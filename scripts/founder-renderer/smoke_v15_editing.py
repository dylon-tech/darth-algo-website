"""Local-only edit smoke using the existing approved ZIP; no TTS/API/upload.

The resulting clip is a changed, unapproved review artifact, never a calendar
asset or a publication. Private music/narration bytes remain outside the repo.
"""
import argparse
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import subprocess
import tempfile
import wave
from zipfile import ZipFile

import numpy as np
from PIL import Image, ImageDraw

from recipes import RECIPES
from render import ASSETS, font, wrap, scene_image, photo, validate_sources
from v15_editing import VERSION, MANIFEST_PATH, settled_zoom, scene_timing, ass_caption_events, outro_timing, outro_frame, private_music, mix_audio


def run(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if result.returncode:
        raise RuntimeError('LOCAL_SMOKE_CODEC_FAILED')
    return result


def main(template, output):
    output = output.resolve(); output.mkdir(parents=True, exist_ok=True)
    sources = validate_sources()
    manifest = json.loads(MANIFEST_PATH.read_text())
    with template.open('rb') as stream:
        digest = sha256()
        for block in iter(lambda: stream.read(1024*1024), b''):
            digest.update(block)
    if digest.hexdigest() != manifest['sourcePackageSha256']:
        raise ValueError('APPROVED_TEMPLATE_HASH_MISMATCH')
    with ZipFile(template) as package, tempfile.TemporaryDirectory(prefix='darth-v15-private-') as private:
        music_path = Path(private)/manifest['music']['privateFilename']
        music_path.write_bytes(package.read(manifest['music']['sourceMember']))
        with wave.open(BytesIO(package.read('source/assets/tutorial.wav'))) as audio:
            if audio.getparams()[:3] != (1, 2, 48000):
                raise ValueError('APPROVED_DEMO_AUDIO_FORMAT_CHANGED')
            voice = np.frombuffer(audio.readframes(audio.getnframes()), '<i2').astype(np.float32)/32768
        # Existing measured tutorial phrase timings, from caption_style.py.
        source_start, source_end, lead = 1.84, 8.15, .12
        cues = [(a-source_start+lead, b-source_start+lead, text) for a, b, text in [
            (1.84, 2.34, 'ONCE YOUR ACCESS'), (2.34, 3.25, 'IS ACTIVE'),
            (3.50, 4.45, 'OPEN INDICATORS'), (4.70, 5.70, 'THEN INVITE-ONLY'),
            (5.90, 6.34, 'AND SELECT'), (6.34, 7.32, 'DARTH ALGO'), (7.32, 8.15, 'SWING')]]
        speech = voice[round(source_start*48000):round(source_end*48000):2]
        timing = scene_timing(len(speech)/24000+lead)
        close = outro_timing()
        samples = round((timing['duration']+close['duration'])*24000)
        narration = np.zeros(samples, dtype=np.float32)
        narration[round(lead*24000):round(lead*24000)+len(speech)] = speech
        music, music_report = private_music(private)
        mixed, audio_report = mix_audio(narration, music, [(3.50-source_start+lead, 'click'), (timing['duration'], 'whoosh')])
        with wave.open(str(output/'mix.wav'), 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
            wav.writeframes(np.rint(np.clip(mixed, -1, 1)*32767).astype('<i2').tobytes())
        recipe = RECIPES[0]
        scene_image(recipe, recipe['scenes'][1], 1, output/'scene.png')
        photo(recipe, output/'cover.jpg', cover=True)
        header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter Display,76,&H00FBF6F4,&H005B46FF,&H00110C0A,&H00110C0A,-1,0,0,0,100,100,0,0,1,0,0,5,72,72,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
        ass = output/'captions.ass'; ass.write_text(header+ass_caption_events(cues, wrap, font))
        motion = settled_zoom(timing['frames'])
        vf = f"scale=2160:3840,zoompan=z='{motion['expression']}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={timing['frames']}:s=1080x1920:fps=60,ass=filename='{ass}':fontsdir='{ASSETS}',format=yuv420p"
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(output/'scene.png'), '-vf', vf, '-frames:v', str(timing['frames']), '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '21', str(output/'body.mp4')])
        cover = Image.open(output/'cover.jpg').convert('RGB')
        encoder = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', str(output/'outro.mp4')], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            for frame in range(close['frames']):
                encoder.stdin.write(outro_frame(cover, frame, close['frames']).tobytes())
            encoder.stdin.close()
            if encoder.wait(timeout=60):
                raise RuntimeError('LOCAL_SMOKE_OUTRO_FAILED')
        finally:
            if encoder.poll() is None:
                encoder.kill(); encoder.wait()
        listing = output/'concat.txt'
        listing.write_text("file 'body.mp4'\nfile 'outro.mp4'\n")
        final = output/'v15-editing-local-review.mp4'
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(listing), '-i', str(output/'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-3.5:LRA=7', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', str(final)])
        run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(final), '-f', 'null', '-'])
        meta = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(final)]).stdout)
        video = next(stream for stream in meta['streams'] if stream['codec_type'] == 'video')
        expected_frames = timing['frames']+close['frames']
        if (video['width'], video['height'], video['r_frame_rate'], int(video['nb_frames'])) != (1080, 1920, '60/1', expected_frames):
            raise ValueError('LOCAL_SMOKE_TIMING_FAILED')
        contact = Image.new('RGB', (390*3, 720*2), '#0a0f19')
        for index, at in enumerate([.15, .6, 2.1, 5.8, timing['duration']+.35, expected_frames/60-.1]):
            frame = output/f'frame-{index}.png'
            run(['ffmpeg', '-y', '-v', 'error', '-ss', str(at), '-i', str(final), '-frames:v', '1', str(frame)])
            image = Image.open(frame).convert('RGB')
            if index == 5:
                error = float(np.mean(np.abs(np.asarray(image, dtype=float)-np.asarray(cover, dtype=float))))
                if error > 9:
                    raise ValueError('LOCAL_SMOKE_COVER_MISMATCH')
            contact.paste(image.resize((390, 693), Image.Resampling.LANCZOS), ((index%3)*390, (index//3)*720))
            ImageDraw.Draw(contact).text(((index%3)*390+8, (index//3)*720+696), f'{at:.2f}s', fill='white')
        contact.save(output/'phone-contact-sheet.jpg', quality=94)
        if validate_sources() != sources:
            raise ValueError('LOCAL_SMOKE_SOURCE_CHANGED')
        report = {'editingVersion': VERSION, 'kind': 'offline_changed_review_clip', 'creativeReview': False,
                  'uploaded': False, 'published': False, 'newVoiceGenerated': False, 'externalCalls': 0,
                  'voice': 'Existing approved tutorial recording, measured excerpt; no new ElevenLabs request.',
                  'music': music_report, 'audio': audio_report, 'captionTiming': 'existing measured phrase boundaries',
                  'frames': expected_frames, 'fps': 60, 'width': 1080, 'height': 1920, 'duration': expected_frames/60,
                  'camera': motion, 'readableHold': timing['holdFrames']/60, 'coverSeconds': .25, 'coverDecodedMeanError': error,
                  'sourcePath': recipe['scenes'][1]['source'], 'sourceHashesUnchanged': True, 'fullDecode': True,
                  'sha256': sha256(final.read_bytes()).hexdigest(), 'limitations': ['Not full v15 fidelity.', 'Static genuine source; no live chart recording.', 'No new narration generation or private hosted asset connection.']}
        (output/'review.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps({'output': str(final), 'frames': expected_frames, 'fullDecode': True, 'creativeReview': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--template-zip', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    main(args.template_zip, args.output)
