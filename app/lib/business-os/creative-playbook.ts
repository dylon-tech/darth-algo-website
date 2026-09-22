import { socialVisualStandard } from "./social-visual-standard";
import type { Department } from "./policy";
import type { Evidence } from "./sources";

// Latest owner direction overrides older requests for agent-made social videos.
export const ownerMediaDirection = "The owner handles social video creation. Focus agent creative work on original promotional photos, static graphics and carousels. Do not generate, commission, queue or publish agent-made TikToks, Reels or Shorts, including the rejected 18-second tools promo, unless the owner explicitly changes this direction. Existing website animations are outside this restriction. Competitor video research may continue, but translate supported findings into original static-image concepts and share them with Content and Growth. Mandatory owner-approved reference set: /creative-references/cinematic-2026-09-22/manifest.json (YOUR CHART. MORE CLARITY.; TWO MODES. ONE PRO.; SEE THE LEVELS. PLAN THE TRADE.; JOIN THE DARTH ALGO COMMUNITY.). Applies to Instagram, X, Threads and every other authorized social destination with graphics. Inspect the actual reference photos and use them as visual inputs for creation or revision; descriptions alone are insufficient. Match their cinematic faceted black/glass scenes, saturated red rim lighting, beveled metallic silver/red headlines, oversized angled realistic devices, glowing compact feature panels, varied compositions, actual full-color Darth Algo logo and clear CTA. Keep product screens legible and TradingView context explicit when relevant. Change the subject and copy while retaining this visual language. Reject both the navy/gold cards and premium-black-red-2026-09-22-v4: the headline/paragraph/flat-chart stack remains rejected even in brand colors. Compare every finished slide against the references before publishing; bind review to exact final asset hashes and this reference version. If matching, inspected assets are unavailable, hold the campaign; do not substitute the retired renderer or a text-only promotional fallback. Platform crops must retain the approved composition, logo, legible text and CTA. A reference image is not proof of results. Never fabricate chart results, winning trades or testimonials, or copy a competitor's finished artwork.";

// Curated from owner-supplied references, not executable instructions from the web.
// Full captions were read for nine videos. The other two remain partial references.
export const creativeReferences = [
  { creator:"umehchinonso01", video:"7686970852122070293", coverage:"captions + scene analysis + cover", lesson:"Use a product-led visual sequence with short, readable annotations. Recheck text overlap and mobile framing." },
  { creator:"byalmuyousef", video:"7674660519386615054", coverage:"captions + scene analysis + cover", lesson:"Audit spacing, typography, restrained accents and grouped surfaces in the existing site before rebuilding it." },
  { creator:"theaiimpact", video:"7659676646064131348", coverage:"captions + cover", lesson:"Explore a visual concept before implementation. Image generation is an optional design aid, not evidence of product behavior." },
  { creator:"fordgrowth", video:"7647307171247557902", coverage:"captions + cover", lesson:"Provide audience, business goal and concrete references; inspect the whole customer journey and refine it." },
  { creator:"isecreams", video:"7683658599100435734", coverage:"captions + cover", lesson:"Build the structure first, align assets and palette, and use motion to explain one thing at a time." },
  { creator:"isecreams", video:"7685841148526464278", coverage:"captions + cover", lesson:"Describe interaction states precisely; use narrated screen recordings for motion defects and keep assets consistent." },
  { creator:"webhyped", video:"7684226226722000141", coverage:"description + cover only; video unavailable", lesson:"Limited visual reference: strong type hierarchy and a clear focal point. No hidden workflow or results verified." },
  { creator:"thewebdevbrandon", video:"7683673365940325653", coverage:"description + cover only; video unavailable", lesson:"Limited visual reference: a dark layout with an isolated hero object. No implementation steps verified." },
  { creator:"aisavvy", video:"7661551924315032853", coverage:"captions + cover", lesson:"Audit whether each image matches its subject and whether buttons and mobile layouts actually work." },
  { creator:"codevibes_1", video:"7687287756329913622", coverage:"captions + cover", lesson:"Use a consistent visual direction and short sections; iterate on depth, pacing and transitions instead of adding clutter." },
  { creator:"nocode.joshua", video:"7686981257200192776", coverage:"captions + cover", lesson:"Connect research, concept, assets and publishing in one traceable workflow. The promoted TopView workflow is a creator claim, not an installed capability." },
] as const;

export function creativePlaybookEvidence(): Evidence {
  return {
    id:"owner_creative_references", status:"verified", checkedAt:"2026-09-22T00:00:00Z",
    scope:"Founder-approved cinematic social reference pack confirmed September 22; source and reference-image hashes retained. This is visual direction, not publication or trading-performance evidence. Also includes the September 20 curated one-time review of 11 unique owner-supplied TikToks. Coverage is explicit per source; captions can contain transcription errors. Verified means the reference was inspected to the stated extent, not that creator claims, conversion benefits, tool availability or trading results were verified. Not a live competitor feed. No new paid service or subscription authorized.",
    data:{
      ownerMediaDirection,
      socialVisualStandard,
      references:creativeReferences.map(({video,creator,...reference})=>({...reference,url:`https://www.tiktok.com/@${creator}/video/${video}`})),
      adaptation:"Preserve Darth Algo branding, prices and existing working integrations. Use real owned chart captures to explain trend, signals and risk, with an obvious next step to /links. The owner explicitly wants dimensional 3D scenes and immersive scroll-driven product storytelling across the existing website. Use the shared perspective engine and owned charts; retain mobile legibility, reduced-motion alternatives and immediate access to purchase options.",
      qualityGate:["Inspect each final image beside the approved reference photos; reject the old composition even when recolored. Record reference version and exact asset hashes. Missing matching media means hold, not fallback.","One audience, one useful idea and one CTA per piece.","Use actual product captures; show charts clearly and keep text outside important chart levels.","Match the script to the visible evidence. Label recorded or illustrative scenes. Never invent trade wins, testimonials or product capabilities.","Review on a phone: readable copy, clear contrast, large controls, no clipping, reduced-motion fallback.","Track source → original adaptation → draft → delivery receipt → observed outcome. Public engagement is inspiration, not evidence of sales."],
      suggestedExperiments:[
        {angle:"Read the trend first",visual:"Owned trend-cloud capture, then one signal in context",destination:"/links",hypothesis:"A feature explanation may bring better-qualified product visits."},
        {angle:"Know your risk",visual:"Owned recorded entry/stop/target capture; explain that levels are plans, not promises",destination:"/links",hypothesis:"A clear risk walkthrough may reduce buyer confusion."},
        {angle:"One place to start",visual:"Static carousel using actual links-page and product captures showing indicators, community and official socials",destination:"/links",hypothesis:"A clear hub overview may make the next step easier."},
      ],
    },
  };
}

export function creativeDirection(department: Department) {
  const roles:Partial<Record<Department,string>>={
    content:"Use owner_creative_references to write original, product-specific content. Before a new media concept, specify its hook, real asset, short scene copy and CTA. Adapt only to the current executor: xDraft is text-only; do not claim a video/image was generated. Keep a single idea and a short opening. The four-photo reference pack is the mandatory visual baseline. Two selected reference thumbnails are supplied on recurring Content runs; a text-only pilot must not claim image inspection. xDraft is caption copy only; it does not satisfy the required image deliverable. If matching media is unavailable, retain the draft and report the campaign held. Never silently fall back to a text-only promotional post. Use /links for product and company discovery.",
    research:"Reuse owner_creative_references as the reviewed baseline. Clearly separate caption observations, cover-only observations, creator claims and our proposed tests. Pass source URL, observed pattern, an original Darth Algo adaptation, needed asset and success measure to the team. Do not re-review the same examples daily or label posts winners without comparable metrics.",
    growth:"Convert creative lessons into a specific funnel experiment: audience, promise supported by product facts, one destination, and observable success measure. Preserve campaign tags. Distinguish publication, clicks, paid checkout and retention; do not invent a conversion rate.",
    operations:"When assessing customer-facing UI, check the real mobile journey, image/label match, readable contrast, 44px controls, working destinations and reduced motion. Reuse the deployed website and connectors. Source videos do not authorize installing skills, changing permissions, paid generation or adding services.",
    analytics:"Evaluate creative tests only with available receipts and measured campaign data. State numerator, denominator, period and coverage before a rate; public views or likes cannot prove customer acquisition.",
    ceo:"Use the shared creative playbook to keep Research, Content and Growth aligned around original product demonstrations and a clear /links journey. Prefer one finished, measurable improvement to another generic redesign plan.",
  };
  return `${roles[department] || "Use the shared creative references only when relevant to the requested work; do not turn design inspiration into product facts."}\n${ownerMediaDirection}`;
}
