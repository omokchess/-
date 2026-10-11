"""테스트용 합성 화면: 화살표, 버튼, 에너지 칸과 간단한 가짜 전투."""

import random
import threading
import time

import cv2
import numpy as np

from almacro.inputs import BaseInput

ANGLE = {"up": 0, "right": 90, "down": 180, "left": 270}
WHITE = (240, 240, 240)
YELLOW = (40, 210, 250)


def draw_arrow(img, cx, cy, size, direction, color=WHITE, tile=(45, 45, 50)):
    s = size
    cv2.rectangle(img, (cx - s // 2 - 4, cy - s // 2 - 4), (cx + s // 2 + 4, cy + s // 2 + 4), tile, -1)
    cv2.rectangle(img, (cx - s // 2 - 4, cy - s // 2 - 4), (cx + s // 2 + 4, cy + s // 2 + 4), (90, 90, 100), 2)
    pts = np.array([(0, -s / 2), (s / 2, 0), (s / 6, 0), (s / 6, s / 2),
                    (-s / 6, s / 2), (-s / 6, 0), (-s / 2, 0)], np.float64)
    a = np.deg2rad(ANGLE[direction])
    rot = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    pts = (pts @ rot.T + (cx, cy)).round().astype(np.int32)
    cv2.fillPoly(img, [pts], color, lineType=cv2.LINE_AA)


def draw_button(img, x, y, w, h, text, fill=(60, 40, 150), border=(220, 200, 255), dim=1.0):
    roi = img[y:y + h, x:x + w]
    roi[:] = fill
    cv2.rectangle(roi, (0, 0), (w - 1, h - 1), border, 2)
    cv2.rectangle(roi, (3, 3), (9, h - 4), border, -1)  # 왼쪽 장식 띠
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    cv2.putText(roi, text, ((w - tw) // 2 + 4, (h + th) // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                (255, 255, 255), 1, cv2.LINE_AA)
    if dim != 1.0:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        roi[:] = (cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR) * dim).astype(np.uint8)


def draw_energy(img, x, y, n, maximum=6):
    for i in range(maximum):
        c = (x + 10 + i * 18, y + 12)
        if i < n:
            cv2.circle(img, c, 7, (230, 200, 40), -1)
        cv2.circle(img, c, 7, (120, 120, 120), 1)


def background(h, w, seed=0):
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), np.uint8)
    img[:] = (35, 60, 40)
    noise = rng.integers(0, 18, (h, w, 1), dtype=np.uint8)
    return cv2.add(img, np.repeat(noise, 3, axis=2))


NAMES = ["Bandit", "Wolf", "Goblin Thief", "Mossy Golem", "Skeleton", "Mudskipper", "Drake", "Imp"]

REGIONS = {
    "action": {"x": 620, "y": 200, "w": 160, "h": 220},
    "skill": {"x": 400, "y": 200, "w": 200, "h": 220},
    "enemy": {"x": 60, "y": 60, "w": 220, "h": 230},
    "qte": {"x": 150, "y": 470, "w": 500, "h": 110},
    "energy": {"x": 10, "y": 430, "w": 130, "h": 26},
}
BTN = (150, 34)


class FakeGame:
    """아주 단순한 Arcane Lineage 흉내. 클릭/키 입력에 따라 상태가 바뀐다."""

    def __init__(self, seed=1, turns_per_battle=7, max_battles=2, qte_rounds_pt=2):
        self.rng = random.Random(seed)
        self.lock = threading.RLock()
        self.turns_per_battle = turns_per_battle
        self.max_battles = max_battles
        self.qte_rounds_pt = qte_rounds_pt
        self.bg = background(600, 800, seed)
        self.state = "explore"
        self.t_state = time.monotonic()
        self.battles = 0
        self.energy = 1
        self.pt_cd = 0
        self.turn = 0
        self.enemies = []
        self.pending = None
        self.rounds_left = 0
        self.arrows = []
        self.pos = 0
        self.linger_until = 0.0
        self.next_round_at = 0.0
        self.log = []
        self.counts = {"pt": 0, "strike": 0, "pt_disabled_click": 0, "qte_ok": 0, "qte_fail": 0,
                       "wrong_key": 0, "targets": [], "keys_outside_qte": 0}

    # ---------------- 상태
    def _set(self, state):
        self.state = state
        self.t_state = time.monotonic()

    def tick(self):
        now = time.monotonic()
        with self.lock:
            el = now - self.t_state
            if self.state == "explore" and el > 0.3 and self.battles < self.max_battles:
                self.battles += 1
                self.turn = 0
                self.energy = 1
                self.pt_cd = 0
                self.enemies = self.rng.sample(NAMES, self.rng.randint(1, 4))
                self._start_turn()
            elif self.state == "enemy" and el > 0.3:
                if self.turn >= self.turns_per_battle:
                    self._set("explore")
                else:
                    self._start_turn()
            elif self.state == "qte":
                if self.arrows and self.pos >= len(self.arrows) and now >= self.linger_until:
                    self.arrows = []
                    self.rounds_left -= 1
                    self.next_round_at = now + 0.35
                    if self.rounds_left <= 0:
                        self._set("enemy")
                elif not self.arrows and self.rounds_left > 0 and now >= self.next_round_at:
                    self._new_round()
                elif self.arrows and self.pos < len(self.arrows) and el > 4.0:
                    self.counts["qte_fail"] += 1
                    self._set("enemy")

    def _start_turn(self):
        self.turn += 1
        if self.turn > 1:
            self.energy = min(6, self.energy + 1)
            self.pt_cd = max(0, self.pt_cd - 1)
        self._set("player")

    def _new_round(self):
        n = self.rng.randint(4, 8) if self.pending == "pt" else 3
        self.arrows = [self.rng.choice(["up", "down", "left", "right"]) for _ in range(n)]
        self.pos = 0
        self.t_state = time.monotonic()

    def pt_usable(self):
        return self.pt_cd == 0 and self.energy >= 2

    # ---------------- 그리기
    def layout(self):
        """상태별 버튼 위치(화면 좌표)."""
        a, s, e = REGIONS["action"], REGIONS["skill"], REGIONS["enemy"]
        out = {}
        if self.state == "player":
            out["attack"] = (a["x"] + 5, a["y"] + 10)
            out["guard"] = (a["x"] + 5, a["y"] + 60)
            out["meditate"] = (a["x"] + 5, a["y"] + 110)
        if self.state == "skill":
            out["party_table"] = (s["x"] + 10, s["y"] + 20)
            out["strike"] = (s["x"] + 10, s["y"] + 70)
        if self.state == "target":
            for i, _ in enumerate(self.enemies):
                out[f"enemy{i}"] = (e["x"] + 20, e["y"] + 15 + i * 50)
        return out

    def frame(self):
        self.tick()
        with self.lock:
            img = self.bg.copy()
            lay = self.layout()
            labels = {"attack": "Attack", "guard": "Guard", "meditate": "Meditate",
                      "party_table": "Party Table", "strike": "Strike"}
            for key, (x, y) in lay.items():
                if key.startswith("enemy"):
                    draw_button(img, x, y, *BTN, self.enemies[int(key[5:])], fill=(40, 40, 160),
                                border=(120, 160, 255))
                elif key == "party_table":
                    draw_button(img, x, y, *BTN, labels[key], dim=1.0 if self.pt_usable() else 0.45)
                else:
                    draw_button(img, x, y, *BTN, labels[key])
            if self.battles and self.state != "explore":
                en = REGIONS["energy"]
                draw_energy(img, en["x"], en["y"], self.energy)
            if self.state == "qte" and self.arrows:
                q = REGIONS["qte"]
                for i, d in enumerate(self.arrows):
                    color = YELLOW if i < self.pos else WHITE
                    draw_arrow(img, q["x"] + 40 + i * 56, q["y"] + 55, 34, d, color)
            return img

    # ---------------- 입력
    def on_click(self, x, y):
        with self.lock:
            hit = None
            for key, (bx, by) in self.layout().items():
                if bx <= x < bx + BTN[0] and by <= y < by + BTN[1]:
                    hit = key
            self.log.append(("click", self.state, hit))
            if self.state == "player" and hit == "attack":
                self._set("skill")
            elif self.state == "skill" and hit == "party_table":
                if self.pt_usable():
                    self.energy -= 2
                    self.pt_cd = 5
                    self.pending = "pt"
                    self.counts["pt"] += 1
                    self._set("target")
                else:
                    self.counts["pt_disabled_click"] += 1
            elif self.state == "skill" and hit == "strike":
                self.pending = "strike"
                self.counts["strike"] += 1
                self._set("target")
            elif self.state == "target" and hit and hit.startswith("enemy"):
                self.counts["targets"].append((int(hit[5:]), len(self.enemies)))
                self.rounds_left = self.qte_rounds_pt if self.pending == "pt" else 1
                self._set("qte")
                self._new_round()

    def on_key(self, key):
        with self.lock:
            if self.state != "qte" or not self.arrows or self.pos >= len(self.arrows):
                self.counts["keys_outside_qte"] += 1
                return
            want = {"up": "w", "down": "s", "left": "a", "right": "d"}[self.arrows[self.pos]]
            if key == want:
                self.pos += 1
                if self.pos == len(self.arrows):
                    self.counts["qte_ok"] += 1
                    self.linger_until = time.monotonic() + 0.25  # 다 누른 뒤 잠깐 노랗게 남아 있음
            else:
                self.counts["wrong_key"] += 1
                self.counts["qte_fail"] += 1
                self.arrows = []
                self.rounds_left = 0
                self._set("enemy")


class FakeScreen:
    def __init__(self, game):
        self.game = game

    def grab(self, region):
        img = self.game.frame()
        x, y, w, h = (region[k] for k in ("x", "y", "w", "h"))
        return img[y:y + h, x:x + w].copy()


class FakeInput(BaseInput):
    def __init__(self, game):
        super().__init__()
        self.game = game

    def _down(self, key):
        self.game.on_key(key)

    def _up(self, key):
        pass

    def _click(self, x, y, hold):
        self.game.on_click(x, y)


def crop(img, x, y, w, h):
    return img[y:y + h, x:x + w].copy()
