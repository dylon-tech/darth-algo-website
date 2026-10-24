from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "social-campaigns" / "2026-10-24"
W, H = 1080, 1350
BG = (7, 8, 12)
PANEL = (16, 18, 24)
RED = (255, 45, 67)
WHITE = (246, 247, 250)
MUTED = (185, 190, 201)

DISPLAY = ROOT / "public" / "fonts" / "darth-social" / "BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SOURCE = ROOT / "public" / "indicators" / "clean-price-action.png"
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
            glow = max(0.0, 1.0 - (((x - 890) / 700) ** 2 + ((y - 220) / 760) ** 2))
            lift = int(12 * glow)
            px[x, y] = (7 + lift, 8 + lift // 4, 12 + lift // 3)
    d = ImageDraw.Draw(im)
    d.polygon([(0, 0), (330, 0), (95, H), (0, H)], fill=(12, 13, 18))
    d.polygon([(W, 0), (W, 390), (830, 0)], fill=(43, 7, 14))
    d.line([(48, 0), (0, 310)], fill=RED, width=4)
    d.line([(W, 215), (900, 0)], fill=(119, 20, 34), width=3)
    d.line([(0, 1240), (W, 1090)], fill=(77, 17, 28), width=2)
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    im = backdrop()
    d = ImageDraw.Draw(im)

    logo = Image.open(LOGO).convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
    im.paste(logo, (56, 42), logo)
    d.text((164, 48), "DARTH ALGO", font=font(SUPPORT, 36), fill=WHITE)
    d.text((164, 91), "PRO · CLEAN STRUCTURE", font=font(SUPPORT, 22), fill=RED)
    d.line([(56, 150), (1024, 150)], fill=(86, 29, 39), width=2)

    d.text((56, 178), "COMPARE THE", font=font(DISPLAY, 116), fill=WHITE)
    d.text((650, 178), "PAIR.", font=font(DISPLAY, 116), fill=RED)
    d.text((62, 288), "LATEST SWING HIGH + SWING LOW", font=font(SUPPORT, 42), fill=MUTED)

    d.rounded_rectangle((56, 362, 1024, 800), radius=22, fill=PANEL, outline=(103, 31, 44), width=3)
    chart = fit_inside(source, (940, 405))
    chart_x = 56 + (968 - chart.width) // 2
    chart_y = 362 + (438 - chart.height) // 2
    im.paste(chart, (chart_x, chart_y))

    d.rounded_rectangle((56, 835, 518, 970), radius=16, fill=(22, 24, 31), outline=(75, 30, 40), width=2)
    d.text((80, 858), "1", font=font(DISPLAY, 70), fill=RED)
    d.text((140, 850), "MARK THE LATEST", font=font(SUPPORT, 31), fill=WHITE)
    d.text((140, 895), "SWING HIGH", font=font(DISPLAY, 55), fill=WHITE)

    d.rounded_rectangle((538, 835, 1024, 970), radius=16, fill=(22, 24, 31), outline=(75, 30, 40), width=2)
    d.text((562, 858), "2", font=font(DISPLAY, 70), fill=RED)
    d.text((622, 850), "MARK THE LATEST", font=font(SUPPORT, 31), fill=WHITE)
    d.text((622, 895), "SWING LOW", font=font(DISPLAY, 55), fill=WHITE)

    d.text((56, 1012), "COMPARE BOTH WITH", font=font(DISPLAY, 76), fill=WHITE)
    d.text((56, 1082), "THE PRIOR PAIR.", font=font(DISPLAY, 92), fill=RED)
    d.text((62, 1172), "Structure comes from the sequence.", font=font(SUPPORT, 39), fill=MUTED)

    d.rounded_rectangle((56, 1240, 1024, 1320), radius=15, fill=(31, 10, 17), outline=RED, width=3)
    d.text((84, 1245), "SAVE THIS STRUCTURE CHECK", font=font(DISPLAY, 52), fill=WHITE)
    d.text((934, 1248), "→", font=font(SUPPORT, 50), fill=RED)

    im.save(OUT / "pro-compare-the-pair-e7ab4af998b7.png", optimize=True)


if __name__ == "__main__":
    main()
