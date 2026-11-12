"""Produce a finite private review pack locally. No app writes or publishing."""
import argparse
from datetime import date, timedelta
import json
from pathlib import Path

from recipes import RECIPES
from render import kokoro, render


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--first-day',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    first=date.fromisoformat(args.first_day);root=Path(args.output).resolve();root.mkdir(parents=True,exist_ok=True)
    voice=kokoro();manifest=[]
    for index,recipe in enumerate(RECIPES[:10]):
        day=str(first+timedelta(days=index//2));kind='image' if index%2==0 else 'video'
        out=root/f'{day}-{kind}-{recipe["id"]}'
        item={'day':day,'time':'09:00' if kind=='image' else '15:00','type':kind,'title':recipe['title'],'templateId':'DA-VIDEO-v15' if kind=='video' else 'DA-PHOTO-20261112-v4-REFINED','script':'','caption':''}
        result=render(item,out,voice=voice)
        entry={**item,'media':str(Path(result['media']).relative_to(root)),'cover':str(Path(result['cover']).relative_to(root)),'result':str((out/'result.json').relative_to(root)),'mediaSha256':result['mediaReport']['sha256'],'proofHash':result['proofHash'],'status':'checking','published':False,'narration':result['mediaReport']['narration']}
        manifest.append(entry)
        (root/'manifest.json').write_text(json.dumps({'status':'LOCAL_REVIEW_PACK','incrementalCostUsd':0,'automatedProductionHostVerified':False,'source':'Approved recorded product images; no current-market or performance claim.','notice':'Native v4/v15-derived draft media. New local Kokoro voice is not the approved ElevenLabs JackJohn voice. Creative and listening review are required before publication.','items':manifest},indent=2)+'\n')
        print(f'Local draft {index+1}/10 completed.',flush=True)


if __name__=='__main__':main()
