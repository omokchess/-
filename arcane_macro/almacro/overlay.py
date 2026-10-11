"""화면 위에 띄우는 도구 창: 크기 조절 영역 박스, 화면 얼리고 자르기(스닙)."""

import base64
import sys
import tkinter as tk

import cv2
import numpy as np

STRIP = 20  # 박스 위쪽 이름 띠 높이 (영역 밖)
EDGE = 7  # 테두리 잡는 폭
KEY_COLOR = "#ff00fe"  # 윈도우에서 투명 처리할 색
IS_WINDOWS = sys.platform == "win32"


def photo_from_bgr(img, master=None):
    """BGR numpy → tk.PhotoImage (Pillow 없이 PNG로 넘긴다)."""
    ok, buf = cv2.imencode(".png", img, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return tk.PhotoImage(master=master, data=base64.b64encode(buf.tobytes()).decode("ascii"))


class RegionBox(tk.Toplevel):
    """드래그로 이동, 테두리/모서리로 크기 조절하는 반투명 박스.

    - 위쪽 띠를 끌면 이동, 테두리를 끌면 크기 조절
    - 방향키: 1px 이동 / Shift+방향키: 1px 크기 조절 (Ctrl을 같이 누르면 10px)
    """

    def __init__(self, master, name, label, color, rect, on_change=None):
        super().__init__(master)
        self.name = name
        self.label = label
        self.color = color
        self.on_change = on_change or (lambda name, rect: None)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        if IS_WINDOWS:
            self.attributes("-transparentcolor", KEY_COLOR)
            bg = KEY_COLOR
        else:
            self.attributes("-alpha", 0.45)
            bg = "#202020"
        self.canvas = tk.Canvas(self, bg=bg, highlightthickness=0, cursor="fleur")
        self.canvas.pack(fill="both", expand=True)
        x, y, w, h = rect
        self.set_rect(x, y, w, h)
        self.canvas.bind("<Configure>", lambda e: self.redraw())
        self.canvas.bind("<Motion>", self._hover)
        self.canvas.bind("<ButtonPress-1>", self._press)
        self.canvas.bind("<B1-Motion>", self._drag)
        self.canvas.bind("<ButtonRelease-1>", lambda e: self._changed())
        for key, d in (("Left", (-1, 0)), ("Right", (1, 0)), ("Up", (0, -1)), ("Down", (0, 1))):
            self.bind(f"<{key}>", lambda e, d=d: self.nudge(*d, resize=False, step=1))
            self.bind(f"<Shift-{key}>", lambda e, d=d: self.nudge(*d, resize=True, step=1))
            self.bind(f"<Control-{key}>", lambda e, d=d: self.nudge(*d, resize=False, step=10))
            self.bind(f"<Control-Shift-{key}>", lambda e, d=d: self.nudge(*d, resize=True, step=10))
        self._mode = None
        self._start = None
        self.redraw()

    # ---- 좌표
    def rect(self):
        self.update_idletasks()
        return (self.winfo_rootx(), self.winfo_rooty() + STRIP,
                self.winfo_width(), self.winfo_height() - STRIP)

    def set_rect(self, x, y, w, h):
        w, h = max(10, int(w)), max(10, int(h))
        self.geometry(f"{w}x{h + STRIP}+{int(x)}+{int(y) - STRIP}")
        self._geom = (int(x), int(y), w, h)

    def redraw(self):
        c = self.canvas
        c.delete("all")
        w, h = self.winfo_width(), self.winfo_height()
        if w < 2:
            _, _, w, gh = self._geom
            h = gh + STRIP
        c.create_rectangle(0, 0, w, STRIP, fill=self.color, outline=self.color)
        x, y, rw, rh = self._geom
        c.create_text(4, STRIP // 2, anchor="w", fill="black", font=("Malgun Gothic", 9, "bold"),
                      text=f"{self.label}  {rw}x{rh}  ({x},{y})")
        c.create_rectangle(1, STRIP + 1, w - 2, h - 2, outline=self.color, width=3)
        c.create_rectangle(w - 12, h - 12, w - 1, h - 1, fill=self.color, outline=self.color)

    # ---- 마우스
    def _edges(self, ex, ey):
        w, h = self.winfo_width(), self.winfo_height()
        if ey < STRIP:
            return "move"
        left, right = ex < EDGE, ex > w - EDGE - 6
        top, bottom = ey < STRIP + EDGE, ey > h - EDGE - 6
        mode = ("t" if top else "") + ("b" if bottom else "") + ("l" if left else "") + ("r" if right else "")
        return mode or "move"

    _CURSORS = {"move": "fleur", "t": "sb_v_double_arrow", "b": "sb_v_double_arrow",
                "l": "sb_h_double_arrow", "r": "sb_h_double_arrow", "tl": "top_left_corner",
                "br": "bottom_right_corner", "tr": "top_right_corner", "bl": "bottom_left_corner"}

    def _hover(self, e):
        self.canvas.configure(cursor=self._CURSORS.get(self._edges(e.x, e.y), "fleur"))

    def _press(self, e):
        self.focus_force()
        self._mode = self._edges(e.x, e.y)
        self._start = (e.x_root, e.y_root, *self._geom)

    def _drag(self, e):
        if not self._start:
            return
        sx, sy, x, y, w, h = self._start
        dx, dy = e.x_root - sx, e.y_root - sy
        m = self._mode
        if m == "move":
            x, y = x + dx, y + dy
        else:
            if "l" in m:
                x, w = x + dx, w - dx
            if "r" in m:
                w = w + dx
            if "t" in m:
                y, h = y + dy, h - dy
            if "b" in m:
                h = h + dy
        if w >= 10 and h >= 10:
            self.set_rect(x, y, w, h)
            self.redraw()

    def nudge(self, dx, dy, resize, step):
        x, y, w, h = self._geom
        if resize:
            w, h = max(10, w + dx * step), max(10, h + dy * step)
        else:
            x, y = x + dx * step, y + dy * step
        self.set_rect(x, y, w, h)
        self.redraw()
        self._changed()

    def _changed(self):
        self.on_change(self.name, self._geom)


class SnipWindow(tk.Toplevel):
    """얼린 화면 위에서 드래그로 사각형을 고른다.

    choices가 있으면 고를 때마다 이름 메뉴를 띄워 여러 개를 연속으로 저장할 수 있다.
    선택 후 방향키로 1px 이동, Shift+방향키로 크기 조절, Enter로 확정, Esc로 닫기.
    """

    ZOOM = 8
    LOUPE = 15  # 확대경이 보여 줄 원본 픽셀 수(정사각)

    def __init__(self, master, image, origin=(0, 0), hint="", choices=None, on_pick=None):
        super().__init__(master)
        self.image = image
        self.origin = origin
        self.choices = choices
        self.on_pick = on_pick or (lambda *a: None)
        self.saved = []
        h, w = image.shape[:2]
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.geometry(f"{w}x{h}+{origin[0]}+{origin[1]}")
        self.canvas = tk.Canvas(self, width=w, height=h, highlightthickness=0, cursor="crosshair")
        self.canvas.pack()
        self.photo = photo_from_bgr(image, self)
        self.canvas.create_image(0, 0, anchor="nw", image=self.photo)
        msg = hint or "드래그로 영역 선택"
        msg += "   |   방향키 이동 · Shift+방향키 크기 · Enter 확정 · Esc 닫기"
        self.canvas.create_rectangle(0, 0, w, 26, fill="#101010", outline="")
        self.canvas.create_text(8, 13, anchor="w", fill="#ffe060", text=msg, font=("Malgun Gothic", 10, "bold"))
        self.sel = None
        self.sel_id = None
        self.loupe_photo = None
        self.canvas.bind("<ButtonPress-1>", self._press)
        self.canvas.bind("<B1-Motion>", self._drag)
        self.canvas.bind("<ButtonRelease-1>", self._release)
        self.canvas.bind("<Motion>", self._loupe)
        self.canvas.bind("<ButtonPress-3>", lambda e: self._confirm(e.x_root, e.y_root))
        self.bind("<Escape>", lambda e: self.destroy())
        self.bind("<Return>", lambda e: self._confirm())
        for key, d in (("Left", (-1, 0)), ("Right", (1, 0)), ("Up", (0, -1)), ("Down", (0, 1))):
            self.bind(f"<{key}>", lambda e, d=d: self._nudge(*d, False))
            self.bind(f"<Shift-{key}>", lambda e, d=d: self._nudge(*d, True))
        self.focus_force()
        self.grab_set()

    def _press(self, e):
        self._anchor = (e.x, e.y)
        self._set_sel(e.x, e.y, 1, 1)

    def _drag(self, e):
        ax, ay = self._anchor
        self._set_sel(min(ax, e.x), min(ay, e.y), abs(e.x - ax) + 1, abs(e.y - ay) + 1)
        self._loupe(e)

    def _release(self, e):
        if self.sel and self.sel[2] >= 4 and self.sel[3] >= 4:
            self._confirm(e.x_root, e.y_root)

    def _set_sel(self, x, y, w, h):
        H, W = self.image.shape[:2]
        x, y = max(0, min(W - 1, x)), max(0, min(H - 1, y))
        w, h = max(1, min(W - x, w)), max(1, min(H - y, h))
        self.sel = (x, y, w, h)
        if self.sel_id:
            self.canvas.delete(self.sel_id)
        self.sel_id = self.canvas.create_rectangle(x, y, x + w, y + h, outline="#00ff66", width=1, dash=(3, 2))
        self.canvas.delete("size")
        self.canvas.create_text(x, y + h + 4, anchor="nw", fill="#00ff66", tags="size",
                                text=f"{w}x{h}", font=("Consolas", 10, "bold"))

    def _nudge(self, dx, dy, resize):
        if not self.sel:
            return
        x, y, w, h = self.sel
        if resize:
            self._set_sel(x, y, w + dx, h + dy)
        else:
            self._set_sel(x + dx, y + dy, w, h)

    def _loupe(self, e):
        r = self.LOUPE // 2
        H, W = self.image.shape[:2]
        x0, y0 = max(0, min(W - self.LOUPE, e.x - r)), max(0, min(H - self.LOUPE, e.y - r))
        patch = self.image[y0:y0 + self.LOUPE, x0:x0 + self.LOUPE]
        big = cv2.resize(patch, None, fx=self.ZOOM, fy=self.ZOOM, interpolation=cv2.INTER_NEAREST)
        c = (e.x - x0) * self.ZOOM + self.ZOOM // 2, (e.y - y0) * self.ZOOM + self.ZOOM // 2
        cv2.drawMarker(big, c, (0, 255, 100), cv2.MARKER_CROSS, self.ZOOM * 3, 1)
        self.loupe_photo = photo_from_bgr(big, self)
        size = self.LOUPE * self.ZOOM
        lx = W - size - 12 if e.x < W - size - 40 else 12
        self.canvas.delete("loupe")
        self.canvas.create_rectangle(lx - 2, 34, lx + size + 2, 36 + size + 2, outline="#00ff66", tags="loupe")
        self.canvas.create_image(lx, 36, anchor="nw", image=self.loupe_photo, tags="loupe")

    def crop(self):
        x, y, w, h = self.sel
        return self.image[y:y + h, x:x + w].copy()

    def _confirm(self, mx=None, my=None):
        if not self.sel or self.sel[2] < 4 or self.sel[3] < 4:
            return
        x, y, w, h = self.sel
        abs_rect = (x + self.origin[0], y + self.origin[1], w, h)
        if not self.choices:
            self.grab_release()
            self.destroy()
            self.on_pick(None, abs_rect, self.image[y:y + h, x:x + w].copy())
            return
        menu = tk.Menu(self, tearoff=0)
        for name, label in self.choices:
            mark = "✔ " if name in self.saved else ""
            menu.add_command(label=f"{mark}{name} — {label}", command=lambda n=name: self._save_as(n, abs_rect))
        menu.add_separator()
        menu.add_command(label="취소", command=lambda: None)
        if mx is None:
            mx, my = self.winfo_rootx() + x + w, self.winfo_rooty() + y + h
        menu.tk_popup(int(mx), int(my))

    def _save_as(self, name, abs_rect):
        x, y, w, h = self.sel
        img = self.image[y:y + h, x:x + w].copy()
        if self.on_pick(name, abs_rect, img) is not False:
            self.saved.append(name)
            self.canvas.create_rectangle(x, y, x + w, y + h, outline="#ffd000", width=2)
            self.canvas.create_text(x, y - 2, anchor="sw", fill="#ffd000", text=name,
                                    font=("Consolas", 9, "bold"))


def annotate(img, matches, color=(0, 255, 0), labels=True):
    out = img.copy()
    for m in matches:
        cv2.rectangle(out, (m.x, m.y), (m.x + m.w - 1, m.y + m.h - 1), color, 2)
        if labels:
            cv2.putText(out, f"{m.label} {m.score:.2f}", (m.x, max(10, m.y - 3)), cv2.FONT_HERSHEY_SIMPLEX,
                        0.4, color, 1, cv2.LINE_AA)
    return out


def stack_previews(items, width=520):
    """[(제목, 이미지)] → 세로로 이어 붙인 미리보기 한 장."""
    rows = []
    for title, img in items:
        if img is None:
            img = np.zeros((40, width, 3), np.uint8)
        scale = min(1.0, width / img.shape[1], 300 / img.shape[0])
        if scale < 1.0:
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        canvas = np.full((img.shape[0] + 22, width, 3), 30, np.uint8)
        canvas[22:22 + img.shape[0], :img.shape[1]] = img
        cv2.putText(canvas, title, (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (230, 230, 230), 1, cv2.LINE_AA)
        rows.append(canvas)
    return np.vstack(rows) if rows else np.zeros((10, width, 3), np.uint8)
