import {db} from "../affiliate-db";
import {ensureAffiliateSchema} from "../affiliate-db";

export async function revenueHealthIssues(){
  const issues:string[]=[];
  const sql=db();
  await ensureAffiliateSchema();
  const [webhooks]=await sql`select count(*)::int as n from affiliate_webhook_events where processed_at>now()-interval '24 hours'`;
  const [holding]=await sql`select count(*)::int as n from affiliate_commissions where status='holding' and payable_at<now()`;
  const [payable]=await sql`select count(*)::int as n from affiliate_commissions where status='payable' and payable_at<now()-interval '7 days'`;
  if(holding.n)issues.push(`${holding.n} affiliate commission(s) passed their hold date without becoming payable.`);
  if(payable.n)issues.push(`${payable.n} affiliate commission(s) have been payable for more than seven days.`);
  // The affiliate webhook event ledger is intentionally used only for reconciliation signals.
  // Zero recent events is not itself an error because a quiet sales day is valid.
  void webhooks;
  return issues;
}

export async function recordRevenueException(kind:string,details:Record<string,unknown>){
  const sql=db();
  const signature=JSON.stringify([kind,details]);
  const [existing]=await sql`select id from os_activity where event='revenue_exception' and details->>'signature'=${signature} and created_at>now()-interval '24 hours' limit 1`;
  if(existing)return;
  await sql`insert into os_activity(actor,event,details) values('revenue-watchdog','revenue_exception',${sql.json({signature,kind,...details})})`;
}
