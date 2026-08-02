from __future__ import annotations

from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "store-listing"
SOURCES = OUT / "sources"
SIZE = (1280, 800)

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def rounded_gradient() -> Image.Image:
    canvas = Image.new("RGB", SIZE, "#0b1114")
    px = canvas.load()
    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            teal = max(0.0, 1.0 - (((x - 1060) / 850) ** 2 + ((y - 120) / 760) ** 2))
            blue = max(0.0, 1.0 - (((x - 260) / 700) ** 2 + ((y - 760) / 550) ** 2))
            px[x, y] = (
                int(11 + 4 * teal + 2 * blue),
                int(17 + 16 * teal + 5 * blue),
                int(20 + 15 * teal + 12 * blue),
            )
    return canvas


def fit_image(source: Image.Image, max_width: int, max_height: int) -> Image.Image:
    scale = min(max_width / source.width, max_height / source.height)
    size = (round(source.width * scale), round(source.height * scale))
    return source.resize(size, Image.Resampling.LANCZOS)


def cubic(start, control1, control2, end, steps=36):
    points = []
    for index in range(steps + 1):
        t = index / steps
        mt = 1 - t
        x = mt**3 * start[0] + 3 * mt**2 * t * control1[0] + 3 * mt * t**2 * control2[0] + t**3 * end[0]
        y = mt**3 * start[1] + 3 * mt**2 * t * control1[1] + 3 * mt * t**2 * control2[1] + t**3 * end[1]
        points.append((x, y))
    return points


def arrow(draw: ImageDraw.ImageDraw, start, end, color="#78c9bd"):
    bend = max(25, (end[0] - start[0]) * 0.42)
    points = cubic(start, (start[0] + bend, start[1]), (end[0] - 34, end[1]), end)
    draw.line(points, fill=color, width=3, joint="curve")
    angle = atan2(points[-1][1] - points[-3][1], points[-1][0] - points[-3][0])
    length = 9
    spread = 0.7
    p1 = (end[0] - length * cos(angle - spread), end[1] - length * sin(angle - spread))
    p2 = (end[0] - length * cos(angle + spread), end[1] - length * sin(angle + spread))
    draw.polygon([end, p1, p2], fill=color)


def callout(draw: ImageDraw.ImageDraw, number: int, y: int, title: str, body: str, target):
    x, w, h = 48, 500, 68
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill="#141d21")
    draw.ellipse((x + 15, y + 15, x + 53, y + 53), fill="#78c9bd")
    n = str(number)
    nfont = font(17, True)
    box = draw.textbbox((0, 0), n, font=nfont)
    draw.text((x + 34 - (box[2] - box[0]) / 2, y + 34 - (box[3] - box[1]) / 2 - 1), n, font=nfont, fill="#071214")
    draw.text((x + 68, y + 11), title, font=font(20, True), fill="#f4f7f6")
    draw.text((x + 68, y + 38), body, font=font(14), fill="#9eaaad")
    arrow(draw, (x + w + 8, y + h / 2), target)


def highlight(overlay: Image.Image, box, color=(120, 201, 189, 255)):
    draw = ImageDraw.Draw(overlay, "RGBA")
    draw.rounded_rectangle(box, radius=11, fill=(120, 201, 189, 26), outline=color, width=3)


def shadowed_panel(canvas: Image.Image, screenshot: Image.Image, x: int, y: int):
    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x - 5, y - 5, x + screenshot.width + 5, y + screenshot.height + 8), radius=8, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(screenshot, (x, y))


def transform_box(box, source_size, position, rendered_size):
    sx = rendered_size[0] / source_size[0]
    sy = rendered_size[1] / source_size[1]
    return (
        position[0] + box[0] * sx,
        position[1] + box[1] * sy,
        position[0] + box[2] * sx,
        position[1] + box[3] * sy,
    )


def build_main():
    source = Image.open(SOURCES / "browser-monitor-overview-current.png").convert("RGB")
    rendered = fit_image(source, 455, 680)
    pos = (770, 58)
    canvas = rounded_gradient()
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.text((48, 42), "Everything within reach", font=font(33, True), fill="#f4f7f6")
    draw.text((49, 83), "A quick map of Browser Monitor’s main screen", font=font(17), fill="#8fa0a4")
    shadowed_panel(canvas, rendered, *pos)

    raw_boxes = [
        (500, 42, 812, 125),
        (30, 145, 810, 330),
        (575, 340, 812, 455),
        (28, 485, 812, 860),
        (28, 965, 812, 1078),
        (620, 1080, 815, 1195),
    ]
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    boxes = [transform_box(box, source.size, pos, rendered.size) for box in raw_boxes]
    for box in boxes:
        highlight(overlay, box)
    canvas.paste(overlay, (0, 0), overlay)
    draw = ImageDraw.Draw(canvas, "RGBA")

    texts = [
        ("Header controls", "Activity · stats · settings · master switch"),
        ("Protection", "Filter status and protection for the browser"),
        ("Current site", "Pause 10 min · clean site data · privacy receipt"),
        ("Tab activity", "See busy tabs and pause any tab separately"),
        ("Quick tools", "PiP · cookies · element blocker · statistics"),
        ("Feedback & refresh", "Report a problem or refresh the local snapshot"),
    ]
    ys = [130, 215, 300, 385, 470, 555]
    for index, ((title, body), y, box) in enumerate(zip(texts, ys, boxes), start=1):
        target = (box[0], (box[1] + box[3]) / 2)
        callout(draw, index, y, title, body, target)

    canvas.save(OUT / "store-guide-main-controls-current.png", quality=96)


def build_details():
    source = Image.open(SOURCES / "browser-monitor-tab-details-current.png").convert("RGB")
    rendered = fit_image(source, 455, 690)
    pos = (770, 55)
    canvas = rounded_gradient()
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.text((48, 42), "Understand every tab", font=font(33, True), fill="#f4f7f6")
    draw.text((49, 83), "Clear measurements, context, and one simple action", font=font(17), fill="#8fa0a4")
    shadowed_panel(canvas, rendered, *pos)

    raw_boxes = [
        (35, 28, 812, 145),
        (34, 182, 812, 475),
        (34, 485, 812, 930),
        (34, 955, 812, 1172),
    ]
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    boxes = [transform_box(box, source.size, pos, rendered.size) for box in raw_boxes]
    for box in boxes:
        highlight(overlay, box)
    canvas.paste(overlay, (0, 0), overlay)
    draw = ImageDraw.Draw(canvas, "RGBA")

    texts = [
        ("Tab summary", "Go back, identify the site, and check its score"),
        ("Live measurements", "Frames · blocking · layout · resources · media"),
        ("Why it matters", "A short explanation of what Browser Monitor found"),
        ("Recommendation", "A clear next step with a one-click tab action"),
    ]
    ys = [160, 280, 400, 520]
    for index, ((title, body), y, box) in enumerate(zip(texts, ys, boxes), start=1):
        target = (box[0], (box[1] + box[3]) / 2)
        callout(draw, index, y, title, body, target)

    canvas.save(OUT / "store-guide-tab-details-current.png", quality=96)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_main()
    build_details()
