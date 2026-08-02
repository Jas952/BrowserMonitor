from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "store-listing"
SOURCES = OUT / "sources"
W, H = 1280, 800

REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

BACKGROUND = "#071416"
TEXT = "#eef3f1"
MUTED = "#98a7a4"
ACCENT = "#84bbae"
LINE = "#477f7c"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def fit_height(image: Image.Image, height: int):
    ratio = height / image.height
    return image.resize((round(image.width * ratio), height), Image.Resampling.LANCZOS)


def panel(canvas: Image.Image, source: Image.Image, x: int, y: int):
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x - 4, y - 3, x + source.width + 4, y + source.height + 7), radius=10, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(source, (x, y))

    fade = Image.new("RGBA", (source.width, 115), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for row in range(fade.height):
        alpha = round(112 * (row / max(1, fade.height - 1)) ** 1.35)
        fd.line((0, row, fade.width, row), fill=(6, 23, 25, alpha))
    canvas.paste(fade, (x, y + source.height - fade.height), fade)


def leader(canvas: Image.Image, points):
    """Draw an antialiased leader without raster stair-stepping."""
    factor = 4
    layer = Image.new("RGBA", (W * factor, H * factor), (0, 0, 0, 0))
    high = ImageDraw.Draw(layer)
    scaled = [(round(x * factor), round(y * factor)) for x, y in points]
    high.line(scaled, fill=LINE, width=7, joint="curve")

    x, y = scaled[-1]
    outer = 7 * factor
    inner = 2 * factor
    high.ellipse(
        (x - outer, y - outer, x + outer, y + outer),
        fill=BACKGROUND,
        outline=LINE,
        width=7,
    )
    high.ellipse((x - inner, y - inner, x + inner, y + inner), fill=ACCENT)

    layer = layer.resize((W, H), Image.Resampling.LANCZOS)
    canvas.paste(layer, (0, 0), layer)


def callout(draw: ImageDraw.ImageDraw, y: int, title: str, body: str):
    draw.rounded_rectangle((30, y, 35, y + 60), radius=3, fill=ACCENT)
    draw.text((50, y + 2), title, font=font(18, True), fill=TEXT)
    draw.text((50, y + 31), body, font=font(13), fill=MUTED)


def main():
    canvas = Image.new("RGB", (W, H), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    icon = Image.open(ROOT / "Extension" / "icons" / "browser-monitor-128.png").convert("RGBA")
    icon.thumbnail((44, 44), Image.Resampling.LANCZOS)
    canvas.paste(icon, (30, 19), icon)
    draw.text((90, 20), "Browser Monitor", font=font(29, True), fill=TEXT)
    draw.text((91, 54), "FEATURE MAP", font=font(11, True), fill=ACCENT)

    draw.text((30, 98), "Know what needs attention — and why", font=font(30, True), fill=TEXT)
    draw.text((31, 137), "A compact overview leads to clear details for the current tab.", font=font(14), fill=MUTED)

    overview_source = Image.open(SOURCES / "browser-monitor-overview-current.png").convert("RGB")
    details_source = Image.open(SOURCES / "browser-monitor-tab-details-current.png").convert("RGB")
    overview = fit_height(overview_source, 455)
    details = fit_height(details_source, 455)
    overview_pos = (570, 165)
    details_pos = (930, 165)
    panel(canvas, overview, *overview_pos)
    panel(canvas, details, *details_pos)

    draw.text((570, 137), "OVERVIEW", font=font(10, True), fill=ACCENT)
    draw.text((930, 137), "TAB DETAILS", font=font(10, True), fill=ACCENT)

    callout(draw, 210, "Protection status", "See whether protection is active and pause it instantly.")
    callout(draw, 315, "Current site controls", "Exclude, pause, clean site data, or open the receipt.")
    callout(draw, 420, "Tab health", "Spot tabs that need attention before they slow you down.")
    callout(draw, 550, "Detailed diagnosis", "Review metrics, reasons, and the recommended action.")

    scale = overview.height / overview_source.height
    def target(pos, raw_x, raw_y):
        return (round(pos[0] + raw_x * scale), round(pos[1] + raw_y * scale))

    # End every leader on the outside edge of its section. The lines never run
    # across labels, values, buttons, or metric cards inside the screenshots.
    protection = target(overview_pos, 25, 225)
    site = target(overview_pos, 25, 410)
    tab = target(overview_pos, 25, 650)
    diagnosis = target(details_pos, 34, 650)

    leader(canvas, [(425, 238), (505, 238), (545, protection[1]), protection])
    leader(canvas, [(425, 343), (505, 343), (545, site[1]), site])
    leader(canvas, [(425, 448), (505, 448), (545, tab[1]), tab])
    leader(canvas, [
        (425, 602),
        (500, 602),
        (540, 645),
        (910, 645),
        (910, diagnosis[1]),
        diagnosis,
    ])

    draw.text((30, 711), "Everything stays local on this device.", font=font(14, True), fill=ACCENT)
    draw.text((30, 739), "No account · no cloud analytics · reversible controls", font=font(13), fill=MUTED)

    destination = OUT / "store-feature-map-aligned-v2.png"
    canvas.save(destination, quality=96)
    print(destination)


if __name__ == "__main__":
    main()
