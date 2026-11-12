"""Pinned CPU runtime files in /tmp, downloaded only inside an approved attempt."""
import hashlib
import fcntl
import os
from pathlib import Path
import urllib.request
import time

FILES={
 'kokoro-v1.0.int8.onnx':('https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx',92361271,'6e742170d309016e5891a994e1ce1559c702a2ccd0075e67ef7157974f6406cb'),
 'voices-v1.0.bin':('https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',28214398,'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d'),
 'ffmpeg':('https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64',78683840,'ed652b2f32e0851d1946894fb8333f5b677c1b2ce6b9d187910a67f8b99da028'),
 'ffprobe':('https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffprobe-linux-x64',78557440,'a339171d90f7482b2db02234e261b9e00d51526391f87fa633d5da7b98a28cf4'),
}


def setup_runtime(root=None,deadline=None):
    root=Path(root or '/tmp/darth-native-media-runtime');root.mkdir(exist_ok=True)
    with (root/'.download.lock').open('a') as lock:
        while True:
            if deadline is not None and time.monotonic()>=deadline:raise ValueError('RENDER_DEADLINE')
            try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);break
            except BlockingIOError:time.sleep(0.05)
        if deadline is not None and time.monotonic()>=deadline:raise ValueError('RENDER_DEADLINE')
        _setup_files(root,deadline)


def _setup_files(root,deadline):
    for name,(url,size,sha) in FILES.items():
        remaining=35 if deadline is None else min(35,deadline-time.monotonic())
        if remaining<=0:raise ValueError('RENDER_DEADLINE')
        target=root/name
        valid=target.is_file() and target.stat().st_size==size and hashlib.sha256(target.read_bytes()).hexdigest()==sha
        if not valid:
            partial=root/(name+'.part')
            try:
                with urllib.request.urlopen(url,timeout=remaining) as response,partial.open('wb') as output:
                    received=0
                    while chunk:=response.read(1024*1024):
                        if deadline is not None and time.monotonic()>deadline:raise ValueError('RENDER_DEADLINE')
                        received+=len(chunk)
                        if received>size:raise ValueError('RUNTIME_SIZE_MISMATCH')
                        output.write(chunk)
                if partial.stat().st_size!=size or hashlib.sha256(partial.read_bytes()).hexdigest()!=sha:raise ValueError('RUNTIME_HASH_MISMATCH')
                partial.replace(target)
            finally:partial.unlink(missing_ok=True)
        if name in ['ffmpeg','ffprobe']:target.chmod(0o700)
    os.environ['PATH']=str(root)+os.pathsep+os.environ.get('PATH','')
    os.environ['DARTH_RENDER_MODEL_DIR']=str(root)
    # Keep the tested renderer implementation, substituting verified lighter
    # weights before its first preflight; no paid hosted voice inference.
    import setup_models,render
    setup_models.MODELS={'kokoro-v1.0.int8.onnx':(FILES['kokoro-v1.0.int8.onnx'][2],FILES['kokoro-v1.0.int8.onnx'][1]),'voices-v1.0.bin':(FILES['voices-v1.0.bin'][2],FILES['voices-v1.0.bin'][1])}
    render.MODELS=setup_models.MODELS
    # Original filename is selected by render.kokoro through this environment.
    os.environ['DARTH_RENDER_MODEL_FILE']='kokoro-v1.0.int8.onnx'
