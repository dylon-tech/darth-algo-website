import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {db} from '../../../lib/affiliate-db';
import {sameOrigin} from '../../../lib/business-os/owner-session';
import {ensureWelcomeSchema} from '../../../lib/welcome/schema';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function signature(id:string){return createHmac('sha256',process.env.AI_OS_OWNER_KEY!).update('welcome-visit:'+id).digest('hex');}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Origin required'},{status:403,headers});
 if(!process.env.AI_OS_OWNER_KEY)return Response.json({error:'Unavailable'},{status:503,headers});
 try{const raw=await request.text();if(raw.length>500)throw Error();const b=JSON.parse(raw);if(!['instagram','x','tiktok'].includes(b.platform))throw Error();await ensureWelcomeSchema();const sql=db();
 if(b.token){if(typeof b.token!=='string'||!/^([a-f0-9-]{36})\.[a-f0-9]{64}$/.test(b.token))throw Error();const [id,sig]=b.token.split('.');if(!timingSafeEqual(Buffer.from(sig),Buffer.from(signature(id))))throw Error();if(b.action==='checkout')await sql`update os_welcome_visits set checkout_started_at=coalesce(checkout_started_at,now()) where id=${id}::uuid and platform=${b.platform} and created_at>now()-interval '30 days'`;return Response.json({reference:'daw_'+id,token:b.token},{headers});}
 const id=typeof b.visitId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(b.visitId)?b.visitId:randomUUID();const inserted=await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730953)`;const [n]=await tx`select count(*)::int n from os_welcome_visits where created_at>now()-interval '1 day'`;if(n.n>=10000)return false;await tx`insert into os_welcome_visits(id,platform,is_test) values(${id},${b.platform},${b.test===true}) on conflict do nothing`;return true;});
 if(!inserted)return Response.json({error:'Daily tracking capacity reached'},{status:429,headers});return Response.json({reference:'daw_'+id,token:id+'.'+signature(id)},{headers});
 }catch{return Response.json({error:'Invalid tracking request'},{status:400,headers});}
}
