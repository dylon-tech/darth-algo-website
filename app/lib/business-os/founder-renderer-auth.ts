import {createPublicKey,verify,type JsonWebKey} from 'node:crypto';
import {founderRendererProductionHostVerified} from './founder-renderer';

// A public repository is required for the verified $0 standard-runner policy.
// This identity grants media work only; it never grants owner-cookie access.
export const founderRendererTrust={
 issuer:'https://token.actions.githubusercontent.com',
 audience:'https://www.darthalgo.com/api/owner/founder-renderer',
 repository:'dylon-tech/darth-algo-website',repositoryId:'1259040960',ownerId:'290566026',
 ref:'refs/heads/main',workflow:'dylon-tech/darth-algo-website/.github/workflows/founder-renderer.yml@refs/heads/main',
} as const;
export type FounderRendererIdentity={workerId:string;runId:string;attempt:string;sha:string};
type Jwk=JsonWebKey&{kid?:string;alg?:string;use?:string};
let keysCache:{expires:number;keys:Jwk[]}|undefined;
function decode(part:string){
 if(!/^[A-Za-z0-9_-]+$/.test(part))throw Error('RENDERER_UNAUTHORIZED');
 const value=JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('RENDERER_UNAUTHORIZED');
 return value as Record<string,unknown>;
}
export function verifyFounderRendererJwt(token:string,keys:Jwk[],approvedSha:string,now=Date.now()):FounderRendererIdentity {
 if(token.length>12000||!/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(approvedSha))throw Error('RENDERER_UNAUTHORIZED');
 const parts=token.split('.');if(parts.length!==3)throw Error('RENDERER_UNAUTHORIZED');
 const header=decode(parts[0]),claims=decode(parts[1]);
 if(header.alg!=='RS256'||header.typ!=='JWT'||typeof header.kid!=='string'||header.crit!==undefined)throw Error('RENDERER_UNAUTHORIZED');
 const key=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(!key||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('RENDERER_UNAUTHORIZED');
 const seconds=Math.floor(now/1000),number=(key:string)=>typeof claims[key]==='number'?claims[key] as number:NaN;
 if(!Number.isFinite(number('exp'))||!Number.isFinite(number('iat'))||!Number.isFinite(number('nbf'))||number('exp')<=seconds||number('nbf')>seconds+30||number('iat')>seconds+30||seconds-number('iat')>600||number('exp')-number('iat')>900)throw Error('RENDERER_UNAUTHORIZED');
 const t=founderRendererTrust;
 if(claims.iss!==t.issuer||claims.aud!==t.audience||claims.repository!==t.repository||claims.repository_id!==t.repositoryId||claims.repository_owner_id!==t.ownerId||claims.ref!==t.ref||claims.ref_type!=='branch'||claims.repository_visibility!=='public'||claims.runner_environment!=='github-hosted'||claims.workflow_ref!==t.workflow||claims.workflow_sha!==approvedSha||claims.sha!==approvedSha||!['schedule','workflow_dispatch','push'].includes(String(claims.event_name)))throw Error('RENDERER_UNAUTHORIZED');
 if(typeof claims.run_id!=='string'||!/^\d{1,20}$/.test(claims.run_id)||typeof claims.run_attempt!=='string'||!/^\d{1,5}$/.test(claims.run_attempt))throw Error('RENDERER_UNAUTHORIZED');
 return {workerId:`github:${claims.run_id}:${claims.run_attempt}`,runId:claims.run_id,attempt:claims.run_attempt,sha:approvedSha};
}
export async function authenticateFounderRenderer(request:Request):Promise<FounderRendererIdentity>{
 if(!founderRendererProductionHostVerified)throw Error('RENDERER_UNAUTHORIZED');
 const header=request.headers.get('authorization');
 if(!header?.startsWith('Bearer '))throw Error('RENDERER_UNAUTHORIZED');
 // Vercel supplies the exact deployed Git commit. No wildcard or branch-only fallback.
 const approvedSha=process.env.VERCEL_GIT_COMMIT_SHA||'';
 if(!approvedSha)throw Error('RENDERER_UNAUTHORIZED');
 if(!keysCache||keysCache.expires<Date.now()){
  const response=await fetch(`${founderRendererTrust.issuer}/.well-known/jwks`,{cache:'no-store',signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)throw Error('RENDERER_UNAUTHORIZED');
  const text=await response.text();if(text.length>65536)throw Error('RENDERER_UNAUTHORIZED');
  const value=JSON.parse(text);if(!Array.isArray(value.keys)||value.keys.length>20)throw Error('RENDERER_UNAUTHORIZED');
  keysCache={expires:Date.now()+300000,keys:value.keys};
 }
 return verifyFounderRendererJwt(header.slice(7),keysCache.keys,approvedSha);
}
