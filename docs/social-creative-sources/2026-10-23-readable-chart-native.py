from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "social-campaigns" / "2026-10-23"
W, H = 1080, 1350
BG = (7, 8, 12)
PANEL = (16, 18, 24)
RED = (255, 45, 67)
WHITE = (246, 247, 250)
MUTED = (185, 190, 201)

DISPLAY = ROOT / "public" / "fonts" / "darth-social" / "BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SOURCE = ROOT / "public" / "indicators" / "signal-context-alt.png"
LOGO = ROOT / "public" / "darth-algo-social-logo.png"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit_inside(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    scale = min(box[0] / image.width, box[1] / image.height, 1.0)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)


def backdrop() -> Image.Image:
    im = Image.new("RGB", (W, H), BG)
    px = im.load()
    for y in range(H):
        for x in range(W):
            glow = max(0.0, 1.0 - (((x - 140) / 820) ** 2 + ((y - 1120) / 720) ** 2))
            lift = int(14 * glow)
            px[x, y] = (7 + lift, 8 + lift // 4, 12 + lift // 3)
    d = ImageDraw.Draw(im)
    d.polygon([(0, 0), (330, 0), (100, H), (0, H)], fill=(12, 13, 18))
    d.polygon([(W, 0), (W, 430), (880, 0)], fill=(43, 7, 14))
    d.line([(50, 0), (0, 320)], fill=RED, width=4)
    d.line([(W, 235), (910, 0)], fill=(119, 20, 34), width=3)
    d.line([(0, 1210), (W, 1015)], fill=(77, 17, 28), width=2)
    for y in range(760, H, 58):
        d.line([(0, y), (W, y - 150)], fill=(22, 24, 31), width=1)
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    im = backdrop()
    d = ImageDraw.Draw(im)

    logo = Image.open(LOGO).convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
    im.paste(logo, (56, 42), logo)
    d.text((164, 48), "DARTH ALGO", font=font(SUPPORT, 36), fill=WHITE)
    d.text((164, 91), "SCALPER · TRADINGVIEW", font=font(SUPPORT, 22), fill=RED)
    d.line([(56, 150), (1024, 150)], fill=(86, 29, 39), width=2)

    d.rounded_rectangle((56, 190, 1024, 545), radius=22, fill=PANEL, outline=(103, 31, 44), width=3)
    chart = fit_inside(source, (940, 325))
    chart_x = 56 + (968 - chart.width) // 2
    chart_y = 190 + (355 - chart.height) // 2
    im.paste(chart, (chart_x, chart_y))

    d.rounded_rectangle((56, 574, 493, 650), radius=13, fill=(22, 24, 31), outline=(75, 30, 40), width=2)
    d.rounded_rectangle((513, 574, 1024, 650), radius=13, fill=(22, 24, 31), outline=(75, 30, 40), width=2)
    d.text((78, 589), "BUY / SELL MARKERS", font=font(SUPPORT, 36), fill=WHITE)
    d.text((537, 589), "TREND CONTEXT", font=font(SUPPORT, 36), fill=RED)

    d.text((56, 700), "KEEP THE CHART", font=font(DISPLAY, 120), fill=WHITE)
    d.text((56, 804), "READABLE.", font=font(DISPLAY, 154), fill=RED)
    d.text((62, 968), "Signals and trend context in one view.", font=font(SUPPORT, 43), fill=MUTED)

    d.line([(56, 1035), (1024, 1035)], fill=(86, 29, 39), width=2)
    d.text((56, 1061), "PRO · $29/MONTH", font=font(DISPLAY, 68), fill=WHITE)
    d.text((60, 1138), "SCALPER + SWING INCLUDED", font=font(SUPPORT, 42), fill=MUTED)

    d.rounded_rectangle((56, 1196, 1024, 1316), radius=18, fill=(31, 10, 17), outline=RED, width=3)
    d.text((84, 1204), "COMPARE YOUR OPTIONS", font=font(DISPLAY, 54), fill=WHITE)
    d.text((84, 1260), "LINK IN BIO", font=font(SUPPORT, 44), fill=MUTED)
    d.text((934, 1223), "→", font=font(SUPPORT, 54), fill=RED)

    im.save(OUT / "scalper-readable-chart-ad7c8c4ae21e.png", optimize=True)


if __name__ == "__main__":
    main()
