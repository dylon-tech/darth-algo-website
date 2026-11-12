"""Bounded private media consumer. Does not plan, replenish, send or publish."""
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from render import VERSION, preflight, render

ORIGIN='https://www.darthalgo.com'
ENDPOINT=ORIGIN+'/api/owner/founder-renderer'
TOKEN_LOCK=threading.Lock()
TOKEN={'value':None,'time':0}


class ApiError(Exception):
    def __init__(self, code, status=0):
        self.code=code;self.status=status
        super().__init__(code)


def oidc_token():
    with TOKEN_LOCK:
        if TOKEN['value'] and time.monotonic()-TOKEN['time']<180:return TOKEN['value']
        url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']
        url+=('&' if '?' in url else '?')+urllib.parse.urlencode({'audience':ENDPOINT})
        request=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
        with urllib.request.urlopen(request,timeout=30) as response:
            data=json.loads(response.read(32768))
        token=data.get('value')
        if not isinstance(token,str) or len(token)>12000:raise ApiError('OIDC_UNAVAILABLE')
        TOKEN.update(value=token,time=time.monotonic())
        return token


def api(payload, path='', body=None, headers=None, token_provider=oidc_token):
    encoded=body if body is not None else json.dumps(payload,separators=(',',':')).encode()
    for attempt in range(3):
        request=urllib.request.Request(ENDPOINT+path,data=encoded,method='PUT' if body is not None else 'POST',headers={
            'Authorization':'Bearer '+token_provider(),
            'Content-Type':'application/octet-stream' if body is not None else 'application/json',
            **(headers or {})})
        try:
            with urllib.request.urlopen(request,timeout=75) as response:
                result=response.read(524289)
                if len(result)>524288:raise ApiError('RESPONSE_TOO_LARGE')
                return json.loads(result)
        except urllib.error.HTTPError as error:
            try:code=json.loads(error.read(4096)).get('error','HTTP_ERROR')
            except Exception:code='HTTP_ERROR'
            code=code if isinstance(code,str) and re.fullmatch(r'[A-Z_]{4,80}',code) else 'HTTP_ERROR'
            if error.code<500 or attempt==2:raise ApiError(code,error.code) from None
        except (TimeoutError,urllib.error.URLError):
            if attempt==2:raise ApiError('NETWORK_UNCONFIRMED') from None
        time.sleep(2**attempt)


def worker_heartbeat(status):
    return api({'operation':'workerHeartbeat','rendererVersion':VERSION,'incrementalCostUsd':0,
        'imageReady':True,'videoReady':True,'fullDecode':True,
        'narration':'kokoro-v1.0-am_michael','status':status})


def upload(path, role, report, lease, call=api):
    path=Path(path);size=path.stat().st_size
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    mime='video/mp4' if path.suffix=='.mp4' else 'image/jpeg'
    response=call({'operation':'uploadBegin',**lease,'role':role,'fileName':f"{lease['jobId']}-{role}{path.suffix}",'size':size,'mimeType':mime,'sha256':sha})
    up=response['upload']
    if up.get('sha256')!=sha or up.get('size')!=size:raise ApiError('UPLOAD_FILE_MISMATCH')
    # Persisted server chunk hashes and expected full-file hash make resume exact.
    received=set(up.get('received',[]))
    with path.open('rb') as handle:
        for index in range(up['chunkCount']):
            chunk=handle.read(up['chunkBytes'])
            if index in received:continue
            call(None,f"/{up['id']}/chunks?index={index}",chunk,{'x-darth-job-id':lease['jobId'],'x-darth-lease-token':lease['leaseToken']})
    return call({'operation':'uploadComplete',**lease,'uploadId':up['id'],'report':report})


ERRORS={
 'SOURCE_MATCH_REQUIRED':'This brief needs a verified source and scene plan. Choose an available suggested lesson or provide source-matched instructions.',
 'CUSTOM_SCRIPT_SOURCE_REVIEW_REQUIRED':'Your saved script needs a source-matched scene plan. It was preserved, not replaced by stock copy.',
 'SOURCE_HASH_MISMATCH':'An approved source changed. Review and update the source manifest before rendering.',
 'MODEL_HASH_MISMATCH':'The local narration model did not match its verified file. No paid voice service was used.',
 'AUDIO_LEVEL_REVIEW_REQUIRED':'The new narration failed its listening-level check. Review the audio before retrying.',
 'TEXT_LAYOUT_OVERFLOW':'The text did not fit its approved layout. Shorten the scene copy before retrying.',
 'CAPTION_LAYOUT_OVERFLOW':'The caption did not fit the phone layout. Shorten the narration before retrying.',
 'MEDIA_STORAGE_LIMIT':'The private media allowance is full. No additional storage was purchased.',
}


def work(claim,voice,call=api,heartbeat_call=worker_heartbeat):
    lease={'jobId':claim['job']['id'],'leaseToken':claim['job']['leaseToken']}
    stop=threading.Event();lost=threading.Event();state={'stage':'Preparing','progress':1}
    def heartbeat():
        while not stop.wait(25):
            try:
                heartbeat_call('working')
                call({'operation':'progress',**lease,**state})
            except ApiError as error:
                if error.status in [401,403,409]:lost.set();return
    def progress(stage,percent):
        if lost.is_set():raise ApiError('LEASE_LOST',409)
        state.update(stage=stage,progress=percent)
        call({'operation':'progress',**lease,**state})
    thread=threading.Thread(target=heartbeat,daemon=True);thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix='darth-render-job-') as folder:
            result=render(claim['item'],folder,progress,voice)
            progress('Uploading',90)
            upload(result['media'],'media',result['mediaReport'],lease,call)
            upload(result['cover'],'cover',result['coverReport'],lease,call)
            progress('Checking',98)
            response=call({'operation':'complete',**lease,'caption':result['caption'],'script':result['script'],'proofHash':result['proofHash']})
            if response.get('status') not in ['completed','obsolete']:raise ApiError('COMPLETION_UNCONFIRMED')
            print('Media job saved for private review.' if response.get('status')=='completed' else 'Media job replaced by a newer owner edit; no asset attached.',flush=True)
    except Exception as error:
        code=str(error) if re.fullmatch(r'[A-Z_]{4,80}',str(error)) else 'RENDER_FAILED'
        if code!='LEASE_LOST':
            try:call({'operation':'fail',**lease,'error':ERRORS.get(code,'The media worker stopped before completion. Review the job and retry.'),'retryable':code not in ERRORS,'ambiguous':code in ['COMPLETION_UNCONFIRMED','NETWORK_UNCONFIRMED']})
            except Exception:pass # Preserve durable lease/unknown outcome for reconciliation.
        print('Media job held: '+code,flush=True)
    finally:
        stop.set();thread.join(timeout=2)


def main():
    # GitHub Actions may validate this software, but its terms do not permit
    # using Actions as an application's media runtime. Never activate there.
    if os.environ.get('GITHUB_ACTIONS')=='true':
        raise ApiError('ACTIONS_IS_CI_ONLY')
    if os.environ.get('GITHUB_REPOSITORY')!='dylon-tech/darth-algo-website' or os.environ.get('GITHUB_REF')!='refs/heads/main' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
        raise ApiError('WORKER_ENVIRONMENT_REJECTED')
    # No artifacts or private work directories survive this ephemeral run.
    with tempfile.TemporaryDirectory(prefix='darth-render-preflight-') as folder:
        voice=preflight(folder)
    # A push may start this workflow before the matching Vercel deployment is ready.
    connected=False
    for _ in range(16):
        try:worker_heartbeat('ready');connected=True;break
        except ApiError as error:
            if error.status not in [401,404,503]:raise
            time.sleep(30)
    if not connected:raise ApiError('MATCHING_DEPLOYMENT_NOT_READY')
    started=time.monotonic()
    try:
        for _ in range(12):
            if time.monotonic()-started>35*60:break
            worker_heartbeat('ready')
            claim=api({'operation':'claim'}).get('claim')
            if not claim:break # No idle hosted daemon and no duplicate planning loop.
            worker_heartbeat('working');work(claim,voice)
    finally:
        try:worker_heartbeat('stopped')
        except Exception:pass


if __name__=='__main__':
    try:main()
    except Exception as error:
        code=str(error) if re.fullmatch(r'[A-Z_]{4,80}',str(error)) else 'WORKER_UNAVAILABLE'
        print('Private media worker unavailable: '+code,flush=True)
        raise SystemExit(1)
