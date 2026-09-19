// Campaign labels only: no customer identity, fingerprint or new visitor cookie.
export type CampaignAttribution = { source: string; campaign: string; content: string; capturedAt: number };
const sources = new Set(["x","instagram","tiktok","youtube","facebook","reddit","telegram","email","affiliate","search","ads"]);
const label = (v: string | null) => (v || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,40);
export function captureCampaign(search: string, previous: unknown, now = Date.now()): CampaignAttribution | null {
  const q = new URLSearchParams(search);
  const rawSource = (q.get("utm_source") || q.get("source") || "").toLowerCase();
  const source = ["twitter","x-twitter"].includes(rawSource) ? "x" : rawSource;
  if (sources.has(source)) return {source,campaign:label(q.get("utm_campaign") || q.get("campaign")) || "default",content:label(q.get("utm_content")),capturedAt:now};
  const p = previous as CampaignAttribution | null;
  return p && sources.has(p.source) && /^[a-z0-9_-]{1,40}$/.test(p.campaign) && /^[a-z0-9_-]{0,40}$/.test(p.content) && Number.isFinite(p.capturedAt) && p.capturedAt<=now && now-p.capturedAt<30*86400000 ? p : null;
}
export function campaignReference(value: CampaignAttribution) {
  return `da1_${btoa(JSON.stringify([value.source,value.campaign,value.content])).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}`;
}
export function parseCampaignReference(value: unknown): Pick<CampaignAttribution,"source"|"campaign"|"content"> | null {
  if (typeof value!=="string" || !/^da1_[A-Za-z0-9_-]{1,196}$/.test(value)) return null;
  try {
    const fields=JSON.parse(atob(value.slice(4).replace(/-/g,"+").replace(/_/g,"/")));
    if (!Array.isArray(fields) || fields.length!==3 || !sources.has(fields[0]) || typeof fields[1]!=="string" || typeof fields[2]!=="string" || !/^[a-z0-9_-]{1,40}$/.test(fields[1]) || !/^[a-z0-9_-]{0,40}$/.test(fields[2])) return null;
    return {source:fields[0],campaign:fields[1],content:fields[2]};
  } catch {return null;}
}
const paymentPaths=new Set(["/14AfZi4T5fRidqS2oc6kg03","/28EcN699l8oQ9aC5Ao6kg02","/4gM8wQfxJ6gI1IabYM6kg05","/6oUcN62KX0WoeuW1k86kg04"]);
export function attributeCheckout(href: string, attribution: CampaignAttribution | null) {
  if(!attribution) return href;
  try {
    const url=new URL(href);
    if(url.origin!=="https://buy.stripe.com" || !paymentPaths.has(url.pathname) || url.username || url.password || url.searchParams.has("client_reference_id")) return href;
    url.searchParams.set("client_reference_id",campaignReference(attribution));
    for(const [key,value] of Object.entries({utm_source:attribution.source,utm_campaign:attribution.campaign,utm_content:attribution.content})) if(value && !url.searchParams.has(key)) url.searchParams.set(key,value);
    return url.toString();
  } catch {return href;}
}
