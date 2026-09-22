type WhopCompany = {
  id?: string;
  title?: string | null;
  name?: string | null;
  owner_user?: { id?: string | null } | null;
};

type WhopList<T> = { data?: T[]; pagination?: unknown };

const baseUrl = () => "https://api.whop.com/api/v1";

function companyKey() {
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
      ...(init.headers || {}),
    },
    cache: "no-store",
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
    publishingConfigured: process.env.WHOP_PUBLISHING_ENABLED === "true",
    publishChannelId: process.env.WHOP_CHAT_CHANNEL_ID?.trim() || null,
  };
  if (!state.configured) return {...state,error:"WHOP_COMPANY_API_KEY_MISSING"};

  // A successful company read verifies the credential without exposing it.
  if (explicitCompanyId) {
    const result = await whopRequest<WhopCompany>(`/companies/${encodeURIComponent(explicitCompanyId)}`);
    if (!result.ok) return {...state,error:result.code};
    state.connected = true;
    state.companyId = result.data.id || explicitCompanyId;
    state.companyName = result.data.title || result.data.name || null;
    state.ownerUserId = result.data.owner_user?.id || null;
    return state;
  }

  const result = await whopRequest<WhopList<WhopCompany>>("/companies?first=10");
  if (!result.ok) return {...state,error:result.code};
  const companies = result.data.data || [];
  if (companies.length !== 1) {
    return {...state,connected:true,error:companies.length === 0 ? "WHOP_COMPANY_NOT_FOUND" : "WHOP_COMPANY_ID_REQUIRED"};
  }
  const company = companies[0];
  state.connected = true;
  state.companyId = company.id || null;
  state.companyName = company.title || company.name || null;
  state.ownerUserId = company.owner_user?.id || null;
  return state;
}

export async function createWhopHomePost(content:string, options:{title?:string;pinned?:boolean;idempotencyKey:string}) {
  if (process.env.WHOP_PUBLISHING_ENABLED !== "true") throw new Error("WHOP_PUBLISHING_DISABLED");
  const status = await whopStatus();
  if (!status.connected || !status.companyId) throw new Error(status.error || "WHOP_NOT_CONNECTED");
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(options.idempotencyKey)) throw new Error("WHOP_IDEMPOTENCY_KEY_INVALID");
  const text=content.trim();
  if(!text || text.length>12000) throw new Error("WHOP_POST_TEXT_INVALID");
  const response=await fetch(`${baseUrl()}/forum_posts`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${companyKey()}`,
      "Content-Type":"application/json",
      "Api-Version-Date":process.env.WHOP_API_VERSION_DATE?.trim()||"2026-08-21-1",
      "Idempotency-Key":options.idempotencyKey,
    },
    body:JSON.stringify({experience_id:"public",account_id:status.companyId,content:text,title:options.title?.trim()||undefined,pinned:options.pinned===true,is_mention:false,paywall_amount:0}),
    cache:"no-store",signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error(response.status===401?"WHOP_KEY_REJECTED":response.status===403?"WHOP_FORUM_PERMISSION_MISSING":response.status===429?"WHOP_RATE_LIMITED":`WHOP_FORUM_HTTP_${response.status}`);
  const body=await response.json() as {id?:string;created_at?:string;user?:{id?:string;username?:string}};
  if(!body.id)throw new Error("WHOP_POST_REJECTED");
  return {id:body.id,companyId:status.companyId,createdAt:body.created_at||null,username:body.user?.username||null};
}
