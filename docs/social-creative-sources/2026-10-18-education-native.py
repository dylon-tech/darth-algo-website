"""Native education artwork. Genuine logo and faithful dashboard detail; no generated chart pixels."""
from pathlib import Path
import hashlib, json, math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/social-campaigns/2026-10-18'
QA = Path('/workspace/shared/darth-posting-repair-qa')
W, H = 1080, 1350
BG, PANEL, RED, WHITE, SILVER = '#08090d', '#181b24', '#ff3046', '#f5f6fa', '#c6cbd5'
DISPLAY = ROOT / 'public/fonts/darth-social/BarlowCondensed-BlackItalic.ttf'
SUPPORT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
BOLD = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')

def f(size, display=False, bold=False):
    return ImageFont.truetype(str(DISPLAY if display else BOLD if bold else SUPPORT), size)

def txt(im, xy, text, size, color=WHITE, display=False, bold=False):
    d=ImageDraw.Draw(im); font=f(size,display,bold)
    box=d.textbbox(xy,text,font=font)
    assert box[0]>=38 and box[2]<=1042, (text,box)
    d.text(xy,text,font=font,fill=color)

def base(section, number=''):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.polygon([(790,0),(1080,0),(1080,1350),(330,1350)],fill='#11131a')
    d.polygon([(1030,0),(1080,0),(1080,1350),(850,1350)],fill='#200c13')
    d.line([(1030,0),(850,1350)],fill='#6b1a2c',width=3)
    for p in range(-1000,1500,30): d.line([(p,1350),(p+650,0)],fill='#14151c',width=1)
    logo=Image.open(ROOT/'public/darth-algo-social-logo.png').convert('RGBA').resize((104,104),Image.Resampling.LANCZOS)
    im.paste(logo,(66,42),logo)
    txt(im,(194,44),'DARTH ALGO',36,bold=True)
    txt(im,(194,93),section,27,SILVER,bold=True)
    if number: txt(im,(937,54),number,36,RED,bold=True)
    return im

def footer(im,cta='SAVE THIS GUIDE'):
    d=ImageDraw.Draw(im)
    d.line((64,1197,1016,1197),fill='#5b2431',width=2)
    txt(im,(64,1220),cta,62,display=True)
    d.line((785,1258,992,1258),fill=RED,width=6)
    d.line((962,1233,992,1258,962,1283),fill=RED,width=6)
    txt(im,(66,1301),'DARTHALGO.COM',28,SILVER,bold=True)

def save(im,name):
    tmp=OUT/(name+'.png'); im.save(tmp,optimize=True)
    sha=hashlib.sha256(tmp.read_bytes()).hexdigest(); final=OUT/(name+'-'+sha[:12]+'.png'); tmp.rename(final)
    im.resize((390,488),Image.Resampling.LANCZOS).save(QA/(name+'-390.png'))
    return {'path':'/social-campaigns/2026-10-18/'+final.name,'sha256':sha,'width':W,'height':H,'bytes':final.stat().st_size}

def ratio():
    im=base('SWING / DASHBOARD GUIDE'); d=ImageDraw.Draw(im)
    txt(im,(62,188),'READ 1:2',146,display=True)
    txt(im,(62,332),'THE RIGHT WAY.',118,RED,display=True)
    txt(im,(68,495),'SWING · RISK/REWARD ROW',35,SILVER,bold=True)
    source=Image.open(ROOT/'public/indicators/swing-dashboard.png').convert('RGB')
    # One contiguous, unchanged feature crop. Same original family as Swing overview.
    detail=source.crop((0,146,212,177)).resize((944,138),Image.Resampling.LANCZOS)
    im.paste(detail,(68,550))
    d.line((68,733,68,938),fill='#667080',width=2)
    d.polygon([(68,752),(338,752),(318,810),(68,810)],fill=RED)
    txt(im,(365,747),'1 UNIT OF RISK',45,bold=True)
    d.polygon([(68,857),(608,857),(588,915),(68,915)],fill=WHITE)
    txt(im,(632,856),'2 UNITS',43,bold=True)
    txt(im,(632,906),'OF REWARD',40,SILVER,bold=True)
    txt(im,(68,1008),'A planned payoff ratio.',48,bold=True)
    txt(im,(68,1078),'It does not predict your win rate.',44,SILVER)
    footer(im)
    return save(im,'swing-read-risk-reward')

def delayed_data():
    im=base('SCALPER / CHART DATA GUIDE');d=ImageDraw.Draw(im)
    txt(im,(68,199),'CHECK THE CHART HEADER',37,SILVER,bold=True)
    source=Image.open(ROOT/'public/indicators/scalper-overview.png').convert('RGB')
    # The complete contiguous header detail retains symbol, interval, exchange,
    # status badge and bid/ask. No candle or signal is erased or selectively omitted.
    detail=source.crop((0,0,380,100)).resize((944,248),Image.Resampling.LANCZOS)
    im.paste(detail,(68,272))
    # Exterior pointer terminates above the badge; nothing covers the original.
    d.line((955,256,955,236),fill=RED,width=4)
    d.polygon([(944,244),(955,262),(966,244)],fill=RED)
    d.polygon([(0,596),(1080,528),(1080,937),(0,1004)],fill='#1e1018')
    d.line((0,596,1080,528),fill='#9e253b',width=3)
    txt(im,(62,616),'SPOT THE D.',142,display=True)
    txt(im,(62,755),'CHECK THE FEED.',114,RED,display=True)
    txt(im,(68,958),'D means delayed chart data.',48,bold=True)
    txt(im,(68,1035),'Check the feed before judging',45,SILVER)
    txt(im,(68,1096),'Scalper signal timing.',45,SILVER)
    footer(im)
    return save(im,'scalper-delayed-data-check')

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
    assets=[ratio(),delayed_data()]
    (QA/'assets.json').write_text(json.dumps(assets,indent=2)+'\n')
    print(json.dumps(assets,indent=2))
