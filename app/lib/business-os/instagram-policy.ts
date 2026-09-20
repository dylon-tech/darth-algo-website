// Fixed campaign assets: changing caption, order, account or bytes requires a new approval.
export const instagramCampaign = {
  id: "links-carousel-v1",
  channelId: "6aaf1886ea19ca0bde8f584c",
  channelName: "@darth.algo",
  text: "One place to explore Darth Algo.\n\nCompare Swing, Scalper and Pro, find our free community, and see our official social pages.\n\nTap the link in our bio → darthalgo.com/links\n\nTrading tools support your process; they don’t guarantee results.\n\n#DarthAlgo #TradingView #FuturesTrading",
};
const slides = [
  ["0c7e6b275cca2b4b15602819a8546699896e610009b9cc74bf833ec705c7984d", "Slide 1 of 3. Darth Algo: One link. Your next step. Indicators. Community. More. darthalgo.com/links."],
  ["8478375d7818c4575c4daf6f983372ab7d66c2bafe4726aba0205da75792861e", "Slide 2 of 3. Darth Algo: Find your tool. Swing, Scalper, Pro. Explore the indicator plans. darthalgo.com/links."],
  ["e4c04e6ea0c19df4daf4102d0ba3ae5c5de388674a37a2a96acb02c0859e782d", "Slide 3 of 3. Darth Algo: Explore it all. Tools. Community. Official socials. darthalgo.com/links. Your next step starts here."],
];
export type InstagramAsset = {url:string; sha256:string; altText:string};
export function instagramPublicationPayload(custom?: {campaignId:string; text:string; assets:InstagramAsset[]}) {
  const assets = custom?.assets || slides.map(([sha256, altText], i) => ({
    url: `https://www.darthalgo.com/campaigns/links-carousel-v1/${i+1}-${sha256}.png`, sha256, altText,
  }));
  const campaignId=custom?.campaignId || instagramCampaign.id, text=custom?.text || instagramCampaign.text;
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(campaignId) || text.length>2200 || !text.trim() || assets.length<1 || assets.length>3)throw new Error("INSTAGRAM_PAYLOAD_INVALID");
  for(const asset of assets) {
    if(Object.keys(asset).length!==3 || !/^[a-f0-9]{64}$/.test(asset.sha256) || !asset.altText || asset.altText.length>1000)throw new Error("INSTAGRAM_ASSET_INVALID");
    const staticUrl=slides.some(([hash],i)=>asset.url===`https://www.darthalgo.com/campaigns/links-carousel-v1/${i+1}-${hash}.png` && hash===asset.sha256);
    const storedUrl=new RegExp(`^https://www\\.darthalgo\\.com/api/social-media/[a-f0-9-]{36}/${asset.sha256}$`).test(asset.url);
    if(!staticUrl && !storedUrl)throw new Error("INSTAGRAM_ASSET_INVALID");
  }
  return {
    kind: "publishing" as const, executor: "buffer_instagram_v1" as const, policyVersion: 1,
    campaignId, channelId: instagramCampaign.channelId, channelName: instagramCampaign.channelName,
    text, assets, mode: "shareNow" as const, postType: "post" as const, isAiGenerated: true,
    summary: `Instagram ${assets.length>1 ? "carousel" : "post"}: @darth.algo`,
    details: `Account: @darth.algo\nAction: Publish these ${assets.length} images in order with this exact caption now.\n\n${text}\n\nReview the slides:\n${assets.map((asset, i) => `${i+1}. ${asset.url}`).join("\n")}\n\nOriginal branded artwork. Instagram bio destination verified: www.darthalgo.com/links.`,
    evidence: ["instagram_carousel_draft_verified", "instagram_bio_links_verified"],
  };
}
export type InstagramPublication = ReturnType<typeof instagramPublicationPayload>;
// JSONB reorders object keys; array order must remain significant.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
  return value;
}
export function isInstagramPublication(value: unknown): value is InstagramPublication {
  try {
    const p=value as InstagramPublication;
    return Boolean(p) && JSON.stringify(canonical(value)) === JSON.stringify(canonical(instagramPublicationPayload({campaignId:p.campaignId,text:p.text,assets:p.assets})));
  } catch {return false;}
}
