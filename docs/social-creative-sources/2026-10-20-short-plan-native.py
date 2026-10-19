"""Native Scalper education artwork; genuine chart pixels and real font layers."""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/social-campaigns/2026-10-20"
QA = ROOT / ".photo-qa-2026-10-20"
W, H = 1080, 1350
BG = "#08090d"
PANEL = "#171923"
RED = "#ff3046"
WHITE = "#f5f6fa"
SILVER = "#c6cbd5"
DISPLAY = ROOT / "public/fonts/darth-social/BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


def font(size, display=False, bold=False):
    path = DISPLAY if display else BOLD if bold else SUPPORT
    return ImageFont.truetype(str(path), size)


def text(image, xy, value, size, color=WHITE, display=False, bold=False):
    draw = ImageDraw.Draw(image)
    selected = font(size, display=display, bold=bold)
    box = draw.textbbox(xy, value, font=selected)
    assert box[0] >= 38 and box[2] <= 1042, (value, box)
    draw.text(xy, value, font=selected, fill=color)


def compose():
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.polygon([(760, 0), (1080, 0), (1080, 1350), (285, 1350)], fill="#11131a")
    draw.polygon([(1010, 0), (1080, 0), (1080, 1350), (825, 1350)], fill="#210c14")
    draw.line([(1010, 0), (825, 1350)], fill="#791b31", width=3)
    for start in range(-920, 1500, 32):
        draw.line([(start, 1350), (start + 630, 0)], fill="#15161d", width=1)

    logo = Image.open(ROOT / "public/darth-algo-social-logo.png").convert("RGBA")
    logo = logo.resize((104, 104), Image.Resampling.LANCZOS)
    image.paste(logo, (66, 42), logo)
    text(image, (194, 44), "DARTH ALGO", 36, bold=True)
    text(image, (194, 93), "SCALPER / SHORT PLAN GUIDE", 27, SILVER, bold=True)

    text(image, (62, 184), "READ A SHORT PLAN", 116, display=True)
    text(image, (62, 298), "TOP TO BOTTOM.", 112, RED, display=True)
    text(image, (68, 434), "Stop above entry. Targets below.", 46, SILVER, bold=True)

    # Genuine complete source, fitted proportionally with no crop, redraw, or retouch.
    source = Image.open(ROOT / "public/indicators/scalper-risk-plan.png").convert("RGB")
    proof = source.resize((820, 581), Image.Resampling.LANCZOS)
    image.paste(proof, (198, 520))
    draw.rectangle((196, 518, 1019, 1102), outline="#4c5260", width=2)

    # The exterior rail explains the vertical relationship without covering evidence.
    draw.rounded_rectangle((54, 568, 176, 1038), radius=24, fill=PANEL, outline="#5b2431", width=2)
    draw.line((116, 643, 116, 962), fill="#687180", width=4)
    draw.polygon([(103, 648), (116, 622), (129, 648)], fill=RED)
    draw.polygon([(103, 958), (116, 984), (129, 958)], fill="#3bd36a")
    text(image, (68, 585), "STOP", 35, RED, bold=True)
    text(image, (64, 765), "ENTRY", 31, WHITE, bold=True)
    text(image, (61, 986), "TARGETS", 26, "#48d56d", bold=True)

    text(image, (68, 1133), "The layout maps a plan.", 45, bold=True)
    text(image, (68, 1193), "It does not predict the outcome.", 42, SILVER)

    draw.line((64, 1254, 1016, 1254), fill="#5b2431", width=2)
    text(image, (64, 1271), "SAVE THIS GUIDE", 51, display=True)
    draw.line((800, 1305, 992, 1305), fill=RED, width=6)
    draw.line((962, 1280, 992, 1305, 962, 1330), fill=RED, width=6)

    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    provisional = OUT / "scalper-read-short-plan.png"
    image.save(provisional, optimize=True)
    sha256 = hashlib.sha256(provisional.read_bytes()).hexdigest()
    final = OUT / f"scalper-read-short-plan-{sha256[:12]}.png"
    provisional.rename(final)
    image.resize((390, 488), Image.Resampling.LANCZOS).save(QA / "scalper-read-short-plan-390.png")
    result = {
        "path": f"/social-campaigns/2026-10-20/{final.name}",
        "sha256": sha256,
        "width": W,
        "height": H,
        "bytes": final.stat().st_size,
    }
    (QA / "assets.json").write_text(json.dumps([result], indent=2) + "\n")
    return result


if __name__ == "__main__":
    print(json.dumps(compose(), indent=2))
