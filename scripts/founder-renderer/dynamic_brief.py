"""Consume only a server-signed, immutable plan using the owned-source manifest.

Factual copy must exactly match reviewed claims; the model only composes them.
Every produced file retains creativeReview=False and requires owner review.
"""
import hashlib
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
MANIFEST=json.loads((ROOT/'app/lib/business-os/founder-brief-sources.json').read_text())
UNSAFE=re.compile(r'(?:\d|[$€£%]|https?:|www\.|guarantee|profit|win.?rate|backtest|discount|black\s*friday|lifetime|free\s*trial|promotion|coupon|pricing|(?:product|subscription|monthly|annual)\s+price|\bbuy\b|\bsell\b|\blong\b|\bshort\b|forecast|prediction|return\s+on|outperform|live\s+(?:trade|market)|current\s+(?:trade|market))',re.I)

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def normalized(value):
    return re.sub(r'\s+',' ',re.sub(r'[^a-z]+',' ',value.lower())).strip()

def text(value,maximum):
    return isinstance(value,str) and value.strip() and len(value)<=maximum and not re.search(r'[\x00-\x08\x0b-\x1f<>{}\\]',value) and not UNSAFE.search(value)

def resolve_dynamic_brief(item):
    def require(condition):
        if not condition:raise ValueError('DYNAMIC_BRIEF_INVALID')
    snapshot=item.get('renderBrief')
    require(isinstance(snapshot,dict) and set(snapshot)=={'plan','hash','inputHash','fingerprint'})
    plan=snapshot['plan']
    require(isinstance(plan,dict) and set(plan)=={'schemaVersion','sourceVersion','title','objective','headline','feature','summary','caption','scenes'})
    require(type(plan['schemaVersion']) is int and plan['schemaVersion']==1 and plan['sourceVersion']==MANIFEST['version'])
    require(all(isinstance(snapshot[k],str) and re.fullmatch('[a-f0-9]{64}',snapshot[k]) for k in ('hash','inputHash','fingerprint')))
    require(digest(plan)==snapshot['hash'])
    for key,maximum in [('title',160),('objective',240),('headline',58),('feature',58),('summary',180),('caption',600)]:require(text(plan[key],maximum))
    require(plan['headline'] in MANIFEST['headlines'] and plan['feature'] in MANIFEST['features'] and isinstance(plan['scenes'],list) and 3<=len(plan['scenes'])<=6)
    owned={row['path'] for row in json.loads((ROOT/'scripts/founder-renderer/sources.json').read_text())['sources']}
    sources={row['id']:row for row in MANIFEST['sources']};scenes=[]
    for scene in plan['scenes']:
        require(isinstance(scene,dict) and set(scene)=={'sourceId','claimIds','label','spoken'})
        require(isinstance(scene['sourceId'],str) and scene['sourceId'] in sources)
        source=sources[scene['sourceId']];claims=scene['claimIds']
        require(source['path'] in owned and isinstance(claims,list) and 1<=len(claims)<=3 and all(isinstance(c,str) for c in claims))
        require(len(set(claims))==len(claims) and all(c in source['claims'] for c in claims))
        require(text(scene['label'],52) and text(scene['spoken'],600) and scene['label'] in MANIFEST['labels'])
        require(scene['spoken']==' '.join(source['claims'][c] for c in claims))
        scenes.append({'source':source['path'],'label':scene['label'],'spoken':scene['spoken'],'crop':source['crop']})
    primary=sources[plan['scenes'][0]['sourceId']]
    require(plan['title']==primary['summary'] and plan['objective']==primary['summary'] and plan['summary']==primary['summary'] and plan['caption']==primary['summary']+MANIFEST['captionSuffix'])
    narration=' '.join(scene['spoken'] for scene in scenes)
    require(45<=len(narration.split())<=180)
    require(item.get('type') in ('image','video'))
    script=narration if item['type']=='video' else ''
    require(item.get('script','')==script and item.get('caption','')==plan['caption'])
    copy=narration if item['type']=='video' else f"{plan['headline']} {plan['summary']} {plan['caption']}"
    require(digest({'type':item['type'],'copy':normalized(copy)})==snapshot['fingerprint'])
    variant=item.get('visualVariant',0);require(type(variant) is int and 0<=variant<=7)
    return {'id':'dynamic-'+snapshot['hash'],'title':plan['title'],'headline':plan['headline'],'feature':plan['feature'],'summary':plan['summary'],'sources':list(dict.fromkeys(s['source'] for s in scenes)),'scenes':scenes,'visualVariant':variant}
