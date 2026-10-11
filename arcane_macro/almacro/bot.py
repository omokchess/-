"""전투 자동화 상태머신.

흐름: 대기(사냥 이동) → Attack 버튼 발견 → 에너지 읽기 → 로테이션에서 쓸 행동 결정
      → Attack 클릭 → 스킬 클릭 → 적 버튼 클릭 → QTE 화살표 입력 → 다시 대기
"""

import threading
import time
import traceback

from . import vision, winapi
from .config import parse_hunt_pattern, region_tuple
from .inputs import FailSafe, validate_key


class Stopped(Exception):
    pass


class Hunter:
    """전투가 아닐 때 정해진 패턴으로 걸어 다니며 조우를 유도한다."""

    def __init__(self, inp, pattern):
        self.inp = inp
        self.steps = parse_hunt_pattern(pattern)
        self.i = 0
        self.key = None
        self.until = 0.0

    def tick(self, now):
        if not self.steps:
            return
        if self.key is None:
            key, dur = self.steps[self.i]
            self.key = key
            self.until = now + dur
            if key != "wait":
                self.inp.key_down(key)
        elif now >= self.until:
            self.release()
            self.i = (self.i + 1) % len(self.steps)

    def release(self):
        if self.key is not None and self.key != "wait":
            self.inp.key_up(self.key)
        self.key = None


class Bot:
    def __init__(self, cfg, store, screen, inp, log=print, on_status=None):
        self.cfg = cfg
        self.store = store
        self.screen = screen
        self.inp = inp
        self.log = log
        self.on_status = on_status or (lambda s: None)
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.thread = None

        self.turn = 0
        self.battle_active = False
        self.last_used = {}
        self.blocked_until = {}
        self.last_attack_seen = -1e9
        self.attack_cleared = True
        self.turn_done_at = -1e9
        self.hunter = Hunter(inp, cfg["hunt"]["pattern"]) if cfg["hunt"].get("enabled") else None
        self.qte_sig = None  # 마지막으로 입력한 화살표 배열 (사라지기 전까지 다시 누르지 않음)
        self.turn_attack_gone = False  # 내 행동 도중 Attack 버튼이 사라지는 걸 봤는지
        self._status = None
        self.stats = {"battles": 0, "turns": 0, "skills": {}, "qte_rounds": 0, "qte_keys": 0}

    # ------------------------------------------------------------ 실행 제어
    def start(self):
        self.thread = threading.Thread(target=self.run, name="al-bot", daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()

    def toggle_pause(self):
        if self.pause_event.is_set():
            self.pause_event.clear()
            self.log("▶ 재개")
        else:
            self.pause_event.set()
            self.log("⏸ 일시정지")
        return self.pause_event.is_set()

    def now(self):
        return time.monotonic()

    def sleep(self, seconds):
        if seconds > 0 and self.stop_event.wait(seconds):
            raise Stopped()
        if self.stop_event.is_set():
            raise Stopped()

    def status(self, text):
        if text != self._status:
            self._status = text
            self.on_status(text)

    # ------------------------------------------------------------ 화면 도구
    def grab(self, name):
        r = self.cfg["regions"].get(name)
        return self.screen.grab(r) if region_tuple(r) else None

    def origin(self, name):
        x, y, _, _ = region_tuple(self.cfg["regions"][name])
        return x, y

    def thr(self, key):
        return float(self.cfg["match"][key])

    def scales(self):
        return tuple(self.cfg["match"].get("scales") or (1.0,))

    def find(self, region, template, thr_key, img=None):
        """region 안에서 template을 찾아 화면 절대좌표 Match로 반환."""
        templ = self.store.get(template)
        if templ is None or not region_tuple(self.cfg["regions"].get(region)):
            return None
        img = self.grab(region) if img is None else img
        m = vision.find(img, templ, self.thr(thr_key), scales=self.scales(), label=template)
        if m is None:
            return None
        ox, oy = self.origin(region)
        return m.shifted(ox, oy)

    def is_disabled(self, region, m, template, img):
        templ = self.store.get(template)
        ox, oy = self.origin(region)
        local = m.shifted(-ox, -oy)
        mc = self.cfg["match"]
        return vision.looks_disabled(img, local, templ, mc["disabled_brightness"], mc["disabled_saturation"])

    def click(self, m, what=""):
        self.inp.check_failsafe()
        self.inp.click(m.cx, m.cy, self.cfg["input"].get("click_hold", 0.04))
        park = self.cfg["input"].get("park_mouse")
        if park:
            time.sleep(0.05)
            self.inp.move(park[0], park[1])
        if what:
            self.log(f"  클릭: {what} ({m.cx},{m.cy}) 점수 {m.score:.2f}")
        self.sleep(self.cfg["timing"]["after_click"])

    def wait_until(self, fn, timeout, interval=0.05):
        end = self.now() + timeout
        while True:
            value = fn()
            if value:
                return value
            if self.now() >= end:
                return None
            self.sleep(interval)

    # ------------------------------------------------------------ 메인 루프
    def run(self):
        self.log("■ 매크로 시작 (F7 일시정지 / F8 정지 / 마우스 왼쪽 위 구석 = 비상정지)")
        try:
            self.validate()
            if self.cfg["input"].get("focus_roblox") and winapi.focus_window("Roblox"):
                self.log("Roblox 창을 앞으로 가져옴")
            self.loop()
        except Stopped:
            pass
        except FailSafe as e:
            self.log(f"■ {e}")
        except Exception:
            self.log("■ 오류로 정지:\n" + traceback.format_exc())
        finally:
            if self.hunter:
                self.hunter.release()
            self.inp.release_all()
            self.stop_event.set()
            self.status("정지")
            self.log(f"■ 매크로 정지 — 전투 {self.stats['battles']}회, 턴 {self.stats['turns']}회, "
                     f"QTE {self.stats['qte_rounds']}회")

    def validate(self):
        """시작 전에 설정 문제를 알려 준다. 키 이름이 틀리면 시작하지 않는다."""
        bad = [k for k in self.cfg["qte"]["keys"].values() if not validate_key(k)]
        if self.hunter:
            bad += [k for k, _ in self.hunter.steps if k != "wait" and not validate_key(k)]
        if bad:
            raise ValueError(f"알 수 없는 키 이름: {bad} (예: w, a, s, d, up, down, left, right, space)")
        for name in ("action", "skill", "enemy", "qte"):
            if not region_tuple(self.cfg["regions"].get(name)):
                self.log(f"  ⚠ '{name}' 영역이 지정되지 않음")
        if self.store.get("attack") is None:
            self.log("  ⚠ attack 템플릿이 없음 → 전투를 감지할 수 없음")
        if not any(self.store.arrows().values()):
            self.log("  ⚠ 화살표 템플릿이 없음 → QTE를 입력하지 않음")

    def loop(self):
        timing = self.cfg["timing"]
        while not self.stop_event.is_set():
            if self.pause_event.is_set():
                if self.hunter:
                    self.hunter.release()
                self.status("일시정지")
                self.sleep(0.1)
                continue
            t0 = self.now()
            self.inp.check_failsafe()
            attack = self.find("action", "attack", "attack")
            now = self.now()
            if attack:
                self.last_attack_seen = now
                stuck = now - self.turn_done_at > timing["stuck_timeout"]
                if self.attack_cleared or stuck:
                    if not self.attack_cleared:
                        self.log("Attack 버튼이 계속 보임 → 이번 턴 다시 시도")
                    if self.hunter:
                        self.hunter.release()
                    self.turn_attack_gone = False
                    self.take_turn(attack)
                    # 행동 중에 Attack이 사라진 걸 봤다면, 다음에 보이는 Attack은 새 턴이다
                    self.attack_cleared = self.turn_attack_gone
                    self.turn_done_at = self.now()
                    continue
            else:
                self.attack_cleared = True
                if self.watch_qte():
                    continue
                idle = now - self.last_attack_seen
                if self.battle_active and idle > timing["new_battle_gap"]:
                    self.battle_active = False
                    self.log(f"전투 종료로 판단 ({idle:.0f}초 동안 Attack 없음)")
                if idle > timing["hunt_resume_delay"]:
                    self.handle_popups()
                    if self.hunter:
                        self.status("사냥 이동")
                        self.hunter.tick(self.now())
                    else:
                        self.status("전투 대기")
                else:
                    self.status("적 턴 대기")
            self.sleep(max(0.0, timing["scan_interval"] - (self.now() - t0)))

    # ------------------------------------------------------------ 턴 처리
    def take_turn(self, attack):
        if not self.battle_active:
            self.battle_active = True
            self.turn = 0
            self.last_used.clear()
            self.blocked_until.clear()
            self.stats["battles"] += 1
            self.log(f"⚔ 전투 시작 (#{self.stats['battles']})")
        self.turn += 1
        self.stats["turns"] += 1
        self.status(f"내 턴 {self.turn}")
        energy = self.read_energy()
        self.log(f"[턴 {self.turn}] 에너지 {energy if energy is not None else '?'}")

        rules = [r for r in self.cfg["rotation"] if r.get("enabled", True)]
        for i, rule in enumerate(rules):
            ok, why = self.ready(rule, energy)
            if not ok:
                self.log(f"  {rule['name']}: 건너뜀 ({why})")
                continue
            if rule["type"] == "action":
                m = self.find("action", rule["template"], "skill")
                if m:
                    self.click(m, rule["name"])
                    self.mark_used(rule)
                    self.wait_attack_gone()
                    return
                self.log(f"  {rule['name']}: 버튼을 못 찾음")
                continue
            if self.skill_flow(attack, rules[i:], energy):
                return
            # 스킬창이 안 열렸거나 쓸 스킬이 없으면 남은 '행동' 규칙으로
            rules_left = [r for r in rules[i + 1:] if r["type"] == "action"]
            for r in rules_left:
                if self.ready(r, energy)[0]:
                    m = self.find("action", r["template"], "skill")
                    if m:
                        self.click(m, r["name"])
                        self.mark_used(r)
                        self.wait_attack_gone()
                        return
            return
        self.log("  쓸 수 있는 행동이 없음 (로테이션/템플릿 확인)")

    def ready(self, rule, energy):
        if energy is not None and rule.get("cost", 0) > energy:
            return False, f"에너지 {energy} < {rule['cost']}"
        name = rule["name"]
        if self.blocked_until.get(name, 0) > self.turn:
            return False, "직전 시도에서 반응 없음"
        cd = int(rule.get("cooldown", 0))
        if self.cfg["timing"].get("use_turn_counter") and cd > 0 and name in self.last_used:
            passed = self.turn - self.last_used[name]
            if passed < cd:
                return False, f"쿨타임 {cd - passed}턴 남음(추정)"
        if self.store.get(rule["template"]) is None:
            return False, f"템플릿 {rule['template']} 없음"
        return True, ""

    def wait_attack_gone(self, timeout=1.5):
        self.wait_until(lambda: self.note_attack_state() or self.turn_attack_gone, timeout)

    def note_attack_state(self):
        if not self.turn_attack_gone and not self.find("action", "attack", "attack"):
            self.turn_attack_gone = True

    def mark_used(self, rule):
        self.last_used[rule["name"]] = self.turn
        self.stats["skills"][rule["name"]] = self.stats["skills"].get(rule["name"], 0) + 1

    def skill_flow(self, attack, rules, energy):
        skills = [r for r in rules if r["type"] == "skill" and self.ready(r, energy)[0]]
        if not skills:
            return False
        self.click(attack, "Attack")

        def menu_open():
            img = self.grab("skill")
            if img is None:
                return None
            return any(self.find("skill", r["template"], "skill", img)
                       for r in skills + [{"template": "back"}])

        if not self.wait_until(menu_open, self.cfg["timing"]["menu_timeout"]):
            self.log("  스킬창이 보이지 않음 (스킬창 영역/템플릿 확인)")
            return False

        for r in skills:
            img = self.grab("skill")
            m = self.find("skill", r["template"], "skill", img)
            if not m:
                self.log(f"  {r['name']}: 스킬창에 없음")
                continue
            if self.is_disabled("skill", m, r["template"], img):
                self.log(f"  {r['name']}: 어두움 → 쿨타임으로 판단")
                self.blocked_until[r["name"]] = self.turn + 1
                continue
            self.click(m, r["name"])
            self.note_attack_state()
            if r.get("target", True):
                targets = self.wait_until(self.detect_targets, self.cfg["timing"]["target_timeout"])
                if not targets:
                    if self.find("skill", r["template"], "skill"):
                        self.log(f"  {r['name']}: 클릭해도 반응 없음 → 다음 후보")
                        self.blocked_until[r["name"]] = self.turn + 1
                        continue
                    self.log("  적 선택창이 안 보임 (자동 대상이었을 수 있음)")
                else:
                    e = self.cfg["enemy"]
                    target = vision.pick_target(targets, e.get("pick", "middle"), e.get("index", 0))
                    self.click(target, f"적 {targets.index(target) + 1}/{len(targets)}")
            self.mark_used(r)
            if r.get("qte", True):
                self.solve_qte()
            self.note_attack_state()
            return True

        back = self.find("skill", "back", "skill")
        if back:
            self.click(back, "뒤로")
        else:
            self.log("  사용 가능한 스킬 없음 (Strike를 로테이션 끝에 두면 안전)")
        return False

    # ------------------------------------------------------------ 인식 단계
    def read_energy(self):
        e = self.cfg["energy"]
        mode = e.get("mode", "template")
        if mode == "off":
            return None
        img = self.grab("energy")
        if img is None:
            return None
        if mode == "pips":
            hsv = self.store.hsv_of("energy_pip")
            if hsv is None:
                return None
            return vision.count_blobs(img, hsv, e["pip_tolerance"], e.get("pip_min_area", 6))
        states = self.store.energy_states()
        if not states:
            return None
        label, score, _ = vision.classify_state(img, states)
        if score < self.thr("energy"):
            self.log(f"  에너지 판독 불확실 (최고 {label}={score:.2f})")
            return None
        return int(label)

    def detect_targets(self):
        img = self.grab("enemy")
        if img is None:
            return None
        targets = detect_targets(img, self.cfg, self.store)
        if not targets:
            return None
        ox, oy = self.origin("enemy")
        return [t.shifted(ox, oy) for t in targets]

    def handle_popups(self):
        if not region_tuple(self.cfg["regions"].get("popup")):
            return
        img = self.grab("popup")
        for name, templ in self.store.popups():
            m = vision.find(img, templ, self.thr("popup"), scales=self.scales())
            if m:
                ox, oy = self.origin("popup")
                self.click(m.shifted(ox, oy), f"팝업 {name}")
                return

    def qte_ready(self):
        arrows_t = self.store.arrows()
        if not region_tuple(self.cfg["regions"].get("qte")) or not any(arrows_t.values()):
            return None
        return arrows_t

    def read_qte(self, arrows_t):
        q = self.cfg["qte"]
        img = self.grab("qte")
        return vision.read_arrows(img, arrows_t, self.thr("arrow"), q.get("use_color", False),
                                  q.get("row_tolerance", 0.6))

    def watch_qte(self):
        """내 행동 흐름 밖에서 나타난 QTE(다단 히트의 늦은 라운드 등)도 처리한다."""
        arrows_t = self.qte_ready()
        if arrows_t is None:
            return False
        arrows = self.read_qte(arrows_t)
        if not arrows:
            self.qte_sig = None
            return False
        if vision.arrow_signature(arrows, self.cfg["qte"].get("row_tolerance", 0.6)) == self.qte_sig:
            return False  # 이미 입력한 배열이 아직 화면에 남아 있음
        if self.hunter:
            self.hunter.release()
        self.solve_qte(wait_for_appear=False)
        return True

    def solve_qte(self, wait_for_appear=True):
        q = self.cfg["qte"]
        arrows_t = self.qte_ready()
        if arrows_t is None:
            return
        self.status("QTE")
        start = self.now()
        pending_sig, pending_n = None, 0
        pressed_any = not wait_for_appear
        last_seen = start
        last_press = start
        while self.now() - start < q["max_time"]:
            arrows = self.read_qte(arrows_t)
            t = self.now()
            if not arrows:
                pending_sig, pending_n = None, 0
                self.qte_sig = None  # 사라졌다 다시 나오면 같은 배열이라도 새 라운드
                if pressed_any and t - last_seen > q["done_timeout"]:
                    break
                if not pressed_any and t - start > q["appear_timeout"]:
                    self.log("  QTE 화살표가 나타나지 않음")
                    break
                self.sleep(0.03)
                continue
            last_seen = t
            self.note_attack_state()  # QTE 중에는 행동창이 없으므로 '턴이 넘어감' 표시로 쓴다
            sig = vision.arrow_signature(arrows, q.get("row_tolerance", 0.6))
            if sig == self.qte_sig:
                since = t - last_press
                if q.get("repeat_after", 0) > 0 and since > q["repeat_after"]:
                    self.qte_sig = None  # 같은 배열이 계속 남아 있으면 다시 입력
                elif since > q["linger_timeout"]:
                    break
                self.sleep(0.03)
                continue
            if sig != pending_sig:
                pending_sig, pending_n = sig, 1
            else:
                pending_n += 1
            if pending_n < max(1, int(q.get("stable_reads", 2))):
                self.sleep(0.02)
                continue
            keys = [q["keys"][a.label] for a in arrows]
            self.log(f"  QTE {len(keys)}개: {vision.arrows_text(arrows)}")
            for k in keys:
                self.inp.press(k, q["key_hold"])
                time.sleep(q["key_delay"])
            pressed_any = True
            self.qte_sig = sig
            last_press = self.now()
            pending_sig, pending_n = None, 0
            self.stats["qte_rounds"] += 1
            self.stats["qte_keys"] += len(keys)


def detect_targets(img, cfg, store):
    """적 선택 영역 이미지에서 적 버튼 목록(영역 기준 좌표, 읽는 순서)을 찾는다."""
    e = cfg["enemy"]
    mode = e.get("mode", "auto")
    thr = float(cfg["match"]["enemy"])
    found = []
    button = store.get("enemy_button")
    if mode in ("auto", "template") and button is not None:
        found = vision.detect_buttons_by_template(img, button, thr, e.get("strip_ratio", 0.18))
    if not found and mode in ("auto", "color"):
        hsv = store.hsv_of("enemy_button")
        if hsv is not None:
            found = vision.detect_buttons_by_color(img, hsv, e["color_tolerance"], tuple(e["min_size"]))
    if mode == "slots" and e.get("slots"):  # 고정 좌표는 창이 떴는지 알 수 없으므로 명시적으로만
        found = vision.buttons_from_slots(img, e["slots"])
    return vision.reading_order(found)
