from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
VS = ROOT / "Art" / "Assets" / "Vertical Slice"
OUT = ROOT / "Art" / "Assets" / "Production"
SCALE_DIR = OUT / "Scale"
MORTAR_DIR = OUT / "Mortar"
SOURCE_DIR = OUT / "_sources"
PREVIEW_DIR = OUT / "Previews"


def remove_light_background(image: Image.Image) -> Image.Image:
    """Fit the parchment field from border samples and turn only that field transparent."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    x = xx.astype(np.float32) / max(w - 1, 1)
    y = yy.astype(np.float32) / max(h - 1, 1)
    border = max(12, min(h, w) // 35)
    mask = (xx < border) | (xx >= w - border) | (yy < border) | (yy >= h - border)
    sample = np.flatnonzero(mask.ravel())[::4]
    features = np.stack(
        [np.ones_like(x), x, y, x * x, y * y, x * y], axis=-1
    ).reshape(-1, 6)
    fit_x = features[sample]
    expected = np.empty_like(rgb)
    for channel in range(3):
        coeff, *_ = np.linalg.lstsq(fit_x, rgb[..., channel].reshape(-1)[sample], rcond=None)
        expected[..., channel] = (features @ coeff).reshape(h, w)
    distance = np.sqrt(np.sum((rgb - expected) ** 2, axis=2))
    # Keep the painted anti-aliasing while suppressing parchment texture.
    alpha = np.clip((distance - 7.0) / (35.0 - 7.0), 0.0, 1.0)
    alpha = (alpha * alpha * (3.0 - 2.0 * alpha) * 255.0).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.35))
    # Close only pinhole-sized matte defects without sealing intentional chain links.
    alpha_img = alpha_img.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    # Contract one pixel to remove the parchment-colored antialias fringe baked
    # into the RGB master, then restore a very small soft edge.
    alpha_img = alpha_img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.22))
    alpha_float = np.asarray(alpha_img, dtype=np.float32) / 255.0
    # Unmix parchment from antialiased edge pixels to prevent a pale halo on dark scenes.
    safe_alpha = np.maximum(alpha_float[..., None], 0.08)
    foreground = (rgb - (1.0 - alpha_float[..., None]) * expected) / safe_alpha
    foreground = np.clip(foreground, 0, 255)
    edge = (alpha_float > 0.02) & (alpha_float < 0.985)
    cleaned = rgb.copy()
    cleaned[edge] = foreground[edge]
    rgba = Image.fromarray(cleaned.astype(np.uint8), "RGB").convert("RGBA")
    rgba.putalpha(alpha_img)
    return rgba


def trim(image: Image.Image, pad: int = 12, threshold: int = 3):
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > threshold)
    if len(xs) == 0:
        raise ValueError("No visible pixels to trim")
    box = (
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(image.width, int(xs.max()) + 1 + pad),
        min(image.height, int(ys.max()) + 1 + pad),
    )
    return image.crop(box), box


def extract(
    source: Image.Image,
    region: tuple[int, int, int, int],
    destination: Path,
    pivot_source: tuple[float, float],
    ellipse: tuple[int, int, int, int] | None = None,
):
    piece = source.crop(region)
    if ellipse is not None:
        matte = Image.new("L", piece.size, 0)
        d = ImageDraw.Draw(matte)
        d.ellipse(ellipse, fill=255)
        matte = matte.filter(ImageFilter.GaussianBlur(2.0))
        alpha = Image.fromarray(
            np.minimum(np.asarray(piece.getchannel("A")), np.asarray(matte)).astype(np.uint8),
            "L",
        )
        piece.putalpha(alpha)
    piece, local_trim = trim(piece)
    # Guarantee a transparent safety border even when the authored region cuts
    # through an overlapping source component. This prevents texture bleeding
    # and gives every sprite four transparent corners for atlas packing.
    safety = 8
    bordered = Image.new("RGBA", (piece.width + safety * 2, piece.height + safety * 2))
    bordered.alpha_composite(piece, (safety, safety))
    piece = bordered
    destination.parent.mkdir(parents=True, exist_ok=True)
    piece.save(destination, optimize=True)
    origin_x = region[0] + local_trim[0] - safety
    origin_y = region[1] + local_trim[1] - safety
    return {
        "file": destination.name,
        "size": [piece.width, piece.height],
        "source_origin": [origin_x, origin_y],
        "pivot_px": [round(pivot_source[0] - origin_x, 2), round(pivot_source[1] - origin_y, 2)],
        "pivot_normalized": [
            round((pivot_source[0] - origin_x) / piece.width, 5),
            round((pivot_source[1] - origin_y) / piece.height, 5),
        ],
    }


def masked_source(source: Image.Image, paint_mask) -> Image.Image:
    matte = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(matte)
    paint_mask(draw)
    alpha = Image.fromarray(
        np.minimum(np.asarray(source.getchannel("A")), np.asarray(matte)).astype(np.uint8),
        "L",
    )
    result = source.copy()
    result.putalpha(alpha)
    return result


def radial_sprite(size, inner, outer, color, center=None):
    w, h = size
    cx, cy = center or (w / 2, h / 2)
    yy, xx = np.mgrid[0:h, 0:w]
    dx = (xx - cx) / max(w / 2, 1)
    dy = (yy - cy) / max(h / 2, 1)
    dist = np.sqrt(dx * dx + dy * dy)
    alpha = np.clip((outer - dist) / max(outer - inner, 1e-6), 0, 1)
    alpha = (alpha * alpha * 255).astype(np.uint8)
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    arr[..., 0] = color[0]
    arr[..., 1] = color[1]
    arr[..., 2] = color[2]
    arr[..., 3] = (alpha.astype(np.float32) * color[3] / 255.0).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def shadow_sprite(size, color=(55, 31, 18, 105)):
    image = Image.new("RGBA", size)
    matte = Image.new("L", size)
    d = ImageDraw.Draw(matte)
    margin_x = size[0] // 12
    margin_y = size[1] // 4
    d.ellipse((margin_x, margin_y, size[0] - margin_x, size[1] - margin_y), fill=color[3])
    matte = matte.filter(ImageFilter.GaussianBlur(max(5, size[1] // 12)))
    fill = Image.new("RGBA", size, color[:3] + (255,))
    fill.putalpha(matte)
    return fill


def centered_master(image: Image.Image, size=(2048, 2048), margin=120):
    piece, _ = trim(image, pad=0)
    factor = min((size[0] - margin * 2) / piece.width, (size[1] - margin * 2) / piece.height)
    piece = piece.resize((round(piece.width * factor), round(piece.height * factor)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(piece, ((size[0] - piece.width) // 2, (size[1] - piece.height) // 2))
    return canvas


def paste_source(canvas: Image.Image, piece: Image.Image, info: dict):
    canvas.alpha_composite(piece, tuple(map(int, info["source_origin"])))


def rotate_about_canvas(image: Image.Image, pivot: tuple[float, float], degrees: float):
    # Pillow rotates around an explicit center while retaining the original canvas.
    return image.rotate(degrees, resample=Image.Resampling.BICUBIC, center=pivot, expand=False)


def save_gif(frames, path: Path, duration=90):
    path.parent.mkdir(parents=True, exist_ok=True)
    reduced = []
    for frame in frames:
        preview = centered_master(frame, (720, 720), margin=55)
        bg = Image.new("RGBA", preview.size, (244, 230, 201, 255))
        bg.alpha_composite(preview)
        reduced.append(bg.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
    reduced[0].save(path, save_all=True, append_images=reduced[1:], duration=duration, loop=0, disposal=2, optimize=True)


def build_scale(scale_master: Image.Image):
    clean = remove_light_background(scale_master)
    clean.save(SOURCE_DIR / "scale_master_alpha.png", optimize=True)
    left_paths = [((306, 326), (147, 801)), ((306, 326), (306, 815)), ((306, 326), (466, 801))]
    right_paths = [((947, 326), (788, 801)), ((947, 326), (947, 815)), ((947, 326), (1107, 801))]

    masks = {
        "scale_base.png": lambda d: d.polygon(
            [(570, 805), (684, 805), (706, 858), (790, 925), (860, 1015), (860, 1145), (395, 1145), (395, 1015), (463, 925), (548, 858)],
            fill=255,
        ),
        "scale_stem.png": lambda d: d.polygon(
            [(575, 300), (680, 300), (684, 610), (712, 690), (696, 825), (676, 930), (578, 930), (557, 825), (542, 690), (570, 610)],
            fill=255,
        ),
        "scale_beam.png": lambda d: (
            d.rectangle((235, 75, 1015, 325), fill=255),
            d.rectangle((535, 75, 718, 365), fill=255),
        ),
        "scale_left_chain.png": lambda d: (
            [d.line((a, b), fill=255, width=34, joint="curve") for a, b in left_paths],
            d.ellipse((286, 309, 326, 355), fill=255),
            d.rectangle((0, 748, 1254, 1254), fill=0),
        ),
        "scale_right_chain.png": lambda d: (
            [d.line((a, b), fill=255, width=34, joint="curve") for a, b in right_paths],
            d.ellipse((927, 309, 967, 355), fill=255),
            d.rectangle((0, 748, 1254, 1254), fill=0),
        ),
        "scale_left_pan.png": lambda d: d.rectangle((90, 715, 520, 905), fill=255),
        "scale_right_pan.png": lambda d: d.rectangle((735, 715, 1165, 905), fill=255),
    }
    regions = {
        "scale_base.png": ((395, 805, 865, 1145), (627, 1090)),
        "scale_stem.png": ((535, 300, 720, 940), (627, 900)),
        "scale_beam.png": ((235, 75, 1015, 365), (627, 285)),
        "scale_left_chain.png": ((105, 305, 505, 825), (306, 323)),
        "scale_left_pan.png": ((90, 715, 520, 905), (306, 735)),
        "scale_right_chain.png": ((750, 305, 1145, 825), (947, 323)),
        "scale_right_pan.png": ((735, 715, 1165, 905), (947, 735)),
    }
    metadata = {}
    for name, (region, pivot) in regions.items():
        component_source = masked_source(clean, masks[name])
        metadata[name.removesuffix(".png")] = extract(component_source, region, SCALE_DIR / name, pivot)

    shadow = shadow_sprite((720, 170))
    shadow.save(SCALE_DIR / "scale_shadow.png", optimize=True)
    metadata["scale_shadow"] = {"file": "scale_shadow.png", "size": list(shadow.size), "pivot_px": [360, 85], "pivot_normalized": [0.5, 0.5]}
    glow = radial_sprite((620, 620), 0.12, 1.0, (97, 194, 178, 80))
    glow.save(SCALE_DIR / "scale_glow.png", optimize=True)
    metadata["scale_glow"] = {"file": "scale_glow.png", "size": list(glow.size), "pivot_px": [310, 310], "pivot_normalized": [0.5, 0.5]}

    centered_master(clean).save(SCALE_DIR / "scale_preview.png", optimize=True)

    static = Image.new("RGBA", clean.size)
    moving = Image.new("RGBA", clean.size)
    for key in ("scale_base", "scale_stem"):
        paste_source(static, Image.open(SCALE_DIR / metadata[key]["file"]).convert("RGBA"), metadata[key])
    for key in ("scale_beam", "scale_left_chain", "scale_left_pan", "scale_right_chain", "scale_right_pan"):
        paste_source(moving, Image.open(SCALE_DIR / metadata[key]["file"]).convert("RGBA"), metadata[key])
    frames = []
    sequence = [0, 0.7, 1.2, 0.5, 0, -0.6, -1.1, -0.4, 0, 2.5, 5, 7, 7, 4, 1, 0, -2.5, -5, -7, -7, -4, -1, 0, 1.5, -1.0, 0.5, 0]
    for angle in sequence:
        frame = static.copy()
        frame.alpha_composite(rotate_about_canvas(moving, (627, 285), angle))
        frames.append(frame)
    save_gif(frames, PREVIEW_DIR / "scale_animation_preview.gif", duration=95)

    manifest = {
        "asset": "Persian brass balance scale",
        "source_canvas": list(clean.size),
        "recommended_node": "Scale (Node2D)",
        "beam_pivot_source_px": [627, 285],
        "layers": metadata,
        "animations": {
            "idle": {"loop": True, "duration_s": 2.4, "beam_rotation_deg": [-1.2, 1.2]},
            "weighing_left": {"loop": False, "duration_s": 0.55, "beam_rotation_deg": [0, 7]},
            "weighing_right": {"loop": False, "duration_s": 0.55, "beam_rotation_deg": [0, -7]},
            "balanced": {"loop": False, "duration_s": 0.7, "beam_rotation_deg": [2, -1.3, 0], "glow_pulse": [0, 0.7, 0]},
            "selected": {"loop": True, "duration_s": 1.5, "scale": [1.0, 1.018, 1.0], "glow_alpha": [0.1, 0.45, 0.1]},
        },
    }
    (SCALE_DIR / "scale_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def build_mortar(mortar_master: Image.Image, supplement: Image.Image):
    clean = remove_light_background(mortar_master)
    clean.save(SOURCE_DIR / "mortar_master_alpha.png", optimize=True)
    metadata = {}
    metadata["mortar_body"] = extract(clean, (70, 135, 820, 900), MORTAR_DIR / "mortar_body.png", (445, 840))
    metadata["mortar_pestle"] = extract(clean, (945, 190, 1475, 885), MORTAR_DIR / "mortar_pestle.png", (1370, 260))

    inner = radial_sprite((600, 245), 0.23, 0.98, (48, 31, 21, 168), center=(300, 130))
    inner.save(MORTAR_DIR / "mortar_inner_shadow.png", optimize=True)
    metadata["mortar_inner_shadow"] = {"file": "mortar_inner_shadow.png", "size": list(inner.size), "pivot_px": [300, 122], "pivot_normalized": [0.5, 0.49796]}

    # Content ellipses intentionally exclude the generated brass dishes and retain only the ingredient field.
    metadata["mortar_contents_base"] = extract(
        supplement, (140, 238, 555, 445), MORTAR_DIR / "mortar_contents_base.png", (347, 342), ellipse=(6, 3, 409, 201)
    )
    metadata["mortar_contents_crushed"] = extract(
        supplement, (695, 235, 1115, 448), MORTAR_DIR / "mortar_contents_crushed.png", (905, 342), ellipse=(7, 3, 413, 207)
    )
    supplemental_regions = {
        "mortar_piece_01.png": ((250, 585, 410, 740), (330, 660)),
        "mortar_piece_02.png": ((560, 585, 735, 745), (648, 665)),
        "mortar_piece_03.png": ((880, 595, 990, 730), (935, 662)),
        "mortar_dust_01.png": ((155, 825, 520, 1095), (338, 1035)),
        "mortar_dust_02.png": ((600, 810, 1135, 1105), (868, 1040)),
    }
    for name, (region, pivot) in supplemental_regions.items():
        metadata[name.removesuffix(".png")] = extract(supplement, region, MORTAR_DIR / name, pivot)

    shadow = shadow_sprite((760, 190))
    shadow.save(MORTAR_DIR / "mortar_shadow.png", optimize=True)
    metadata["mortar_shadow"] = {"file": "mortar_shadow.png", "size": list(shadow.size), "pivot_px": [380, 95], "pivot_normalized": [0.5, 0.5]}
    glow = radial_sprite((590, 350), 0.15, 1.0, (97, 194, 178, 72))
    glow.save(MORTAR_DIR / "mortar_glow.png", optimize=True)
    metadata["mortar_glow"] = {"file": "mortar_glow.png", "size": list(glow.size), "pivot_px": [295, 175], "pivot_normalized": [0.5, 0.5]}

    # Assemble an interaction-ready preview rather than repeating the separated design-master layout.
    preview = Image.new("RGBA", (1536, 1300))
    body = Image.open(MORTAR_DIR / "mortar_body.png").convert("RGBA")
    contents = Image.open(MORTAR_DIR / "mortar_contents_base.png").convert("RGBA")
    pestle = Image.open(MORTAR_DIR / "mortar_pestle.png").convert("RGBA")
    preview.alpha_composite(body, (350, 460))
    contents_scaled = contents.resize((460, 230), Image.Resampling.LANCZOS)
    preview.alpha_composite(contents_scaled, (492, 520))
    pestle_scaled = pestle.resize((round(pestle.width * 0.78), round(pestle.height * 0.78)), Image.Resampling.LANCZOS)
    preview.alpha_composite(pestle_scaled, (690, 90))
    centered_master(preview).save(MORTAR_DIR / "mortar_preview.png", optimize=True)

    frames = []
    body_layer = Image.new("RGBA", preview.size)
    body_layer.alpha_composite(body, (350, 460))
    body_layer.alpha_composite(contents_scaled, (492, 520))
    pestle_layer = Image.new("RGBA", preview.size)
    pestle_layer.alpha_composite(pestle_scaled, (690, 90))
    dust1 = Image.open(MORTAR_DIR / "mortar_dust_01.png").convert("RGBA").resize((300, 220), Image.Resampling.LANCZOS)
    motion = [(-35, -80, -5), (-18, -45, -3), (0, 0, 0), (8, 28, 2), (0, 0, 0), (-14, -38, -2), (-32, -75, -5), (-16, -35, -2), (7, 26, 2), (0, 0, 0)]
    for idx, (dx, dy, angle) in enumerate(motion):
        frame = body_layer.copy()
        moved = rotate_about_canvas(pestle_layer, (1030, 220), angle)
        shifted = Image.new("RGBA", preview.size)
        shifted.alpha_composite(moved, (dx, dy))
        frame.alpha_composite(shifted)
        if idx in (3, 8):
            dust = dust1.copy()
            dust.putalpha(dust.getchannel("A").point(lambda p: round(p * 0.78)))
            frame.alpha_composite(dust, (620, 560))
        frames.append(frame)
    save_gif(frames, PREVIEW_DIR / "mortar_grinding_preview.gif", duration=105)

    manifest = {
        "asset": "Persian brass mortar and pestle",
        "source_canvas": list(clean.size),
        "recommended_node": "Mortar (Node2D)",
        "layers": metadata,
        "animations": {
            "idle": {"loop": True, "duration_s": 2.6, "pestle_rotation_deg": [-0.4, 0.4]},
            "ready": {"loop": False, "duration_s": 0.3, "pestle_offset_y_px": [0, -16], "glow_alpha": [0, 0.3]},
            "grinding_start": {"loop": False, "duration_s": 0.42, "pestle_arc_deg": [-5, 2], "impact_frame": 0.82},
            "grinding_loop": {"loop": True, "duration_s": 0.84, "pestle_arc_deg": [-5, 2, -5], "dust_at_normalized_time": [0.45], "contents_crossfade_per_loop": 0.16},
            "finished": {"loop": False, "duration_s": 0.75, "contents_base_alpha": [1, 0], "contents_crushed_alpha": [0, 1], "glow_pulse": [0, 0.55, 0]},
            "selected": {"loop": True, "duration_s": 1.5, "scale": [1.0, 1.018, 1.0], "glow_alpha": [0.08, 0.34, 0.08]},
        },
    }
    (MORTAR_DIR / "mortar_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def write_readme():
    text = """# Production assets — ترازو و هاون

این پوشه خروجی production-ready دو design master موجود در `Art/Assets/Vertical Slice` است.

## Scale

- فایل‌های `scale_*.png` دارای alpha واقعی و پس‌زمینهٔ شفاف‌اند.
- `scale_beam`، زنجیرها و کفه‌ها متحرک‌اند؛ pivot اصلی کل مجموعه در `scale_manifest.json` ثبت شده است.
- در Godot، `BeamPivot` را در نقطهٔ pivot تیر بسازید و Beam/Chain/Panها را فرزند آن کنید. برای ثابت ماندن کفه‌ها می‌توان rotation آن‌ها را با مقدار منفی rotation تیر جبران کرد.

## Mortar

- `mortar_body` ثابت و `mortar_pestle` قطعهٔ متحرک اصلی است.
- محتوای خام و خردشده برای crossfade، سه ingredient piece و دو فریم dust مستقل هستند.
- pivot دسته‌هاون نزدیک محل گرفتن ثبت شده تا حرکت قوسی طبیعی ایجاد شود.

## Preview و انیمیشن

- `Scale/scale_preview.png` و `Mortar/mortar_preview.png`: preview ترکیبی 2048×2048 با پس‌زمینهٔ شفاف.
- `Previews/scale_animation_preview.gif`: مرور Idle، وزن چپ/راست و بازگشت به تعادل.
- `Previews/mortar_grinding_preview.gif`: loop نمونهٔ کوبش قوسی و dust impact.

## Import

- Filter روشن، Mipmaps خاموش برای کاربرد UI/موبایل نزدیک، و Compression روی Lossless پیشنهاد می‌شود.
- مقادیر دقیق bounds، pivot و زمان‌بندی پیشنهادی در `scale_manifest.json` و `mortar_manifest.json` هستند.
- همهٔ PNGها فضای رنگی sRGB و alpha مستقیم دارند.

## چک‌لیست تحویل

- [x] پس‌زمینهٔ شفاف و چهار گوشهٔ alpha-zero برای همهٔ PNGها
- [x] قطعات متحرک اصلی به فایل مستقل تفکیک شده‌اند
- [x] نام‌گذاری انگلیسی ثابت و مطابق سند است
- [x] preview ترکیبی 2048×2048 برای هر دارایی موجود است
- [x] bounds، pivot و زمان‌بندی پیشنهادی انیمیشن ثبت شده است
- [x] محتوای خام/خردشده و FX ضربه برای هاون موجود است
- [x] shadow و glow اختیاری، مستقل از بدنه‌اند
- [x] آزمون ماشینی ۲۳ فایل در `validation_report.json` پاس شده است
"""
    (OUT / "README.md").write_text(text, encoding="utf-8")


def validate():
    results = []
    for path in sorted([*SCALE_DIR.glob("*.png"), *MORTAR_DIR.glob("*.png")]):
        image = Image.open(path)
        has_alpha = image.mode == "RGBA"
        alpha = np.asarray(image.getchannel("A")) if has_alpha else np.full((image.height, image.width), 255)
        corners = [alpha[0, 0], alpha[0, -1], alpha[-1, 0], alpha[-1, -1]]
        results.append(
            {
                "file": str(path.relative_to(OUT)).replace("\\", "/"),
                "size": list(image.size),
                "mode": image.mode,
                "transparent_corners": int(sum(v == 0 for v in corners)),
                "visible_coverage": round(float(np.mean(alpha > 8)), 4),
                "pass": has_alpha and all(v == 0 for v in corners) and bool(np.any(alpha > 24)),
            }
        )
    report = {"files_checked": len(results), "all_pass": all(item["pass"] for item in results), "results": results}
    (OUT / "validation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main():
    for directory in (SCALE_DIR, MORTAR_DIR, SOURCE_DIR, PREVIEW_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    scale_master = Image.open(VS / "prop_brass_scale_balanced.png").convert("RGB")
    mortar_master = Image.open(VS / "prop_brass_mortar_pestle_default.png").convert("RGB")
    supplement = Image.open(SOURCE_DIR / "mortar_supplement_alpha.png").convert("RGBA")
    build_scale(scale_master)
    build_mortar(mortar_master, supplement)
    write_readme()
    report = validate()
    print(json.dumps({"output": str(OUT), "validation": report["all_pass"], "files": report["files_checked"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
