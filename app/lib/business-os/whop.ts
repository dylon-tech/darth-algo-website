type WhopAccount = {
  id?: string;
  title?: string | null;
  name?: string | null;
  owner?: { id?: string | null } | null;
};

const baseUrl = () => "https://api.whop.com/api/v1";
const apiVersion = () => process.env.WHOP_API_VERSION_DATE?.trim() || "2026-08-21-1";
const accountIdValid = (value: unknown): value is string => typeof value === "string" && /^biz_[a-zA-Z0-9]+$/.test(value);
function companyKey() {
  // Retain the existing environment variable; no credential migration or new key is needed.
  return process.env.WHOP_COMPANY_API_KEY?.trim() || "";
}

async function whopRequest<T>(path: string, init: RequestInit = {}): Promise<{ok:true;data:T}|{ok:false;status:number;code:string}> {
  const key = companyKey();
  if (!key) return {ok:false,status:0,code:"WHOP_COMPANY_API_KEY_MISSING"};
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Api-Version-Date": apiVersion(),
      ...(init.headers || {}),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const code = response.status === 401 ? "WHOP_KEY_REJECTED"
      : response.status === 403 ? "WHOP_PERMISSION_MISSING"
      : response.status === 429 ? "WHOP_RATE_LIMITED"
      : `WHOP_HTTP_${response.status}`;
    return {ok:false,status:response.status,code};
  }
  try {
    return {ok:true,data:await response.json() as T};
  } catch {
    return {ok:false,status:502,code:"WHOP_INVALID_RESPONSE"};
  }
}

export type WhopConnection = {
  configured: boolean;
  connected: boolean;
  companyId: string | null;
  companyName: string | null;
  ownerUserId: string | null;
  publishingConfigured: boolean;
  publishChannelId: string | null;
  error?: string;
};

export async function whopStatus(): Promise<WhopConnection> {
  const explicitCompanyId = process.env.WHOP_COMPANY_ID?.trim() || "";
  const state: WhopConnection = {
    configured: Boolean(companyKey()),
    connected: false,
    companyId: explicitCompanyId || null,
    companyName: null,
    ownerUserId: null,
    publishingConfigured: process.env.WHOP_PUBLISHING_ENABLED !== "false",
    publishChannelId: process.env.WHOP_CHAT_CHANNEL_ID?.trim() || null,
  };
  if (!state.configured) return {...state,error:"WHOP_COMPANY_API_KEY_MISSING"};
  if (explicitCompanyId && !accountIdValid(explicitCompanyId)) return {...state,error:"WHOP_COMPANY_ID_INVALID"};

  // The versioned API uses Accounts, not Companies. With an account-scoped API
  // key, /accounts/me resolves exactly its account; do not guess from a list.
  // This verifies read access only, not forum:post:create permission.
  // https://docs.whop.com/api-reference/beta/accounts/retrieve-account
  const result = await whopRequest<WhopAccount>(`/accounts/${encodeURIComponent(explicitCompanyId || "me")}`);
  if (!result.ok) return {...state,error:result.code};
  if (!result.data || !accountIdValid(result.data.id)) return {...state,error:"WHOP_ACCOUNT_RESPONSE_INVALID"};
  if (explicitCompanyId && result.data.id !== explicitCompanyId) return {...state,error:"WHOP_ACCOUNT_MISMATCH"};
  return {...state,connected:true,companyId:result.data.id,companyName:result.data.title || result.data.name || null,ownerUserId:result.data.owner?.id || null};
}

export async function createWhopHomePost(content:string, options:{title?:string;pinned?:boolean;idempotencyKey:string}) {
  if (process.env.WHOP_PUBLISHING_ENABLED === "false") throw new Error("WHOP_PUBLISHING_DISABLED");
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(options.idempotencyKey)) throw new Error("WHOP_IDEMPOTENCY_KEY_INVALID");
  const text=content.trim();
  if(!text || text.length>12000) throw new Error("WHOP_POST_TEXT_INVALID");
  const status = await whopStatus();
  if (!status.connected || !status.companyId || status.error) throw new Error(status.error || "WHOP_NOT_CONNECTED");
  const response=await fetch(`${baseUrl()}/forum_posts`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${companyKey()}`,
      "Content-Type":"application/json",
      "Api-Version-Date":apiVersion(),
      "Idempotency-Key":options.idempotencyKey,
    },
    body:JSON.stringify({experience_id:"public",account_id:status.companyId,content:text,title:options.title?.trim()||undefined,pinned:options.pinned===true,is_mention:false,paywall_amount:0}),
    cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error(response.status===401?"WHOP_KEY_REJECTED":response.status===403?"WHOP_FORUM_PERMISSION_MISSING":response.status===429?"WHOP_RATE_LIMITED":`WHOP_FORUM_HTTP_${response.status}`);
  const body=await response.json() as {id?:string;created_at?:string;user?:{id?:string;username?:string}};
  if(!body.id)throw new Error("WHOP_POST_REJECTED");
  return {id:body.id,companyId:status.companyId,createdAt:body.created_at||null,username:body.user?.username||null};
}
