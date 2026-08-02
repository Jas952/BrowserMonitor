from __future__ import annotations

from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "store-listing"
SOURCES = OUT / "sources"
WIDTH, HEIGHT = 1280, 800
REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
INK = "#eff5f3"
MUTED = "#9aabaa"
ACCENT = "#73c1b5"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def background():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#061416")
    pixels = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            glow = max(0.0, 1.0 - (((x - 940) / 920) ** 2 + ((y - 310) / 820) ** 2))
            pixels[x, y] = (6 + int(glow * 2), 20 + int(glow * 5), 22 + int(glow * 5))
    return image


def fit(source: Image.Image, height: int):
    scale = height / source.height
    return source.resize((round(source.width * scale), height), Image.Resampling.LANCZOS)


def curve_points(start, control1, control2, end, steps=54):
    points = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        points.append((
            mt**3 * start[0] + 3 * mt**2 * t * control1[0] + 3 * mt * t**2 * control2[0] + t**3 * end[0],
            mt**3 * start[1] + 3 * mt**2 * t * control1[1] + 3 * mt * t**2 * control2[1] + t**3 * end[1],
        ))
    return points


def friendly_arrow(draw: ImageDraw.ImageDraw, start, end, vertical=False):
    if vertical:
        direction = 1 if end[1] > start[1] else -1
        points = curve_points(
            start,
            (start[0], start[1] + direction * 34),
            (end[0] - 18, end[1] - direction * 30),
            end,
        )
    else:
        distance = max(48, (end[0] - start[0]) * 0.42)
        points = curve_points(start, (start[0] + distance, start[1] - 8), (end[0] - 45, end[1] + 8), end)
    dash, gap = 10.0, 7.0
    pattern = dash + gap
    travelled = 0.0
    for index in range(len(points) - 1):
        x1, y1 = points[index]
        x2, y2 = points[index + 1]
        segment = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        if segment == 0:
            continue
        offset = 0.0
        while offset < segment:
            phase = (travelled + offset) % pattern
            amount = min(segment - offset, (dash if phase < dash else pattern) - phase)
            if phase < dash:
                a = offset / segment
                b = (offset + amount) / segment
                p1 = (x1 + (x2 - x1) * a, y1 + (y2 - y1) * a)
                p2 = (x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)
                draw.line((p1, p2), fill=ACCENT, width=3)
            offset += amount
        travelled += segment
    angle = atan2(points[-1][1] - points[-4][1], points[-1][0] - points[-4][0])
    length = 11
    spread = 0.68
    p1 = (end[0] - length * cos(angle - spread), end[1] - length * sin(angle - spread))
    p2 = (end[0] - length * cos(angle + spread), end[1] - length * sin(angle + spread))
    draw.line((p1, end, p2), fill=ACCENT, width=3, joint="curve")


def label(draw, x, y, title, lines, width=410):
    draw.text((x, y), title, font=font(18, True), fill=INK)
    line_y = y + 28
    for line in lines:
        draw.text((x, line_y), line, font=font(13), fill=MUTED)
        line_y += 19
    return (x + width, y + 21)


def paste_panel(canvas, image, x, y):
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x - 3, y - 3, x + image.width + 3, y + image.height + 6), radius=8, fill=(0, 0, 0, 105))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(image, (x, y))


def main():
    canvas = background()
    draw = ImageDraw.Draw(canvas)

    icon = Image.open(ROOT / "Extension" / "icons" / "browser-monitor-128.png").convert("RGBA")
    icon.thumbnail((40, 40), Image.Resampling.LANCZOS)
    canvas.paste(icon, (48, 36), icon)
    draw.text((100, 39), "Browser Monitor", font=font(25, True), fill=INK)
    draw.text((48, 105), "A quick tour", font=font(31, True), fill=INK)
    draw.text((48, 145), "The essentials — without the manual", font=font(15), fill=MUTED)

    overview_src = Image.open(SOURCES / "browser-monitor-overview-current.png").convert("RGB")
    details_src = Image.open(SOURCES / "browser-monitor-tab-details-current.png").convert("RGB")
    overview = fit(overview_src, 455)
    details = fit(details_src, 455)
    overview_pos = (600, 172)
    details_pos = (935, 172)
    paste_panel(canvas, overview, *overview_pos)
    paste_panel(canvas, details, *details_pos)

    scale = overview.height / overview_src.height
    def target(pos, raw_x, raw_y):
        return (pos[0] + raw_x * scale, pos[1] + raw_y * scale)

    starts = []
    starts.append((label(draw, 48, 205, "Header shortcuts", ["Activity · statistics · settings · main switch"]), target(overview_pos, 610, 82)))
    starts.append((label(draw, 48, 290, "Protection", ["Filter status and the main protection control"]), target(overview_pos, 735, 230)))
    starts.append((label(draw, 48, 375, "Selected site", ["On regular sites: exclude · pause · clean data · receipt"]), target(overview_pos, 710, 410)))
    starts.append((label(draw, 48, 460, "Tab activity", ["Score shows workload · Pause suspends background work"]), target(overview_pos, 675, 650)))

    for start, end in starts:
        friendly_arrow(draw, start, end)

    feedback_start = label(draw, 500, 688, "Feedback & refresh", ["Report a site issue or update the local snapshot"], width=300)
    feedback_end = target(overview_pos, 710, 1140)
    friendly_arrow(draw, feedback_start, feedback_end, vertical=True)

    metrics_start = label(
        draw,
        915,
        82,
        "Tab metrics",
        [
            "Responsiveness: long frames + blocking",
            "Page weight: resources + transferred + media",
            "Layout: shifts · Background: work · Sample: time",
        ],
        width=150,
    )
    metrics_end = target(details_pos, 410, 340)
    friendly_arrow(draw, metrics_start, metrics_end, vertical=True)

    destination = OUT / "store-guide-quick-tour-current.png"
    canvas.save(destination, quality=96)
    print(destination)


if __name__ == "__main__":
    main()
