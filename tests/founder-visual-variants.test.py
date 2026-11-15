"""Offline visual QA: real source hashes, deterministic distinct layouts, no TTS/API."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/founder-renderer'))
from recipes import RECIPES, resolve_recipe
from render import photo, scene_image, camera_zoom, validate_sources
from PIL import Image

catalog = json.loads((ROOT/'app/lib/business-os/founder-render-catalog.json').read_text())
validate_sources()
with tempfile.TemporaryDirectory() as directory:
    directory=Path(directory)
    photo_hashes=set()
    scene_hashes=set()
    for variant in range(8):
        recipe=resolve_recipe({'title':RECIPES[0]['title'],'visualVariant':variant})
        assert recipe['scenes']==RECIPES[0]['scenes'], 'Narration, labels, source paths and crops must not change'
        assert recipe['sources']==RECIPES[0]['sources']
        out=directory/f'photo-{variant}.jpg'
        photo(recipe,out)
        assert Image.open(out).size==(1080,1350)
        photo_hashes.add(hashlib.sha256(out.read_bytes()).hexdigest())
        scene=directory/f'scene-{variant}.png'
        scene_image(recipe,recipe['scenes'][0],0,scene)
        assert Image.open(scene).size==(1080,1920)
        scene_hashes.add(hashlib.sha256(scene.read_bytes()).hexdigest())
        repeat=directory/'repeat.jpg';photo(recipe,repeat)
        assert out.read_bytes()==repeat.read_bytes(), 'Retries are visually deterministic'
    assert len(photo_hashes)==8 and len(scene_hashes)==8, 'All eight variants produce distinct pixels'
    for recipe in RECIPES:
        for variant in (0,7):
            styled=resolve_recipe({'title':recipe['title'],'visualVariant':variant})
            photo(styled,directory/'layout.jpg')
            photo(styled,directory/'cover.jpg',cover=True)
    assert camera_zoom(0,600)!=camera_zoom(1,600)
    assert 'visualVariant' not in RECIPES[0], 'Shared approved recipes remain unchanged'
    for bad in (-1,8,True,'1'):
        try:resolve_recipe({'title':RECIPES[0]['title'],'visualVariant':bad})
        except ValueError:pass
        else:raise AssertionError('Invalid variant accepted')
print('PASS: genuine source hashes, 8 distinct deterministic photo/video layouts, all 12 photo/cover layouts, unchanged source/narration, bounded camera treatments. Full video/audio render not exercised.')
