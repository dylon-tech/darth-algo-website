from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "social-campaigns" / "2026-10-11"
W, H = 1080, 1350
BG = (8, 9, 13)
PANEL = (18, 20, 27)
RED = (255, 48, 70)
WHITE = (245, 246, 250)
MUTED = (184, 188, 198)

DISPLAY = ROOT / "public" / "fonts" / "darth-social" / "BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SOURCE = ROOT / "public" / "indicator-examples" / "darth-algo-feature-map-01.png"
LOGO = ROOT / "public" / "darth-algo-social-logo.png"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit_inside(image: Image.Image, box: tuple[int, int], allow_upscale: bool = True) -> Image.Image:
    scale = min(box[0] / image.width, box[1] / image.height)
    if not allow_upscale:
        scale = min(scale, 1.0)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)


def backdrop() -> Image.Image:
    im = Image.new("RGB", (W, H), BG)
    px = im.load()
    for y in range(H):
        for x in range(W):
            radial = max(0.0, 1.0 - (((x - 870) / 980) ** 2 + ((y - 210) / 820) ** 2))
            red = int(12 * radial)
            shade = int(8 * y / H)
            px[x, y] = (8 + red, 9 + red // 4, 13 + red // 3 + shade)
    d = ImageDraw.Draw(im)
    d.polygon([(0, 0), (310, 0), (78, H), (0, H)], fill=(13, 14, 19))
    d.polygon([(W, 0), (W, 430), (835, 0)], fill=(45, 8, 15))
    d.line([(46, 0), (0, 340)], fill=RED, width=4)
    d.line([(W, 216), (900, 0)], fill=(116, 20, 34), width=3)
    d.line([(0, H - 70), (W, H - 260)], fill=(70, 16, 27), width=2)
    for y in range(210, H, 54):
        d.line([(0, y), (W, y - 145)], fill=(22, 24, 30), width=1)
    return im


def add_header(im: Image.Image, eyebrow: str) -> None:
    d = ImageDraw.Draw(im)
    logo = Image.open(LOGO).convert("RGBA").resize((92, 92), Image.Resampling.LANCZOS)
    im.paste(logo, (56, 46), logo)
    d.text((174, 55), "DARTH ALGO", font=font(SUPPORT, 38), fill=WHITE)
    d.text((174, 99), eyebrow, font=font(SUPPORT, 24), fill=RED)
    d.line([(56, 160), (1024, 160)], fill=(84, 28, 38), width=2)


def panel(im: Image.Image, xy: tuple[int, int, int, int], image: Image.Image) -> None:
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(xy, radius=20, fill=PANEL, outline=(98, 31, 43), width=3)
    x0, y0, x1, y1 = xy
    fitted = fit_inside(image, (x1 - x0 - 16, y1 - y0 - 16))
    x = x0 + (x1 - x0 - fitted.width) // 2
    y = y0 + (y1 - y0 - fitted.height) // 2
    im.paste(fitted, (x, y))


def slide_one(source: Image.Image) -> Image.Image:
    im = backdrop()
    d = ImageDraw.Draw(im)
    add_header(im, "PRO · TRADINGVIEW")
    d.text((56, 196), "STILL COMPARING", font=font(DISPLAY, 103), fill=WHITE)
    d.text((56, 286), "INDICATORS?", font=font(DISPLAY, 124), fill=RED)
    d.text((60, 416), "PUT DARTH ALGO ON YOUR SHORTLIST.", font=font(SUPPORT, 45), fill=WHITE)
    panel(im, (56, 500, 1024, 922), source)
    d.text((60, 963), "SIGNALS", font=font(DISPLAY, 49), fill=WHITE)
    d.text((279, 963), "+  DASHBOARD", font=font(DISPLAY, 49), fill=RED)
    d.text((618, 963), "+  PLANNED LEVELS", font=font(DISPLAY, 49), fill=WHITE)
    d.line([(56, 1044), (1024, 1044)], fill=(84, 28, 38), width=2)
    d.text((56, 1071), "PRO · $29/MONTH", font=font(DISPLAY, 70), fill=WHITE)
    d.text((60, 1148), "SCALPER + SWING INCLUDED", font=font(SUPPORT, 45), fill=MUTED)
    d.text((56, 1225), "COMPARE DARTH ALGO", font=font(DISPLAY, 61), fill=RED)
    d.text((650, 1228), "→", font=font(SUPPORT, 54), fill=RED)
    d.text((56, 1290), "DARTHALGO.COM/ALTERNATIVES", font=font(SUPPORT, 44), fill=WHITE)
    return im


def slide_two(source: Image.Image) -> Image.Image:
    im = backdrop()
    d = ImageDraw.Draw(im)
    add_header(im, "PRO FEATURE MAP")
    d.text((56, 193), "SEE THE TOOL.", font=font(DISPLAY, 106), fill=WHITE)
    d.text((56, 286), "KEEP THE PLAN IN VIEW.", font=font(DISPLAY, 90), fill=RED)
    crop = source.crop((1125, 36, 1795, 700))
    panel(im, (100, 405, 980, 1110), crop)
    d.rounded_rectangle((56, 1136, 500, 1212), radius=14, fill=(25, 27, 34), outline=(84, 28, 38), width=2)
    d.rounded_rectangle((520, 1136, 1024, 1212), radius=14, fill=(25, 27, 34), outline=(84, 28, 38), width=2)
    d.text((82, 1147), "DASHBOARD", font=font(SUPPORT, 44), fill=WHITE)
    d.text((544, 1147), "PLAN LEVELS", font=font(SUPPORT, 44), fill=RED)
    d.text((56, 1232), "COMPARE DARTH ALGO", font=font(DISPLAY, 58), fill=WHITE)
    d.text((638, 1234), "→", font=font(SUPPORT, 52), fill=RED)
    d.text((56, 1292), "DARTHALGO.COM/ALTERNATIVES", font=font(SUPPORT, 40), fill=MUTED)
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    slide_one(source).save(OUT / "pro-shortlist-overview-908d1ab001ac.png", optimize=True)
    slide_two(source).save(OUT / "pro-shortlist-detail-7913f7192a28.png", optimize=True)


if __name__ == "__main__":
    main()
