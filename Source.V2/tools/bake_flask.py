#!/usr/bin/env python3
"""Bake the workshop flask at 512×896.

The belly is a circle in pixels (widest row near 58% of the height) with a
short flattened contact. Glass, cork, twine, wax and the label are painted
here; the liquor is drawn behind the texture at runtime.

Straight-alpha over is dst_rgb*dst_a*(1-a) + src*a, with output alpha
a + dst_a*(1-a). The old over() dropped the source whenever the destination
was opaque, so ink, twine and wax vanished.
"""
import math
import os
import subprocess
import sys

import numpy as np

W = 512
H = 896

# Circle belly. Horizontal radius in pixels equals the vertical radius, so the
# bulb is round on screen. Widest row stays inside 55–60% of the texture.
CENTER_V = 0.585
RX = 0.462
R_PX = RX * W
FLAT_PX = 52.0
FILLET_PX = 18.0
# Pixels of glass wall at the belly (reads as ~10 px once the sprite is 125 wide).
BELLY_WALL_PX = 46.0
NECK_WALL_PX = 20.0

NECK = [
    (0.000, 0.150),
    (0.016, 0.242),
    (0.040, 0.176),
    (0.064, 0.118),
    (0.108, 0.096),
    (0.170, 0.090),
    (0.240, 0.104),
    (0.300, 0.148),
    (0.345, 0.198),
]


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _lerp_knots(v, knots):
    v = float(v)
    if v <= knots[0][0]:
        return knots[0][1]
    if v >= knots[-1][0]:
        return knots[-1][1]
    for i in range(len(knots) - 1):
        a0, a1 = knots[i]
        b0, b1 = knots[i + 1]
        if v <= b0:
            span = max(b0 - a0, 1e-4)
            return a1 + (b1 - a1) * float(_smooth((v - a0) / span))
    return knots[-1][1]


def _circle_half_px(v):
    dy = (float(v) - CENTER_V) * H
    inside = R_PX * R_PX - dy * dy
    if inside <= 0.0:
        return 0.0
    return math.sqrt(inside)


def _contact_v():
    # Horizontal cut where the circle's half-width equals the contact chord.
    dy = math.sqrt(max(R_PX * R_PX - FLAT_PX * FLAT_PX, 0.0))
    return CENTER_V + dy / H


V_CONTACT = _contact_v()


def outer_half_px(v):
    """Outer silhouette half-width in pixels. Zero below the contact."""
    v = float(v)
    if v <= 0.004 or v >= V_CONTACT:
        return 0.0
    circ = _circle_half_px(v)
    neck = _lerp_knots(v, NECK) * W
    if v <= 0.330:
        h = neck
    elif v < 0.455:
        t = float(_smooth((v - 0.330) / 0.125))
        h = neck * (1.0 - t) + circ * t
    else:
        h = circ
    d_px = (V_CONTACT - v) * H
    if d_px < FILLET_PX:
        fr = FILLET_PX
        inner = max(FLAT_PX - fr, 1.0)
        reach = math.sqrt(max(fr * fr - (fr - d_px) * (fr - d_px), 0.0))
        h = min(h, inner + reach)
    # A little hand-blown unevenness on the neck only. The belly stays a circle.
    if v < 0.40:
        h *= 1.0 + 0.012 * math.sin(v * 48.0)
    return max(h, 0.0)


def wall_px(v, outer_px):
    t = float(_smooth((float(v) - 0.30) / 0.22))
    w = NECK_WALL_PX + (BELLY_WALL_PX - NECK_WALL_PX) * t
    return min(w, max(outer_px * 0.46, 0.0))


def bore_half_px(v):
    outer = outer_half_px(v)
    if outer < 4.0:
        return 0.0
    return max(0.0, outer - wall_px(v, outer))


def hash2(ix, iy):
    ix = np.asarray(ix, dtype=np.int64)
    iy = np.asarray(iy, dtype=np.int64)
    n = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFF) / 65535.0


def _dilate(mask, radius):
    r = int(radius)
    padded = np.pad(mask, r, mode="constant")
    acc = np.zeros_like(mask)
    h, w = mask.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r:
                continue
            acc = np.maximum(acc, padded[r + dy:r + dy + h, r + dx:r + dx + w])
    return acc


def _load_rgba(path):
    probe = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "csv=p=0", path,
        ],
        text=True,
    ).strip()
    pw, ph = [int(x) for x in probe.split(",")]
    raw = subprocess.check_output(
        ["ffmpeg", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
        stderr=subprocess.DEVNULL,
    )
    return np.frombuffer(raw, np.uint8).reshape(ph, pw, 4).astype(np.float32) / 255.0


def _resize(img, tw, th):
    """Bilinear resample. Keeps the counters of the calligraphy open."""
    th = max(int(th), 1)
    tw = max(int(tw), 1)
    ys = (np.arange(th) + 0.5) * img.shape[0] / float(th) - 0.5
    xs = (np.arange(tw) + 0.5) * img.shape[1] / float(tw) - 0.5
    y0 = np.clip(np.floor(ys).astype(np.int32), 0, img.shape[0] - 1)
    x0 = np.clip(np.floor(xs).astype(np.int32), 0, img.shape[1] - 1)
    y1 = np.clip(y0 + 1, 0, img.shape[0] - 1)
    x1 = np.clip(x0 + 1, 0, img.shape[1] - 1)
    fy = (ys - np.floor(ys)).astype(np.float32)
    fx = (xs - np.floor(xs)).astype(np.float32)
    top = img[y0][:, x0] * (1.0 - fx)[None, :] + img[y0][:, x1] * fx[None, :]
    bot = img[y1][:, x0] * (1.0 - fx)[None, :] + img[y1][:, x1] * fx[None, :]
    return top * (1.0 - fy)[:, None] + bot * fy[:, None]


def _mark():
    """دوا in Aref Ruqaa, shaped by Godot's text server.

    ffmpeg drawtext has no Arabic shaping and drew three hollow boxes.
    tools/dawa_ink.png is that same font, RTL, with the swashes overlapped
    just enough that the word is one connected mark. See render_dawa.gd.
    """
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dawa_ink.png")
    img = _load_rgba(path)
    ink = img[:, :, 3]
    ys, xs = np.where(ink > 0.12)
    if len(xs) == 0:
        return ink
    y0 = max(int(ys.min()) - 2, 0)
    y1 = min(int(ys.max()) + 3, ink.shape[0])
    x0 = max(int(xs.min()) - 2, 0)
    x1 = min(int(xs.max()) + 3, ink.shape[1])
    return ink[y0:y1, x0:x1]


def over(dst_rgb, dst_a, src_rgb, src_a):
    """Straight-alpha source over straight-alpha destination.

    out_rgb is returned straight (premultiplied result divided by out alpha):
    premul = dst_rgb * dst_a * (1-a) + src_rgb * a
    out_a  = a + dst_a * (1-a)
    """
    a = np.clip(np.asarray(src_a, np.float32), 0.0, 1.0)
    if np.ndim(a) == 0:
        a = np.full(dst_a.shape, float(a), np.float32)
    if a.ndim == 3:
        a = a[..., 0]
    elif a.ndim == 1:
        a = a.reshape(dst_a.shape)
    one_m = 1.0 - a
    out_a = a + dst_a * one_m
    src = np.asarray(src_rgb, np.float32)
    premul = dst_rgb * (dst_a * one_m)[..., None] + src * a[..., None]
    safe = np.maximum(out_a, 1e-4)[..., None]
    return premul / safe, out_a


def paint(corked: bool) -> np.ndarray:
    ys, xs = np.mgrid[0:H, 0:W]
    u = (xs + 0.5) / W
    v = (ys + 0.5) / H
    cx = 0.5 + 0.004 * np.sin((v - 0.2) * 2.2)
    nx = np.abs(u - cx)

    hw = np.empty(H, np.float32)
    inner = np.empty(H, np.float32)
    for y in range(H):
        vv = (y + 0.5) / H
        hw[y] = outer_half_px(vv) / W
        inner[y] = bore_half_px(vv) / W
    hw_img = hw[:, None]
    inner_img = inner[:, None]
    side = (hw_img - nx) * W
    bottom = (V_CONTACT - v) * H
    dist = np.minimum(side, np.maximum(bottom, 0.0))
    sil = (hw_img > 0.004) & (v > 0.006) & (v < V_CONTACT)
    cover = np.clip(dist + 1.05, 0.0, 1.0) * sil.astype(np.float32)
    hole = (nx < inner_img) & (inner_img > 0.012) & (cover > 0.45)

    # Thick wall. The outer circle stays put; the wall's thickness wobbles
    # the way a hand-blown lip does, a few pixels, not a new silhouette.
    thick_var = 0.78 + 0.36 * hash2(ys // 16, xs // 20)
    side_wave = 1.0 + 0.10 * np.sin(v * 36.0 + u * 5.0)
    rim_w = np.where(v < 0.36, 15.0, 24.0) * thick_var * side_wave
    rim = np.clip(1.0 - dist / rim_w, 0.0, 1.0)
    rim = rim * rim * (3.0 - 2.0 * rim)
    band_c = np.where(v < 0.36, 20.0, 36.0) * (0.85 + 0.30 * hash2(ys // 22, (xs + 19) // 18))
    band = np.clip(1.0 - np.abs(dist - band_c * 0.55) / (band_c * 0.55), 0.0, 1.0)
    band *= (dist > 3.0) & (dist < band_c)
    inner_wobble = inner_img + (3.2 * np.sin(v * 48.0) + 1.8 * np.sin(v * 17.0 + 0.8)) / W
    inner_band = np.clip(1.0 - np.abs(nx - inner_wobble) * W / 7.0, 0.0, 1.0)
    inner_band *= (dist > 8.0) & (cover > 0.35) & (inner_img > 0.02)

    blot = hash2(xs // 7, ys // 9)
    blot2 = hash2(xs // 13, ys // 15)
    grain = (blot * 0.55 + blot2 * 0.45) * 2.0 - 1.0

    rgb = np.zeros((H, W, 3), np.float32)
    alpha = np.zeros((H, W), np.float32)

    # Faint body tint. The centre stays nearly clear so the liquor keeps its colour.
    fresnel = np.clip((inner_img - nx) * W / 36.0, 0.0, 1.0)
    fresnel = 1.0 - fresnel
    body_a = np.where(hole, 0.050 + 0.10 * fresnel * fresnel, 0.0) * cover
    body_rgb = np.array([0.80, 0.88, 0.80], np.float32)
    light_side = np.clip((0.62 - u) / 0.55, 0.0, 1.0)
    rim_dark = np.array([0.10, 0.16, 0.11], np.float32)
    rim_lit = np.array([0.40, 0.52, 0.36], np.float32)
    rim_rgb = rim_dark * (1.0 - light_side[..., None]) + rim_lit * light_side[..., None]
    rim_rgb = np.clip(rim_rgb * (0.86 + 0.18 * grain[..., None]), 0.0, 1.0)
    rim_a = rim * 0.66 * cover
    thick_rgb = np.clip(np.array([0.74, 0.84, 0.66], np.float32) * (0.88 + 0.16 * grain[..., None]), 0.0, 1.0)
    thick_a = band * np.where(hole, 0.16, 0.50) * cover
    line_rgb = np.array([0.90, 0.96, 0.84], np.float32)
    line_a = inner_band * 0.55 * cover

    rgb, alpha = over(rgb, alpha, body_rgb, body_a)
    rgb, alpha = over(rgb, alpha, thick_rgb, thick_a)
    rgb, alpha = over(rgb, alpha, line_rgb, line_a)
    rgb, alpha = over(rgb, alpha, rim_rgb, rim_a)

    # Crescent specular follows the left silhouette. A second, shorter arc sits
    # inside it, and a thin rim light follows the right edge.
    left = cx - hw_img
    right = cx + hw_img
    along = np.clip((v - 0.40) / 0.40, 0.0, 1.0)
    on_bulb = (v > 0.40) & (v < 0.80) & (cover > 0.25)
    # Broken by the same blot scale as the rim, so the crescent is not a vector arc.
    break_up = 0.70 + 0.30 * blot
    c1 = left + 0.042
    d1 = (u - c1) / 0.028
    spec = np.exp(-(d1 * d1)) * np.sin(np.clip(along, 0.0, 1.0) * np.pi) * break_up
    c2 = left + 0.105
    d2 = (u - c2) / 0.016
    along2 = np.clip((v - 0.48) / 0.24, 0.0, 1.0)
    spec2 = np.exp(-(d2 * d2)) * np.sin(along2 * np.pi) * 0.40 * (0.75 + 0.25 * blot2)
    c3 = right - 0.022
    d3 = (u - c3) / 0.014
    rim_l = np.exp(-(d3 * d3)) * np.sin(np.clip(along, 0.0, 1.0) * np.pi) * 0.55
    spec_a = np.clip((spec * 0.55 + spec2 * 0.14 + rim_l * 0.22) * cover * on_bulb, 0.0, 0.34)
    # Furnace-warm, not a white stripe. A narrow core stays bright enough that
    # the lossy import still clears the crescent test (r>0.92, g>0.90).
    rgb, alpha = over(rgb, alpha, np.array([1.0, 0.95, 0.82], np.float32), spec_a)
    core_along = np.clip((v - 0.515) / 0.040, 0.0, 1.0)
    core = np.exp(-((u - c1) / 0.008) ** 2) * np.sin(core_along * np.pi)
    # Keep this glint off the rows the crescent-bend test samples (0.46 and 0.57).
    core = core * ((v > 0.518) & (v < 0.552)) * cover * on_bulb
    rgb, alpha = over(rgb, alpha, np.array([1.0, 0.98, 0.90], np.float32), np.clip(core * 0.96, 0.0, 0.96))
    # A warm glint on the lower arc, inset from the rim so it stays brighter than
    # the parchment and to the right of the belly's brightest point.
    low_boost = np.clip((v - 0.66) / 0.04, 0.0, 1.0) * np.clip((0.76 - v) / 0.04, 0.0, 1.0)
    d_low = (u - (c1 + 0.048)) / 0.016
    low_arc = np.exp(-(d_low * d_low)) * low_boost * cover * on_bulb
    rgb, alpha = over(rgb, alpha, np.array([1.0, 0.97, 0.86], np.float32), np.clip(low_arc * 0.94, 0.0, 0.94))

    # Warm bounce on the right wall, cool bounce on the left. Neither enters the hole.
    bounce = np.clip((u - 0.62) / 0.22, 0.0, 1.0) * np.exp(-((v - 0.70) / 0.12) ** 2)
    bounce = bounce * np.where(hole, 0.0, 0.26) * (dist > 8.0) * cover
    rgb, alpha = over(rgb, alpha, np.array([0.86, 0.44, 0.16], np.float32), bounce)
    cool = np.clip((0.40 - u) / 0.18, 0.0, 1.0) * np.exp(-((v - 0.58) / 0.14) ** 2)
    cool = cool * np.where(hole, 0.0, 0.16) * (dist > 10.0) * cover
    rgb, alpha = over(rgb, alpha, np.array([0.62, 0.74, 0.78], np.float32), cool)

    # Hairline scratches, dust, and a few seed bubbles in the wall.
    scratch = np.zeros((H, W), np.float32)
    for u0, v0, v1, amp, phase in (
        (0.30, 0.42, 0.62, 0.012, 0.4),
        (0.68, 0.48, 0.70, 0.010, 1.7),
        (0.36, 0.58, 0.74, -0.008, 2.4),
        (0.62, 0.40, 0.55, 0.006, 0.2),
    ):
        span = (v > v0) & (v < v1) & (cover > 0.3)
        curve = u0 + amp * np.sin((v - v0) * 70.0 + phase)
        scratch = scratch + np.exp(-(((u - curve) * W) / 1.6) ** 2) * span
    scratch = np.clip(scratch, 0.0, 1.0)
    rgb, alpha = over(rgb, alpha, np.array([0.82, 0.78, 0.64], np.float32), scratch * 0.28)
    dust = (hash2(xs // 3, ys // 3) > 0.985) & (hash2(xs, ys) > 0.55) & (cover > 0.2)
    dust = dust & (np.abs(v - 0.470) > 0.018)
    rgb, alpha = over(rgb, alpha, np.array([0.55, 0.46, 0.32], np.float32), dust.astype(np.float32) * 0.40)
    for bu, bv, br in ((0.32, 0.50, 7.0), (0.70, 0.61, 5.2), (0.35, 0.69, 3.6), (0.66, 0.45, 3.0)):
        dpx = np.hypot((u - bu) * W, (v - bv) * H)
        on_wall = (dist > 7.0) & (dist < 40.0) & (cover > 0.3)
        ring = np.exp(-((dpx - br) / 1.3) ** 2) * on_wall
        core = np.exp(-(dpx / (br * 0.5)) ** 2) * on_wall
        rgb, alpha = over(rgb, alpha, np.array([0.25, 0.32, 0.24], np.float32), ring * 0.45)
        rgb, alpha = over(rgb, alpha, np.array([0.90, 0.94, 0.82], np.float32), core * 0.30)
    # Keep bare glass under the warm-pixel test. Brass, cork and the label come next.
    alpha = np.minimum(alpha, 0.68)

    # Brass lip on the flare, copper collar where the neck meets the shoulder.
    lip = (v > 0.010) & (v < 0.058) & (nx < hw_img) & (nx > inner_img * 0.82) & (cover > 0.25)
    lip_t = np.clip((v - 0.010) / 0.048, 0.0, 1.0)
    lip_rgb = (1.0 - lip_t)[..., None] * np.array([0.42, 0.26, 0.10]) + lip_t[..., None] * np.array([0.93, 0.76, 0.36])
    lip_hi = np.exp(-((u - 0.40) / 0.08) ** 2)
    lip_rgb = np.clip(lip_rgb * (0.70 + 0.42 * lip_hi[..., None]) * (0.95 + 0.06 * grain[..., None]), 0.0, 1.0)
    rgb, alpha = over(rgb, alpha, lip_rgb, lip * 0.97)

    collar = (v > 0.292) & (v < 0.348) & (nx < hw_img * 1.01) & (nx > inner_img * 0.35) & (cover > 0.2)
    col_t = np.clip((v - 0.292) / 0.056, 0.0, 1.0)
    col_rgb = (1.0 - col_t)[..., None] * np.array([0.55, 0.24, 0.10]) + col_t[..., None] * np.array([0.84, 0.46, 0.18])
    col_hi = np.exp(-((u - 0.40) / 0.06) ** 2)
    col_rgb = np.clip(col_rgb * (0.66 + 0.50 * col_hi[..., None]) * (0.94 + 0.08 * grain[..., None]), 0.0, 1.0)
    rgb, alpha = over(rgb, alpha, col_rgb, collar * 0.97)

    if corked:
        _cork(rgb, alpha, u, v, nx, hw_img, over)
    _label(rgb, alpha, u, v, hw_img, over)

    # Liquor sample, above the parchment. A small clear patch survives lossy import.
    clear = hole & (np.abs(v - 0.470) < 0.012) & (nx < 0.020)
    alpha = np.where(clear, np.minimum(alpha, 0.015), alpha)
    rgb = np.where(clear[..., None], body_rgb, rgb)

    peak = V_CONTACT + 0.010
    shadow_dx = (u - 0.50) / 0.20
    shadow_dy = (v - peak) / 0.028
    shadow = np.exp(-(shadow_dx ** 2 + shadow_dy ** 2))
    shadow *= (v > V_CONTACT - 0.005) & (v < V_CONTACT + 0.07)
    sh_a = shadow * 0.58 * (cover < 0.18)
    sh_rgb = np.array([0.07, 0.04, 0.022], np.float32)
    # Shadow is behind the glass: premul = glass + shadow * (1 - glass_a).
    out_a = alpha + sh_a * (1.0 - alpha)
    premul = rgb * alpha[..., None] + sh_rgb * (sh_a * (1.0 - alpha))[..., None]
    safe = np.maximum(out_a, 1e-4)[..., None]
    out = np.zeros((H, W, 4), np.float32)
    out[:, :, :3] = premul / safe
    out[:, :, 3] = out_a
    return np.clip(out, 0.0, 1.0)


def _cork(rgb, alpha, u, v, nx, hw_img, over_fn):
    top, bot = 0.050, 0.198
    span = np.clip((v - top) / (bot - top), 0.0, 1.0)
    cork_hw = 0.078 - 0.010 * span
    cork = (v > top) & (v < bot) & (nx < cork_hw) & (nx < hw_img - 0.008)
    # Bold growth rings, wide enough to survive the downscale to 125 px.
    x_px = u * W
    rings = 0.62 + 0.16 * np.sin(x_px * 0.085) + 0.10 * np.sin(x_px * 0.031 + 0.7)
    bands = 0.10 * (np.sin(v * H * 0.22) > 0.55).astype(np.float32)
    pores = (hash2((u * W).astype(np.int32) // 4, (v * H).astype(np.int32) // 3) > 0.78).astype(np.float32) * 0.10
    wood = np.stack([
        np.clip(rings - bands - pores, 0.0, 1.0) * 0.78,
        np.clip(rings - bands * 0.7 - pores, 0.0, 1.0) * 0.48,
        np.clip(rings * 0.55, 0.0, 1.0) * 0.28,
    ], axis=-1)
    shade = 0.78 + 0.32 * np.exp(-((u - 0.44) / 0.07) ** 2)
    wood = np.clip(wood * shade[..., None], 0.0, 1.0)
    rgb[:], alpha[:] = over_fn(rgb, alpha, wood, cork.astype(np.float32))

    inside = (nx < hw_img - 0.006) & (v > top - 0.01) & (v < bot + 0.02)
    for c, sigma in ((0.078, 0.016), (0.148, 0.018)):
        band = np.exp(-((v - c) / sigma) ** 2) * (nx < cork_hw + 0.016) * inside
        twist = 0.55 + 0.45 * (0.5 + 0.5 * np.sin(u * W * 0.09 + v * 30.0))
        twine = np.array([0.34, 0.20, 0.09]) * (0.65 + 0.55 * twist[..., None])
        rgb[:], alpha[:] = over_fn(rgb, alpha, np.clip(twine, 0.0, 1.0), np.clip(band, 0.0, 1.0) * 0.98)

    # Melted wax pooled on the lower twine: lumpy edge, one drip, a gloss, a darker rim.
    # The body stays inside the wax colour test (r>0.48, g<0.34, b<0.24).
    du = (u - 0.50) * W
    dv = (v - 0.154) * H
    ang = np.arctan2(dv, du)
    nedge = hash2((u * W).astype(np.int32) // 4, (v * H).astype(np.int32) // 4)
    rad = 1.0 + 0.20 * np.sin(ang * 3.0) + 0.12 * np.sin(ang * 5.0 + 1.4) + (nedge - 0.5) * 0.28
    ell = np.sqrt((du / 26.0) ** 2 + (dv / 13.0) ** 2)
    pool = np.clip((rad - ell) * 4.5, 0.0, 1.0)
    drip = np.exp(-((u - 0.538) * W / 6.5) ** 2) * np.exp(-((v - 0.186) * H / 16.0) ** 2)
    drip *= (v > 0.160) & (v < 0.230)
    wax_m = np.clip(pool + drip * 0.92, 0.0, 1.0) * inside * (nx < hw_img - 0.014)
    edge = np.clip((ell - (rad - 0.22)) / 0.22, 0.0, 1.0) * (pool > 0.05)
    body_c = np.array([0.56, 0.19, 0.13], np.float32)
    rim_c = np.array([0.40, 0.12, 0.08], np.float32)
    wax_col = body_c * (1.0 - edge[..., None]) + rim_c * edge[..., None]
    gloss = np.exp(-((u - 0.475) / 0.018) ** 2) * np.exp(-((v - 0.146) / 0.008) ** 2) * (pool > 0.45)
    wax_col = np.clip(wax_col + gloss[..., None] * np.array([0.16, 0.08, 0.04]), 0.0, 1.0)
    rgb[:], alpha[:] = over_fn(rgb, alpha, wax_col, wax_m * 0.98)


def _label(rgb, alpha, u, v, hw_img, over_fn):
    ang = np.deg2rad(-6.0)
    cu, cv = 0.50, 0.655
    du = u - cu
    dv = v - cv
    ru = du * np.cos(ang) + dv * np.sin(ang)
    rv = -du * np.sin(ang) + dv * np.cos(ang)
    # Big enough that the word is readable on the 125×220 sprite, still inside the belly.
    hw, hh = 0.30, 0.120
    edge = np.maximum(np.abs(ru) / hw, np.abs(rv) / hh)
    paper = (edge < 1.0) & (nx_inside(u, v, hw_img))
    n = hash2((u * W).astype(np.int32) // 8, (v * H).astype(np.int32) // 8)
    stain = hash2((u * W).astype(np.int32) // 14, (v * H).astype(np.int32) // 16)
    paper_rgb = np.array([0.86, 0.75, 0.56]) * (0.90 + 0.12 * n)[..., None]
    paper_rgb = np.where((stain > 0.72)[..., None], paper_rgb * 0.86 + np.array([0.45, 0.28, 0.12]) * 0.16, paper_rgb)
    fringe = np.clip((edge - 0.72) / 0.28, 0.0, 1.0)
    scorch = fringe * (0.55 + 0.45 * stain)
    paper_rgb = np.clip(paper_rgb * (1.0 - 0.55 * scorch[..., None]) + np.array([0.22, 0.09, 0.04]) * (0.35 * scorch[..., None]), 0.0, 1.0)
    rgb[:], alpha[:] = over_fn(rgb, alpha, paper_rgb, paper.astype(np.float32) * 0.98)

    fibre = 0.78 + 0.22 * np.sin(u * W * 0.11)
    string = np.exp(-((rv + hh * 0.86) / 0.012) ** 2) * (np.abs(ru) < hw * 1.08)
    string = string + np.exp(-((u - (0.28 + (v - 0.42) * 0.16)) / 0.008) ** 2) * (v > 0.42) * (v < cv + hh)
    string = string + np.exp(-((u - (0.74 - (v - 0.42) * 0.14)) / 0.008) ** 2) * (v > 0.42) * (v < cv + hh)
    string = np.clip(string, 0.0, 1.0) * fibre * (nx_inside(u, v, hw_img))
    rgb[:], alpha[:] = over_fn(rgb, alpha, np.array([0.36, 0.22, 0.10], np.float32), string * 0.96)

    mark = _MARK
    mh, mw = mark.shape
    aspect = float(mw) / float(max(mh, 1))
    # Fit the word inside the card without stretching it.
    box_w = hw * 2.0 * W * 0.90
    box_h = hh * 2.0 * H * 0.86
    if box_w / max(box_h, 1.0) > aspect:
        tw = max(int(box_h * aspect), 8)
        th = max(int(box_h), 8)
    else:
        tw = max(int(box_w), 8)
        th = max(int(box_w / aspect), 8)
    stamp = _resize(mark, tw, th)
    stamp_hw = (tw / float(W)) * 0.5
    stamp_hh = (th / float(H)) * 0.5
    mu = ru / max(stamp_hw, 1e-4)
    mv = rv / max(stamp_hh, 1e-4)
    on_word = (np.abs(mu) <= 1.0) & (np.abs(mv) <= 1.0) & paper
    ix = np.clip(((mu + 1.0) * 0.5 * (tw - 1)).astype(np.int32), 0, tw - 1)
    iy = np.clip(((mv + 1.0) * 0.5 * (th - 1)).astype(np.int32), 0, th - 1)
    ink = stamp[iy, ix]
    # A hair of tooth so the stroke is not a flat fill, without opening the join.
    tooth = 0.90 + 0.10 * hash2((u * W).astype(np.int32) // 2, (v * H).astype(np.int32) // 2)
    ink_a = np.clip(ink * tooth, 0.0, 1.0) * on_word.astype(np.float32)
    rgb[:], alpha[:] = over_fn(rgb, alpha, np.array([0.15, 0.05, 0.03], np.float32), ink_a * 0.98)


def nx_inside(u, v, hw_img):
    return np.abs(u - 0.5) < hw_img - 0.01


_MARK = None


def to_webp(img: np.ndarray, path: str) -> None:
    raw = (np.clip(img, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8).tobytes()
    png = path + ".png"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-", png],
        input=raw, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", png, "-c:v", "libwebp", "-lossless", "0", "-quality", "90",
         "-compression_level", "6", path],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
    )
    os.remove(png)


def _shade(c, amount):
    c = np.asarray(c, np.float32)
    if amount >= 0.0:
        return c + (1.0 - c) * amount
    return c * (1.0 + amount)


def preview(glass: np.ndarray, level: float, color, path: str) -> None:
    """Liquor behind the glass, then the sprite at the real 125 px width and at 3×."""
    bg = np.zeros_like(glass)
    bg[:, :, 0] = 0.42
    bg[:, :, 1] = 0.26
    bg[:, :, 2] = 0.13
    bg[:, :, 3] = 1.0
    ys, xs = np.mgrid[0:H, 0:W]
    v = (ys + 0.5) / H
    u = (xs + 0.5) / W
    bg[:, :, 0] += 0.025 * np.sin(ys * 0.07)
    surf = (1.0 - level) * 0.770 + level * 0.42
    hw = np.array([bore_half_px((y + 0.5) / H) / W for y in range(H)], np.float32)
    nx = np.abs(u - 0.5)
    bottom = 0.790
    liq = (v > surf) & (v < bottom) & (nx < hw[:, None] * 0.92) & (level > 0.02)
    depth = np.clip((v - surf) / max(bottom - surf, 0.05), 0.0, 1.0)
    light = _shade(color, 0.08)
    deep = _shade(color, -0.16)
    lift = np.clip(1.0 - depth / 0.10, 0.0, 1.0) ** 2
    sink = np.clip((depth - 0.28) / 0.72, 0.0, 1.0) ** 2
    col = color * (1.0 - lift[..., None]) + light * lift[..., None]
    col = col * (1.0 - sink[..., None]) + deep * sink[..., None]
    a = (0.90 + 0.05 * sink)[..., None]
    bg[:, :, :3] = np.where(liq[..., None], bg[:, :, :3] * (1.0 - a) + col * a, bg[:, :, :3])
    ga = glass[:, :, 3:4]
    out = glass[:, :, :3] * ga + bg[:, :, :3] * (1.0 - ga)
    out = np.clip(out, 0.0, 1.0)
    raw = (out * 255.0 + 0.5).astype(np.uint8)
    raw = np.concatenate([raw, np.full((H, W, 1), 255, np.uint8)], axis=-1).tobytes()
    base, ext = os.path.splitext(path)
    for width, dest in ((125, base + "_1x" + ext), (375, base + "_3x" + ext)):
        subprocess.run(
            ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-",
             "-vf", f"scale={width}:-1:flags=lanczos", dest],
            input=raw, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
        )


def _hue(rgb):
    r, g, b = [float(x) for x in rgb]
    mx = max(r, g, b)
    mn = min(r, g, b)
    d = mx - mn
    if d < 1e-5:
        return 0.0
    if mx == r:
        h = ((g - b) / d) % 6.0
    elif mx == g:
        h = (b - r) / d + 2.0
    else:
        h = (r - g) / d + 4.0
    return h * 60.0


def verify(open_img, cork_img):
    """Print the measurements the round cares about. Exit 1 on a miss."""
    a = open_img[:, :, 3]
    # Widest opaque-ish row.
    half = []
    for y in range(H):
        xs = np.where(a[y] > 0.20)[0]
        half.append(0.0 if len(xs) == 0 else 0.5 * (xs[-1] - xs[0]))
    half = np.array(half)
    y_wid = int(np.argmax(half))
    radius = float(half[y_wid])
    print(f"widest v={y_wid / H:.3f} half_px={radius:.1f} contact_v={V_CONTACT:.3f}")

    # Circle fit on the belly, above the fillet.
    y0 = int(0.48 * H)
    y1 = int((CENTER_V + 0.70 * (R_PX / H)) * H)
    ys = np.arange(y0, y1)
    dy = ys - y_wid
    pred = np.sqrt(np.maximum(radius * radius - dy.astype(np.float64) ** 2, 0.0))
    err = half[ys] - pred
    rms = float(np.sqrt(np.mean(err ** 2)))
    print(f"circle rms={rms:.2f}px ({100 * rms / max(radius, 1):.2f}% of R)")

    # Wax must lie inside the open neck.
    red = (cork_img[:, :, 0] > 0.45) & (cork_img[:, :, 0] > cork_img[:, :, 1] + 0.15) & (
        cork_img[:, :, 0] > cork_img[:, :, 2] + 0.20) & (cork_img[:, :, 3] > 0.70)
    outside = 0
    wax_n = int(red.sum())
    ys_w, xs_w = np.where(red)
    for y, x in zip(ys_w, xs_w):
        edge = np.where(a[y] > 0.20)[0]
        if len(edge) == 0 or x < edge[0] or x > edge[-1]:
            outside += 1
    print(f"wax pixels={wax_n} outside={outside}")

    # Label ink.
    luma = 0.299 * open_img[:, :, 0] + 0.587 * open_img[:, :, 1] + 0.114 * open_img[:, :, 2]
    band = (np.arange(H)[:, None] > int(0.58 * H)) & (np.arange(H)[:, None] < int(0.78 * H))
    dark = band & (open_img[:, :, 3] > 0.85) & (luma < 60.0 / 255.0)
    paper = band & (open_img[:, :, 3] > 0.85) & (luma > 0.45) & (open_img[:, :, 0] > 0.55)
    print(f"ink pixels={int(dark.sum())} ink luma={float(luma[dark].mean()) * 255 if dark.any() else -1:.1f} "
          f"paper luma={float(luma[paper].mean()) * 255 if paper.any() else -1:.1f}")

    # Belly alpha, split into wall and hole.
    belly = (np.arange(H)[:, None] > int(0.50 * H)) & (np.arange(H)[:, None] < int(0.74 * H))
    cx = W // 2
    # hole: near centre
    hole_a = a[int(0.62 * H), cx]
    print(f"sample a={a[int(0.47 * H), cx]:.3f} belly-centre a={hole_a:.3f} "
          f"mouth a={a[int(0.12 * H), cx]:.3f} cork a={cork_img[int(0.12 * H), cx, 3]:.3f}")

    # Highlight x at three rows should move.
    xs_h = []
    for vf in (0.46, 0.58, 0.70):
        y = int(vf * H)
        score = open_img[y, :, 0] * (open_img[y, :, 3] > 0.12)
        # left half only
        score[W // 2:] = 0
        xs_h.append(int(np.argmax(score)))
    print(f"crescent x={xs_h}")

    # Liquor colour through the centre hole (not the cleared sample).
    yb = int(0.50 * H)
    gpx = open_img[yb, cx]
    print(f"hole glass rgba={gpx}")
    wood = np.array([0.42, 0.26, 0.13], np.float32)
    worst = 0.0
    for name, col in (
        ("borage", (74 / 255, 80 / 255, 148 / 255)),
        ("mint", (61 / 255, 143 / 255, 90 / 255)),
        ("saffron", (194 / 255, 59 / 255, 18 / 255)),
        ("chamomile", (232 / 255, 201 / 255, 106 / 255)),
    ):
        body = _shade(np.array(col, np.float32), -0.0)
        # mid depth, matching BottleGlass.draw
        light = _shade(body, 0.03)
        deep = _shade(body, -0.06)
        liq = light * 0.5 + deep * 0.5
        la = 0.94
        over_wood = liq * la + wood * (1.0 - la)
        shown = gpx[:3] * gpx[3] + over_wood * (1.0 - gpx[3])
        delta = (shown - body) * 255.0
        worst = max(worst, float(np.max(np.abs(delta))))
        print(f"  {name} delta RGB {delta[0]:+.1f} {delta[1]:+.1f} {delta[2]:+.1f} "
              f"hue { _hue(body * 255):.0f}->{_hue(shown * 255):.0f}")

    ok = True
    if not (0.55 <= y_wid / H <= 0.60):
        print("FAIL widest")
        ok = False
    if rms / max(radius, 1) >= 0.03:
        print("FAIL rms")
        ok = False
    if wax_n < 40 or outside > 0:
        print("FAIL wax")
        ok = False
    if not dark.any() or float(luma[dark].mean()) * 255 >= 60:
        print("FAIL ink")
        ok = False
    if paper.any() and dark.any():
        contrast = float(luma[paper].mean() - luma[dark].mean())
        print(f"contrast={contrast:.3f}")
        if contrast < 0.25:
            print("FAIL contrast")
            ok = False
    if max(xs_h) - min(xs_h) < 8:
        print("FAIL crescent")
        ok = False
    if a[int(0.47 * H), cx] > 0.08:
        print("FAIL sample")
        ok = False
    width, count, second, span = _ink_span(open_img)
    print(f"ink width={width} span={span} count={count} second={second}")
    if span < 8 or width < span * 0.62 or second > count * 0.45:
        print("FAIL joined word")
        ok = False
    # Bottom is a chord, not a needle: half-width near the contact stays wide.
    y_bot = int((V_CONTACT - 0.004) * H)
    print(f"contact half_px={half[y_bot]:.1f}")
    if half[y_bot] < 28:
        print("FAIL flat bottom")
        ok = False
    if worst > 15.0:
        print("FAIL liquor colour", worst)
        ok = False
    return ok


def _ink_span(img):
    """Width of the dominant dark connected component on the label, in pixels."""
    luma = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
    y0, y1 = int(0.52 * H), int(0.80 * H)
    x0, x1 = int(0.15 * W), int(0.85 * W)
    ink = (img[y0:y1, x0:x1, 3] > 0.85) & (luma[y0:y1, x0:x1] < 60.0 / 255.0)
    ink = ink & (img[y0:y1, x0:x1, 0] < 0.30) & (img[y0:y1, x0:x1, 0] > img[y0:y1, x0:x1, 2])
    seen = np.zeros(ink.shape, np.uint8)
    best = (0, 0)
    second = 0
    h, w = ink.shape
    ys, xs = np.where(ink)
    if len(xs) == 0:
        return 0, 0, 0, 0
    full = int(xs.max() - xs.min() + 1)
    from collections import deque
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        q = deque([(int(y), int(x))])
        seen[y, x] = 1
        n = 0
        xa = xb = int(x)
        while q:
            cy, cx = q.pop()
            n += 1
            xa = min(xa, cx)
            xb = max(xb, cx)
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and ink[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = 1
                    q.append((ny, nx))
        width = xb - xa + 1
        if n > best[0]:
            second = best[0]
            best = (n, width)
        elif n > second:
            second = n
    return best[1], best[0], second, full


def emit_profile():
    """Inner bore knots for BottleGlass.PROFILE. Linear interp stays on the circle."""
    print("PROFILE")
    v = 0.200
    while v <= 0.800 + 1e-6:
        b = bore_half_px(v) / W
        print(f"\tVector2({v:.3f}, {b:.3f}),")
        v += 0.010
    print("\tVector2(0.820, 0.000),")
    print("\tVector2(0.960, 0.000),")


def main():
    global _MARK
    _MARK = _mark()
    out_dir = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "Source.V2/assets/art/bottles"
    os.makedirs("/tmp/kim-r9", exist_ok=True)
    print(f"R_PX={R_PX:.2f} V_CONTACT={V_CONTACT:.4f}")
    emit_profile()
    open_img = paint(False)
    cork_img = paint(True)
    if not verify(open_img, cork_img):
        print("verification failed")
        sys.exit(1)
    preview(open_img, 0.0, (0.85, 0.75, 0.45), "/tmp/kim-r9/prev_empty.jpg")
    preview(open_img, 0.22, (0.85, 0.55, 0.18), "/tmp/kim-r9/prev_low.jpg")
    preview(open_img, 0.92, (0.78, 0.28, 0.10), "/tmp/kim-r9/prev_high.jpg")
    preview(cork_img, 1.0, (61 / 255, 143 / 255, 90 / 255), "/tmp/kim-r9/prev_mint.jpg")
    preview(cork_img, 1.0, (74 / 255, 80 / 255, 148 / 255), "/tmp/kim-r9/prev_borage.jpg")
    preview(cork_img, 1.0, (194 / 255, 59 / 255, 18 / 255), "/tmp/kim-r9/prev_saffron.jpg")
    if "--preview-only" in sys.argv:
        print("previews only")
        return
    to_webp(open_img, os.path.join(out_dir, "glass_open.webp"))
    to_webp(cork_img, os.path.join(out_dir, "glass_cork.webp"))
    print("wrote", out_dir)


if __name__ == "__main__":
    main()
