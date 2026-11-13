"""Vercel Python entrypoint, prepared for the gated activation patch.

Enable only after exact additional-rendering budget approval. The paired
TypeScript dispatcher and callbacks enforce reservation and lease scope. No credential is copied outside the project.
"""
import base64
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time

AUDIENCE='https://www.darthalgo.com/api/founder-native-render'


def verify_invocation(token,body,owner_key,now=None):
    now=int(time.time() if now is None else now)
    if not isinstance(owner_key,str) or len(owner_key)<32 or not isinstance(token,str) or len(token)>4096:raise ValueError('UNAUTHORIZED')
    parts=token.split('.')
    if len(parts)!=3 or parts[0]!='DR1' or not all(re.fullmatch(r'[A-Za-z0-9_-]+',x) for x in parts[1:]):raise ValueError('UNAUTHORIZED')
    decode=lambda part:base64.urlsafe_b64decode(part+'='*((4-len(part)%4)%4))
    derived=hmac.new(owner_key.encode(),b'darth-founder-media-service-v1',hashlib.sha256).digest()
    expected=hmac.new(derived,'.'.join(parts[:2]).encode(),hashlib.sha256).digest()
    if not hmac.compare_digest(expected,decode(parts[2])):raise ValueError('UNAUTHORIZED')
    p=json.loads(decode(parts[1]));uuid=lambda s:isinstance(s,str) and re.fullmatch(r'[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}',s,re.I)
    if p.get('v')!=1 or p.get('aud')!=AUDIENCE or p.get('scope')!='invoke' or type(p.get('iat')) is not int or type(p.get('exp')) is not int or p['iat']>now+15 or p['exp']<=now or not 0<p['exp']-p['iat']<=360:raise ValueError('UNAUTHORIZED')
    if not all(uuid(p.get(k)) for k in ['jobId','leaseToken','invocationId']) or p.get('workerId')!='native:'+p['invocationId'] or not re.fullmatch(r'[a-f0-9]{40}',p.get('sha','')) or p.get('bodySha256')!=hashlib.sha256(body).hexdigest():raise ValueError('UNAUTHORIZED')
    return p


class handler(BaseHTTPRequestHandler):
    def log_message(self,*_):pass # No private body, credential or file logs.
    def reply(self,status,value):
        body=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','private, no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_POST(self):
        started_at=time.monotonic()
        if os.environ.get('AI_OS_MEDIA_RENDERER_ENABLED')!='true' or os.environ.get('AI_OS_MEDIA_RENDERER_MONTHLY_USD')!='5' or os.environ.get('VERCEL_ENV')!='production':return self.reply(503,{'error':'RENDERING_NOT_APPROVED'})
        # Fluid compute intentionally hides AWS memory variables. Keep the
        # existing project allocation; never infer it from an absent variable.
        # Both observed/specified US regions have the reviewed pricing tier.
        if os.environ.get('VERCEL_REGION') not in ('iad1','cle1'):return self.reply(503,{'error':'RENDER_RUNTIME_REGION_NOT_VERIFIED'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=262144 or self.headers.get('Content-Type')!='application/json':return self.reply(413,{'error':'INVALID_BODY'})
            body=self.rfile.read(size);token=self.headers.get('Authorization','').removeprefix('Bearer ')
            claims=verify_invocation(token,body,os.environ.get('AI_OS_OWNER_KEY',''))
            if claims['sha']!=os.environ.get('VERCEL_GIT_COMMIT_SHA'):return self.reply(409,{'error':'DEPLOYMENT_CHANGED'})
            request=json.loads(body);claim=request['claim']
            if request.get('mode')!=claims.get('mode') or claims.get('mode') not in ['job','preflight'] or claim['job']['id']!=claims['jobId'] or claim['job']['leaseToken']!=claims['leaseToken'] or claim['job']['workerId']!=claims['workerId']:raise ValueError('UNAUTHORIZED')
        except Exception:return self.reply(401,{'error':'UNAUTHORIZED'})
        # Delay all heavy imports/downloads until signature and server nonce pass.
        root=Path(os.getcwd());sys.path.insert(0,str(root/'scripts/founder-renderer'));sys.path.insert(0,str(root/'scripts/founder-renderer/prepared-vercel'))
        import worker
        # Each request keeps its scoped credential in its own closure. Never
        # mutate module globals: Vercel may serve concurrent requests together.
        def native_api(payload,path='',body=None,headers=None):
            return worker.api(payload,path,body,headers,token_provider=lambda:request['callbackToken'],deadline=started_at+265)
        try:
            started=native_api({'operation':'startReservedInvocation','invocationId':claims['invocationId'],'jobId':claims['jobId'],'leaseToken':claims['leaseToken']})
            if started.get('started') is not True:return self.reply(409,{'error':'INVOCATION_ALREADY_STARTED'})
            from setup_runtime import setup_runtime
            setup_runtime(deadline=started_at+230)
            # The worker callback transport still enforces exact job/lease/role.
            from render import preflight,render_deadline
            runtime_profile=json.loads((root/'app/lib/business-os/founder-native-runtime.json').read_text())['fingerprint']
            def heartbeat(state):return native_api({'runtimeProfile':runtime_profile,'operation':'workerHeartbeat','rendererVersion':'DA-RENDERER-20261112-1','incrementalCostUsd':0.05,'imageReady':True,'videoReady':True,'fullDecode':True,'narration':'kokoro-v1.0-am_michael','status':state})
            with render_deadline(started_at+230):
                with tempfile.TemporaryDirectory(prefix='darth-native-preflight-') as folder:voice=preflight(folder)
                if claims['mode']=='preflight':
                    heartbeat('ready')
                    return self.reply(200,{'status':'preflight_complete'})
                heartbeat('working');worker.work(claim,voice,native_api,heartbeat,{'hosting':'vercel-native','attemptReservationUsd':0.05,'actualHostingCostUsd':None});heartbeat('stopped')
            return self.reply(200,{'status':'attempt_finished'})
        except Exception:
            # The retained reservation is not refunded on an uncertain outcome.
            return self.reply(503,{'error':'RENDER_ATTEMPT_UNCONFIRMED'})
