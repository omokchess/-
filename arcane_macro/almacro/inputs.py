"""키보드/마우스 입력 백엔드."""

import threading
import time

from . import winapi


class FailSafe(Exception):
    """마우스를 화면 왼쪽 위 구석(0,0)으로 옮기면 즉시 정지."""


class BaseInput:
    def __init__(self):
        self._held = set()
        self._lock = threading.Lock()

    # 하위 클래스가 구현
    def _down(self, key):
        raise NotImplementedError

    def _up(self, key):
        raise NotImplementedError

    def _click(self, x, y, hold):
        raise NotImplementedError

    def cursor_pos(self):
        return None

    def move(self, x, y):
        pass

    # 공통
    def key_down(self, key):
        with self._lock:
            self._held.add(key)
        self._down(key)

    def key_up(self, key):
        with self._lock:
            self._held.discard(key)
        self._up(key)

    def press(self, key, hold=0.03):
        self.key_down(key)
        time.sleep(hold)
        self.key_up(key)

    def click(self, x, y, hold=0.04):
        self._click(int(x), int(y), hold)

    def release_all(self):
        with self._lock:
            held = list(self._held)
        for key in held:
            self.key_up(key)

    def check_failsafe(self):
        pos = self.cursor_pos()
        if pos is not None and pos[0] <= 0 and pos[1] <= 0:
            raise FailSafe("마우스가 화면 왼쪽 위 구석에 있음 → 비상 정지")


class WinInput(BaseInput):
    """SendInput + 스캔코드. 화살표는 확장키 플래그를 붙여 숫자패드와 구분한다."""

    def _down(self, key):
        winapi.key_event(key, up=False)

    def _up(self, key):
        winapi.key_event(key, up=True)

    def move(self, x, y):
        winapi.set_cursor(x, y)

    def _click(self, x, y, hold):
        winapi.set_cursor(x, y)
        # Roblox는 실제 마우스 이동 이벤트가 있어야 버튼 hover/클릭을 인식하는 경우가 있다
        winapi.mouse_event(winapi.MOUSEEVENTF_MOVE, 1, 0)
        winapi.mouse_event(winapi.MOUSEEVENTF_MOVE, -1, 0)
        time.sleep(0.03)
        winapi.mouse_event(winapi.MOUSEEVENTF_LEFTDOWN)
        time.sleep(hold)
        winapi.mouse_event(winapi.MOUSEEVENTF_LEFTUP)

    def cursor_pos(self):
        return winapi.cursor_pos()


class DryRunInput(BaseInput):
    """실제로 누르지 않고 기록만 한다(인식 점검용)."""

    def __init__(self, log=None):
        super().__init__()
        self.log = log or (lambda msg: None)
        self.events = []

    def _down(self, key):
        self.events.append(("down", key))

    def _up(self, key):
        self.events.append(("up", key))
        self.log(f"(드라이런) 키 {key}")

    def _click(self, x, y, hold):
        self.events.append(("click", x, y))
        self.log(f"(드라이런) 클릭 {x},{y}")


def make_input(cfg, log=None):
    if cfg["input"].get("dry_run") or not winapi.IS_WINDOWS:
        return DryRunInput(log)
    return WinInput()


def validate_key(name):
    return name in winapi.SCANCODES
