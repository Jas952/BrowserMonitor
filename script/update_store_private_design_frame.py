from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "store-listing" / "04-private-by-design.png"
WINDOW_TOP = 194
WINDOW_BOTTOM = 680
CORNER_RADIUS = 14
SUPERSAMPLE = 4


def round_window_corners(image: Image.Image, x: int, width: int):
    height = WINDOW_BOTTOM - WINDOW_TOP
    window = image.crop((x, WINDOW_TOP, x + width, WINDOW_BOTTOM))

    # Reconstruct only the tiny areas revealed by the rounded bottom corners.
    background = Image.new("RGB", window.size)
    bg_draw = ImageDraw.Draw(background)
    for local_x in range(width):
        top_color = image.getpixel((x + local_x, 185))
        bottom_color = image.getpixel((x + local_x, 706))
        bg_draw.line((local_x, 0, local_x, height // 2), fill=top_color)
        bg_draw.line((local_x, height // 2, local_x, height), fill=bottom_color)

    scale = SUPERSAMPLE
    mask = Image.new("L", (width * scale, height * scale), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(
        (0, 0, width * scale - 1, height * scale - 1),
        radius=CORNER_RADIUS * scale,
        fill=255,
    )
    mask = mask.resize((width, height), Image.Resampling.LANCZOS)

    rounded = Image.composite(window, background, mask)
    image.paste(rounded, (x, WINDOW_TOP))


def main():
    image = Image.open(TARGET).convert("RGB")
    draw = ImageDraw.Draw(image)

    # Remove the two remnants of the previous, taller screenshot frames. The
    # pixel immediately below each column is the uninterrupted artwork
    # background, so extending it upward produces a seamless crop.
    for start_x, end_x in ((48, 805), (836, 1232)):
        for x in range(start_x, end_x + 1):
            background = image.getpixel((x, 706))
            draw.line((x, 680, x, 700), fill=background)

    round_window_corners(image, 48, 757)
    round_window_corners(image, 836, 396)

    image.save(TARGET, quality=96)
    print(TARGET)


if __name__ == "__main__":
    main()
