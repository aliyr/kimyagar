#!/usr/bin/env python3
"""Hand-carved walnut spoon for the classic workshop.

The bowl pivot is (256, 1000) on a 512x1280 sheet, four times the old
128x320 spoon, so the same on-screen size stays sharp at 3x.
"""

import os
import subprocess
import numpy as np

W, H = 512, 1280
CX, CY = 256.0, 1000.0
BOWL_RX, BOWL_RY = 200.0, 228.0

WOOD = np.array([0.40, 0.24, 0.12], np.float32)
LIGHT = np.array([0.72, 0.52, 0.30], np.float32)
SHADE = np.array([0.22, 0.12, 0.06], np.float32)
DARK = np.array([0.10, 0.055, 0.028], np.float32)
RIM = np.array([0.84, 0.66, 0.40], np.float32)
STAIN = np.array([0.16, 0.07, 0.03], np.float32)


def _hash(ix, iy):
    n = (ix * 374761393 + iy * 668265263) & 0x7FFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0x7FFFFFFF
    return (n & 0xFFFF) / 65535.0


def _noise(x, y):
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    fx = x - x0
    fy = y - y0
    sx = fx * fx * (3.0 - 2.0 * fx)
    sy = fy * fy * (3.0 - 2.0 * fy)
    n00 = _hash(x0, y0)
    n10 = _hash(x0 + 1, y0)
    n01 = _hash(x0, y0 + 1)
    n11 = _hash(x0 + 1, y0 + 1)
    return (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy


def _handle_half(y):
    """Half-width. Narrow under the knob, wider at the neck."""
    t = np.clip((y - 150.0) / 700.0, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)
    return 15.0 + 26.0 * t


def paint():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = xs - CX
    half = np.maximum(_handle_half(ys), 1.0)
    neck = np.clip((ys - 800.0) / 80.0, 0.0, 1.0)
    half = half + neck * 36.0
    # Shaft between the knob and the neck, plus a round knob at the top.
    cap_y = 118.0
    cap_r = 36.0
    above = np.maximum(cap_y - ys, 0.0)
    cap = np.sqrt(dx * dx + above * above) - cap_r
    shaft = np.abs(dx) - half
    shaft = np.where(ys < cap_y, cap, shaft)
    shaft = np.where(ys > 900.0, 80.0, shaft)
    # A little carved wobble so the edge is not a ruler line.
    wobble = (_noise(ys * 0.04, np.zeros_like(ys)) - 0.5) * 3.5
    handle_sdf = shaft - wobble

    bx = (xs - CX) / BOWL_RX
    by = (ys - (CY + 18.0)) / BOWL_RY
    bowl = (np.sqrt(bx * bx + by * by) - 1.0) * BOWL_RX

    sdf = np.minimum(handle_sdf, bowl)
    alpha = np.clip(0.5 - sdf * 0.45, 0.0, 1.0).astype(np.float32)

    # Nicks: small bites out of the rim.
    nicks = [
        (CX + 150, CY - 20, 11),
        (CX - 170, CY + 40, 8),
        (CX + 40, CY + 210, 9),
        (CX - 90, CY - 150, 7),
    ]
    for nx, ny, nr in nicks:
        bite = nr - np.sqrt((xs - nx) ** 2 + (ys - ny) ** 2)
        alpha = np.where(bite > 0.0, alpha * np.clip(1.0 - bite / 3.0, 0.0, 1.0), alpha)

    # Light from the upper left, plus a worn rim on the bowl.
    nx = np.clip(dx / 40.0, -1.0, 1.0)
    ny = np.clip((ys - CY) / 80.0, -1.0, 1.0)
    light = np.clip(0.55 - 0.28 * nx - 0.12 * ny, 0.0, 1.0)
    rgb = SHADE * (1.0 - light)[:, :, None] + LIGHT * light[:, :, None]
    rgb = rgb * 0.35 + WOOD * 0.65

    grain = _noise(xs * 0.09, ys * 0.035)
    grain2 = _noise(xs * 0.22 + 4.0, ys * 0.08)
    along = 0.84 + 0.28 * (grain - 0.5) + 0.08 * np.sin(ys * 0.045 + grain2 * 5.0)
    rgb = np.clip(rgb * along[:, :, None], 0.0, 1.0)
    line = np.exp(-((dx + 7.0 * np.sin(ys * 0.018)) ** 2) / 14.0)
    line2 = np.exp(-((dx - 9.0 + 4.0 * np.sin(ys * 0.03)) ** 2) / 22.0)
    rgb = rgb * (1.0 - 0.38 * line - 0.18 * line2)[:, :, None]

    # Carved rings.
    for ry, rw in ((210, 7.0), (248, 5.5), (760, 6.5), (798, 5.0), (836, 6.0)):
        band = np.exp(-((ys - ry) ** 2) / (rw * rw))
        groove = np.clip(band * np.clip(1.0 - np.abs(dx) / (half + 2.0), 0.0, 1.0), 0.0, 1.0)
        rgb = rgb * (1.0 - 0.62 * groove)[:, :, None]
        lip = np.exp(-((ys - (ry - rw)) ** 2) / 6.0) * np.clip(1.0 - np.abs(dx) / np.maximum(half, 1.0), 0.0, 1.0)
        rgb = np.clip(rgb + RIM * (0.18 * lip)[:, :, None], 0.0, 1.0)

    # Bowl interior, stained from use, with a lighter worn rim.
    inner = (bx / 0.72) ** 2 + ((ys - (CY + 8.0)) / (BOWL_RY * 0.62)) ** 2
    hollow = np.clip(1.15 - inner, 0.0, 1.0) * (bowl < 2.0)
    rgb = rgb * (1.0 - 0.55 * hollow)[:, :, None] + STAIN * (0.72 * hollow)[:, :, None]
    rim_band = np.exp(-((np.sqrt(bx * bx + by * by) - 0.86) ** 2) / 0.008) * (bowl < 8.0)
    rgb = np.clip(rgb + (RIM - rgb) * (0.55 * rim_band)[:, :, None], 0.0, 1.0)
    # Inner wall highlight, upper left of the hollow.
    glint = np.exp(-(((xs - (CX - 50)) / 46.0) ** 2 + ((ys - (CY - 30)) / 28.0) ** 2))
    glint = glint * (inner < 1.0)
    rgb = np.clip(rgb + RIM * (0.22 * glint)[:, :, None], 0.0, 1.0)

    # Tool marks: short darker cuts, not a regular pattern.
    marks = [
        (CX - 8, 320, CX + 4, 410),
        (CX + 10, 480, CX + 6, 560),
        (CX - 14, 600, CX - 6, 690),
        (CX + 120, CY + 20, CX + 160, CY + 70),
        (CX - 140, CY + 80, CX - 100, CY + 130),
    ]
    for x0, y0, x1, y1 in marks:
        vx, vy = x1 - x0, y1 - y0
        seg = max(1.0, vx * vx + vy * vy)
        t = np.clip(((xs - x0) * vx + (ys - y0) * vy) / seg, 0.0, 1.0)
        px, py = x0 + t * vx, y0 + t * vy
        d = (xs - px) ** 2 + (ys - py) ** 2
        cut = np.exp(-d / 5.5) * (alpha > 0.4)
        rgb = rgb * (1.0 - 0.35 * cut)[:, :, None]

    # Soft body shading on the right of the bowl.
    body_shade = np.clip((dx - 20.0) / 140.0, 0.0, 1.0) * np.clip(1.0 - bowl / 30.0, 0.0, 1.0)
    rgb = rgb * (1.0 - 0.28 * body_shade)[:, :, None]

    rgb = np.clip(rgb, 0.0, 1.0) * alpha[:, :, None]
    out = np.dstack([rgb, alpha])
    return out.astype(np.float32)


def main():
    img = paint()
    out = os.path.join(os.path.dirname(__file__), "..", "assets", "art", "workshop", "wooden_spoon.png")
    out = os.path.abspath(out)
    raw = (np.clip(img, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8).tobytes()
    subprocess.run(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-", out],
        input=raw, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
    )
    covered = float((img[:, :, 3] > 0.2).mean())
    print(f"spoon {out} cover={covered:.3f}")


if __name__ == "__main__":
    main()
