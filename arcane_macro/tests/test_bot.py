import time

from almacro.bot import Bot
from almacro.config import default_config
from almacro.templates import TemplateStore
from synth import BTN, REGIONS, FakeGame, FakeInput, FakeScreen, crop, draw_energy


def capture_templates(store, seed=1):
    """사용자가 GUI에서 캡처하는 것과 같은 템플릿을 가짜 게임 화면에서 잘라 둔다."""
    g = FakeGame(seed=seed)
    g.battles, g.enemies = 1, ["Wolf", "Bandit"]
    g.state = "player"
    f = g.frame()
    a = REGIONS["action"]
    store.save("attack", crop(f, a["x"] + 5, a["y"] + 10, *BTN))
    store.save("action_meditate", crop(f, a["x"] + 5, a["y"] + 110, *BTN))
    g.state, g.energy = "skill", 3
    f = g.frame()
    s = REGIONS["skill"]
    store.save("skill_party_table", crop(f, s["x"] + 10, s["y"] + 20, *BTN))
    store.save("skill_strike", crop(f, s["x"] + 10, s["y"] + 70, *BTN))
    g.state = "target"
    f = g.frame()
    e = REGIONS["enemy"]
    store.save("enemy_button", crop(f, e["x"] + 20, e["y"] + 15, *BTN))
    g.state, g.arrows, g.pos = "qte", ["up"], 0
    f = g.frame()
    q = REGIONS["qte"]
    store.save("arrow_up", crop(f, q["x"] + 40 - 21, q["y"] + 55 - 21, 43, 43))
    en = REGIONS["energy"]
    for n in range(7):
        img = g.bg[en["y"]:en["y"] + en["h"], en["x"]:en["x"] + en["w"]].copy()
        draw_energy(img, 0, 0, n)
        store.save(f"energy_{n}", img)


def fast_config():
    cfg = default_config()
    cfg["regions"] = {k: dict(v) for k, v in REGIONS.items()}
    cfg["regions"]["popup"] = None
    cfg["timing"].update(scan_interval=0.02, after_click=0.03, menu_timeout=0.6, target_timeout=0.6,
                         stuck_timeout=2.0, new_battle_gap=1.0, hunt_resume_delay=0.3)
    cfg["qte"].update(appear_timeout=0.8, done_timeout=0.5, linger_timeout=1.0, key_delay=0.004, key_hold=0.002)
    cfg["input"].update(focus_roblox=False, click_hold=0.0)
    return cfg


def run_bot(cfg, store, game, until, timeout=25.0):
    logs = []
    bot = Bot(cfg, store, FakeScreen(game), FakeInput(game), log=logs.append)
    bot.start()
    end = time.monotonic() + timeout
    while time.monotonic() < end and not until(game):
        time.sleep(0.05)
    bot.stop()
    bot.thread.join(3)
    return bot, logs


def battles_done(n):
    return lambda g: g.battles >= n and g.state == "explore"


def test_full_hunt_uses_party_table_and_clears_every_qte(tmp_path):
    store = TemplateStore(str(tmp_path))
    capture_templates(store)
    game = FakeGame(seed=7, turns_per_battle=7, max_battles=2)
    bot, logs = run_bot(fast_config(), store, game, battles_done(2))
    c = game.counts
    text = "\n".join(logs)
    assert game.battles == 2 and game.state == "explore", text
    assert bot.stats["battles"] == 2, text
    assert c["qte_fail"] == 0 and c["wrong_key"] == 0, text
    assert c["keys_outside_qte"] == 0, text  # 남아 있는 노란 화살표를 다시 누르지 않음
    # 전투당 7턴: 1턴 에너지1 → Strike, 2턴 에너지2 → PT, 쿨 5턴 뒤 7턴에 다시 PT
    assert c["pt"] == 4, text
    assert c["strike"] == 10, text
    assert c["pt_disabled_click"] == 0, text
    assert c["qte_ok"] == c["pt"] * 2 + c["strike"], text  # PT는 QTE 2라운드
    for idx, n in c["targets"]:
        assert idx == (n - 1) // 2  # 가운데 적
    assert not any("오류" in line for line in logs), text


def test_visual_cooldown_check_without_turn_counter(tmp_path):
    """턴 카운터를 끄면 어두운 버튼(쿨타임)을 보고 Strike로 넘어가야 한다."""
    store = TemplateStore(str(tmp_path))
    capture_templates(store)
    cfg = fast_config()
    cfg["timing"]["use_turn_counter"] = False
    cfg["energy"]["mode"] = "off"  # 에너지도 모르는 상태
    game = FakeGame(seed=3, turns_per_battle=6, max_battles=1)
    bot, logs = run_bot(cfg, store, game, battles_done(1))
    c = game.counts
    text = "\n".join(logs)
    assert c["qte_fail"] == 0 and c["keys_outside_qte"] == 0, text
    assert c["pt"] == 1 and c["strike"] == 5, text
    assert c["pt_disabled_click"] == 0, text
    assert "쿨타임으로 판단" in text


def test_meditate_fallback_when_no_skill_templates(tmp_path):
    store = TemplateStore(str(tmp_path))
    capture_templates(store)
    store.delete("skill_strike")
    cfg = fast_config()
    for r in cfg["rotation"]:
        if r["name"] == "Meditate":
            r["enabled"] = True
    game = FakeGame(seed=4, turns_per_battle=3, max_battles=1)
    clicks = []
    orig = game.on_click
    game.on_click = lambda x, y: (clicks.append(game.state), orig(x, y))
    bot, logs = run_bot(cfg, store, game, lambda g: len(clicks) >= 2, timeout=8)
    text = "\n".join(logs)
    assert "Meditate" in text, text
    assert bot.stats["skills"].get("Meditate", 0) >= 1, text


def test_stop_releases_held_keys(tmp_path):
    store = TemplateStore(str(tmp_path))
    capture_templates(store)
    cfg = fast_config()
    cfg["hunt"].update(enabled=True, pattern="w:5")
    game = FakeGame(seed=5, max_battles=0)  # 전투가 안 나는 상태에서 계속 걷기
    held = {}

    class Spy(FakeInput):
        def _down(self, key):
            held[key] = True

        def _up(self, key):
            held[key] = False

    bot = Bot(cfg, store, FakeScreen(game), Spy(game), log=lambda m: None)
    bot.start()
    time.sleep(0.8)
    assert held.get("w") is True
    bot.stop()
    bot.thread.join(2)
    assert held.get("w") is False
