"""설정(config.json) 로드/저장과 템플릿 목록 정의."""

import copy
import json
import os

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(APP_DIR, "config.json")
TEMPLATE_DIR = os.path.join(APP_DIR, "templates")
LOG_PATH = os.path.join(APP_DIR, "macro.log")

# 화면에서 감시할 영역. 순서 = GUI 표시 순서.
REGION_NAMES = ["action", "skill", "enemy", "qte", "energy", "popup"]
REGION_LABELS = {
    "action": "행동 선택창 (Attack)",
    "skill": "스킬 선택창",
    "enemy": "적 선택창",
    "qte": "QTE 화살표",
    "energy": "에너지",
    "popup": "팝업 (선택)",
}
REGION_COLORS = {
    "action": "#ff4d4d",
    "skill": "#ffb020",
    "enemy": "#b04dff",
    "qte": "#20c0ff",
    "energy": "#30e070",
    "popup": "#ff60c0",
}

# 캡처해야 하는 템플릿 이미지: (이름, 설명, 찾는 영역, 필수 여부)
TEMPLATE_SLOTS = [
    ("attack", "행동창의 Attack 버튼", "action", True),
    ("skill_party_table", "스킬창의 Party Table 버튼 (사용 가능 상태)", "skill", True),
    ("skill_strike", "스킬창의 Strike 버튼 (대체 공격)", "skill", False),
    ("action_meditate", "행동창의 명상 버튼 (대체 행동)", "action", False),
    ("action_guard", "행동창의 가드 버튼 (대체 행동)", "action", False),
    ("enemy_button", "적 선택 버튼 하나 (이름은 아무거나)", "enemy", True),
    ("arrow_up", "QTE 위 화살표 (하나만 있어도 회전으로 4방향 생성)", "qte", True),
    ("arrow_down", "QTE 아래 화살표 (선택)", "qte", False),
    ("arrow_left", "QTE 왼쪽 화살표 (선택)", "qte", False),
    ("arrow_right", "QTE 오른쪽 화살표 (선택)", "qte", False),
    ("energy_pip", "에너지 칸 하나 (pips 모드에서만)", "energy", False),
    ("back", "스킬창 뒤로가기 버튼 (선택)", "skill", False),
    ("popup_1", "전투 후 닫을 팝업 버튼 1 (선택)", "popup", False),
    ("popup_2", "전투 후 닫을 팝업 버튼 2 (선택)", "popup", False),
    ("popup_3", "전투 후 닫을 팝업 버튼 3 (선택)", "popup", False),
]

DEFAULTS = {
    "regions": {name: None for name in REGION_NAMES},
    "match": {
        "attack": 0.82,
        "skill": 0.82,
        "arrow": 0.78,
        "enemy": 0.80,
        "energy": 0.80,
        "popup": 0.85,
        "scales": [1.0],
        # 템플릿보다 이만큼 어두우면(밝기 비율) 쿨타임/비활성 버튼으로 본다
        "disabled_brightness": 0.78,
        "disabled_saturation": 0.55,
    },
    # 위에서부터 조건이 맞는 첫 행동을 쓴다
    "rotation": [
        {"name": "Party Table", "type": "skill", "template": "skill_party_table",
         "cost": 2, "cooldown": 5, "target": True, "qte": True, "enabled": True},
        {"name": "Strike", "type": "skill", "template": "skill_strike",
         "cost": 0, "cooldown": 0, "target": True, "qte": True, "enabled": True},
        {"name": "Meditate", "type": "action", "template": "action_meditate",
         "cost": 0, "cooldown": 0, "target": False, "qte": False, "enabled": False},
        {"name": "Guard", "type": "action", "template": "action_guard",
         "cost": 0, "cooldown": 0, "target": False, "qte": False, "enabled": False},
    ],
    "energy": {
        "mode": "template",  # template | pips | off
        "pip_tolerance": [10, 70, 70],
        "pip_min_area": 6,
    },
    "enemy": {
        "mode": "auto",  # auto | template | color | slots
        "pick": "middle",  # middle | first | last | index | random
        "index": 0,
        "strip_ratio": 0.18,
        "color_tolerance": [8, 60, 60],
        "min_size": [30, 12],
        "slots": [],  # 적 선택 영역 기준 상대 좌표 [[0.5, 0.15], ...]
    },
    "qte": {
        "keys": {"up": "w", "down": "s", "left": "a", "right": "d"},
        "key_delay": 0.05,
        "key_hold": 0.03,
        "appear_timeout": 2.5,
        "done_timeout": 1.0,
        "linger_timeout": 3.0,
        "max_time": 15.0,
        "stable_reads": 2,
        "use_color": False,
        "row_tolerance": 0.6,
        "repeat_after": 0.0,
    },
    "timing": {
        "scan_interval": 0.10,
        "after_click": 0.25,
        "menu_timeout": 2.0,
        "target_timeout": 1.6,
        "stuck_timeout": 6.0,
        "new_battle_gap": 20.0,
        "hunt_resume_delay": 8.0,
        "use_turn_counter": True,
    },
    "hunt": {
        "enabled": False,
        "pattern": "w:1.5, s:1.5",
    },
    "input": {
        "dry_run": False,
        "focus_roblox": True,
        "click_hold": 0.04,
        "park_mouse": None,  # [x, y] 클릭 후 커서를 치워 둘 위치
        "minimize_on_start": True,
    },
}


def _merge(base, override):
    """override 값을 base 구조 위에 덮는다(모르는 키도 보존)."""
    if not isinstance(base, dict) or not isinstance(override, dict):
        return copy.deepcopy(override)
    out = copy.deepcopy(base)
    for key, value in override.items():
        if key in out and isinstance(out[key], dict) and isinstance(value, dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


def default_config():
    return copy.deepcopy(DEFAULTS)


def load_config(path=CONFIG_PATH):
    cfg = default_config()
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            cfg = _merge(cfg, json.load(f))
    return cfg


def save_config(cfg, path=CONFIG_PATH):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def region_tuple(region):
    """{"x","y","w","h"} 또는 None → (x, y, w, h) 또는 None."""
    if not region:
        return None
    try:
        x, y, w, h = (int(region[k]) for k in ("x", "y", "w", "h"))
    except (KeyError, TypeError, ValueError):
        return None
    if w < 2 or h < 2:
        return None
    return x, y, w, h


def parse_hunt_pattern(text):
    """'w:1.5, s:1.5, wait:0.5' → [("w", 1.5), ("s", 1.5), ("wait", 0.5)]."""
    steps = []
    for part in (text or "").replace(";", ",").split(","):
        part = part.strip()
        if not part:
            continue
        key, _, dur = part.partition(":")
        try:
            seconds = float(dur) if dur else 1.0
        except ValueError:
            continue
        if key.strip() and seconds > 0:
            steps.append((key.strip().lower(), seconds))
    return steps
