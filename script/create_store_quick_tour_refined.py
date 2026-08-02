from __future__ import annotations

from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "store-listing"
SOURCES = OUT / "sources"
W, H = 1280, 800
REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

BG = (7, 19, 22)
TEXT = "#eef4f2"
MUTED = "#91a29f"
ACCENT = "#76c9bc"
ACCENT_SOFT = "#315e5a"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def make_background():
    image = Image.new("RGB", (W, H), BG)
    pixels = image.load()
    for y in range(H):
        for x in range(W):
            left = max(0.0, 1.0 - (((x - 500) / 560) ** 2 + ((y - 430) / 620) ** 2))
            right = max(0.0, 1.0 - (((x - 1010) / 520) ** 2 + ((y - 350) / 600) ** 2))
            pixels[x, y] = (
                7 + int(2 * left + 2 * right),
                19 + int(7 * left + 6 * right),
                22 + int(7 * left + 8 * right),
            )
    return image


def fit_height(image: Image.Image, height: int):
    scale = height / image.height
    return image.resize((round(image.width * scale), height), Image.Resampling.LANCZOS)


def paste_with_glow(canvas: Image.Image, panel: Image.Image, x: int, y: int):
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle((x - 16, y - 16, x + panel.width + 16, y + panel.height + 16), 22, fill=(55, 133, 122, 34))
    glow = glow.filter(ImageFilter.GaussianBlur(34))
    canvas.paste(glow, (0, 0), glow)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x - 4, y - 3, x + panel.width + 4, y + panel.height + 7), 9, fill=(0, 0, 0, 125))
    shadow = shadow.filter(ImageFilter.GaussianBlur(13))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(panel, (x, y))


def cubic(start, c1, c2, end, count=70):
    result = []
    for i in range(count + 1):
        t = i / count
        mt = 1 - t
        result.append((
            mt**3 * start[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * end[0],
            mt**3 * start[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * end[1],
        ))
    return result


def pointer(draw: ImageDraw.ImageDraw, start, end, direction="right"):
    if direction == "right":
        delta = max(26, (end[0] - start[0]) * 0.45)
        points = cubic(start, (start[0] + delta, start[1]), (end[0] - 28, end[1]), end)
    elif direction == "down":
        points = cubic(start, (start[0], start[1] + 22), (end[0], end[1] - 24), end)
    else:
        points = cubic(start, (start[0], start[1] - 22), (end[0], end[1] + 24), end)
    draw.line(points, fill=ACCENT, width=2, joint="curve")
    angle = atan2(points[-1][1] - points[-4][1], points[-1][0] - points[-4][0])
    length = 8
    spread = 0.62
    a = (end[0] - length * cos(angle - spread), end[1] - length * sin(angle - spread))
    b = (end[0] - length * cos(angle + spread), end[1] - length * sin(angle + spread))
    draw.line((a, end, b), fill=ACCENT, width=2, joint="curve")
    draw.ellipse((end[0] - 2, end[1] - 2, end[0] + 2, end[1] + 2), fill=ACCENT)


def callout(draw: ImageDraw.ImageDraw, x: int, y: int, eyebrow: str, title: str, body: str):
    draw.text((x, y), eyebrow.upper(), font=font(10, True), fill=ACCENT)
    draw.text((x, y + 17), title, font=font(18, True), fill=TEXT)
    draw.text((x, y + 44), body, font=font(12), fill=MUTED)
    return x + 250, y + 31


def main():
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)

    icon = Image.open(ROOT / "Extension" / "icons" / "browser-monitor-128.png").convert("RGBA")
    icon.thumbnail((38, 38), Image.Resampling.LANCZOS)
    canvas.paste(icon, (46, 34), icon)
    draw.text((96, 36), "Browser Monitor", font=font(24, True), fill=TEXT)
    draw.text((46, 93), "Know what matters. Act in one click.", font=font(29, True), fill=TEXT)
    draw.text((47, 132), "A focused guide to the controls you’ll use most.", font=font(14), fill=MUTED)

    overview_source = Image.open(SOURCES / "browser-monitor-overview-current.png").convert("RGB")
    details_source = Image.open(SOURCES / "browser-monitor-tab-details-current.png").convert("RGB")
    overview = fit_height(overview_source, 500)
    details = fit_height(details_source, 500)
    overview_pos = (350, 165)
    details_pos = (820, 185)
    paste_with_glow(canvas, overview, *overview_pos)
    paste_with_glow(canvas, details, *details_pos)

    scale = overview.height / overview_source.height
    def mark(pos, raw_x, raw_y):
        return (pos[0] + raw_x * scale, pos[1] + raw_y * scale)

    a = callout(draw, 46, 205, "Navigation", "Header shortcuts", "Activity · Stats · Settings · On/Off")
    pointer(draw, a, mark(overview_pos, 620, 82))

    b = callout(draw, 46, 315, "Protection", "Protection status", "Filters, status, and the main switch")
    pointer(draw, b, mark(overview_pos, 730, 225))

    c = callout(draw, 46, 425, "Current site", "Site actions", "Exclude · Pause · Clean data · Receipt")
    pointer(draw, c, mark(overview_pos, 710, 405))

    d = callout(draw, 46, 535, "Tab activity", "Workload at a glance", "Score shows load · Pause stops background work")
    pointer(draw, d, mark(overview_pos, 690, 650))

    draw.text((820, 52), "TAB DETAILS", font=font(10, True), fill=ACCENT)
    draw.text((820, 70), "Metrics, translated", font=font(18, True), fill=TEXT)

    draw.text((820, 103), "Responsiveness", font=font(11, True), fill="#cbd7d4")
    draw.text((820, 120), "Long frames · Blocking", font=font(11), fill=MUTED)
    draw.text((820, 143), "Page weight", font=font(11, True), fill="#cbd7d4")
    draw.text((820, 160), "Resources · Transfer · Media", font=font(11), fill=MUTED)

    draw.text((1040, 103), "Stability", font=font(11, True), fill="#cbd7d4")
    draw.text((1040, 120), "Layout shifts", font=font(11), fill=MUTED)
    draw.text((1040, 143), "Context", font=font(11, True), fill="#cbd7d4")
    draw.text((1040, 160), "Background work · Sample time", font=font(11), fill=MUTED)
    pointer(draw, (1017, 166), mark(details_pos, 420, 340), direction="down")

    draw.line((350, 708, 700, 708), fill=ACCENT_SOFT, width=1)
    draw.text((350, 722), "FEEDBACK", font=font(10, True), fill=ACCENT)
    draw.text((350, 739), "Report a site problem", font=font(15, True), fill=TEXT)
    draw.text((350, 762), "Refresh updates the local snapshot.", font=font(12), fill=MUTED)
    pointer(draw, (660, 741), mark(overview_pos, 710, 1140), direction="up")

    destination = OUT / "store-guide-quick-tour-refined-v2.png"
    canvas.save(destination, quality=96)
    print(destination)


if __name__ == "__main__":
    main()
