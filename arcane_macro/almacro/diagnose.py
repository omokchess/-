"""'인식 테스트' 탭: 지금 화면에서 무엇이 몇 점으로 보이는지 진단한다."""

from . import vision
from .bot import detect_targets
from .config import region_tuple
from .overlay import annotate


def diagnose(cfg, store, grab):
    """grab(region_name) → 이미지|None. 반환: (텍스트 줄 목록, [(제목, 주석 이미지)])."""
    mc = cfg["match"]
    scales = tuple(mc.get("scales") or (1.0,))
    lines, previews = [], []

    def region_img(name):
        if not region_tuple(cfg["regions"].get(name)):
            lines.append(f"[{name}] 영역이 지정되지 않음")
            return None
        return grab(name)

    # 행동창
    img = region_img("action")
    if img is not None:
        found = []
        for t in ("attack", "action_meditate", "action_guard"):
            templ = store.get(t)
            if templ is None:
                continue
            m = vision.best_match(img, templ, scales=scales, label=t)
            ok = m is not None and m.score >= mc["attack" if t == "attack" else "skill"]
            lines.append(f"[행동창] {t}: 최고 {m.score:.2f} {'✔' if ok else '✖'}" if m else f"[행동창] {t}: 비교 불가")
            if ok:
                found.append(m)
        previews.append(("ACTION", annotate(img, found)))

    # 스킬창
    img = region_img("skill")
    if img is not None:
        found = []
        for r in cfg["rotation"]:
            if r["type"] != "skill":
                continue
            templ = store.get(r["template"])
            if templ is None:
                lines.append(f"[스킬창] {r['name']}: 템플릿 없음")
                continue
            m = vision.best_match(img, templ, scales=scales, label=r["name"])
            if m is None:
                lines.append(f"[스킬창] {r['name']}: 비교 불가(템플릿이 영역보다 큼?)")
                continue
            ok = m.score >= mc["skill"]
            extra = ""
            if ok:
                br = vision.brightness_ratio(img, m, templ)
                dis = vision.looks_disabled(img, m, templ, mc["disabled_brightness"], mc["disabled_saturation"])
                extra = f" 밝기비 {br:.2f}{' → 비활성(쿨타임)' if dis else ''}"
                found.append(m)
            lines.append(f"[스킬창] {r['name']}: 최고 {m.score:.2f} {'✔' if ok else '✖'}{extra}")
        previews.append(("SKILL", annotate(img, found)))

    # 적 선택창
    img = region_img("enemy")
    if img is not None:
        targets = detect_targets(img, cfg, store)
        e = cfg["enemy"]
        pick = vision.pick_target(targets, e.get("pick", "middle"), e.get("index", 0))
        lines.append(f"[적 선택] 버튼 {len(targets)}개 ({e.get('mode')}) → "
                     f"{'선택 #' + str(targets.index(pick) + 1) if pick else '선택 없음'}")
        out = annotate(img, targets, (255, 160, 0))
        if pick:
            out = annotate(out, [pick], (0, 0, 255), labels=False)
        previews.append(("ENEMY", out))

    # QTE
    img = region_img("qte")
    if img is not None:
        arrows_t = store.arrows()
        if not any(arrows_t.values()):
            lines.append("[QTE] 화살표 템플릿 없음")
        else:
            q = cfg["qte"]
            arrows = vision.read_arrows(img, arrows_t, mc["arrow"], q.get("use_color", False),
                                        q.get("row_tolerance", 0.6))
            keys = " ".join(q["keys"][a.label] for a in arrows)
            lines.append(f"[QTE] {len(arrows)}개: {vision.arrows_text(arrows)}  → 키 {keys or '-'}")
            if arrows:
                lines.append("       점수: " + " ".join(f"{a.score:.2f}" for a in arrows))
            previews.append(("QTE", annotate(img, arrows, (0, 220, 255))))

    # 에너지
    img = region_img("energy")
    if img is not None:
        en = cfg["energy"]
        if en.get("mode") == "pips":
            hsv = store.hsv_of("energy_pip")
            if hsv is None:
                lines.append("[에너지] energy_pip 템플릿 없음")
            else:
                lines.append(f"[에너지] 칸 세기: {vision.count_blobs(img, hsv, en['pip_tolerance'], en['pip_min_area'])}")
        elif en.get("mode") == "off":
            lines.append("[에너지] 끔")
        else:
            states = store.energy_states()
            if not states:
                lines.append("[에너지] energy_N 상태 이미지 없음")
            else:
                label, score, scores = vision.classify_state(img, states)
                ok = score >= mc["energy"]
                ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:3]
                lines.append(f"[에너지] {label if ok else '?'} (점수 {score:.3f}) 후보: "
                             + ", ".join(f"{k}={v:.3f}" for k, v in ranked))
        previews.append(("ENERGY", img))
    return lines, previews
