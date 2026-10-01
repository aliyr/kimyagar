#!/usr/bin/env python3
"""Hand-carved walnut spoon for the classic workshop.

The bowl pivot is (256, 1000) on a 512x1280 sheet. On screen that is
102x255 (TEX_SCALE * SPOON_BOX / 256), so grain, rings, and the rim are
painted at a scale that still reads after that minify. The bowl radius
stays 200 px so the spoon bowl is still about 0.38 of the mortar mouth.
"""

import os
import subprocess
import numpy as np

W, H = 512, 1280
CX, CY = 256.0, 1000.0
BOWL_RX, BOWL_RY = 200.0, 228.0

WOOD = np.array([0.70, 0.46, 0.23], np.float32)
LIGHT = np.array([0.97, 0.80, 0.52], np.float32)
SHADE = np.array([0.28, 0.15, 0.07], np.float32)
RIM = np.array([0.98, 0.86, 0.58], np.float32)
STAIN = np.array([0.10, 0.045, 0.02], np.float32)


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


def _soft_band(v, v0, v1, edge):
    enter = np.clip((v - (v0 - edge)) / max(edge, 1e-4), 0.0, 1.0)
    leave = np.clip(((v1 + edge) - v) / max(edge, 1e-4), 0.0, 1.0)
    enter = enter * enter * (3.0 - 2.0 * enter)
    leave = leave * leave * (3.0 - 2.0 * leave)
    return enter * leave


def _handle_half(y):
    """Half-width in texture px. About 15 px on screen at the grip."""
    t = np.clip((y - 160.0) / 680.0, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)
    return 38.0 + 18.0 * t


def paint():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = xs - CX
    half = np.maximum(_handle_half(ys), 1.0)
    neck = np.clip((ys - 780.0) / 90.0, 0.0, 1.0)
    half = half + neck * 28.0
    cap_y = 128.0
    cap_r = 44.0
    above = np.maximum(cap_y - ys, 0.0)
    cap = np.sqrt(dx * dx + above * above) - cap_r
    shaft = np.abs(dx) - half
    shaft = np.where(ys < cap_y, cap, shaft)
    shaft = np.where(ys > 900.0, 80.0, shaft)
    # A small wobble keeps the edge carved without a jagged silhouette.
    wobble = (_noise(ys * 0.02, np.zeros_like(ys)) - 0.5) * 2.2
    handle_sdf = shaft - wobble

    bx = (xs - CX) / BOWL_RX
    by = (ys - (CY + 18.0)) / BOWL_RY
    bowl = (np.sqrt(bx * bx + by * by) - 1.0) * BOWL_RX

    sdf = np.minimum(handle_sdf, bowl)
    alpha = np.clip(0.85 - sdf * 0.85, 0.0, 1.0).astype(np.float32)

    nicks = [
        (CX + 168, CY - 10, 8),
        (CX - 176, CY + 36, 6),
        (CX + 30, CY + 220, 7),
    ]
    for nx, ny, nr in nicks:
        bite = nr - np.sqrt((xs - nx) ** 2 + (ys - ny) ** 2)
        alpha = np.where(bite > 0.0, alpha * np.clip(1.0 - bite / 2.4, 0.0, 1.0), alpha)

    # Cylinder light, strong left-to-right so the handle reads at 1x.
    nx = np.clip(dx / 70.0, -1.0, 1.0)
    ny = np.clip((ys - 500.0) / 420.0, -1.0, 1.0)
    light = np.clip(0.48 - 0.62 * nx - 0.16 * ny, 0.0, 1.0)
    rgb = SHADE * (1.0 - light)[:, :, None] + LIGHT * light[:, :, None]
    rgb = rgb * 0.34 + WOOD * 0.66

    # Coarse grain only. The wavelength stays wide so the minify does not
    # turn it into speckle.
    grain = _noise(xs * 0.010, ys * 0.007)
    along = 0.78 + 0.62 * (grain - 0.5)
    rgb = np.clip(rgb * along[:, :, None], 0.0, 1.0)
    streak = np.exp(-((dx + 16.0 * np.sin(ys * 0.006)) ** 2) / (12.0 ** 2))
    streak2 = np.exp(-((dx - 20.0) ** 2) / (22.0 ** 2))
    rgb = rgb * (1.0 - 0.55 * streak - 0.28 * streak2)[:, :, None]

    # Ring grooves with a dark cut and a bright lip. Each band is several
    # screen pixels after the 5x minify, with a short soft edge.
    def _band(y0, y1, edge=8.0):
        enter = np.clip((ys - (y0 - edge)) / edge, 0.0, 1.0)
        leave = np.clip(((y1 + edge) - ys) / edge, 0.0, 1.0)
        enter = enter * enter * (3.0 - 2.0 * enter)
        leave = leave * leave * (3.0 - 2.0 * leave)
        return enter * leave

    for ry in (240, 360, 500, 640, 770):
        cover = np.clip(1.0 - np.abs(dx) / (half + 6.0), 0.0, 1.0)
        groove = _band(ry + 2.0, ry + 28.0) * cover
        lip = _band(ry - 26.0, ry - 4.0) * cover
        shade = _band(ry + 26.0, ry + 42.0) * cover
        rgb = rgb * (1.0 - 0.88 * groove)[:, :, None]
        rgb = np.clip(rgb + (RIM - rgb) * (0.82 * lip)[:, :, None], 0.0, 1.0)
        rgb = rgb * (1.0 - 0.45 * shade)[:, :, None]

    # Bowl: stained floor, a wall that climbs toward the rim, a dark inner
    # lip, and a bright worn edge.
    radial = np.sqrt(bx * bx + by * by)
    inner = (bx / 0.72) ** 2 + ((ys - (CY + 10.0)) / (BOWL_RY * 0.62)) ** 2
    hollow = np.clip(1.15 - inner, 0.0, 1.0) * (bowl < 8.0)
    depth = np.clip(hollow, 0.0, 1.0)
    rgb = rgb * (1.0 - 0.92 * depth)[:, :, None] + STAIN * (0.95 * depth)[:, :, None]
    wall = np.clip((radial - 0.42) / 0.38, 0.0, 1.0) * (bowl < 10.0)
    rgb = np.clip(rgb + (WOOD * 1.15 - rgb) * (0.72 * wall)[:, :, None], 0.0, 1.0)
    inner_lip = _soft_band(radial, 0.78, 0.86, 0.03)
    rgb = rgb * (1.0 - 0.55 * inner_lip * (bowl < 16.0))[:, :, None]
    rim_band = _soft_band(radial, 0.88, 0.98, 0.025) * (bowl < 18.0)
    rgb = np.clip(rgb + (RIM - rgb) * (0.95 * rim_band)[:, :, None], 0.0, 1.0)
    glint = np.exp(-(((xs - (CX - 78)) / 48.0) ** 2 + ((ys - (CY - 48)) / 32.0) ** 2))
    glint = glint * (inner < 0.85)
    rgb = np.clip(rgb + RIM * (0.70 * glint)[:, :, None], 0.0, 1.0)

    marks = [
        (CX - 6, 300, CX + 8, 420),
        (CX + 14, 460, CX + 4, 580),
        (CX - 16, 600, CX - 4, 720),
        (CX + 110, CY + 30, CX + 168, CY + 90),
        (CX - 150, CY + 70, CX - 96, CY + 140),
    ]
    for x0, y0, x1, y1 in marks:
        vx, vy = x1 - x0, y1 - y0
        seg = max(1.0, vx * vx + vy * vy)
        t = np.clip(((xs - x0) * vx + (ys - y0) * vy) / seg, 0.0, 1.0)
        px, py = x0 + t * vx, y0 + t * vy
        d = (xs - px) ** 2 + (ys - py) ** 2
        cut = np.exp(-d / 18.0) * (alpha > 0.4)
        rgb = rgb * (1.0 - 0.40 * cut)[:, :, None]

    body_shade = np.clip((dx - 10.0) / 160.0, 0.0, 1.0) * np.clip(1.0 - bowl / 40.0, 0.0, 1.0)
    rgb = rgb * (1.0 - 0.34 * body_shade)[:, :, None]

    rgb = np.clip(rgb, 0.0, 1.0) * alpha[:, :, None]
    return np.dstack([rgb, alpha]).astype(np.float32)


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
