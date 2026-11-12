"""Local boundary checks; no downloads, hosted calls, or narration inference."""
import fcntl
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts/founder-renderer'))
sys.path.insert(0,str(Path(__file__).parent))

class RuntimeBoundaries(unittest.TestCase):
    def test_disabled_handler_has_no_heavy_imports(self):
        spec=importlib.util.spec_from_file_location('native_handler',ROOT/'api/founder-native-render.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        self.assertNotIn('render',sys.modules)
        old=os.environ.pop('AI_OS_MEDIA_RENDERER_ENABLED',None)
        try:
            handler=module.handler.__new__(module.handler);replies=[]
            handler.reply=lambda status,value:replies.append((status,value))
            handler.do_POST()
            self.assertEqual(replies[0][0],503)
            self.assertNotIn('render',sys.modules)
        finally:
            if old is not None:os.environ['AI_OS_MEDIA_RENDERER_ENABLED']=old

    def test_download_lock_respects_deadline(self):
        from setup_runtime import setup_runtime
        with tempfile.TemporaryDirectory() as folder:
            with (Path(folder)/'.download.lock').open('a') as lock:
                fcntl.flock(lock,fcntl.LOCK_EX)
                began=time.monotonic()
                with self.assertRaisesRegex(ValueError,'RENDER_DEADLINE'):
                    setup_runtime(folder,deadline=began+0.07)
                self.assertLess(time.monotonic()-began,0.4)

    def test_subprocess_stops_before_callback_margin(self):
        from render import command,render_deadline
        began=time.monotonic()
        with render_deadline(began+0.1):
            with self.assertRaisesRegex(RuntimeError,'RENDER_DEADLINE'):
                command([sys.executable,'-c','import time;time.sleep(10)'])
        self.assertLess(time.monotonic()-began,1)

if __name__=='__main__':unittest.main()
