"""윈도우 전용 기능: DPI 인식, SendInput 키/마우스, 전역 단축키, Roblox 창 포커스.

구조체 정의는 플랫폼과 무관하게 같은 크기가 되도록 고정폭 정수형을 쓴다.
"""

import ctypes
import sys
import time

IS_WINDOWS = sys.platform == "win32"

INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

ULONG_PTR = ctypes.c_size_t


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [("dx", ctypes.c_int32), ("dy", ctypes.c_int32), ("mouseData", ctypes.c_uint32),
                ("dwFlags", ctypes.c_uint32), ("time", ctypes.c_uint32), ("dwExtraInfo", ULONG_PTR)]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [("wVk", ctypes.c_uint16), ("wScan", ctypes.c_uint16), ("dwFlags", ctypes.c_uint32),
                ("time", ctypes.c_uint32), ("dwExtraInfo", ULONG_PTR)]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [("uMsg", ctypes.c_uint32), ("wParamL", ctypes.c_uint16), ("wParamH", ctypes.c_uint16)]


class _INPUTUNION(ctypes.Union):
    _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _fields_ = [("type", ctypes.c_uint32), ("u", _INPUTUNION)]


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_int32), ("y", ctypes.c_int32)]


# 키 이름 → (스캔코드, 확장키 여부). Roblox는 가상키보다 스캔코드 입력을 잘 받는다.
SCANCODES = {"esc": (0x01, False), "tab": (0x0F, False), "enter": (0x1C, False),
             "space": (0x39, False), "backspace": (0x0E, False), "lshift": (0x2A, False),
             "shift": (0x2A, False), "lctrl": (0x1D, False), "ctrl": (0x1D, False),
             "up": (0x48, True), "down": (0x50, True), "left": (0x4B, True), "right": (0x4D, True)}
for _i, _c in enumerate("1234567890"):
    SCANCODES[_c] = (0x02 + _i, False)
for _row, _start in (("qwertyuiop", 0x10), ("asdfghjkl", 0x1E), ("zxcvbnm", 0x2C)):
    for _i, _c in enumerate(_row):
        SCANCODES[_c] = (_start + _i, False)
for _i in range(10):
    SCANCODES[f"f{_i + 1}"] = (0x3B + _i, False)
SCANCODES["f11"] = (0x57, False)
SCANCODES["f12"] = (0x58, False)

VK = {"F6": 0x75, "F7": 0x76, "F8": 0x77, "F9": 0x78}

_user32 = ctypes.windll.user32 if IS_WINDOWS else None
if _user32 is not None:
    _user32.SendInput.argtypes = (ctypes.c_uint, ctypes.POINTER(INPUT), ctypes.c_int)
    _user32.SendInput.restype = ctypes.c_uint
    _user32.GetAsyncKeyState.restype = ctypes.c_short


def set_dpi_aware():
    """화면 배율(125%, 150%…)에서도 캡처 좌표 = 클릭 좌표 = 창 좌표가 되도록."""
    if not IS_WINDOWS:
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except (AttributeError, OSError):
        try:
            _user32.SetProcessDPIAware()
        except (AttributeError, OSError):
            pass


def _send(*inputs):
    arr = (INPUT * len(inputs))(*inputs)
    return _user32.SendInput(len(inputs), arr, ctypes.sizeof(INPUT))


def key_event(name, up=False):
    code, ext = SCANCODES[name]
    flags = KEYEVENTF_SCANCODE | (KEYEVENTF_EXTENDEDKEY if ext else 0) | (KEYEVENTF_KEYUP if up else 0)
    inp = INPUT(type=INPUT_KEYBOARD)
    inp.u.ki = KEYBDINPUT(0, code, flags, 0, 0)
    _send(inp)


def mouse_event(flags, dx=0, dy=0):
    inp = INPUT(type=INPUT_MOUSE)
    inp.u.mi = MOUSEINPUT(dx, dy, 0, flags, 0, 0)
    _send(inp)


def set_cursor(x, y):
    _user32.SetCursorPos(int(x), int(y))


def cursor_pos():
    pt = POINT()
    _user32.GetCursorPos(ctypes.byref(pt))
    return pt.x, pt.y


def key_down_now(vk):
    return bool(_user32.GetAsyncKeyState(vk) & 0x8000)


def focus_window(title="Roblox"):
    """제목이 정확히 title인 창을 앞으로 가져온다. 성공하면 True."""
    if not IS_WINDOWS:
        return False
    hwnd = _user32.FindWindowW(None, title)
    if not hwnd:
        return False
    if _user32.IsIconic(hwnd):
        _user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    ok = bool(_user32.SetForegroundWindow(hwnd))
    time.sleep(0.15)
    return ok
