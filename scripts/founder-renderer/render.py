"""Original native v4/v15-derived media from hash-verified owned evidence.

CPU-only: Pillow, Kokoro ONNX and FFmpeg. No paid API, remote media URL,
publishing, invented chart or reused finished video. Outputs stay private.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from contextvars import ContextVar
from contextlib import contextmanager

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from recipes import RECIPES, resolve_recipe, TOP, LOWER, TIME, INVITE, TOP_CROP, LOWER_CROP, TIME_CROP, INVITE_CROP
from setup_models import MODELS, digest

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent / 'assets'
VERSION = 'DA-RENDERER-20261112-1'
WHITE, RED, MUTED = '#f4f6fb', '#ff263f', '#aeb7c8'
HEAD = ROOT / 'public/fonts/darth-social/BarlowCondensed-BlackItalic.ttf'
FONT = ASSETS / 'InterDisplay-Bold.ttf'
MEDIUM = ASSETS / 'InterDisplay-Medium.ttf'
CROPS = {TOP:TOP_CROP, LOWER:LOWER_CROP, TIME:TIME_CROP, INVITE:INVITE_CROP}
_deadline=ContextVar('darth_render_deadline',default=None)


@contextmanager
def render_deadline(deadline):
    token=_deadline.set(deadline)
    try:yield
    finally:_deadline.reset(token)


def check_deadline():
    deadline=_deadline.get()
    if deadline is not None and time.monotonic()>=deadline:raise RuntimeError('RENDER_DEADLINE')
    return deadline


def command(args):
    # Never print subprocess stderr: codecs/TTS can include private copy/paths.
    deadline=check_deadline()
    timeout=600 if deadline is None else max(0.1,min(600,deadline-time.monotonic()))
    try:result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.TimeoutExpired:raise RuntimeError('RENDER_DEADLINE') from None
    if result.returncode:
        raise RuntimeError('MEDIA_COMMAND_FAILED')
    return result


def validate_sources():
    manifest = json.loads((Path(__file__).parent / 'sources.json').read_text())
    for row in manifest['sources']:
        path = ROOT / row['path']
        if not path.is_file() or digest(path) != row['sha256']:
            raise ValueError('SOURCE_HASH_MISMATCH')
    return manifest


def font(size, head=False, medium=False):
    return ImageFont.truetype(str(HEAD if head else MEDIUM if medium else FONT), int(size))


def wrap(text, width, f):
    d = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    lines, line = [], ''
    for word in text.split():
        proposal = (line + ' ' + word).strip()
        if line and d.textlength(proposal, font=f) > width:
            lines.append(line)
            line = word
        else:
            line = proposal
    return lines + ([line] if line else [])


def background(height, variant=0):
    # Matte charcoal with a single restrained red glass lighting gesture.
    y, x = np.mgrid[0:height, 0:1080]
    cx, cy = (1040, 270) if variant % 2 == 0 else (-90, height - 100)
    radius = np.sqrt((x-cx)**2 + (y-cy)**2)
    glow = np.exp(-((radius-610)/100)**2)
    vignette = np.clip(1 - ((x-540)/1200)**2 - ((y-height/2)/height)**2, 0, 1)
    a = np.zeros((height,1080,3), dtype=np.uint8)
    for channel, base in enumerate((8,10,15)):
        a[:,:,channel] = np.clip(base+vignette*5+glow*(36 if channel==0 else 2),0,255)
    im = Image.fromarray(a)
    d=ImageDraw.Draw(im)
    for inset,col in [(0,'#6d1824'),(3,'#ad2237'),(6,'#48121c')]:
        d.arc((cx-610-inset,cy-610-inset,cx+610+inset,cy+610+inset),0,360,fill=col,width=1)
    return im


def brand(im, y=60, video=False):
    emblem=Image.open(ASSETS/'approved-v4-emblem.png').convert('RGB')
    emblem=emblem.resize((86,86),Image.Resampling.LANCZOS)
    im.paste(emblem,(68,y-7))
    d=ImageDraw.Draw(im);f=font(52,head=not video)
    d.text((185,y),'DARTH',font=f,fill=RED)
    x=185+d.textlength('DARTH ',font=f)
    d.text((x,y),'ALGO',font=f,fill=WHITE)
    d.line((169,y+3,155,y+60),fill=RED,width=3)


def headline(im, text, top=185, size=136, width=930, video=False):
    d=ImageDraw.Draw(im)
    lines=text.split('\n')
    while any(d.textlength(line,font=font(size,head=not video))>width for line in lines):
        size-=1
    f=font(size,head=not video)
    for index,line in enumerate(lines):
        y=top+index*int(size*1.02)
        # Quiet black extrusion, no shiny chrome letter faces.
        for off in range(9,0,-1):d.text((70+off,y+off),line,font=f,fill=(2,3,5))
        d.text((70,y),line,font=f,fill=WHITE if index==0 else RED)
    return top+len(lines)*int(size*1.02)


def evidence(im, source, box, crop=None, radius=30):
    path=ROOT/source
    source_im=Image.open(path).convert('RGB')
    if crop:source_im=source_im.crop(tuple(crop))
    x,y,w,h=box
    # Fit in full. Do not stretch, invent candles or crop out original labels.
    scale=min((w-30)/source_im.width,(h-30)/source_im.height)
    source_im=source_im.resize((round(source_im.width*scale),round(source_im.height*scale)),Image.Resampling.LANCZOS)
    d=ImageDraw.Draw(im)
    for inset,col in [(0,'#7b2431'),(3,'#dadce2'),(5,'#141820'),(10,'#565a62'),(13,'#06090f')]:
        d.rounded_rectangle((x+inset,y+inset,x+w-inset,y+h-inset),radius=max(4,radius-inset),fill=col)
    im.paste(source_im,(x+(w-source_im.width)//2,y+(h-source_im.height)//2))


def photo(recipe, output, cover=False):
    height=1920 if cover else 1350
    variant=next(i for i,r in enumerate(RECIPES) if r['id']==recipe['id'])%5
    im=background(height,variant);brand(im,74 if cover else 46)
    headline(im,recipe['headline'],top=240 if cover else 172,size=145 if cover else 136)
    source=recipe['sources'][0]
    chart_top=640 if cover else 470
    chart_h=760 if cover else 560
    evidence(im,source,(46,chart_top,988,chart_h),CROPS.get(source))
    d=ImageDraw.Draw(im)
    d.text((72,chart_top+chart_h+18),'RECORDED PRODUCT VIEW',font=font(24,medium=True),fill=MUTED)
    y=chart_top+chart_h+66
    for line in wrap(recipe['summary'],930,font(39 if cover else 32)):
        d.text((74,y),line,font=font(39 if cover else 32),fill=WHITE);y+=54 if cover else 42
    footer=height-135
    d.rounded_rectangle((70,footer,650,footer+63),radius=14,outline=RED,width=3)
    d.text((95,footer+12),'EXPLORE THE FEATURE',font=font(32),fill=WHITE)
    d.text((73,height-49),'darthalgo.com/links',font=font(25,medium=True),fill=MUTED)
    if y>footer-12:raise ValueError('TEXT_LAYOUT_OVERFLOW')
    im.save(output,quality=95,subsampling=0)
    with Image.open(output) as check:check.load()


def scene_image(recipe, scene, index, output):
    im=background(1920,index);brand(im,87,video=True)
    d=ImageDraw.Draw(im)
    d.text((72,220),recipe['feature'],font=font(25,medium=True),fill=MUTED)
    title_lines=wrap(scene['label'],930,font(76))
    for n,line in enumerate(title_lines):d.text((70,278+n*88),line,font=font(76),fill=WHITE if n==0 else RED)
    evidence(im,scene['source'],(42,540,996,670),scene.get('crop'))
    d.text((73,1235),'RECORDED PRODUCT VIEW',font=font(25,medium=True),fill=MUTED)
    d.line((72,1680,1008,1680),fill='#343947',width=2)
    d.text((73,1720),'DARTHALGO.COM/LINKS',font=font(31),fill=WHITE)
    for n in range(6):d.rounded_rectangle((73+n*157,1820,73+n*157+142,1825),radius=2,fill=RED if n<=index else '#343947')
    im.save(output)


def kokoro():
    import onnxruntime as ort
    from kokoro_onnx import Kokoro
    root=Path(os.environ['DARTH_RENDER_MODEL_DIR'])
    for name,(sha,size) in MODELS.items():
        if not (root/name).is_file() or (root/name).stat().st_size!=size or digest(root/name)!=sha:
            raise ValueError('MODEL_HASH_MISMATCH')
    options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
    options.log_severity_level=3
    model_file=os.environ.get('DARTH_RENDER_MODEL_FILE','kokoro-v1.0.onnx')
    if model_file not in MODELS:raise ValueError('MODEL_HASH_MISMATCH')
    session=ort.InferenceSession(str(root/model_file),sess_options=options,providers=['CPUExecutionProvider'])
    return Kokoro.from_session(session,str(root/'voices-v1.0.bin'))


def sentence_parts(text):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+',text) if s.strip()]


def ass_time(seconds):
    ticks=round(seconds*100)
    return f'{ticks//360000}:{ticks//6000%60:02}:{ticks//100%60:02}.{ticks%100:02}'


def captions(cues, output):
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter Display,57,&H00FBF6F4,&H005B46FF,&H00110C0A,&H00110C0A,-1,0,0,0,100,100,0,0,1,2,1,5,72,72,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    lines=[]
    for start,end,text in cues:
        wrapped=wrap(text,900,font(57))
        if len(wrapped)>4:raise ValueError('CAPTION_LAYOUT_OVERFLOW')
        safe='\\N'.join(wrapped).replace('{','').replace('}','')
        lines.append(f'Dialogue: 0,{ass_time(start)},{ass_time(end)},Default,,0,0,0,,{{\\pos(540,1450)\\fad(70,40)}}{safe}')
    output.write_text(header+'\n'.join(lines)+'\n')


def loudness(path):
    result=command(['ffmpeg','-hide_banner','-i',str(path),'-vn','-af','loudnorm=I=-16:TP=-3.5:LRA=7:print_format=json','-f','null','-'])
    matches=re.findall(r'\{[^{}]*"input_i"[^{}]*\}',result.stderr.decode(errors='replace'),re.S)
    if not matches:raise ValueError('AUDIO_ANALYSIS_FAILED')
    data=json.loads(matches[-1])
    return float(data['input_i']),float(data['input_tp'])


def video(recipe, output_dir, progress=lambda *_:None, voice=None):
    import soundfile as sf
    k=voice or kokoro();parts=[];audio_parts=[];scene_data=[];sr=24000;elapsed=0
    for i,scene in enumerate(recipe['scenes']):
        progress('Rendering',8+i*10)
        # Sentence boundaries are actual audio boundaries, not guessed word timings.
        audio=[];cues=[];position=0.12
        audio.append(np.zeros(round(sr*position),dtype=np.float32))
        for sentence in sentence_parts(scene['spoken']):
            check_deadline()
            samples,rate=k.create(sentence,voice='am_michael',speed=1.0,lang='en-us')
            if rate!=sr or not np.isfinite(samples).all() or len(samples)<sr//3:raise ValueError('NARRATION_INVALID')
            seconds=len(samples)/sr
            cues.append((position,position+seconds,sentence))
            audio.extend([samples,np.zeros(round(sr*0.16),dtype=np.float32)])
            position+=seconds+0.16
        frames=math.ceil(position*60);duration=frames/60
        joined=np.concatenate(audio);joined=np.pad(joined,(0,max(0,round(duration*sr)-len(joined))))
        audio_parts.append(joined)
        png=output_dir/f'scene-{i}.png';scene_image(recipe,scene,i,png)
        ass=output_dir/f'scene-{i}.ass';captions(cues,ass)
        part=output_dir/f'scene-{i}.mp4'
        # A slow centered push preserves the genuine chart and avoids camera hunting.
        vf=f"scale=2160:3840,zoompan=z='1+0.022*on/{frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1080x1920:fps=60,ass=filename='{ass}':fontsdir='{ASSETS}',format=yuv420p"
        command(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(png),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-maxrate','3M','-bufsize','6M','-r','60',str(part)])
        parts.append(part);scene_data.append({'source':scene['source'],'start':elapsed,'end':elapsed+duration,'captions':len(cues)})
        elapsed+=duration
    progress('Rendering',73)
    cover=output_dir/'cover.jpg';photo(recipe,cover,cover=True)
    cover_part=output_dir/'cover.mp4'
    command(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-framerate','60','-i',str(cover),'-frames:v','15','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-maxrate','3M','-bufsize','6M','-pix_fmt','yuv420p','-r','60',str(cover_part)])
    parts.append(cover_part)
    joined=np.concatenate(audio_parts+[np.zeros(sr//4,dtype=np.float32)])
    # Original quiet tonal bed. No sampled track or third-party music license.
    t=np.arange(len(joined),dtype=np.float64)/sr
    bed=(np.sin(t*2*np.pi*55)+0.35*np.sin(t*2*np.pi*82.4069))*0.0025
    envelope=np.minimum(1,t/1.5)*np.minimum(1,np.maximum(0,(len(joined)/sr-t)/1.5))
    mixed=joined+bed*envelope
    audio=output_dir/'narration.wav';sf.write(audio,mixed,sr,subtype='PCM_16')
    listing=output_dir/'parts.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
    result=output_dir/'media.mp4'
    command(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-3.5:LRA=7','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart','-shortest',str(result)])
    progress('Checking',84)
    command(['ffmpeg','-hide_banner','-loglevel','error','-xerror','-i',str(result),'-f','null','-'])
    data=json.loads(command(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(result)]).stdout)
    v=next(s for s in data['streams'] if s['codec_type']=='video');a=next(s for s in data['streams'] if s['codec_type']=='audio')
    if (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],a['codec_name'])!=(1080,1920,'60/1','h264','aac'):
        raise ValueError('VIDEO_FORMAT_INVALID')
    integrated,peak=loudness(result)
    if not (-20<=integrated<=-12 and peak<=-3):raise ValueError('AUDIO_LEVEL_REVIEW_REQUIRED')
    # Check the actual final decoded frame against the separately designed cover.
    last=output_dir/'last-frame.png'
    command(['ffmpeg','-y','-hide_banner','-loglevel','error','-sseof','-0.08','-i',str(result),'-frames:v','1',str(last)])
    actual=np.asarray(Image.open(last).convert('RGB'),dtype=float)
    expected=np.asarray(Image.open(cover).convert('RGB'),dtype=float)
    if np.mean(np.abs(actual-expected))>8:raise ValueError('FINAL_COVER_MISMATCH')
    report={'fullDecode':True,'creativeReview':False,'sha256':digest(result),'width':1080,'height':1920,'frameRate':60,'hasNarration':True,'coverSeconds':0.25,'integratedLufs':integrated,'truePeakDb':peak,'durationSeconds':float(data['format']['duration']),'scenes':scene_data}
    return result,cover,report


def render(item, output_dir, progress=lambda *_:None, voice=None):
    manifest=validate_sources();recipe=resolve_recipe(item)
    kind=item.get('type')
    expected_template='DA-VIDEO-v15' if kind=='video' else 'DA-PHOTO-20261112-v4-REFINED'
    if kind not in ['image','video'] or item.get('templateId')!=expected_template:raise ValueError('TEMPLATE_NOT_SUPPORTED')
    output_dir=Path(output_dir).resolve();output_dir.mkdir(parents=True,exist_ok=True)
    if kind=='video':media,cover,report=video(recipe,output_dir,progress,voice)
    else:
        progress('Rendering',35);media=output_dir/'media.jpg';photo(recipe,media)
        cover=output_dir/'cover.jpg';photo(recipe,cover)
        report={'fullDecode':True,'creativeReview':False,'sha256':digest(media),'width':1080,'height':1350}
    if media.stat().st_size>32*1024*1024:raise ValueError('FILE_SIZE_LIMIT')
    sources={s['source'] for s in recipe['scenes']}
    report.update({'rendererVersion':VERSION,'recipe':recipe['id'],'template':expected_template,'sourceHashes':[row for row in manifest['sources'] if row['path'] in sources],'narration':'kokoro-v1.0-am_michael' if kind=='video' else None,'externalGenerationApiCostUsd':0})
    script=' '.join(s['spoken'] for s in recipe['scenes']) if kind=='video' else ''
    caption=item.get('caption') or f"{recipe['summary']} Explore the feature: https://www.darthalgo.com/links"
    result={'media':str(media),'cover':str(cover),'mediaReport':report,'coverReport':{'fullDecode':True,'creativeReview':False,'sha256':digest(cover)},'script':script,'caption':caption}
    result['proofHash']=hashlib.sha256(json.dumps(report,sort_keys=True).encode()).hexdigest()
    (output_dir/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def preflight(output_dir):
    validate_sources();voice=kokoro()
    import soundfile as sf
    output_dir=Path(output_dir);output_dir.mkdir(parents=True,exist_ok=True)
    samples,rate=voice.create('Read the chart. Check the context.',voice='am_michael',speed=1.0,lang='en-us')
    if rate!=24000 or len(samples)<rate or not np.isfinite(samples).all():raise ValueError('NARRATION_INVALID')
    sf.write(output_dir/'preflight.wav',samples,rate)
    image=output_dir/'preflight.jpg';photo(RECIPES[0],image)
    command(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-i',str(image),'-i',str(output_dir/'preflight.wav'),'-t','1','-vf','scale=1080:1920','-c:v','libx264','-threads','2','-preset','ultrafast','-pix_fmt','yuv420p','-r','60','-c:a','aac',str(output_dir/'preflight.mp4')])
    command(['ffmpeg','-v','error','-xerror','-i',str(output_dir/'preflight.mp4'),'-f','null','-'])
    return voice


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--input');parser.add_argument('--output',required=True);parser.add_argument('--preflight',action='store_true');args=parser.parse_args()
    try:
        if args.preflight:preflight(args.output)
        else:render(json.loads(Path(args.input).read_text()),args.output)
        print('Local media validation completed.')
    except Exception as error:
        code=str(error) if re.fullmatch(r'[A-Z_]{4,80}',str(error)) else 'RENDER_FAILED'
        print(code,file=sys.stderr);sys.exit(1)
