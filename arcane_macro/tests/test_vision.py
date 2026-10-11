import ctypes
import os
import random

import cv2
import numpy as np
import pytest

from almacro import vision, winapi
from almacro.templates import TemplateStore
from synth import (BTN, NAMES, background, crop, draw_arrow, draw_button, draw_energy)

DIRS4 = ["up", "down", "left", "right"]


def arrow_tile(direction="up", size=34):
    img = background(60, 60, 3)
    draw_arrow(img, 30, 30, size, direction)
    h = size // 2 + 4
    return crop(img, 30 - h, 30 - h, 2 * h + 1, 2 * h + 1)


def qte_scene(seq, rows=1, pressed=0, seed=5, size=34):
    img = background(70 + 60 * rows, 520, seed)
    per_row = (len(seq) + rows - 1) // rows
    for i, d in enumerate(seq):
        r, c = divmod(i, per_row)
        draw_arrow(img, 40 + c * 56, 40 + r * 60, size, d, (40, 210, 250) if i < pressed else (240, 240, 240))
    return img


@pytest.mark.parametrize("seed", range(6))
def test_reads_random_sequence_from_single_up_template(seed):
    rng = random.Random(seed)
    seq = [rng.choice(DIRS4) for _ in range(rng.randint(3, 9))]
    templates = vision.build_arrow_templates({"up": arrow_tile("up")})
    arrows = vision.read_arrows(qte_scene(seq, seed=seed), templates, 0.78)
    assert [a.label for a in arrows] == seq


def test_two_rows_read_top_to_bottom():
    seq = ["up", "left", "down", "right", "right", "down", "left", "up"]
    templates = vision.build_arrow_templates({"up": arrow_tile("up")})
    arrows = vision.read_arrows(qte_scene(seq, rows=2), templates, 0.78)
    assert [a.label for a in arrows] == seq
    assert vision.arrow_signature(arrows) == (tuple(seq[:4]), tuple(seq[4:]))


def test_pressed_arrows_still_read_in_gray_mode_and_signature_is_stable():
    seq = ["left", "left", "up", "right", "down"]
    templates = vision.build_arrow_templates({"up": arrow_tile("up")})
    a0 = vision.read_arrows(qte_scene(seq, pressed=0), templates, 0.78)
    a3 = vision.read_arrows(qte_scene(seq, pressed=3), templates, 0.78)
    assert vision.arrow_signature(a0) == vision.arrow_signature(a3)


def test_explicit_template_overrides_rotation():
    built = vision.build_arrow_templates({"up": arrow_tile("up"), "left": arrow_tile("left")})
    assert len(built["left"]) == 1 and np.array_equal(built["left"][0], arrow_tile("left"))
    assert built["down"][0].shape == arrow_tile("up").shape


def test_no_arrows_in_empty_scene():
    templates = vision.build_arrow_templates({"up": arrow_tile("up")})
    assert vision.read_arrows(background(130, 520, 9), templates, 0.78) == []


def test_flat_template_is_rejected_and_never_matches():
    flat = np.full((20, 20, 3), 128, np.uint8)
    assert vision.template_problem(flat)
    assert vision.find(background(100, 100), flat, 0.5) is None
    assert vision.template_problem(arrow_tile()) is None


def enemy_scene(names, seed=0):
    img = background(240, 230, seed)
    for i, n in enumerate(names):
        draw_button(img, 20, 15 + i * 50, *BTN, n, fill=(40, 40, 160), border=(120, 160, 255))
    return img


def test_enemy_buttons_found_regardless_of_name():
    button = crop(enemy_scene(["Wolf"]), 20, 15, *BTN)  # 'Wolf' 버튼으로 캡처
    for k in range(1, 5):
        names = random.Random(k).sample(NAMES, k)
        found = vision.reading_order(vision.detect_buttons_by_template(enemy_scene(names, k), button, 0.8))
        assert len(found) == k
        assert [f.cy for f in found] == sorted(f.cy for f in found)


def test_enemy_buttons_by_color():
    button = crop(enemy_scene(["Wolf"]), 20, 15, *BTN)
    hsv = vision.median_hsv(button)
    found = vision.detect_buttons_by_color(enemy_scene(NAMES[:3]), hsv, (8, 60, 60))
    assert len(found) == 3


def test_pick_target_middle_hits_most_for_party_table():
    t = [vision.Match(0, i * 10, 5, 5, 1.0) for i in range(5)]
    assert vision.pick_target(t, "middle") is t[2]
    assert vision.pick_target(t[:4], "middle") is t[1]
    assert vision.pick_target(t[:1], "middle") is t[0]
    assert vision.pick_target(t, "last") is t[-1]
    assert vision.pick_target(t, "index", 9) is t[-1]
    assert vision.pick_target([], "first") is None


def test_disabled_button_detected_even_though_score_is_high():
    img = background(60, 200)
    draw_button(img, 10, 10, *BTN, "Party Table")
    templ = crop(img, 10, 10, *BTN)
    dim = background(60, 200)
    draw_button(dim, 10, 10, *BTN, "Party Table", dim=0.45)
    m = vision.find(dim, templ, 0.6)
    assert m is not None  # 정규화 매칭이라 어두워도 찾아진다
    assert vision.looks_disabled(dim, m, templ)
    assert not vision.looks_disabled(img, vision.find(img, templ, 0.8), templ)


def energy_img(n):
    img = background(26, 130, 2)
    draw_energy(img, 0, 0, n)
    return img


def test_energy_state_classification():
    states = {str(n): energy_img(n) for n in range(7)}
    for n in range(7):
        noisy = cv2.add(energy_img(n), np.random.default_rng(n).integers(0, 6, (26, 130, 3), dtype=np.uint8))
        label, score, _ = vision.classify_state(noisy, states)
        assert label == str(n) and score > 0.9


def test_energy_pip_counting():
    pip = crop(energy_img(1), 3, 5, 14, 14)
    hsv = vision.median_hsv(pip)
    for n in range(7):
        assert vision.count_blobs(energy_img(n), hsv, (10, 70, 70), 6) == n


def test_hsv_mask_hue_wraparound():
    img = np.zeros((10, 20, 3), np.uint8)
    img[:, :10] = (0, 0, 255)  # 빨강 (H≈0)
    img[:, 10:] = (40, 0, 220)  # 자홍빛 빨강 (H≈175)
    assert vision.hsv_mask(img, (178, 255, 230), (8, 60, 60)).all()


def test_unicode_path_roundtrip(tmp_path):
    store = TemplateStore(os.path.join(tmp_path, "한글 폴더", "templates"))
    store.save("arrow_up", arrow_tile())
    assert np.array_equal(store.get("arrow_up"), arrow_tile())
    store.save("energy_3", energy_img(3))
    assert list(store.energy_states()) == ["3"]
    assert len(store.arrows()["left"]) == 1


def test_sendinput_struct_layout():
    assert ctypes.sizeof(winapi.INPUT) == (40 if ctypes.sizeof(ctypes.c_void_p) == 8 else 28)
    assert winapi.SCANCODES["w"] == (0x11, False)
    assert winapi.SCANCODES["up"] == (0x48, True)
    assert winapi.SCANCODES["d"] == (0x20, False)
    assert winapi.SCANCODES["1"] == (0x02, False)
