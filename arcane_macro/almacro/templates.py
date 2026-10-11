"""templates/ 폴더의 PNG 템플릿을 읽고 캐시한다."""

import os
import threading

from . import vision


class TemplateStore:
    def __init__(self, folder):
        self.folder = folder
        os.makedirs(folder, exist_ok=True)
        self._cache = {}  # name -> (mtime, img)
        self._derived = {}  # key -> (stamp, value)
        self._lock = threading.Lock()

    def path(self, name):
        return os.path.join(self.folder, name + ".png")

    def _mtime(self, name):
        try:
            return os.path.getmtime(self.path(name))
        except OSError:
            return None

    def get(self, name):
        mtime = self._mtime(name)
        if mtime is None:
            return None
        with self._lock:
            hit = self._cache.get(name)
            if hit and hit[0] == mtime:
                return hit[1]
        img = vision.imread(self.path(name))
        with self._lock:
            self._cache[name] = (mtime, img)
        return img

    def has(self, name):
        return self._mtime(name) is not None

    def save(self, name, img):
        vision.imwrite(self.path(name), img)
        with self._lock:
            self._cache.pop(name, None)

    def delete(self, name):
        try:
            os.remove(self.path(name))
        except OSError:
            pass
        with self._lock:
            self._cache.pop(name, None)

    def names(self):
        try:
            files = os.listdir(self.folder)
        except OSError:
            return []
        return sorted(f[:-4] for f in files if f.lower().endswith(".png"))

    def _stamp(self, names):
        return tuple((n, self._mtime(n)) for n in names)

    def _derive(self, key, names, build):
        stamp = self._stamp(names)
        with self._lock:
            hit = self._derived.get(key)
            if hit and hit[0] == stamp:
                return hit[1]
        value = build()
        with self._lock:
            self._derived[key] = (stamp, value)
        return value

    # ---- 묶음 조회
    def arrows(self):
        names = [f"arrow_{d}" for d in vision.DIRS]
        return self._derive("arrows", names, lambda: vision.build_arrow_templates(
            {d: self.get(f"arrow_{d}") for d in vision.DIRS}))

    def energy_states(self):
        out = {}
        for n in self.names():
            m = vision.ENERGY_NAME.match(n)
            if m:
                img = self.get(n)
                if img is not None:
                    out[m.group(1)] = img
        return out

    def popups(self):
        return [(n, self.get(n)) for n in self.names() if n.startswith("popup_") and self.get(n) is not None]

    def hsv_of(self, name):
        img = self.get(name)
        if img is None:
            return None
        return self._derive("hsv:" + name, [name], lambda: vision.median_hsv(img))
