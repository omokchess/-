"""메인 창: 영역 박스, 템플릿 캡처, 설정, 인식 테스트, 시작/정지."""

import copy
import datetime
import os
import queue
import sys
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk

import cv2
from tkinter.scrolledtext import ScrolledText

from . import vision, winapi
from .bot import Bot
from .config import (LOG_PATH, REGION_COLORS, REGION_LABELS, REGION_NAMES, TEMPLATE_DIR, TEMPLATE_SLOTS,
                     load_config, parse_hunt_pattern, region_tuple, save_config)
from .diagnose import diagnose
from .inputs import make_input, validate_key
from .overlay import RegionBox, SnipWindow, photo_from_bgr, stack_previews
from .screen import Screen
from .templates import TemplateStore

def _int(value):
    return int(float(value))


KEY_PRESETS = {
    "WASD": {"up": "w", "down": "s", "left": "a", "right": "d"},
    "방향키": {"up": "up", "down": "down", "left": "left", "right": "right"},
}


class HotkeyPoller(threading.Thread):
    """F6 시작 / F7 일시정지 / F8 정지 / F9 화면 얼리기 — 게임 창이 앞에 있어도 동작."""

    def __init__(self, out_queue):
        super().__init__(daemon=True, name="hotkeys")
        self.q = out_queue
        self.down = {k: False for k in winapi.VK}

    def run(self):
        while True:
            for name, vk in winapi.VK.items():
                pressed = winapi.key_down_now(vk)
                if pressed and not self.down[name]:
                    self.q.put(("hotkey", name))
                self.down[name] = pressed
            time.sleep(0.04)


class App:
    def __init__(self, root):
        self.root = root
        root.title("Arcane Lineage — 주먹 QTE 사냥 매크로")
        root.geometry("760x720")
        root.minsize(680, 560)
        self.cfg = load_config()
        self.store = TemplateStore(TEMPLATE_DIR)
        self.screen = Screen()
        self.q = queue.Queue()
        self.boxes = {}
        self.bot = None
        self.live_job = None
        self.preview_win = None
        self.vars = []  # (var, path, cast)
        self._build()
        self.refresh_regions()
        self.refresh_templates()
        if winapi.IS_WINDOWS:
            HotkeyPoller(self.q).start()
        else:
            self.log("※ 윈도우가 아니어서 전역 단축키와 실제 입력은 꺼져 있음(드라이런)")
        root.protocol("WM_DELETE_WINDOW", self.on_close)
        root.after(50, self._pump)
        self.log("준비 완료. ① 영역 → ② 템플릿 → ④ 인식 테스트로 점검 → 시작(F6)")

    # ================================================================ 공통
    def log(self, msg):
        """어느 스레드에서 불러도 안전."""
        self.q.put(("log", msg))

    def set_status(self, text):
        self.q.put(("status", text))

    def _pump(self):
        try:
            while True:
                kind, value = self.q.get_nowait()
                if kind == "log":
                    self._append_log(value)
                elif kind == "status":
                    self.status_var.set(value)
                elif kind == "hotkey":
                    self.on_hotkey(value)
        except queue.Empty:
            pass
        running = self.bot is not None and self.bot.thread is not None and self.bot.thread.is_alive()
        self.start_btn.configure(state="disabled" if running else "normal")
        self.pause_btn.configure(state="normal" if running else "disabled")
        self.stop_btn.configure(state="normal" if running else "disabled")
        self.root.after(50, self._pump)

    def _append_log(self, msg):
        stamp = datetime.datetime.now().strftime("%H:%M:%S")
        line = f"{stamp} {msg}\n"
        self.log_box.configure(state="normal")
        self.log_box.insert("end", line)
        if int(self.log_box.index("end-1c").split(".")[0]) > 2000:
            self.log_box.delete("1.0", "500.0")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")
        try:
            with open(LOG_PATH, "a", encoding="utf-8") as f:
                f.write(line)
        except OSError:
            pass

    def on_hotkey(self, name):
        if name == "F6":
            self.start()
        elif name == "F7" and self.bot:
            self.bot.toggle_pause()
        elif name == "F8":
            self.stop()
        elif name == "F9" and not self.is_running():
            self.freeze_multi()

    def _windows_over_regions(self):
        """감시 영역을 가리고 있는 이 프로그램의 창들 (캡처에 섞이면 안 됨)."""
        rects = [r for r in (region_tuple(v) for v in self.cfg["regions"].values()) if r]
        out = []
        for w in (self.preview_win, self.root):
            if w is None or not w.winfo_exists() or w.state() != "normal":
                continue
            wx, wy, ww, wh = w.winfo_rootx(), w.winfo_rooty(), w.winfo_width(), w.winfo_height()
            if any(wx < x + rw and x < wx + ww and wy < y + rh and y < wy + wh for x, y, rw, rh in rects):
                out.append(w)
        return out

    def _capture_clear(self, fn):
        """박스와 영역을 가리는 창을 잠깐 치우고 fn()을 실행한 뒤 되돌린다."""
        boxes = list(self.boxes)
        self.close_all_boxes()
        windows = self._windows_over_regions()
        for w in windows:
            w.withdraw()
        if boxes or windows:
            self.root.update()
            time.sleep(0.12)
        try:
            return fn()
        finally:
            for w in windows:
                w.deiconify()
            for b in boxes:
                self.toggle_box(b)

    def is_running(self):
        return self.bot is not None and self.bot.thread is not None and self.bot.thread.is_alive()

    # ================================================================ 화면 구성
    def _build(self):
        style = ttk.Style()
        if "vista" in style.theme_names():
            style.theme_use("vista")
        top = ttk.Frame(self.root, padding=(8, 6))
        top.pack(fill="x")
        self.start_btn = ttk.Button(top, text="▶ 시작 (F6)", command=self.start)
        self.pause_btn = ttk.Button(top, text="⏸ 일시정지 (F7)", command=lambda: self.bot and self.bot.toggle_pause())
        self.stop_btn = ttk.Button(top, text="■ 정지 (F8)", command=self.stop)
        for b in (self.start_btn, self.pause_btn, self.stop_btn):
            b.pack(side="left", padx=3)
        self.status_var = tk.StringVar(value="정지")
        ttk.Label(top, text="상태:").pack(side="left", padx=(16, 2))
        ttk.Label(top, textvariable=self.status_var, foreground="#c03000",
                  font=("Malgun Gothic", 10, "bold")).pack(side="left")

        pw = ttk.PanedWindow(self.root, orient="vertical")
        pw.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        nb = self.nb = ttk.Notebook(pw)
        pw.add(nb, weight=3)
        logf = ttk.Frame(pw)
        pw.add(logf, weight=1)
        self.log_box = ScrolledText(logf, height=8, state="disabled", font=("Consolas", 9))
        self.log_box.pack(fill="both", expand=True)

        nb.add(self._build_regions(nb), text="① 영역")
        nb.add(self._build_templates(nb), text="② 템플릿")
        nb.add(self._build_settings(nb), text="③ 전투 설정")
        nb.add(self._build_test(nb), text="④ 인식 테스트")

    # ---------------------------------------------------------------- ① 영역
    def _build_regions(self, parent):
        f = ttk.Frame(parent, padding=10)
        ttk.Label(f, text="각 창이 뜨는 자리를 박스로 덮으세요. 박스는 게임 창 크기에 맞춰 자유롭게 늘이고 줄일 수 있습니다.",
                  wraplength=700).grid(row=0, column=0, columnspan=5, sticky="w", pady=(0, 8))
        self.region_vars = {}
        for i, name in enumerate(REGION_NAMES, start=1):
            sw = tk.Canvas(f, width=14, height=14, highlightthickness=0)
            sw.create_rectangle(0, 0, 14, 14, fill=REGION_COLORS[name], outline="")
            sw.grid(row=i, column=0, padx=(0, 6))
            ttk.Label(f, text=REGION_LABELS[name], width=18).grid(row=i, column=1, sticky="w")
            var = tk.StringVar()
            self.region_vars[name] = var
            ttk.Label(f, textvariable=var, width=26, font=("Consolas", 9)).grid(row=i, column=2, sticky="w")
            ttk.Button(f, text="박스 열기/닫기", command=lambda n=name: self.toggle_box(n)).grid(row=i, column=3, padx=3, pady=2)
            ttk.Button(f, text="화면에서 드래그", command=lambda n=name: self.snip_region(n)).grid(row=i, column=4, padx=3)
        bar = ttk.Frame(f)
        bar.grid(row=len(REGION_NAMES) + 1, column=0, columnspan=5, sticky="w", pady=10)
        ttk.Button(bar, text="모든 박스 열기", command=self.open_all_boxes).pack(side="left", padx=3)
        ttk.Button(bar, text="모든 박스 닫기", command=self.close_all_boxes).pack(side="left", padx=3)
        tips = ("• 박스 위쪽 색 띠를 끌면 이동, 테두리·모서리를 끌면 크기 조절\n"
                "• 박스를 클릭한 뒤 방향키 = 1px 이동, Shift+방향키 = 1px 크기 조절 (Ctrl 같이 = 10px)\n"
                "• 행동 선택창: Attack 버튼이 나오는 오른쪽 행동칸 전체\n"
                "• 스킬 선택창: Attack을 누르면 나오는 스킬 목록 전체 (Party Table이 들어가야 함)\n"
                "• 적 선택창: 스킬을 고르면 나오는 적 이름 버튼 목록 전체 (적이 가장 많을 때 기준으로 넉넉히)\n"
                "• QTE: 화면 아래 화살표 줄 전체 (화살표가 가장 많이 나올 때 기준으로 넉넉히)\n"
                "• 에너지: 왼쪽 아래 에너지 표시 부분만 딱 맞게\n"
                "• 매크로가 돌 때는 박스가 자동으로 닫힙니다 (박스 색이 캡처에 섞이지 않도록)")
        ttk.Label(f, text=tips, justify="left", foreground="#404040").grid(
            row=len(REGION_NAMES) + 2, column=0, columnspan=5, sticky="w")
        return f

    def refresh_regions(self):
        for name, var in self.region_vars.items():
            r = region_tuple(self.cfg["regions"].get(name))
            var.set(f"x={r[0]} y={r[1]} {r[2]}x{r[3]}" if r else "(미지정)")

    def set_region(self, name, rect):
        x, y, w, h = (int(v) for v in rect)
        self.cfg["regions"][name] = {"x": x, "y": y, "w": w, "h": h}
        save_config(self.cfg)
        self.refresh_regions()

    def toggle_box(self, name):
        if name in self.boxes:
            self.boxes.pop(name).destroy()
            return
        r = region_tuple(self.cfg["regions"].get(name))
        if r is None:
            sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
            r = (sw // 2 - 120, sh // 2 - 60, 240, 120)
            self.set_region(name, r)
        self.boxes[name] = RegionBox(self.root, name, REGION_LABELS[name], REGION_COLORS[name], r,
                                     on_change=self.set_region)

    def open_all_boxes(self):
        for name in REGION_NAMES:
            if name not in self.boxes and (name != "popup" or self.cfg["regions"].get("popup")):
                self.toggle_box(name)

    def close_all_boxes(self):
        for name in list(self.boxes):
            self.boxes.pop(name).destroy()

    # ---------------------------------------------------------------- 화면 얼리기
    def _freeze(self, after):
        """메인 창과 박스를 숨기고 전체 화면을 찍은 뒤 after(이미지)를 부른다."""
        hidden = list(self.boxes)
        self.close_all_boxes()
        self.root.withdraw()

        def shoot():
            sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
            img = self.screen.grab_rect(0, 0, sw, sh)

            def restore():
                self.root.deiconify()
                for n in hidden:
                    self.toggle_box(n)

            win = after(img)
            if win is None:
                restore()
            else:
                win.bind("<Destroy>", lambda e: e.widget is win and restore())

        self.root.after(300, shoot)

    def snip_region(self, name):
        def after(img):
            return SnipWindow(self.root, img, hint=f"[{REGION_LABELS[name]}] 영역을 드래그하세요",
                              on_pick=lambda _n, rect, _img: self.set_region(name, rect))
        self._freeze(after)

    def snip_template(self, name):
        def after(img):
            return SnipWindow(self.root, img, hint=f"[{name}] 템플릿으로 쓸 부분을 딱 맞게 드래그하세요",
                              on_pick=lambda _n, _rect, crop: self.save_template(name, crop))
        self._freeze(after)

    def freeze_multi(self):
        choices = [(n, d) for n, d, _, _ in TEMPLATE_SLOTS]

        def after(img):
            return SnipWindow(self.root, img, hint="잘라낼 때마다 어떤 템플릿인지 고르세요 (여러 개 가능)",
                              choices=choices, on_pick=lambda n, _rect, crop: self.save_template(n, crop))
        self._freeze(after)

    # ---------------------------------------------------------------- ② 템플릿
    def _build_templates(self, parent):
        f = ttk.Frame(parent, padding=10)
        ttk.Label(f, text="버튼·화살표를 화면에서 잘라 templates 폴더에 저장합니다. 전투 중 F9를 누르면 그 순간 화면을 "
                          "얼려서 QTE 화살표처럼 금방 사라지는 것도 여유 있게 자를 수 있습니다.",
                  wraplength=700).pack(anchor="w", pady=(0, 6))
        cols = ("name", "desc", "region", "state")
        tv = ttk.Treeview(f, columns=cols, show="headings", height=11, selectmode="browse")
        for c, t, w in zip(cols, ("이름", "설명", "영역", "상태"), (130, 330, 70, 120)):
            tv.heading(c, text=t)
            tv.column(c, width=w, anchor="w")
        tv.pack(fill="both", expand=True)
        tv.bind("<Double-1>", lambda e: self.show_selected_template())
        self.tpl_tree = tv
        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=6)
        ttk.Button(bar, text="선택 항목 캡처", command=self.capture_selected).pack(side="left", padx=2)
        ttk.Button(bar, text="화면 얼리고 여러 개 자르기 (F9)", command=self.freeze_multi).pack(side="left", padx=2)
        ttk.Button(bar, text="3초 뒤 얼리기", command=lambda: self.root.after(3000, self.freeze_multi)).pack(side="left", padx=2)
        ttk.Button(bar, text="보기", command=self.show_selected_template).pack(side="left", padx=2)
        ttk.Button(bar, text="삭제", command=self.delete_selected_template).pack(side="left", padx=2)
        ttk.Button(bar, text="폴더 열기", command=self.open_template_folder).pack(side="left", padx=2)

        ef = ttk.LabelFrame(f, text="에너지 상태 저장 (template 모드)", padding=8)
        ef.pack(fill="x", pady=(4, 0))
        ttk.Label(ef, text="지금 에너지 수:").pack(side="left")
        self.energy_n = tk.IntVar(value=0)
        ttk.Spinbox(ef, from_=0, to=12, width=4, textvariable=self.energy_n).pack(side="left", padx=4)
        ttk.Button(ef, text="에너지 영역을 이 값으로 저장", command=self.save_energy_state).pack(side="left", padx=4)
        ttk.Label(f, text="전투 중 에너지가 0, 1, 2 … 일 때마다 한 번씩 저장해 두면 그 모양과 비교해 에너지 수를 판별합니다.",
                  foreground="#505050").pack(anchor="w", pady=(2, 0))
        return f

    def refresh_templates(self):
        tv = self.tpl_tree
        tv.delete(*tv.get_children())
        rows = list(TEMPLATE_SLOTS)
        rows += [(n, f"에너지 {n.split('_')[1]}일 때 모습", "energy", False)
                 for n in self.store.names() if vision.ENERGY_NAME.match(n)]
        for name, desc, region, required in rows:
            img = self.store.get(name)
            if img is not None:
                state = f"✔ {img.shape[1]}x{img.shape[0]}"
            else:
                state = "✖ 필요" if required else "-"
            tv.insert("", "end", iid=name, values=(name, desc, region, state))

    def selected_template(self):
        sel = self.tpl_tree.selection()
        return sel[0] if sel else None

    def capture_selected(self):
        name = self.selected_template()
        if not name:
            messagebox.showinfo("템플릿", "목록에서 캡처할 항목을 먼저 고르세요.")
            return
        if vision.ENERGY_NAME.match(name):
            self.energy_n.set(int(name.split("_")[1]))
            self.save_energy_state()
            return
        self.snip_template(name)

    def save_template(self, name, img):
        problem = vision.template_problem(img)
        if problem:
            messagebox.showwarning("템플릿 저장 안 함", f"{name}: {problem}")
            return False
        self.store.save(name, img)
        self.log(f"템플릿 저장: {name} ({img.shape[1]}x{img.shape[0]})")
        self.refresh_templates()
        return True

    def save_energy_state(self):
        if not region_tuple(self.cfg["regions"].get("energy")):
            messagebox.showinfo("에너지", "먼저 ① 영역 탭에서 에너지 영역을 지정하세요.")
            return
        n = int(self.energy_n.get())
        img = self._capture_clear(lambda: self.screen.grab(self.cfg["regions"]["energy"]))
        self.store.save(f"energy_{n}", img)
        self.log(f"에너지 상태 저장: energy_{n}")
        self.refresh_templates()

    def show_selected_template(self):
        name = self.selected_template()
        img = self.store.get(name) if name else None
        if img is None:
            return
        win = tk.Toplevel(self.root)
        win.title(name)
        scale = max(1, min(6, 240 // max(img.shape[:2])))
        big = img if scale == 1 else cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
        photo = photo_from_bgr(big, win)
        lbl = ttk.Label(win, image=photo)
        lbl.image = photo
        lbl.pack(padx=10, pady=10)
        ttk.Label(win, text=f"{img.shape[1]}x{img.shape[0]} (x{scale} 확대)").pack(pady=(0, 8))

    def delete_selected_template(self):
        name = self.selected_template()
        if name and self.store.has(name) and messagebox.askyesno("삭제", f"{name} 템플릿을 지울까요?"):
            self.store.delete(name)
            self.refresh_templates()

    def open_template_folder(self):
        if hasattr(os, "startfile"):
            os.startfile(TEMPLATE_DIR)
        else:
            self.log(f"템플릿 폴더: {TEMPLATE_DIR}")

    # ---------------------------------------------------------------- ③ 설정
    def _bind(self, var, path, cast):
        self.vars.append((var, path, cast))
        node = self.cfg
        for p in path[:-1]:
            node = node[p]
        var.set(node[path[-1]])
        return var

    def _num(self, parent, label, path, cast=float, frm=0.0, to=10.0, inc=0.01, width=6):
        cast = _int if cast is int else cast
        box = ttk.Frame(parent)
        ttk.Label(box, text=label).pack(side="left")
        var = self._bind(tk.StringVar(), path, cast)
        ttk.Spinbox(box, from_=frm, to=to, increment=inc, width=width, textvariable=var).pack(side="left", padx=3)
        return box

    def _check(self, parent, label, path):
        return ttk.Checkbutton(parent, text=label, variable=self._bind(tk.BooleanVar(), path, bool))

    def _combo(self, parent, label, path, values, width=10):
        box = ttk.Frame(parent)
        ttk.Label(box, text=label).pack(side="left")
        var = self._bind(tk.StringVar(), path, str)
        ttk.Combobox(box, values=values, textvariable=var, width=width, state="readonly").pack(side="left", padx=3)
        return box

    def _build_settings(self, parent):
        outer = ttk.Frame(parent)
        canvas = tk.Canvas(outer, highlightthickness=0)
        sb = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
        f = ttk.Frame(canvas, padding=10)
        f.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=f, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        wheel = lambda e: canvas.yview_scroll(int(-e.delta / 120), "units")  # noqa: E731
        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", wheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

        rot = ttk.LabelFrame(f, text="로테이션 — 위에서부터 조건(에너지·쿨타임·버튼 보임)이 맞는 첫 행동 사용", padding=8)
        rot.pack(fill="x", pady=4)
        for i, rule in enumerate(self.cfg["rotation"]):
            row = ttk.Frame(rot)
            row.pack(fill="x", pady=1)
            self._check(row, f"{rule['name']} ({'스킬' if rule['type'] == 'skill' else '행동'})",
                        ("rotation", i, "enabled")).pack(side="left")
            self._num(row, "   에너지 ≥", ("rotation", i, "cost"), int, 0, 9, 1, 3).pack(side="right")
            self._num(row, "쿨타임(턴)", ("rotation", i, "cooldown"), int, 0, 20, 1, 3).pack(side="right")
        ttk.Label(rot, text="Strike는 에너지 0·쿨타임 없음이라 끝에 켜 두면 Party Table을 못 쓸 때 대신 칩니다.",
                  foreground="#505050").pack(anchor="w")

        q = ttk.LabelFrame(f, text="QTE", padding=8)
        q.pack(fill="x", pady=4)
        r1 = ttk.Frame(q)
        r1.pack(fill="x")
        preset = "방향키" if self.cfg["qte"]["keys"].get("up") == "up" else "WASD"
        self.key_preset = tk.StringVar(value=preset)
        ttk.Label(r1, text="입력 키").pack(side="left")
        ttk.Combobox(r1, values=list(KEY_PRESETS), textvariable=self.key_preset, width=8,
                     state="readonly").pack(side="left", padx=3)
        self._num(r1, "  키 간격(초)", ("qte", "key_delay"), float, 0, 1, 0.01).pack(side="left")
        self._num(r1, "  누름 시간(초)", ("qte", "key_hold"), float, 0, 1, 0.01).pack(side="left")
        r2 = ttk.Frame(q)
        r2.pack(fill="x", pady=(4, 0))
        self._num(r2, "안정 확인 횟수", ("qte", "stable_reads"), int, 1, 5, 1, 3).pack(side="left")
        self._check(r2, "색까지 비교(눌린 화살표 색이 바뀌는 경우)", ("qte", "use_color")).pack(side="left", padx=8)

        en = ttk.LabelFrame(f, text="에너지 / 적 선택", padding=8)
        en.pack(fill="x", pady=4)
        r1 = ttk.Frame(en)
        r1.pack(fill="x")
        self._combo(r1, "에너지 판별", ("energy", "mode"), ["template", "pips", "off"]).pack(side="left")
        ttk.Label(r1, text="  template=상태 이미지 비교, pips=칸 개수 세기", foreground="#505050").pack(side="left")
        r2 = ttk.Frame(en)
        r2.pack(fill="x", pady=(4, 0))
        self._combo(r2, "적 버튼 찾기", ("enemy", "mode"), ["auto", "template", "color", "slots"]).pack(side="left")
        self._combo(r2, "  고를 적", ("enemy", "pick"), ["middle", "first", "last", "index", "random"]).pack(side="left")
        self._num(r2, "  index", ("enemy", "index"), int, 0, 9, 1, 3).pack(side="left")
        r3 = ttk.Frame(en)
        r3.pack(fill="x", pady=(4, 0))
        ttk.Label(r3, text="slots 좌표(적 선택창 기준 비율 x,y; …)").pack(side="left")
        self.slots_var = tk.StringVar(value="; ".join(f"{a},{b}" for a, b in self.cfg["enemy"].get("slots", [])))
        ttk.Entry(r3, textvariable=self.slots_var, width=30).pack(side="left", padx=3)
        ttk.Label(en, text="middle = 가운데 적. Party Table은 대상과 양옆을 치므로 가운데를 고르면 가장 많이 맞습니다.",
                  foreground="#505050").pack(anchor="w")

        th = ttk.LabelFrame(f, text="인식 임계값 (④ 테스트 점수를 보고 조절, 높을수록 엄격)", padding=8)
        th.pack(fill="x", pady=4)
        r1 = ttk.Frame(th)
        r1.pack(fill="x")
        for key, label in (("attack", "Attack"), ("skill", "스킬"), ("arrow", "화살표"), ("enemy", "적"), ("energy", "에너지")):
            self._num(r1, f"{label}", ("match", key), float, 0.3, 0.999, 0.01, 5).pack(side="left", padx=(0, 8))
        r2 = ttk.Frame(th)
        r2.pack(fill="x", pady=(4, 0))
        self._num(r2, "비활성 밝기비", ("match", "disabled_brightness"), float, 0, 1, 0.01, 5).pack(side="left")
        ttk.Label(r2, text="  크기 배율").pack(side="left")
        self.scales_var = tk.StringVar(value=", ".join(str(s) for s in self.cfg["match"]["scales"]))
        ttk.Entry(r2, textvariable=self.scales_var, width=14).pack(side="left", padx=3)
        ttk.Label(r2, text="(게임 창 크기를 바꿨다면 예: 0.9, 1.0, 1.1)", foreground="#505050").pack(side="left")

        hu = ttk.LabelFrame(f, text="사냥 이동 / 기타", padding=8)
        hu.pack(fill="x", pady=4)
        r1 = ttk.Frame(hu)
        r1.pack(fill="x")
        self._check(r1, "전투가 없을 때 걸어 다니기", ("hunt", "enabled")).pack(side="left")
        ttk.Label(r1, text="  패턴").pack(side="left")
        pattern = self._bind(tk.StringVar(), ("hunt", "pattern"), str)
        ttk.Entry(r1, textvariable=pattern, width=26).pack(side="left", padx=3)
        ttk.Label(r1, text="예: w:1.5, s:1.5  /  a:1, d:1, wait:0.5", foreground="#505050").pack(side="left")
        r2 = ttk.Frame(hu)
        r2.pack(fill="x", pady=(4, 0))
        self._check(r2, "드라이런(누르지 않고 기록만)", ("input", "dry_run")).pack(side="left")
        self._check(r2, "시작 시 Roblox 창 앞으로", ("input", "focus_roblox")).pack(side="left", padx=8)
        self._check(r2, "시작 시 이 창 최소화", ("input", "minimize_on_start")).pack(side="left", padx=8)
        r3 = ttk.Frame(hu)
        r3.pack(fill="x", pady=(4, 0))
        self._check(r3, "턴 수로 쿨타임 추정", ("timing", "use_turn_counter")).pack(side="left")
        self._num(r3, "   전투 종료 판정(초)", ("timing", "new_battle_gap"), float, 3, 120, 1, 5).pack(side="left")
        self._num(r3, "   이동 재개 지연(초)", ("timing", "hunt_resume_delay"), float, 0, 60, 0.5, 5).pack(side="left")

        ttk.Button(f, text="설정 저장", command=self.save_settings).pack(anchor="e", pady=8)
        return outer

    def apply_settings(self):
        """화면의 값을 cfg에 반영. 문제가 있으면 메시지를 보여 주고 False."""
        new = copy.deepcopy(self.cfg)
        try:
            for var, path, cast in self.vars:
                node = new
                for p in path[:-1]:
                    node = node[p]
                value = var.get()
                node[path[-1]] = cast(value) if cast is not bool else bool(value)
            new["qte"]["keys"] = dict(KEY_PRESETS[self.key_preset.get()])
            scales = [float(s) for s in self.scales_var.get().replace(";", ",").split(",") if s.strip()]
            new["match"]["scales"] = scales or [1.0]
            slots = []
            for part in self.slots_var.get().split(";"):
                if part.strip():
                    a, b = part.split(",")
                    slots.append([float(a), float(b)])
            new["enemy"]["slots"] = slots
        except (ValueError, TypeError) as e:
            messagebox.showerror("설정 오류", f"숫자 형식을 확인하세요: {e}")
            return False
        bad = [k for k, _ in parse_hunt_pattern(new["hunt"]["pattern"]) if k != "wait" and not validate_key(k)]
        if bad:
            messagebox.showerror("설정 오류", f"사냥 패턴에 모르는 키: {bad}")
            return False
        self.cfg = new
        return True

    def save_settings(self):
        if self.apply_settings():
            save_config(self.cfg)
            self.log("설정 저장됨")

    # ---------------------------------------------------------------- ④ 테스트
    def _build_test(self, parent):
        f = ttk.Frame(parent, padding=10)
        ttk.Label(f, text="게임에서 해당 창이 떠 있을 때 눌러 보세요. 영역별로 무엇이 몇 점으로 인식되는지 보여 줍니다.\n"
                          "점수가 임계값보다 조금만 높으면 불안정하니, 템플릿을 더 딱 맞게 다시 자르거나 임계값을 조절하세요.",
                  wraplength=700, justify="left").pack(anchor="w")
        bar = ttk.Frame(f)
        bar.pack(fill="x", pady=8)
        ttk.Button(bar, text="지금 화면 인식 테스트", command=self.run_diagnose).pack(side="left", padx=2)
        self.live_btn = ttk.Button(bar, text="실시간 인식 보기 켜기", command=self.toggle_live)
        self.live_btn.pack(side="left", padx=2)
        self.diag_text = tk.Text(f, height=14, font=("Consolas", 9), state="disabled")
        self.diag_text.pack(fill="both", expand=True)
        return f

    def _diagnose_once(self):
        if not self.apply_settings():
            return None
        lines, previews = self._capture_clear(
            lambda: diagnose(self.cfg, self.store, lambda n: self.screen.grab(self.cfg["regions"].get(n))))
        self.diag_text.configure(state="normal")
        self.diag_text.delete("1.0", "end")
        self.diag_text.insert("end", "\n".join(lines))
        self.diag_text.configure(state="disabled")
        self._show_preview(stack_previews(previews))
        return lines

    def run_diagnose(self):
        lines = self._diagnose_once()
        if lines:
            self.log("인식 테스트:\n  " + "\n  ".join(lines))

    def toggle_live(self):
        if self.live_job:
            self.root.after_cancel(self.live_job)
            self.live_job = None
            self.live_btn.configure(text="실시간 인식 보기 켜기")
            return
        self.live_btn.configure(text="실시간 인식 보기 끄기")

        def tick():
            self._diagnose_once()
            self.live_job = self.root.after(400, tick)
        tick()

    def _show_preview(self, img):
        if self.preview_win is None or not self.preview_win.winfo_exists():
            self.preview_win = tk.Toplevel(self.root)
            self.preview_win.title("인식 미리보기")
            # 메인 창 옆에 띄움 (게임 영역을 가리면 캡처 때 잠깐 숨겨짐)
            rx, rw = self.root.winfo_rootx(), self.root.winfo_width()
            sw = self.root.winfo_screenwidth()
            px = rx + rw + 8 if rx + rw + 540 < sw else max(0, rx - 540)
            self.preview_win.geometry(f"+{px}+{self.root.winfo_rooty()}")
            self.preview_win.attributes("-topmost", True)
            self.preview_label = ttk.Label(self.preview_win)
            self.preview_label.pack()
        photo = photo_from_bgr(img, self.preview_win)
        self.preview_label.configure(image=photo)
        self.preview_label.image = photo

    # ================================================================ 실행
    def start(self):
        if self.is_running():
            return
        if not self.apply_settings():
            return
        save_config(self.cfg)
        if self.live_job:
            self.toggle_live()
        self.close_all_boxes()
        if self.preview_win is not None and self.preview_win.winfo_exists():
            self.preview_win.destroy()
        inp = make_input(self.cfg, self.log)
        self.bot = Bot(copy.deepcopy(self.cfg), self.store, Screen(), inp, log=self.log, on_status=self.set_status)
        if self.cfg["input"].get("minimize_on_start") and winapi.IS_WINDOWS:
            self.root.iconify()
        elif self._windows_over_regions():
            self.log("⚠ 이 창이 감시 영역을 가리고 있습니다. 창을 옮기거나 '시작 시 이 창 최소화'를 켜세요.")
        self.bot.start()

    def stop(self):
        if self.bot:
            self.bot.stop()

    def on_close(self):
        self.stop()
        if self.bot and self.bot.thread:
            self.bot.thread.join(2)
        try:
            self.apply_settings() and save_config(self.cfg)
        except Exception:
            pass
        self.root.destroy()


def main():
    winapi.set_dpi_aware()
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    sys.exit(main())
