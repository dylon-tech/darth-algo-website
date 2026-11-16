"""Offline timing, original-pixel, audio and private-asset boundary regression."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts/founder-renderer'))
import v15_editing as edit
from render import font, wrap, validate_sources


class EditingTest(unittest.TestCase):
    def test_native_voice_disables_telemetry_before_inference(self):
        import render
        calls = []
        def session(*args, **kwargs):
            self.assertEqual(calls, ['telemetry_disabled'])
            calls.append('session')
            return 'local-session'
        fake = SimpleNamespace(disable_telemetry_events=lambda: calls.append('telemetry_disabled'),
                               SessionOptions=SimpleNamespace, InferenceSession=session)
        voice = SimpleNamespace(Kokoro=SimpleNamespace(from_session=lambda *args: 'local-voice'))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
                (root/name).write_bytes(b'fixture')
            model = {name: (hashlib.sha256(b'fixture').hexdigest(), 7) for name in ('kokoro-v1.0.onnx', 'voices-v1.0.bin')}
            with patch.dict(sys.modules, {'onnxruntime': fake, 'kokoro_onnx': voice}), patch.object(render, 'MODELS', model), patch.dict(render.os.environ, {'DARTH_RENDER_MODEL_DIR': directory, 'DARTH_RENDER_MODEL_FILE': 'kokoro-v1.0.onnx'}):
                self.assertEqual(render.kokoro(), 'local-voice')
        self.assertEqual(calls, ['telemetry_disabled', 'session'])

    def test_motion_settles_without_lateral_drift_or_source_change(self):
        before = validate_sources()
        for frames in (60, 300, 600):
            for variant in (0, 1):
                motion = edit.settled_zoom(frames, variant)
                values = [edit.zoom_at(i, motion, variant) for i in range(frames)]
                self.assertTrue(all(1 <= value <= 1.022 for value in values))
                self.assertEqual(len(set(values[motion['settledFrame']:])), 1)
                self.assertGreaterEqual(frames-motion['settledFrame'], frames/2)
                self.assertEqual(motion['anchor'], 'center')
                self.assertNotIn('source', motion['expression'])
        self.assertEqual(validate_sources(), before)

    def test_readable_hold_preserves_measured_speech(self):
        plan = edit.scene_timing(6.31)
        self.assertEqual(plan['speechFrames'], 379)
        self.assertEqual(plan['holdFrames'], 39)
        self.assertEqual(plan['duration'], 418/60)
        for bad in (-1, 0, float('nan'), 181, True):
            with self.assertRaisesRegex(ValueError, 'EDIT_TIMING_INVALID'):
                edit.scene_timing(bad)

    def test_caption_boundaries_are_measured_not_guessed(self):
        takes = [(0.12, .70, 'OPEN INDICATORS'), (.82, 1.51, 'THEN INVITE-ONLY')]
        self.assertEqual(edit.measured_cues(takes), takes)
        result = edit.ass_caption_events(takes, wrap, font)
        self.assertIn('0:00:00.12,0:00:00.70', result)
        self.assertIn('\\move(540,1452,540,1440,0,100)', result)
        self.assertIn('\\bord0\\shad0', result)
        self.assertNotIn('\\t(', result, 'No endless caption animation')
        for takes in ([(0, .5, 'One'), (.4, .8, 'Overlap')], [(0, 0, 'No duration')], [(0, .5, '{\\p1}override')]):
            with self.assertRaises(ValueError):
                edit.ass_caption_events(takes, wrap, font)
        with self.assertRaisesRegex(ValueError, 'CAPTION_LAYOUT_OVERFLOW'):
            edit.ass_caption_events([(0, 2, 'Too many words in the caption. '*10)], wrap, font)

    def test_phrase_boundaries_preserve_words_and_fit_actual_font(self):
        from recipes import RECIPES
        for recipe in RECIPES:
            for scene in recipe['scenes']:
                chunks = edit.spoken_chunks(scene['spoken'])
                self.assertEqual(' '.join(chunks), ' '.join(scene['spoken'].split()))
                for chunk in chunks:
                    self.assertLessEqual(len(chunk.split()), 7)
                    edit.ass_caption_events([(0, 2, chunk)], wrap, font)
        balanced = edit.spoken_chunks('Keep the surrounding candles visible when reviewing one displayed feature.')
        self.assertEqual([len(part.split()) for part in balanced], [5, 5])

    def test_outro_final_quarter_second_is_exact_cover(self):
        rng = np.random.default_rng(5)
        cover = Image.fromarray(rng.integers(0, 255, (1920, 1080, 3), dtype=np.uint8))
        original = hashlib.sha256(cover.tobytes()).hexdigest()
        plan = edit.outro_timing()
        self.assertEqual(plan['coverFrames'], 15)
        self.assertEqual(plan['coverSeconds'], .25)
        self.assertNotEqual(edit.outro_frame(cover, 0, plan['frames']).tobytes(), cover.tobytes())
        for frame in range(plan['frames']-15, plan['frames']):
            self.assertEqual(hashlib.sha256(edit.outro_frame(cover, frame, plan['frames']).tobytes()).hexdigest(), original)
        self.assertEqual(hashlib.sha256(cover.tobytes()).hexdigest(), original)
        self.assertGreaterEqual(plan['coverFrameOffset'], plan['frames']-15)

    def test_sfx_are_deterministic_bounded_and_do_not_create_events(self):
        events = [(.2, 'click'), (.8, 'whoosh')]
        first = edit.procedural_sfx(events, 48000)
        self.assertEqual(first.tobytes(), edit.procedural_sfx(events, 48000).tobytes())
        self.assertTrue(np.all(first[:4800] == 0))
        self.assertLessEqual(float(np.max(np.abs(first))), .18)
        self.assertTrue(np.all(edit.procedural_sfx([], 48000) == 0))
        for events in ([(-1, 'click')], [(2, 'click')], [(.1, 'unknown')]):
            with self.assertRaisesRegex(ValueError, 'SFX_TIMING_INVALID'):
                edit.procedural_sfx(events, 48000)

    def test_music_is_optional_and_fail_closed_before_decode(self):
        self.assertEqual(edit.private_music()[1]['status'], 'unavailable')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(edit.private_music(root)[1]['status'], 'unavailable')
            entry = json.loads(edit.MANIFEST_PATH.read_text())['music']
            wrong = root/entry['privateFilename']
            wrong.write_bytes(b'x'*entry['bytes'])
            with patch.object(edit.subprocess, 'run', side_effect=AssertionError('Unverified audio reached decoder')):
                with self.assertRaisesRegex(ValueError, 'PRIVATE_AUDIO_HASH_MISMATCH'):
                    edit.private_music(root)
            wrong.unlink(); wrong.symlink_to(root/'missing')
            # A dangling link is unavailable; a link to bytes is never accepted.
            (root/'missing').write_bytes(b'x')
            with self.assertRaisesRegex(ValueError, 'PRIVATE_AUDIO_HASH_MISMATCH'):
                edit.private_music(root)
        with self.assertRaisesRegex(ValueError, 'PRIVATE_AUDIO_LOCATION_INVALID'):
            edit.private_music(ROOT/'public')

    def test_voice_first_mix_retains_timing_and_ducks_music(self):
        sample_rate = 24000
        t = np.arange(sample_rate*3)/sample_rate
        voice = np.zeros(len(t), dtype=np.float32)
        voice[sample_rate:sample_rate*2] = (.15*np.sin(2*np.pi*440*t[:sample_rate])).astype(np.float32)
        music = np.sin(2*np.pi*110*t).astype(np.float32)
        unchanged, report = edit.mix_audio(voice)
        self.assertEqual(unchanged.tobytes(), voice.tobytes())
        self.assertFalse(report['musicPresent'])
        mixed, report = edit.mix_audio(voice, music)
        self.assertEqual(len(mixed), len(voice))
        self.assertEqual(report['narrationTiming'], 'unchanged')
        self.assertLessEqual(report['peakBeforeMaster'], .85)
        bed = mixed-voice
        during = np.sqrt(np.mean(bed[int(1.2*sample_rate):int(1.8*sample_rate)]**2))
        silent = np.sqrt(np.mean(bed[int(.5*sample_rate):int(.9*sample_rate)]**2))
        self.assertLess(during, silent*.6)
        self.assertTrue(np.array_equal(voice[:sample_rate], np.zeros(sample_rate)))


if __name__ == '__main__':
    unittest.main()
