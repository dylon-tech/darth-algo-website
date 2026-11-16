"""Reusable, source-preserving edits adapted from the approved v15 project.

This is an editing component, not a claim of complete v15 fidelity. It cannot
generate a voice, fetch media, approve a creative, or change a rendering budget.
Narration timings must come from actual audio takes or verified word alignment.
"""
from hashlib import sha256
import json
import math
from pathlib import Path
import re
import subprocess

import numpy as np
from PIL import Image, ImageDraw

VERSION = 'DA-V15-EDITING-20261116-1'
ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path(__file__).with_name('v15-private-assets.json')
FPS = 60
COVER_FRAMES = 15


def _finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def ease(value):
    q = min(1.0, max(0.0, value))
    return q*q*q*(q*(q*6-15)+10)


def settled_zoom(frames, variant=0, fps=FPS):
    """A brief centered context-to-detail move, followed by a stationary hold.

    The 2.2% bound retains the existing renderer's generous source margins.
    Unlike its previous perpetual push/pull, labels stop moving while read.
    The returned expression is FFmpeg zoompan syntax; no scene text enters it.
    """
    if not isinstance(frames, int) or frames < 1 or fps != FPS:
        raise ValueError('EDIT_TIMING_INVALID')
    start = min(9, max(0, frames//8))
    move = min(45, max(1, frames//3))
    q = f'min(1,max(0,(on-{start})/{move}))'
    smooth = f'pow({q},3)*({q}*({q}*6-15)+10)'
    zoom = f'1.022-0.022*({smooth})' if variant & 1 else f'1+0.022*({smooth})'
    return {'expression': zoom, 'startFrame': start, 'settledFrame': start+move,
            'maximumZoom': 1.022, 'anchor': 'center', 'fps': fps}


def zoom_at(frame, motion, variant=0):
    q = ease((frame-motion['startFrame'])/max(1, motion['settledFrame']-motion['startFrame']))
    return 1.022-0.022*q if variant & 1 else 1+0.022*q


def scene_timing(speech_end, reading_hold=0.65):
    if not _finite(speech_end) or not 0 < speech_end <= 180 or not _finite(reading_hold) or not 0.25 <= reading_hold <= 1.5:
        raise ValueError('EDIT_TIMING_INVALID')
    speech_frames = math.ceil(speech_end*FPS)
    hold_frames = math.ceil(reading_hold*FPS)
    return {'frames': speech_frames+hold_frames, 'speechFrames': speech_frames,
            'holdFrames': hold_frames, 'duration': (speech_frames+hold_frames)/FPS}


def measured_cues(takes):
    """Keep exact measured take/word boundaries; never estimate word timing."""
    if not isinstance(takes, (list, tuple)) or not 1 <= len(takes) <= 200:
        raise ValueError('CAPTION_TIMING_INVALID')
    result = []; prior = 0.0
    for start, end, text in takes:
        if not _finite(start) or not _finite(end) or start < prior or end <= start or end > 180:
            raise ValueError('CAPTION_TIMING_INVALID')
        if not isinstance(text, str) or not text.strip() or len(text) > 600 or any(c in text for c in '{}\\\x00'):
            raise ValueError('CAPTION_TEXT_INVALID')
        result.append((float(start), float(end), ' '.join(text.split())))
        prior = end
    return result


def spoken_chunks(text):
    """Bound phrases before speech synthesis, preserving every spoken word.

    Each returned phrase gets its own measured audio boundary. This avoids
    inventing word timestamps from a full sentence's duration.
    """
    if not isinstance(text, str) or not text.strip() or len(text) > 600 or any(c in text for c in '{}\\\x00'):
        raise ValueError('CAPTION_TEXT_INVALID')
    result = []
    for clause in re.split(r'(?<=[.!?,;:])\s+', ' '.join(text.split())):
        words = clause.split()
        if any(len(word) > 62 for word in words):
            raise ValueError('CAPTION_LAYOUT_OVERFLOW')
        while words:
            # Balance the remaining phrase sizes instead of stranding the last
            # word of a sentence in its own spoken take/caption.
            groups = max(math.ceil(len(words)/7), math.ceil(len(' '.join(words))/62))
            count = math.ceil(len(words)/groups)
            while len(' '.join(words[:count])) > 62:
                count -= 1
            result.append(' '.join(words[:count])); words = words[count:]
    return result


def ass_caption_events(takes, wrap, font, size=76, y=1440):
    """Borderless Inter phrases: 0.1s entrance, then a stationary reading hold.

    Whole measured takes are retained when word alignment is unavailable.
    The caller must not label those timings as word-aligned narration.
    """
    if size < 72 or size > 82:
        raise ValueError('CAPTION_LAYOUT_OVERFLOW')
    def stamp(seconds):
        ticks = round(seconds*100)
        return f'{ticks//360000}:{ticks//6000%60:02}:{ticks//100%60:02}.{ticks%100:02}'
    lines = []
    for start, end, text in measured_cues(takes):
        rows = wrap(text, 920, font(size))
        if len(rows) > 3:
            raise ValueError('CAPTION_LAYOUT_OVERFLOW')
        safe = '\\N'.join(rows)
        entrance = min(100, max(1, round((end-start)*1000/3)))
        tags = f'{{\\move(540,{y+12},540,{y},0,{entrance})\\fad({entrance},0)\\bord0\\shad0}}'
        lines.append(f'Dialogue: 0,{stamp(start)},{stamp(end)},Default,,0,0,0,,{tags}{safe}')
    return '\n'.join(lines)+'\n'


def outro_timing(seconds=1.5):
    if not _finite(seconds) or not 1.25 <= seconds <= 3:
        raise ValueError('EDIT_TIMING_INVALID')
    frames = math.ceil(seconds*FPS)
    return {'frames': frames, 'animatedFrames': frames-COVER_FRAMES,
            'coverFrames': COVER_FRAMES, 'coverSeconds': COVER_FRAMES/FPS,
            'coverFrameOffset': frames-COVER_FRAMES//2-1, 'duration': frames/FPS}


def outro_frame(cover, frame, frames):
    """Reveal the designed cover without moving its type or product pixels.

    The final quarter-second is exactly the supplied cover, with no added
    annotation or stale offer. A restrained margin accent ends before that hold.
    """
    if cover.size != (1080, 1920) or not 0 <= frame < frames or frames < 75:
        raise ValueError('COVER_LAYOUT_INVALID')
    base = cover.convert('RGB')
    if frame >= frames-COVER_FRAMES:
        return base.copy()
    q = ease(frame/18)
    result = Image.blend(Image.new('RGB', base.size, '#0a0f19'), base, q)
    # Keep the accent in the existing empty outer margin; no source/title cover.
    if frame < 48:
        draw = ImageDraw.Draw(result)
        length = round(360*ease(frame/24)*(1-ease(max(0, frame-30)/18)))
        draw.line((1058, 560, 1058, 560+length), fill='#ff465b', width=3)
    return result


def procedural_sfx(events, samples, sample_rate=24000):
    """Original deterministic accents adapted from v15's original SFX logic.

    Events are explicit edit cues, never inferred chart wins or target hits.
    """
    if not isinstance(samples, int) or not 0 <= samples <= sample_rate*180 or sample_rate not in (24000, 48000):
        raise ValueError('SFX_TIMING_INVALID')
    if len(events) > 100:
        raise ValueError('SFX_TIMING_INVALID')
    result = np.zeros(samples, dtype=np.float32)
    lengths = {'click': .09, 'whoosh': .28, 'chime': .45}
    for index, (at, kind) in enumerate(events):
        if not _finite(at) or at < 0 or at*sample_rate >= samples or kind not in lengths:
            raise ValueError('SFX_TIMING_INVALID')
        t = np.arange(round(sample_rate*lengths[kind]))/sample_rate
        rng = np.random.default_rng(1700+index)
        if kind == 'click':
            signal = (np.sin(2*np.pi*1500*t)*.045+rng.normal(0, .025, len(t)))*np.exp(-t*65)
        elif kind == 'chime':
            signal = .035*(np.sin(2*np.pi*880*t)+.6*np.sin(2*np.pi*1320*t))*np.exp(-t*9)*np.minimum(t/.006, 1)
        else:
            signal = np.convolve(rng.normal(size=len(t)), np.ones(8)/8, 'same')*.06*np.sin(np.pi*t/lengths[kind])**2
        start = round(at*sample_rate); count = min(len(signal), samples-start)
        result[start:start+count] += signal[:count]
    return np.clip(result, -.18, .18)


def private_music(private_root=None, sample_rate=24000, timeout=20):
    """Decode only the exact previously approved private track. Never fetch it.

    No asset is mandatory merely to finish a review draft. Missing music stays
    explicit; an existing invalid file fails closed before the decoder runs.
    """
    entry = json.loads(MANIFEST_PATH.read_text())['music']
    unavailable = {'status': 'unavailable', 'reason': 'Approved private music is not attached.', 'sha256': None}
    if private_root is None:
        return None, unavailable
    root = Path(private_root).resolve()
    if root == ROOT or ROOT in root.parents:
        raise ValueError('PRIVATE_AUDIO_LOCATION_INVALID')
    path = root/entry['privateFilename']
    if not path.exists():
        return None, unavailable
    if path.is_symlink() or not path.is_file() or path.stat().st_size != entry['bytes']:
        raise ValueError('PRIVATE_AUDIO_HASH_MISMATCH')
    raw = path.read_bytes()
    if sha256(raw).hexdigest() != entry['sha256']:
        raise ValueError('PRIVATE_AUDIO_HASH_MISMATCH')
    if sample_rate not in (24000, 48000) or not _finite(timeout) or timeout <= 0:
        raise ValueError('PRIVATE_AUDIO_INVALID')
    try:
        result = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'pipe',
                                 '-i', 'pipe:0', '-t', '180', '-f', 'f32le', '-ac', '1', '-ar', str(sample_rate), 'pipe:1'],
                                input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=min(20, timeout))
    except subprocess.TimeoutExpired:
        raise ValueError('PRIVATE_AUDIO_DECODE_FAILED') from None
    if result.returncode or not result.stdout or len(result.stdout) % 4:
        raise ValueError('PRIVATE_AUDIO_DECODE_FAILED')
    audio = np.frombuffer(result.stdout, dtype='<f4').copy()
    # Lossy MP3 decoding can overshoot full scale (this approved track does).
    # Preserve those float samples; the voice-first mixer sets its quiet level.
    if not np.isfinite(audio).all() or len(audio) > sample_rate*180 or np.max(np.abs(audio)) > 4:
        raise ValueError('PRIVATE_AUDIO_INVALID')
    return audio, {'status': 'verified_private_asset', 'sha256': entry['sha256'], 'assetId': entry['assetId']}


def mix_audio(voice, music=None, events=(), sample_rate=24000):
    """Moderate voice-first mix; preserve voice samples and timing before master.

    The caller still measures the encoded master. This does not normalize a
    quiet preview or claim an ear review. No fallback music impersonates v15.
    """
    voice = np.asarray(voice, dtype=np.float32)
    if voice.ndim != 1 or not 1 <= len(voice) <= sample_rate*180 or not np.isfinite(voice).all():
        raise ValueError('NARRATION_INVALID')
    mixed = voice.copy()
    music_gain = None
    if music is not None:
        music = np.asarray(music, dtype=np.float32)
        if music.ndim != 1 or not len(music) or not np.isfinite(music).all():
            raise ValueError('PRIVATE_AUDIO_INVALID')
        bed = np.resize(music, len(voice)).astype(np.float32)
        rms = float(np.sqrt(np.mean(bed.astype(np.float64)**2)))
        if rms < 1e-7:
            raise ValueError('PRIVATE_AUDIO_INVALID')
        # 20ms RMS activity, fast attack and gradual release; no SciPy dependency.
        block = sample_rate//50
        padded = np.pad(voice, (0, (-len(voice)) % block))
        activity = np.sqrt(np.mean(padded.reshape(-1, block)**2, axis=1)) > .012
        gains = []; current = .008
        for active in activity:
            target = .008 if active else .022
            current += (target-current)*(.75 if active else .07)
            gains.append(current)
        music_gain = np.interp(np.arange(len(voice))/block, np.arange(len(gains)), gains)
        fade = np.minimum(1, np.arange(len(voice))/(sample_rate*.2))*np.minimum(1, (len(voice)-1-np.arange(len(voice)))/(sample_rate*.5))
        mixed += bed/rms*music_gain*fade
    mixed += procedural_sfx(events, len(voice), sample_rate)
    peak = float(np.max(np.abs(mixed)))
    gain = min(1.0, .85/max(peak, 1e-9))
    return (mixed*gain).astype(np.float32), {'peakBeforeMaster': peak*gain, 'clipProtectionGain': gain,
            'musicPresent': music is not None, 'musicRmsDuringVoice': .008 if music is not None else None,
            'sfxEvents': len(events), 'narrationTiming': 'unchanged'}
