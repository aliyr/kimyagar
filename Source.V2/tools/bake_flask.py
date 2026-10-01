#!/usr/bin/env python3
"""Bake the workshop flask. One open glass and one corked glass, painted at
512×896 so the desk sprite and a zoomed carry both stay soft. Interior of the
belly stays clear; the liquid is drawn behind this texture at runtime.
"""
import os
import subprocess
import sys

import numpy as np

W = 512
H = 896

# (v from the lip downward, outer half-width as a fraction of the texture width)
OUTER = [
    (0.018, 0.100),
    (0.046, 0.158),
    (0.072, 0.096),
    (0.120, 0.072),
    (0.200, 0.074),
    (0.270, 0.110),
    (0.340, 0.200),
    (0.420, 0.320),
    (0.520, 0.392),
    (0.640, 0.400),
    (0.750, 0.372),
    (0.830, 0.300),
    (0.890, 0.190),
    (0.935, 0.078),
    (0.962, 0.000),
]


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def half_width(v, knots=OUTER):
    v = float(v)
    if v <= knots[0][0]:
        return knots[0][1]
    if v >= knots[-1][0]:
        return 0.0
    for i in range(len(knots) - 1):
        a0, a1 = knots[i]
        b0, b1 = knots[i + 1]
        if v <= b0:
            span = max(b0 - a0, 1e-4)
            return a1 + (b1 - a1) * float(_smooth((v - a0) / span))
    return 0.0


def bore(v):
    """Inner air hole. Constant through the neck, then inset from the bulb."""
    v = float(v)
    if v < 0.018 or v > 0.955:
        return 0.0
    if v < 0.250:
        return 0.050
    outer = half_width(v)
    wall = 0.020 + 0.008 * np.sin(np.clip((v - 0.30) / 0.55, 0.0, 1.0) * np.pi)
    return max(0.0, outer - wall)


def hash2(ix, iy):
    ix = np.asarray(ix, dtype=np.int64)
    iy = np.asarray(iy, dtype=np.int64)
    n = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFF) / 65535.0


def _mark() -> np.ndarray:
    """دوا, set in Aref Ruqaa, as a white-on-black stamp. Luma becomes ink alpha."""
    os.makedirs("/tmp/kim-r7", exist_ok=True)
    font = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "ArefRuqaa-Regular.ttf"))
    png = "/tmp/kim-r7/ink_mark.png"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=280x140",
         "-frames:v", "1",
         "-vf", f"drawtext=fontfile={font}:text='دوا':fontsize=96:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
         "-update", "1", png],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
    )
    raw = subprocess.check_output(
        ["ffmpeg", "-i", png, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
        stderr=subprocess.DEVNULL,
    )
    os.remove(png)
    img = np.frombuffer(raw, np.uint8).reshape(140, 280, 4).astype(np.float32) / 255.0
    return img[:, :, 0]


def paint(corked: bool) -> np.ndarray:
    ys, xs = np.mgrid[0:H, 0:W]
    u = (xs + 0.5) / W
    v = (ys + 0.5) / H
    # A slight hand-blown lean. Small enough that the centred liquor still sits inside.
    cx = 0.5 + 0.006 * np.sin((v - 0.15) * 2.4)
    nx = np.abs(u - cx)

    hw = np.empty(H, np.float32)
    inner = np.empty(H, np.float32)
    for y in range(H):
        vv = (y + 0.5) / H
        wobble = 1.0 + 0.010 * np.sin(vv * 46.0) + 0.006 * np.sin(vv * 17.0 + 1.3)
        hw[y] = half_width(vv) * wobble
        inner[y] = bore(vv) * (0.985 + 0.015 * np.sin(vv * 23.0))
    hw_img = hw[:, None]
    inner_img = inner[:, None]
    side = (hw_img - nx) * W
    bottom = (0.962 - v) * H
    dist = np.minimum(side, np.maximum(bottom, 0.0))
    sil = (hw_img > 0.003) & (v > 0.012) & (v < 0.964)
    # Antialiased coverage. Zero everywhere outside the bulb, including the
    # rows under the round bottom — those stay clear for the contact shadow.
    cover = np.clip(dist + 1.1, 0.0, 1.0) * sil.astype(np.float32)
    hole = (nx < inner_img) & (inner_img > 0.01) & (cover > 0.5)

    # Fresnel rim is many desk-pixels thick, darker on the shadowed side.
    rim = np.clip(1.0 - dist / 16.0, 0.0, 1.0)
    rim = rim * rim * (3.0 - 2.0 * rim)
    wall = np.clip(1.0 - np.abs(dist - 18.0) / 13.0, 0.0, 1.0)
    inner_band = np.clip(1.0 - (nx - inner_img) * W / 8.0, 0.0, 1.0)
    inner_band *= (nx >= inner_img) & (dist > 8.0) & (cover > 0.4)

    blot = hash2(xs // 9, ys // 11)
    blot2 = hash2(xs // 17, ys // 19)
    grain = (blot * 0.6 + blot2 * 0.4) * 2.0 - 1.0

    rgb = np.zeros((H, W, 3), np.float32)
    alpha = np.zeros((H, W), np.float32)

    def over(dst_rgb, dst_a, src_rgb, src_a):
        a = np.clip(np.asarray(src_a, np.float32), 0.0, 1.0)
        if a.ndim == 2:
            a = a[..., None]
        out_a = dst_a + a[..., 0] * (1.0 - dst_a)
        out_rgb = dst_rgb * dst_a[..., None] + src_rgb * a * (1.0 - dst_a[..., None])
        safe = np.maximum(out_a, 1e-4)[..., None]
        return out_rgb / safe, out_a

    # Almost clear through the bore so the liquor behind the texture reads.
    body_a = np.where(hole, 0.045, 0.0) * cover
    body_rgb = np.array([0.93, 0.90, 0.80], np.float32)
    light_side = np.clip((0.58 - u) / 0.55, 0.0, 1.0)
    rim_dark = np.array([0.16, 0.24, 0.16], np.float32)
    rim_lit = np.array([0.34, 0.44, 0.30], np.float32)
    rim_rgb = rim_dark * (1.0 - light_side[..., None]) + rim_lit * light_side[..., None]
    rim_a = rim * 0.62 * cover
    thick_rgb = np.array([0.76, 0.84, 0.68], np.float32)
    thick_a = wall * np.where(hole, 0.07, 0.28) * (dist > 6.0) * cover
    band_rgb = np.array([0.90, 0.95, 0.86], np.float32)
    band_a = inner_band * 0.40 * cover

    rgb, alpha = over(rgb, alpha, body_rgb, body_a)
    rgb, alpha = over(rgb, alpha, thick_rgb, thick_a)
    rgb, alpha = over(rgb, alpha, band_rgb, band_a)
    rgb, alpha = over(rgb, alpha, rim_rgb, rim_a)

    def streak(u0, v0, v1, bend, width, strength):
        along = np.clip((v - v0) / max(v1 - v0, 1e-3), 0.0, 1.0)
        center = u0 + bend * np.sin(along * np.pi)
        d = (u - center) / width
        fall = np.exp(-(d * d)) * np.sin(along * np.pi)
        return fall * strength

    # Curved shoulder highlight, broken up so it is not a sticker stripe.
    break_up = 0.62 + 0.38 * blot
    spec = streak(0.33, 0.28, 0.80, 0.045, 0.030, 0.55) * break_up
    spec2 = streak(0.42, 0.46, 0.70, -0.01, 0.011, 0.28) * (0.7 + 0.3 * blot2)
    spec_n = streak(0.46, 0.07, 0.22, 0.0, 0.014, 0.42)
    spec_a = np.clip((spec + spec2 + spec_n) * cover, 0.0, 0.62)
    rgb, alpha = over(rgb, alpha, np.array([1.0, 0.97, 0.88], np.float32), spec_a)

    # Faint caustic in the lower bore, off the liquor sample.
    cau = np.exp(-((u - 0.42) / 0.06) ** 2) * np.exp(-((v - 0.78) / 0.07) ** 2)
    rgb, alpha = over(rgb, alpha, np.array([1.0, 0.95, 0.82], np.float32), cau * hole * 0.10)

    bounce = np.clip((u - 0.60) / 0.24, 0.0, 1.0) * np.exp(-((v - 0.64) / 0.20) ** 2)
    bounce = bounce * np.where(hole, 0.12, 0.26) * cover
    rgb, alpha = over(rgb, alpha, np.array([0.86, 0.44, 0.16], np.float32), bounce)

    for s, phase in ((0.34, 0.4), (0.63, 1.7)):
        wav = s + 0.004 * np.sin(v * 30.0 + phase)
        streak_a = np.exp(-((u - wav) / 0.007) ** 2) * 0.06 * cover * (v > 0.32) * (v < 0.88)
        rgb, alpha = over(rgb, alpha, np.array([0.82, 0.86, 0.74], np.float32), streak_a)

    # Brass lip on the flare only. The open mouth stays clear.
    lip = (v > 0.018) & (v < 0.080) & (nx < hw_img) & (nx > inner_img * 0.92) & (cover > 0.2)
    lip_t = np.clip((v - 0.018) / 0.062, 0.0, 1.0)
    lip_rgb = (1.0 - lip_t)[..., None] * np.array([0.40, 0.24, 0.09]) + lip_t[..., None] * np.array([0.92, 0.74, 0.34])
    lip_hi = np.exp(-((u - 0.40) / 0.07) ** 2)
    lip_rgb = np.clip(lip_rgb * (0.72 + 0.40 * lip_hi[..., None]), 0.0, 1.0)
    lip_rgb = lip_rgb * (0.94 + 0.06 * grain[..., None])
    rgb, alpha = over(rgb, alpha, lip_rgb, lip * 0.96)

    collar = (v > 0.186) & (v < 0.236) & (nx < hw_img * 1.02) & (nx > inner_img * 0.55)
    col_t = np.clip((v - 0.186) / 0.050, 0.0, 1.0)
    col_rgb = (1.0 - col_t)[..., None] * np.array([0.52, 0.22, 0.09]) + col_t[..., None] * np.array([0.80, 0.42, 0.16])
    col_hi = np.exp(-((u - 0.40) / 0.055) ** 2)
    col_rgb = np.clip(col_rgb * (0.68 + 0.48 * col_hi[..., None]) * (0.94 + 0.08 * grain[..., None]), 0.0, 1.0)
    rgb, alpha = over(rgb, alpha, col_rgb, collar * 0.97)

    if corked:
        _cork(rgb, alpha, u, v, nx, over)
    _label(rgb, alpha, u, v, over)

    rgb = np.clip(rgb + grain[..., None] * 0.028 * (alpha > 0.08)[..., None], 0.0, 1.0)
    # Liquor sample: a few pixels of the bore stay clear through lossy import.
    clear = hole & (np.abs(v - 0.56) < 0.010) & (nx < 0.018)
    alpha = np.where(clear, np.minimum(alpha, 0.02), alpha)

    # Soft contact shadow on the desk, only outside the glass.
    shadow_dx = (u - 0.50) / 0.22
    shadow_dy = (v - 0.952) / 0.040
    shadow = np.exp(-(shadow_dx ** 2 + shadow_dy ** 2)) * (v > 0.90)
    sh_a = shadow * 0.50 * (cover < 0.20)
    sh_rgb = np.array([0.08, 0.045, 0.025], np.float32)
    a = alpha[..., None]
    out_a = alpha + sh_a * (1.0 - alpha)
    out_rgb = rgb * a + sh_rgb * sh_a[..., None] * (1.0 - a)
    safe = np.maximum(out_a, 1e-4)[..., None]
    out = np.zeros((H, W, 4), np.float32)
    out[:, :, :3] = out_rgb / safe
    out[:, :, 3] = out_a
    return np.clip(out, 0.0, 1.0)


def _cork(rgb, alpha, u, v, nx, over):
    # Tapered plug, wider at the top.
    top, bot = 0.030, 0.198
    span = np.clip((v - top) / (bot - top), 0.0, 1.0)
    cork_hw = 0.060 - 0.012 * span
    cork = (v > top) & (v < bot) & (nx < cork_hw)
    grain = 0.55 + 0.08 * np.sin(u * 90.0) + 0.05 * np.sin(v * 220.0 + u * 12.0)
    pores = (hash2((u * W).astype(int) // 3, (v * H).astype(int) // 2) > 0.82).astype(np.float32)
    wood = np.stack([
        grain * 0.72 - pores * 0.08,
        grain * 0.46 - pores * 0.05,
        grain * 0.22,
    ], axis=-1)
    # Left light, right shade.
    wood = wood * (0.82 + 0.28 * np.exp(-((u - 0.42) / 0.08) ** 2))[..., None]
    wood = np.clip(wood, 0.0, 1.0)
    rgb[:], alpha[:] = over(rgb, alpha, wood, cork * 1.0)
    # Two twine wraps.
    for c in (0.078, 0.132):
        band = np.exp(-((v - c) / 0.010) ** 2) * (nx < cork_hw + 0.008) * (v > top) * (v < bot)
        twist = 0.45 + 0.25 * (0.5 + 0.5 * np.sin(u * 70.0 + v * 40.0))
        twine = np.array([0.45, 0.32, 0.16]) * twist[..., None]
        rgb[:], alpha[:] = over(rgb, alpha, twine, band * 0.95)
    # Wax blob and a short drip on the right of the lower wrap.
    wax_dx = (u - 0.62) / 0.045
    wax_dy = (v - 0.148) / 0.028
    wax = np.exp(-(wax_dx ** 2 + wax_dy ** 2))
    drip = np.exp(-((u - 0.60) / 0.012) ** 2) * np.exp(-((v - 0.175) / 0.02) ** 2)
    wax_a = np.clip(wax + drip, 0.0, 1.0) * (v > 0.12) * (v < 0.21)
    wax_rgb = np.array([0.55, 0.16, 0.10], np.float32)
    wax_hi = np.exp(-((u - 0.58) / 0.02) ** 2) * np.exp(-((v - 0.142) / 0.012) ** 2)
    wax_col = wax_rgb + wax_hi[..., None] * np.array([0.35, 0.18, 0.08])
    rgb[:], alpha[:] = over(rgb, alpha, np.clip(wax_col, 0.0, 1.0), wax_a * 0.95)


def _label(rgb, alpha, u, v, over):
    # Aged card, the same temperature as the workshop parchment, tilted on the belly.
    ang = np.deg2rad(-7.0)
    cu, cv = 0.54, 0.73
    du = u - cu
    dv = v - cv
    ru = du * np.cos(ang) + dv * np.sin(ang)
    rv = -du * np.sin(ang) + dv * np.cos(ang)
    hw, hh = 0.132, 0.070
    wob = (hash2((u * W).astype(np.int32) // 6, (v * H).astype(np.int32) // 6) - 0.5) * 0.22
    edge = np.maximum(np.abs(ru) / (hw * (1.0 + wob)), np.abs(rv) / (hh * (1.0 + wob * 0.35)))
    paper = edge < 1.0
    n = hash2((u * W).astype(np.int32) // 5, (v * H).astype(np.int32) // 7)
    stain = hash2((u * W).astype(np.int32) // 11, (v * H).astype(np.int32) // 13)
    paper_rgb = np.array([0.84, 0.74, 0.56]) * (0.90 + 0.14 * n)[..., None]
    paper_rgb = np.where((stain > 0.72)[..., None], paper_rgb * 0.86 + np.array([0.55, 0.40, 0.22]) * 0.14, paper_rgb)
    fringe = np.clip((edge - 0.62) / 0.38, 0.0, 1.0)
    fringe = fringe * fringe
    paper_rgb = paper_rgb * (1.0 - 0.55 * fringe[..., None])
    paper_rgb = np.clip(paper_rgb, 0.0, 1.0)
    rgb[:], alpha[:] = over(rgb, alpha, paper_rgb, paper * 0.97)
    # Twine over the label and up to the collar.
    fibre = 0.85 + 0.15 * np.sin(u * 140.0)
    string = np.exp(-((rv + hh * 0.78) / 0.007) ** 2) * (np.abs(ru) < hw * 1.08)
    string += np.exp(-((u - (0.40 + (v - 0.22) * 0.26)) / 0.0055) ** 2) * (v > 0.22) * (v < 0.78) * (u < 0.58)
    string += np.exp(-((u - (0.67 - (v - 0.22) * 0.20)) / 0.0055) ** 2) * (v > 0.22) * (v < 0.78) * (u > 0.48)
    string = np.clip(string, 0.0, 1.0) * fibre
    rgb[:], alpha[:] = over(rgb, alpha, np.array([0.42, 0.28, 0.14], np.float32), string * 0.92)
    # The potion mark is the word دوا in Aref Ruqaa, stamped into the card.
    mark = _MARK
    mh, mw = mark.shape
    mu = np.clip((ru / 0.095 + 1.0) * 0.5, 0.0, 0.999)
    mv = np.clip((rv / 0.040 + 1.0) * 0.5, 0.0, 0.999)
    ix = (mu * (mw - 1)).astype(np.int32)
    iy = (mv * (mh - 1)).astype(np.int32)
    ink_a = mark[iy, ix]
    ink_a = ink_a * paper * (0.78 + 0.22 * n)
    # Keep the ink warm so it belongs with the brass and the cork.
    rgb[:], alpha[:] = over(rgb, alpha, np.array([0.42, 0.18, 0.08], np.float32), ink_a * 0.95)


_MARK = None


def to_webp(img: np.ndarray, path: str) -> None:
    raw = (np.clip(img, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8).tobytes()
    png = path + ".png"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-", png],
        input=raw,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", png, "-c:v", "libwebp", "-lossless", "0", "-quality", "90",
         "-compression_level", "6", path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )
    os.remove(png)


def preview(glass: np.ndarray, level: float, color, path: str) -> None:
    """Desk-colored plate with liquor behind the glass, saved near 2× desk size."""
    bg = np.zeros_like(glass)
    bg[:, :, 0] = 0.42
    bg[:, :, 1] = 0.26
    bg[:, :, 2] = 0.13
    bg[:, :, 3] = 1.0
    # Wood grain on the plate.
    ys, xs = np.mgrid[0:H, 0:W]
    v = (ys + 0.5) / H
    u = (xs + 0.5) / W
    bg[:, :, 0] += 0.03 * np.sin(ys * 0.08)
    # Liquid inside the bore, from the surface down.
    surf = 0.90 - 0.50 * level
    hw = np.array([bore((y + 0.5) / H) for y in range(H)], np.float32)
    nx = np.abs(u - 0.5)
    liq = (v > surf) & (v < 0.94) & (nx < hw[:, None] * 0.96)
    depth = np.clip((v - surf) / max(0.94 - surf, 0.05), 0.0, 1.0)
    light = np.array(color, np.float32) * 1.15
    deep = np.array(color, np.float32) * 0.55
    col = light * (1.0 - depth[..., None]) + deep * depth[..., None]
    col = np.clip(col, 0.0, 1.0)
    a = (0.48 + 0.36 * depth)[..., None]
    bg[:, :, :3] = np.where(liq[..., None], bg[:, :, :3] * (1 - a) + col * a, bg[:, :, :3])
    # Meniscus.
    men = np.exp(-((v - surf) / 0.008) ** 2) * (nx < hw[:, None] * 0.9) * (level > 0.02)
    bg[:, :, :3] = np.where(men[..., None] > 0.2, bg[:, :, :3] * 0.75 + 0.25, bg[:, :, :3])
    a = glass[:, :, 3:4]
    out = glass[:, :, :3] * a + bg[:, :, :3] * (1.0 - a)
    out = np.clip(out, 0.0, 1.0)
    raw = (out * 255.0 + 0.5).astype(np.uint8)
    raw = np.concatenate([raw, np.full((H, W, 1), 255, np.uint8)], axis=-1).tobytes()
    # 2× the on-screen desk height (220 → 440).
    subprocess.run(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-",
         "-vf", "scale=250:-1", path],
        input=raw, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
    )


def main():
    global _MARK
    _MARK = _mark()
    out_dir = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "Source.V2/assets/art/bottles"
    os.makedirs("/tmp/kim-r7", exist_ok=True)
    open_img = paint(False)
    cork_img = paint(True)
    preview(open_img, 0.0, (0.85, 0.75, 0.45), "/tmp/kim-r7/prev_empty.jpg")
    preview(open_img, 0.28, (0.85, 0.62, 0.20), "/tmp/kim-r7/prev_low.jpg")
    preview(open_img, 1.0, (0.75, 0.28, 0.12), "/tmp/kim-r7/prev_high.jpg")
    preview(cork_img, 1.0, (0.22, 0.45, 0.28), "/tmp/kim-r7/prev_cork.jpg")
    preview(cork_img, 1.0, (0.35, 0.28, 0.72), "/tmp/kim-r7/prev_blue.jpg")
    if "--preview-only" in sys.argv:
        print("previews only")
        return
    to_webp(open_img, os.path.join(out_dir, "glass_open.webp"))
    to_webp(cork_img, os.path.join(out_dir, "glass_cork.webp"))
    # Sample checks matching the GDScript constants.
    sx, sy = W // 2, int(0.62 * H)
    print("sample", open_img[sy, sx], "mouth", open_img[int(0.12 * H), W // 2, 3],
          "cork", cork_img[int(0.12 * H), W // 2])
    print("wrote", out_dir)


if __name__ == "__main__":
    main()
