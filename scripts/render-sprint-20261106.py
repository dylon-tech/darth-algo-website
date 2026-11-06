"""Render owned product screenshots and typography; no invented chart data."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess, hashlib, json, os, tempfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/growth-sprint/2026-11-06'
TMP = Path(os.environ.get('DARTH_VIDEO_QA_DIR', str(Path(tempfile.gettempdir()) / 'darth-video-qa-20261106')))
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
HEAD = str(ROOT / 'public/fonts/darth-social/BarlowCondensed-BlackItalic.ttf')
BODY = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
WHITE, RED, MUTED = '#f4f4f5', '#ef2438', '#b9bec8'

def wrapped(draw, text, font, width):
    lines, line = [], ''
    for word in text.split():
        candidate = f'{line} {word}'.strip()
        if draw.textlength(candidate, font=font) > width and line:
            lines.append(line); line = word
        else: line = candidate
    return lines + [line]

def frame(name, source, index, heading, body, focus):
    im = Image.new('RGB', (1080,1920), '#07080b')
    d = ImageDraw.Draw(im)
    for y in range(1920):
        glow = max(0, 1-abs(y-740)/820)
        d.line((0,y,1080,y), fill=(int(7+13*glow),8,int(11+3*glow)))
    d.rectangle((76,134,88,191), fill=RED)
    d.text((112,133),'DARTH ALGO',font=ImageFont.truetype(HEAD,55),fill=WHITE)
    d.text((78,228),'TRADINGVIEW  /  RECORDED PRODUCT VIEW',font=ImageFont.truetype(BODY,25),fill=MUTED)
    hfont=ImageFont.truetype(HEAD,108)
    for i,line in enumerate(heading.split('\n')):
        assert d.textlength(line,font=hfont)<920
        d.text((76,305+i*112),line,font=hfont,fill=WHITE if i==0 else RED)
    src=Image.open(ROOT / source).convert('RGB')
    tall=src.height/src.width > 0.7
    width=860 if tall else 900; height=round(src.height*width/src.width)
    src=src.resize((width,height),Image.Resampling.LANCZOS)
    top=610 if tall else 650
    d.rounded_rectangle((66,top-12,94+width,top+height+12),radius=18,fill='#151b26',outline='#343a47',width=2)
    im.paste(src,(80,top))
    # The image is retained in full. A separate caption identifies the relevant row/level.
    d=ImageDraw.Draw(im)
    y=top+height+52
    d.text((78,y),focus,font=ImageFont.truetype(HEAD,46),fill=RED)
    y+=72
    for line in wrapped(d,body,ImageFont.truetype(BODY,36),900):
        d.text((78,y),line,font=ImageFont.truetype(BODY,36),fill=WHITE); y+=54
    assert y < 1590,(name,index,y)
    d.line((78,1630,978,1630),fill='#37313a',width=2)
    d.text((78,1660),'SEE THE FULL DEMO · LINK IN BIO',font=ImageFont.truetype(HEAD,42),fill=WHITE)
    d.text((78,1730),'Feature example. No trade result is claimed.',font=ImageFont.truetype(BODY,26),fill=MUTED)
    d.text((78,1773),'Trading involves risk.',font=ImageFont.truetype(BODY,26),fill=MUTED)
    for j in range(4):
        d.rectangle((78+j*228,1840,78+j*228+210,1846),fill=RED if j<=index else '#3b343b')
    path=TMP/f'{name}-{index}.png'; im.save(path)
    if index==0: im.save(OUT/f'{name}-cover.jpg',quality=94)
    return path

CAMPAIGNS=[
 ('two-targets','public/indicators/swing-risk-plan.png',[
  ('TWO TARGETS.\nTWO DECISIONS.','This Swing view marks Entry, Stop, Target 1 and Target 2. Write your rules before the next setup.','SWING TOOL / PLANNED LEVELS'),
  ('TARGET 1:\nWHAT IS YOUR RULE?','Record what you would do at the first level. A target label does not decide your position size.','STEP 1 / FIRST CHECKPOINT'),
  ('TARGET 2:\nPLAN SEPARATELY.','If a position remains open, define how you will manage it. A marked level is not a promised fill.','STEP 2 / SECOND CHECKPOINT'),
  ('WRITE IT DOWN.\nTHEN TEST IT.','Review your rules in replay or paper trading. Include costs and slippage before judging the plan.','SAVE THIS PLANNING CHECKLIST')
 ]),
 ('read-the-dashboard','public/indicators/scalper-dashboard.png',[
  ('ONE CANDLE.\nTHE WHOLE TREND?','Current Candle and Market are separate rows. Read each field for the information it actually shows.','SCALPER TOOL / DASHBOARD'),
  ('START WITH\nTHE MARKET ROW.','This recorded view reads DOWNTREND. The Guidance row says to look for SELL setups.','MARKET / BROADER CONTEXT'),
  ('THEN READ\nCURRENT CANDLE.','The candle row reads HOLLOW — LOWER. That candle description is not a change in the Market row.','CURRENT CANDLE / ONE BAR'),
  ('KEEP THE\nCONTEXT TOGETHER.','Check the chart, market context and your own rules before acting. A dashboard is not a guaranteed trade.','SAVE THIS DASHBOARD CHECK')
 ])
]
manifest=[]
for name,source,scenes in CAMPAIGNS:
    parts=[]
    for i,(h,b,f) in enumerate(scenes):
        png=frame(name,source,i,h,b,f); part=TMP/f'{name}-{i}.mp4'
        subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','30','-i',str(png),'-t','5','-vf','fade=t=in:st=0:d=0.16,fade=t=out:st=4.84:d=0.16','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',str(part)],check=True)
        parts.append(part)
    listing=TMP/f'{name}.txt'; listing.write_text(''.join(f"file '{p}'\n" for p in parts))
    video=OUT/f'{name}.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-c:v','copy','-c:a','aac','-shortest','-movflags','+faststart',str(video)],check=True)
    manifest.append({'id':name,'source':source,'sourceSha256':hashlib.sha256((ROOT/source).read_bytes()).hexdigest(),'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'durationSeconds':20,'format':'1080x1920, 30fps, H.264/AAC (silent), native screenshot and captions','claims':'Recorded product feature demonstration, not executed trades, backtest performance or live market footage','sourceMapping':'app/lib/products.ts','publicationOwner':'Metricool acquisition sprint; do not enqueue in the app publisher'})
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
