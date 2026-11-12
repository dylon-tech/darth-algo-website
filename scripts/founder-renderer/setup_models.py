"""Download public Apache-2.0 Kokoro weights, verify bytes, never use a hosted API."""
import hashlib
import os
from pathlib import Path
import urllib.request

MODELS = {
    'kokoro-v1.0.onnx': ('7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5', 325532387),
    'voices-v1.0.bin': ('bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d', 28214398),
}
BASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'


def digest(path):
    with open(path, 'rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def setup():
    root = Path(os.environ['DARTH_RENDER_MODEL_DIR'])
    root.mkdir(parents=True, exist_ok=True)
    for name, (sha, size) in MODELS.items():
        target = root / name
        if target.exists() and target.stat().st_size == size and digest(target) == sha:
            continue
        temporary = root / (name + '.part')
        try:
            with urllib.request.urlopen(BASE + name, timeout=90) as response, temporary.open('wb') as output:
                count = 0
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > size:
                        raise ValueError('MODEL_SIZE_MISMATCH')
                    output.write(chunk)
            if temporary.stat().st_size != size or digest(temporary) != sha:
                raise ValueError('MODEL_HASH_MISMATCH')
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    print('Verified local narration weights.')


if __name__ == '__main__':
    setup()
