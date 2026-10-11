"""이미지 인식: 템플릿 매칭, 화살표 읽기, 에너지 판별, 적 버튼 찾기.

모든 함수는 numpy BGR 이미지만 다루므로 화면 없이도 테스트할 수 있다.
"""

import os
import random
import re
from dataclasses import dataclass

import cv2
import numpy as np

DIRS = ("up", "right", "down", "left")  # 시계 방향 순서 (회전 계산용)
ARROW_GLYPH = {"up": "↑", "right": "→", "down": "↓", "left": "←"}
MIN_TEMPLATE_STD = 4.0  # 이보다 밋밋한 템플릿은 어디서나 1.0으로 매칭되므로 거부


@dataclass
class Match:
    x: int
    y: int
    w: int
    h: int
    score: float
    label: str = ""

    @property
    def cx(self):
        return self.x + self.w // 2

    @property
    def cy(self):
        return self.y + self.h // 2

    def shifted(self, dx, dy):
        return Match(self.x + dx, self.y + dy, self.w, self.h, self.score, self.label)


# ---------------------------------------------------------------- 파일 입출력
def imread(path):
    """한글 경로에서도 동작하는 imread (cv2.imread는 윈도우 한글 경로 실패)."""
    try:
        data = np.fromfile(path, dtype=np.uint8)
    except OSError:
        return None
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def imwrite(path, img):
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise IOError(f"PNG 인코딩 실패: {path}")
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    buf.tofile(path)


# ---------------------------------------------------------------- 기본 도구
def to_gray(img):
    if img.ndim == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img


def template_problem(templ):
    """템플릿으로 쓸 수 없는 이유를 돌려준다(문제 없으면 None)."""
    if templ is None:
        return "이미지가 없음"
    h, w = templ.shape[:2]
    if w < 4 or h < 4:
        return f"너무 작음 ({w}x{h})"
    if float(to_gray(templ).std()) < MIN_TEMPLATE_STD:
        return "무늬가 거의 없는 단색 이미지 (어디서나 매칭됨) — 테두리/글자를 포함해 다시 자르세요"
    return None


def _scaled(templ, scale):
    if scale == 1.0:
        return templ
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
    return cv2.resize(templ, None, fx=scale, fy=scale, interpolation=interp)


def _match_map(image, templ, use_color):
    img = image if use_color else to_gray(image)
    t = templ if use_color else to_gray(templ)
    if t.shape[0] > img.shape[0] or t.shape[1] > img.shape[1]:
        return None
    if float(to_gray(t).std()) < MIN_TEMPLATE_STD:
        return None
    res = cv2.matchTemplate(img, t, cv2.TM_CCOEFF_NORMED)
    return np.nan_to_num(res, nan=0.0, posinf=0.0, neginf=0.0)


def iou(a, b):
    x1, y1 = max(a.x, b.x), max(a.y, b.y)
    x2, y2 = min(a.x + a.w, b.x + b.w), min(a.y + a.h, b.y + b.h)
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    if inter == 0:
        return 0.0
    return inter / float(a.w * a.h + b.w * b.h - inter)


def nms(matches, iou_threshold=0.3):
    """겹치는 후보 중 점수가 가장 높은 것만 남긴다."""
    kept = []
    for m in sorted(matches, key=lambda m: m.score, reverse=True):
        if all(iou(m, k) < iou_threshold and not _center_inside(m, k) for k in kept):
            kept.append(m)
    return kept


def _center_inside(a, b):
    return b.x <= a.cx < b.x + b.w and b.y <= a.cy < b.y + b.h


def best_match(image, templ, use_color=False, scales=(1.0,), label=""):
    """임계값과 무관하게 가장 비슷한 위치 하나(진단용). 없으면 None."""
    best = None
    for s in scales:
        t = _scaled(templ, s)
        res = _match_map(image, t, use_color)
        if res is None:
            continue
        _, mx, _, loc = cv2.minMaxLoc(res)
        if best is None or mx > best.score:
            best = Match(int(loc[0]), int(loc[1]), t.shape[1], t.shape[0], float(mx), label)
    return best


def find(image, templ, threshold, use_color=False, scales=(1.0,), label=""):
    m = best_match(image, templ, use_color, scales, label)
    return m if m is not None and m.score >= threshold else None


def find_all(image, templ, threshold, use_color=False, scales=(1.0,), label="", limit=40):
    out = []
    for s in scales:
        t = _scaled(templ, s)
        res = _match_map(image, t, use_color)
        if res is None:
            continue
        ys, xs = np.where(res >= threshold)
        if len(xs) > 400:  # 후보가 너무 많으면 상위만
            order = np.argsort(res[ys, xs])[::-1][:400]
            ys, xs = ys[order], xs[order]
        th, tw = t.shape[:2]
        out.extend(Match(int(x), int(y), tw, th, float(res[y, x]), label) for x, y in zip(xs, ys))
    return nms(out)[:limit]


def reading_order(matches, row_tolerance=0.6):
    """위→아래 줄, 줄 안에서는 왼→오른 순으로 정렬."""
    if not matches:
        return []
    med_h = float(np.median([m.h for m in matches]))
    rows = []
    for m in sorted(matches, key=lambda m: m.cy):
        if rows and abs(m.cy - rows[-1][0]) <= row_tolerance * med_h:
            row = rows[-1][1]
            row.append(m)
            rows[-1] = (float(np.mean([r.cy for r in row])), row)
        else:
            rows.append((float(m.cy), [m]))
    ordered = []
    for _, row in rows:
        ordered.extend(sorted(row, key=lambda m: m.cx))
    return ordered


def brightness_ratio(image, m, templ):
    patch = image[m.y:m.y + m.h, m.x:m.x + m.w]
    if patch.size == 0:
        return 1.0
    t = cv2.resize(templ, (patch.shape[1], patch.shape[0])) if templ.shape[:2] != patch.shape[:2] else templ
    tb = float(to_gray(t).mean())
    return float(to_gray(patch).mean()) / tb if tb > 1 else 1.0


def saturation_ratio(image, m, templ):
    patch = image[m.y:m.y + m.h, m.x:m.x + m.w]
    if patch.size == 0 or patch.ndim != 3 or templ.ndim != 3:
        return 1.0
    ts = float(cv2.cvtColor(templ, cv2.COLOR_BGR2HSV)[:, :, 1].mean())
    if ts < 40:  # 원래 무채색 버튼이면 채도 비교는 의미 없음
        return 1.0
    return float(cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)[:, :, 1].mean()) / ts


def looks_disabled(image, m, templ, min_brightness=0.78, min_saturation=0.55):
    """매칭은 됐지만 어둡거나 색이 빠졌으면 쿨타임/비활성 버튼으로 본다.

    TM_CCOEFF_NORMED는 밝기를 정규화하므로 회색으로 죽은 버튼도 높은 점수가 나온다.
    그래서 밝기/채도를 따로 비교한다.
    """
    return (brightness_ratio(image, m, templ) < min_brightness
            or saturation_ratio(image, m, templ) < min_saturation)


def frame_diff(a, b):
    if a is None or b is None or a.shape != b.shape:
        return 255.0
    return float(cv2.absdiff(to_gray(a), to_gray(b)).mean())


# ---------------------------------------------------------------- 색
def median_hsv(img):
    """이미지 가운데 영역의 대표 HSV (글자보다 배경이 많다는 가정)."""
    h, w = img.shape[:2]
    core = img[h // 6: h - h // 6 or h, w // 6: w - w // 6 or w]
    hsv = cv2.cvtColor(core if core.size else img, cv2.COLOR_BGR2HSV).reshape(-1, 3)
    return [int(v) for v in np.median(hsv, axis=0)]


def hsv_mask(img, center, tolerance):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = (int(c) for c in center)
    th, ts, tv = (int(t) for t in tolerance)
    lo_sv = (max(0, s - ts), max(0, v - tv))
    hi_sv = (min(255, s + ts), min(255, v + tv))
    lo_h, hi_h = h - th, h + th
    ranges = []
    if lo_h < 0:
        ranges += [(0, hi_h), (180 + lo_h, 179)]
    elif hi_h > 179:
        ranges += [(lo_h, 179), (0, hi_h - 180)]
    else:
        ranges.append((lo_h, hi_h))
    mask = np.zeros(hsv.shape[:2], np.uint8)
    for a, b in ranges:
        lo = np.array([a, lo_sv[0], lo_sv[1]], np.uint8)
        hi = np.array([b, hi_sv[0], hi_sv[1]], np.uint8)
        mask |= cv2.inRange(hsv, lo, hi)
    return mask


# ---------------------------------------------------------------- QTE 화살표
def rotate_dir(img, src, dst):
    k = (DIRS.index(dst) - DIRS.index(src)) % 4
    if k == 0:
        return img.copy()
    codes = [None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_180, cv2.ROTATE_90_COUNTERCLOCKWISE]
    return cv2.rotate(img, codes[k])


def build_arrow_templates(explicit):
    """{"up": img|None, ...} → 방향별 템플릿 목록.

    직접 캡처한 방향은 그대로, 없는 방향은 캡처한 화살표를 회전해서 만든다.
    """
    out = {d: [] for d in DIRS}
    for d in DIRS:
        if explicit.get(d) is not None:
            out[d].append(explicit[d])
    for d in DIRS:
        if out[d]:
            continue
        for src in DIRS:
            if explicit.get(src) is not None:
                out[d].append(rotate_dir(explicit[src], src, d))
    return out


def read_arrows(image, arrow_templates, threshold, use_color=False, row_tolerance=0.6):
    """QTE 영역에서 화살표를 읽어 읽는 순서대로 [Match(label=방향)] 반환."""
    cands = []
    for d, tlist in arrow_templates.items():
        for t in tlist:
            cands.extend(find_all(image, t, threshold, use_color, label=d))
    return reading_order(nms(cands), row_tolerance)


def arrow_signature(arrows, row_tolerance=0.6):
    """같은 QTE 라운드를 두 번 누르지 않기 위한 서명: 줄별 방향 순서."""
    if not arrows:
        return ()
    med_h = float(np.median([a.h for a in arrows]))
    rows, cur, last_cy = [], [], None
    for a in arrows:  # 이미 reading_order 정렬 상태
        if last_cy is not None and abs(a.cy - last_cy) > row_tolerance * med_h:
            rows.append(tuple(cur))
            cur = []
        cur.append(a.label)
        last_cy = a.cy
    rows.append(tuple(cur))
    return tuple(rows)


def arrows_text(arrows):
    return " ".join(ARROW_GLYPH.get(a.label, "?") for a in arrows)


# ---------------------------------------------------------------- 에너지
def state_similarity(image, templ):
    """같은 영역을 찍은 두 이미지의 유사도(0~1, 1=동일)."""
    if templ.shape[:2] != image.shape[:2]:
        templ = cv2.resize(templ, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_AREA)
    return 1.0 - float(cv2.absdiff(image, templ).mean()) / 255.0


def classify_state(image, states):
    """{라벨: 템플릿} 중 가장 비슷한 것 → (라벨, 점수, {라벨: 점수})."""
    scores = {label: state_similarity(image, t) for label, t in states.items()}
    if not scores:
        return None, 0.0, scores
    label = max(scores, key=scores.get)
    return label, scores[label], scores


def count_blobs(image, hsv_center, tolerance, min_area=6):
    mask = hsv_mask(image, hsv_center, tolerance)
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    return sum(1 for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= min_area)


ENERGY_NAME = re.compile(r"^energy_(\d+)$")


# ---------------------------------------------------------------- 적 선택 버튼
def detect_buttons_by_template(image, button, threshold, strip_ratio=0.18, use_color=False):
    """버튼의 왼쪽 끝 띠(이름 글자가 없는 부분)만 매칭해서 이름과 무관하게 버튼을 찾는다."""
    h, w = button.shape[:2]
    sw = max(8, min(w, int(round(w * strip_ratio))))
    strip = button[:, :sw]
    found = find_all(image, strip, threshold, use_color, label="enemy")
    out = []
    for m in found:
        full_w = min(w, image.shape[1] - m.x)
        # 이름 길이에 따라 버튼 폭이 달라도 안쪽을 누르도록 띠 바로 오른쪽을 중심으로
        click_w = min(full_w, sw * 3)
        out.append(Match(m.x, m.y, click_w, h, m.score, "enemy"))
    return out


def detect_buttons_by_color(image, hsv_center, tolerance, min_size=(30, 12)):
    """버튼 배경색 덩어리를 찾는다(글자 구멍은 닫기 연산으로 메움)."""
    mask = hsv_mask(image, hsv_center, tolerance)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w >= min_size[0] and h >= min_size[1]:
            fill = float(cv2.contourArea(c)) / float(w * h)
            if fill > 0.5:
                out.append(Match(x, y, w, h, fill, "enemy"))
    return out


def buttons_from_slots(image, slots):
    h, w = image.shape[:2]
    out = []
    for rx, ry in slots:
        x, y = int(rx * w), int(ry * h)
        out.append(Match(max(0, x - 2), max(0, y - 2), 4, 4, 1.0, "slot"))
    return out


def pick_target(targets, policy="middle", index=0, rng=random):
    if not targets:
        return None
    if policy == "first":
        return targets[0]
    if policy == "last":
        return targets[-1]
    if policy == "index":
        return targets[max(0, min(int(index), len(targets) - 1))]
    if policy == "random":
        return rng.choice(targets)
    return targets[(len(targets) - 1) // 2]  # middle: Party Table은 대상+양옆을 치므로 가운데가 이득
