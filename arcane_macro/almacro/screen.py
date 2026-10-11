"""mss 기반 화면 캡처. mss 객체는 스레드마다 따로 만든다."""

import threading

import numpy as np

from .config import region_tuple


class Screen:
    def __init__(self):
        self._local = threading.local()

    def _sct(self):
        sct = getattr(self._local, "sct", None)
        if sct is None:
            import mss
            factory = getattr(mss, "MSS", None) or mss.mss  # mss 10+는 MSS 권장
            sct = factory()
            self._local.sct = sct
        return sct

    def grab_rect(self, x, y, w, h):
        shot = self._sct().grab({"left": int(x), "top": int(y), "width": int(w), "height": int(h)})
        return np.ascontiguousarray(np.asarray(shot)[:, :, :3])  # BGRA → BGR

    def grab(self, region):
        r = region_tuple(region)
        if r is None:
            return None
        return self.grab_rect(*r)

    def virtual_bounds(self):
        mon = self._sct().monitors[0]
        return mon["left"], mon["top"], mon["width"], mon["height"]
