from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "social-campaigns" / "2026-10-13"
W, H = 1080, 1350

BG = (7, 8, 12)
PANEL = (15, 18, 25)
RED = (255, 48, 70)
RED_DARK = (115, 18, 34)
WHITE = (246, 247, 250)
SILVER = (203, 208, 218)
MUTED = (169, 176, 191)
GREEN = (22, 207, 127)

DISPLAY = ROOT / "public" / "fonts" / "darth-social" / "BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SCALPER = ROOT / "public" / "indicators" / "scalper-execution.png"
SWING = ROOT / "public" / "indicators" / "swing-trend-cloud.png"
LOGO = ROOT / "public" / "darth-algo-social-logo.png"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit(image: Image.Image, width: int, height: int, upscale: bool = True) -> Image.Image:
    scale = min(width / image.width, height / image.height)
    if not upscale:
        scale = min(scale, 1.0)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)


def backdrop(accent: str) -> Image.Image:
    image = Image.new("RGB", (W, H), BG)
    px = image.load()
    cx, cy = ((860, 270) if accent == "right" else (170, 980))
    for y in range(H):
        for x in range(W):
            glow = max(0.0, 1.0 - (((x - cx) / 860) ** 2 + ((y - cy) / 950) ** 2))
            px[x, y] = (7 + int(20 * glow), 8 + int(3 * glow), 12 + int(5 * glow) + int(5 * y / H))
    draw = ImageDraw.Draw(image)
    draw.polygon([(0, 0), (280, 0), (0, 820)], fill=(12, 14, 20))
    draw.polygon([(W, 0), (W, 410), (860, 0)], fill=(40, 8, 15))
    draw.polygon([(W, H), (720, H), (W, 1010)], fill=(29, 9, 16))
    draw.line([(48, 0), (0, 320)], fill=RED, width=4)
    draw.line([(W, 170), (928, 0)], fill=RED_DARK, width=3)
    draw.line([(0, H - 34), (W, H - 228)], fill=(73, 21, 32), width=2)
    for y in range(228, H, 72):
        draw.line([(0, y), (W, y - 112)], fill=(19, 21, 27), width=1)
    return image


def header(image: Image.Image, eyebrow: str) -> None:
    draw = ImageDraw.Draw(image)
    logo = Image.open(LOGO).convert("RGBA").resize((86, 86), Image.Resampling.LANCZOS)
    image.paste(logo, (56, 38), logo)
    draw.text((164, 43), "DARTH ALGO", font=font(SUPPORT, 36), fill=WHITE)
    draw.text((164, 85), eyebrow, font=font(SUPPORT, 22), fill=RED)
    draw.line((56, 146, 1024, 146), fill=(79, 30, 40), width=2)


def image_panel(image: Image.Image, xy: tuple[int, int, int, int], source: Image.Image, edge: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(image)
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=22, fill=PANEL, outline=(88, 31, 43), width=3)
    fitted = fit(source, x1 - x0 - 20, y1 - y0 - 20)
    x = x0 + (x1 - x0 - fitted.width) // 2
    y = y0 + (y1 - y0 - fitted.height) // 2
    image.paste(fitted, (x, y))
    draw.line((x0 + 8, y0 + 8, x0 + 272, y0 + 8), fill=edge, width=5)
    draw.line((x1 - 274, y1 - 8, x1 - 8, y1 - 8), fill=edge, width=5)


def footer(image: Image.Image, cta: str, destination: str = "DARTHALGO.COM/PRODUCTS/PRO") -> None:
    draw = ImageDraw.Draw(image)
    draw.line((56, 1194, 1024, 1194), fill=(86, 29, 41), width=2)
    cta_font = font(DISPLAY, 60)
    draw.text((56, 1218), cta, font=cta_font, fill=WHITE)
    cta_box = draw.textbbox((56, 1218), cta, font=cta_font)
    arrow_x = min(cta_box[2] + 28, 950)
    draw.text((arrow_x, 1215), "→", font=font(SUPPORT, 50), fill=RED)
    draw.text((56, 1288), destination, font=font(SUPPORT, 38), fill=MUTED)


def slide_scalper(source: Image.Image) -> Image.Image:
    image = backdrop("right")
    draw = ImageDraw.Draw(image)
    header(image, "PRO · ACTIVE-SESSION VIEW")
    draw.text((56, 186), "ACTIVE SESSION", font=font(DISPLAY, 112), fill=WHITE)
    draw.text((56, 282), "TODAY.", font=font(DISPLAY, 136), fill=RED)
    draw.text((60, 420), "SCALPER · SIGNAL CONTEXT", font=font(SUPPORT, 43), fill=SILVER)
    crop = source.crop((80, 0, 420, 327))
    image_panel(image, (56, 500, 1024, 1060), crop, RED)
    draw.rounded_rectangle((56, 1090, 1024, 1160), radius=14, fill=(20, 23, 31), outline=(78, 28, 39), width=2)
    draw.text((78, 1103), "READ THE MARKER WITH THE FAST TREND LAYER.", font=font(SUPPORT, 34), fill=WHITE)
    footer(image, "SWIPE FOR THE BROADER VIEW")
    return image


def slide_swing(source: Image.Image) -> Image.Image:
    image = backdrop("left")
    draw = ImageDraw.Draw(image)
    header(image, "PRO · BROADER-MOVE VIEW")
    draw.text((56, 188), "BROADER MOVE", font=font(DISPLAY, 110), fill=WHITE)
    draw.text((56, 284), "TOMORROW.", font=font(DISPLAY, 132), fill=RED)
    draw.text((60, 420), "SWING · TREND CONTEXT", font=font(SUPPORT, 43), fill=SILVER)
    image_panel(image, (56, 510, 1024, 930), source, GREEN)
    draw.line((56, 982, 222, 982), fill=GREEN, width=5)
    draw.text((56, 1012), "KEEP THE BROADER TREND VISIBLE", font=font(SUPPORT, 41), fill=WHITE)
    draw.text((56, 1071), "BEFORE YOU EVALUATE THE NEXT SIGNAL.", font=font(SUPPORT, 39), fill=MUTED)
    footer(image, "PRO INCLUDES BOTH")
    return image


def slide_offer() -> Image.Image:
    image = backdrop("right")
    draw = ImageDraw.Draw(image)
    header(image, "PRO · SCALPER + SWING")
    draw.text((56, 205), "ONE PRO", font=font(DISPLAY, 156), fill=WHITE)
    draw.text((56, 337), "SUBSCRIPTION.", font=font(DISPLAY, 137), fill=RED)
    draw.rounded_rectangle((56, 526, 1024, 850), radius=26, fill=(15, 18, 25), outline=(91, 31, 43), width=3)
    draw.text((94, 564), "$29", font=font(DISPLAY, 196), fill=WHITE)
    draw.text((432, 619), "/ MONTH", font=font(DISPLAY, 82), fill=RED)
    draw.line((94, 773, 986, 773), fill=(74, 29, 39), width=2)
    draw.text((94, 800), "SCALPER + SWING INCLUDED", font=font(SUPPORT, 47), fill=SILVER)
    draw.text((56, 922), "AUTOMATIC TRADINGVIEW ACCESS", font=font(SUPPORT, 44), fill=WHITE)
    draw.text((56, 985), "AFTER PURCHASE.", font=font(SUPPORT, 44), fill=WHITE)
    draw.text((56, 1066), "USE YOUR CORRECT USERNAME.", font=font(SUPPORT, 42), fill=MUTED)
    footer(image, "SEE PRO")
    return image


def save_hashed(image: Image.Image, stem: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    temporary = OUT / f"{stem}.png"
    image.save(temporary, optimize=True)
    digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
    final = OUT / f"{stem}-{digest[:12]}.png"
    temporary.replace(final)
    print(f"{final.relative_to(ROOT)} {digest}")
    return final


def main() -> None:
    scalper = Image.open(SCALPER).convert("RGB")
    swing = Image.open(SWING).convert("RGB")
    save_hashed(slide_scalper(scalper), "pro-active-session")
    save_hashed(slide_swing(swing), "pro-broader-move")
    save_hashed(slide_offer(), "pro-one-subscription")


if __name__ == "__main__":
    main()
