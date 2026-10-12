from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "social-campaigns" / "2026-10-12"
W, H = 1080, 1350
BG = (7, 8, 12)
PANEL = (17, 20, 28)
RED = (255, 48, 70)
WHITE = (246, 247, 250)
MUTED = (184, 190, 202)
GREEN = (18, 211, 129)

DISPLAY = ROOT / "public" / "fonts" / "darth-social" / "BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SOURCE = ROOT / "public" / "indicators" / "swing-risk-plan.png"
LOGO = ROOT / "public" / "darth-algo-social-logo.png"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def backdrop() -> Image.Image:
    image = Image.new("RGB", (W, H), BG)
    pixels = image.load()
    for y in range(H):
        for x in range(W):
            edge = max(0.0, 1.0 - abs(x - W) / W)
            glow = max(0.0, 1.0 - (((x - 1040) / 640) ** 2 + ((y - 780) / 900) ** 2))
            shade = int(7 * y / H)
            pixels[x, y] = (7 + int(22 * glow), 8 + int(3 * edge), 12 + shade + int(3 * glow))
    draw = ImageDraw.Draw(image)
    draw.polygon([(0, 0), (290, 0), (0, 980)], fill=(12, 14, 20))
    draw.polygon([(W, 430), (W, H), (795, H)], fill=(24, 8, 15))
    draw.line([(0, 122), (W, 122)], fill=(73, 28, 38), width=2)
    draw.line([(0, 1006), (W, 872)], fill=(86, 19, 31), width=3)
    draw.line([(0, 1036), (W, 902)], fill=(34, 24, 30), width=1)
    return image


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / image.width, height / image.height)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    image = backdrop()
    draw = ImageDraw.Draw(image)

    logo = Image.open(LOGO).convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
    image.paste(logo, (58, 24), logo)
    draw.text((168, 34), "DARTH ALGO", font=font(SUPPORT, 34), fill=WHITE)
    draw.text((168, 75), "SWING · CHART LESSON", font=font(SUPPORT, 22), fill=RED)

    source = Image.open(SOURCE).convert("RGB")
    chart = fit(source, 900, 570)
    chart_x = 90
    chart_y = 184
    draw.rounded_rectangle((54, 150, 1026, 766), radius=24, fill=PANEL, outline=(95, 32, 45), width=3)
    draw.rectangle((chart_x - 5, chart_y - 5, chart_x + chart.width + 5, chart_y + chart.height + 5), fill=(7, 9, 15))
    image.paste(chart, (chart_x, chart_y))
    draw.line((54, 150, 355, 150), fill=RED, width=7)
    draw.line((724, 766, 1026, 766), fill=GREEN, width=5)

    draw.text((58, 812), "A TARGET LINE", font=font(DISPLAY, 112), fill=WHITE)
    draw.text((58, 904), "ISN'T A FILL.", font=font(DISPLAY, 128), fill=RED)
    draw.text((62, 1038), "Plan the level on your chart.", font=font(SUPPORT, 46), fill=WHITE)
    draw.text((62, 1097), "Confirm execution in your broker record.", font=font(SUPPORT, 44), fill=MUTED)

    draw.line((58, 1192, 1022, 1192), fill=(89, 31, 43), width=2)
    draw.text((58, 1221), "SAVE THIS DISTINCTION", font=font(DISPLAY, 62), fill=WHITE)
    draw.text((638, 1219), "→", font=font(SUPPORT, 52), fill=RED)
    draw.text((58, 1291), "DARTHALGO.COM", font=font(SUPPORT, 40), fill=MUTED)

    image.save(OUT / "target-line-not-fill-6614fd43ab62.png", optimize=True)


if __name__ == "__main__":
    main()
