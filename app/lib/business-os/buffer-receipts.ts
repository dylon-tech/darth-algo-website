import {db} from '../affiliate-db';
// Fast initial confirmation, then hourly reconciliation for a stalled provider.
// A failed read also records a check, so failures cannot cause a per-minute loop.
export async function cachedScheduledReceipt(id:string,now=Date.now()){
 const sql=db();
 const [checked]=await sql`select details,created_at from os_activity where entity_id=${id} and event='buffer_publish_checked' order by id desc limit 1`;
 if(!checked)return undefined;
 const [receipt]=await sql`select created_at from os_activity where entity_id=${id} and event='buffer_publish_receipt' order by id desc limit 1`;
 const age=receipt?now-new Date(receipt.created_at).getTime():0;
 const interval=age>=3600_000?3600_000:300_000;
 return now-new Date(checked.created_at).getTime()<interval?checked.details:undefined;
}
