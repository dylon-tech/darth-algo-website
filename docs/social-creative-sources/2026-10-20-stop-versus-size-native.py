"""Native Pro risk-planning lesson; genuine chart crop and real font layers."""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/social-campaigns/2026-10-20"
QA = ROOT / ".photo-qa-2026-10-20-afternoon"
W, H = 1080, 1350
BG = "#08090d"
CHARCOAL = "#11131a"
PANEL = "#171923"
RED = "#ff3046"
GREEN = "#4ad56c"
WHITE = "#f5f6fa"
SILVER = "#c6cbd5"
DISPLAY = ROOT / "public/fonts/darth-social/BarlowCondensed-BlackItalic.ttf"
SUPPORT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


def font(size, display=False, bold=False):
    path = DISPLAY if display else BOLD if bold else SUPPORT
    return ImageFont.truetype(str(path), size)


def add_text(image, xy, value, size, color=WHITE, display=False, bold=False):
    draw = ImageDraw.Draw(image)
    selected = font(size, display=display, bold=bold)
    box = draw.textbbox(xy, value, font=selected)
    assert box[0] >= 38 and box[2] <= 1042, (value, box)
    draw.text(xy, value, font=selected, fill=color)


def compose():
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.polygon([(704, 0), (1080, 0), (1080, 1350), (410, 1350)], fill=CHARCOAL)
    draw.polygon([(1008, 0), (1080, 0), (1080, 1350), (854, 1350)], fill="#210c14")
    draw.line([(1008, 0), (854, 1350)], fill="#791b31", width=3)
    for start in range(-1000, 1500, 34):
        draw.line([(start, 1350), (start + 640, 0)], fill="#15161d", width=1)

    logo = Image.open(ROOT / "public/darth-algo-social-logo.png").convert("RGBA")
    logo = logo.resize((104, 104), Image.Resampling.LANCZOS)
    image.paste(logo, (66, 42), logo)
    add_text(image, (194, 44), "DARTH ALGO", 36, bold=True)
    add_text(image, (194, 93), "PRO / RISK PLANNING GUIDE", 27, SILVER, bold=True)

    add_text(image, (62, 184), "A STOP LINE", 118, display=True)
    add_text(image, (62, 296), "ISN'T POSITION SIZE.", 101, RED, display=True)
    add_text(image, (68, 423), "They answer different questions.", 43, SILVER, bold=True)

    # Focused contiguous crop of the owned Pro risk-engine source. It retains
    # stop, entry, both targets, both zones and the price scale. No pixels are
    # redrawn, retouched or generatively enlarged.
    source = Image.open(ROOT / "public/indicator-examples/darth-algo-feature-map-03.png").convert("RGB")
    crop_box = (1180, 150, 1785, 420)
    proof = source.crop(crop_box)
    proof = proof.resize((890, 397), Image.Resampling.LANCZOS)
    image.paste(proof, (95, 510))
    draw.rectangle((93, 508, 986, 900), outline="#4c5260", width=2)
    draw.line((95, 920, 985, 920), fill="#5b2431", width=2)

    draw.rounded_rectangle((64, 958, 510, 1124), radius=24, fill=PANEL, outline="#6e2432", width=2)
    draw.rounded_rectangle((540, 958, 1016, 1124), radius=24, fill=PANEL, outline="#235e37", width=2)
    add_text(image, (92, 980), "THE STOP", 42, RED, display=True)
    add_text(image, (92, 1037), "marks invalidation.", 40, WHITE, bold=True)
    add_text(image, (568, 980), "POSITION SIZE", 42, GREEN, display=True)
    add_text(image, (568, 1037), "sets exposure.", 40, WHITE, bold=True)

    add_text(image, (68, 1162), "Plan both before focusing on a target.", 42, SILVER, bold=True)
    draw.line((64, 1247, 1016, 1247), fill="#5b2431", width=2)
    add_text(image, (64, 1265), "SAVE THIS DISTINCTION", 50, display=True)
    draw.line((795, 1302, 992, 1302), fill=RED, width=6)
    draw.line((962, 1277, 992, 1302, 962, 1327), fill=RED, width=6)

    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    provisional = OUT / "pro-stop-versus-position-size.png"
    image.save(provisional, optimize=True)
    sha256 = hashlib.sha256(provisional.read_bytes()).hexdigest()
    final = OUT / f"pro-stop-versus-position-size-{sha256[:12]}.png"
    provisional.rename(final)
    image.resize((390, 488), Image.Resampling.LANCZOS).save(QA / "pro-stop-versus-position-size-390.png")
    proof.save(QA / "proof-crop-rendered.png")
    source.crop(crop_box).save(QA / "proof-crop-native.png")
    result = {
        "path": f"/social-campaigns/2026-10-20/{final.name}",
        "sha256": sha256,
        "width": W,
        "height": H,
        "bytes": final.stat().st_size,
        "source_crop": crop_box,
        "source_crop_dimensions": [crop_box[2] - crop_box[0], crop_box[3] - crop_box[1]],
        "rendered_panel_dimensions": [890, 397],
    }
    (QA / "afternoon-assets.json").write_text(json.dumps([result], indent=2) + "\n")
    return result


if __name__ == "__main__":
    print(json.dumps(compose(), indent=2))
