/** Owner-only creative briefs. These are not rendered videos or performance claims. */
export type VideoScene = { seconds: number; headline: string; voiceover: string; direction: string };
export type VideoDraft = { version: 1; templateId: string; scenes: VideoScene[]; notes: string };
export type VideoTemplate = { id: string; name: string; purpose: string; image: string; reference: string; scenes: VideoScene[] };
export const VIDEO_CTA = 'https://www.darthalgo.com/links';
export const VIDEO_DISCLOSURE = 'Selected historical chart. Not live or typical results. Trading involves risk.';
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'clarity', name: 'Chart reveal', purpose: 'Show the product immediately.',
    image: '/indicators/signal-context-alt.png', reference: 'https://www.instagram.com/reel/DccCEutpErt/',
    scenes: [
      { seconds: 3, headline: 'LESS NOISE. MORE CLARITY.', voiceover: 'Your chart needs less noise and a clearer plan.', direction: 'Open on an authentic Darth Algo chart. Slow push toward a visible signal. Never manufacture a candle or a trade.' },
      { seconds: 5, headline: 'SEE THE SETUP.', voiceover: 'See potential setups, trend context, and risk levels on TradingView.', direction: 'Use a verified product capture. Show each feature only when it is visible. Keep the chart large and undistorted.' },
      { seconds: 5, headline: 'CHECK YOUR RISK.', voiceover: 'Review the signal. Check your risk. Make your own decision.', direction: 'Highlight an existing risk level without moving it. Keep market context and the historical-example disclosure visible.' },
      { seconds: 4, headline: 'DARTH ALGO ON TRADINGVIEW', voiceover: 'Explore Darth Algo. Link in bio.', direction: 'Hold the actual full-color Darth Algo logo and links-page CTA. Do not imply an official TradingView partnership.' },
    ],
  },
  {
    id: 'breakdown', name: 'Setup breakdown', purpose: 'Explain one real decision.',
    image: '/indicators/scalper-execution.png', reference: 'https://www.instagram.com/reel/Db23YlvBTPE/',
    scenes: [
      { seconds: 3, headline: 'A SIGNAL IS NOT A PLAN.', voiceover: 'A signal is only the beginning.', direction: 'Open on a real product capture with one clearly visible signal. Keep other bars visible for context.' },
      { seconds: 5, headline: 'READ THE CONTEXT.', voiceover: 'Check the direction, the setup, and what would invalidate your idea.', direction: 'Point to verified features in the source. Explain what is known; do not infer unseen trade outcomes.' },
      { seconds: 5, headline: 'PLAN BEFORE YOU ENTER.', voiceover: 'Define your risk before you decide to enter. No indicator removes uncertainty.', direction: 'Zoom only enough to keep labels legible. No invented profit, payout, win rate, or evaluation-pass claim.' },
      { seconds: 4, headline: 'BUILD YOUR PROCESS.', voiceover: 'See how Darth Algo fits your TradingView workflow. Link in bio.', direction: 'Show the actual logo and clear CTA. Keep the trading-risk disclosure on screen.' },
    ],
  },
  {
    id: 'product', name: 'Product showcase', purpose: 'Make a focused product ad.',
    image: '/indicators/swing-trend-cloud.png', reference: 'https://www.instagram.com/reel/DcCYIPAJzId/',
    scenes: [
      { seconds: 3, headline: 'YOUR CHART. WITH CONTEXT.', voiceover: 'Keep your analysis where you trade.', direction: 'Show the real Swing Tool chart immediately. Use a clean black frame, restrained red accent, and actual logo.' },
      { seconds: 5, headline: 'FOLLOW THE CONTEXT.', voiceover: 'Explore trend context and potential setups directly on your TradingView chart.', direction: 'Use only verified features from the chosen tool. Do not mix Scalp and Swing features as though one plan includes everything.' },
      { seconds: 5, headline: 'CLARITY. NOT CERTAINTY.', voiceover: 'A clearer workflow does not guarantee a winning trade. Your risk plan still matters.', direction: 'Use a smooth crop of the original chart, not AI-recreated market data. No cherry-picked profit counter.' },
      { seconds: 4, headline: 'EXPLORE DARTH ALGO.', voiceover: 'Find your tool at Darth Algo. Link in bio.', direction: 'End with a product-first CTA to the official links page. Do not invent a discount or trial.' },
    ],
  },
];
export function newVideoDraft(templateId = 'clarity'): VideoDraft {
  const template = VIDEO_TEMPLATES.find(t => t.id === templateId) || VIDEO_TEMPLATES[0];
  return { version: 1, templateId: template.id, scenes: template.scenes.map(s => ({ ...s })), notes: '' };
}
export function isVideoDraft(value: unknown): value is VideoDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<VideoDraft>;
  return d.version === 1 && VIDEO_TEMPLATES.some(t => t.id === d.templateId) &&
    typeof d.notes === 'string' && d.notes.length <= 300 && Array.isArray(d.scenes) && d.scenes.length === 4 &&
    d.scenes.every(s => s && Number.isInteger(s.seconds) && s.seconds >= 2 && s.seconds <= 8 &&
      typeof s.headline === 'string' && s.headline.length <= 64 &&
      typeof s.voiceover === 'string' && s.voiceover.length <= 180 &&
      typeof s.direction === 'string' && s.direction.length <= 240);
}
export function videoDraftErrors(draft: VideoDraft): string[] {
  if (!isVideoDraft(draft)) return ['This saved draft cannot be read. Choose a fresh template.'];
  const errors: string[] = [];
  draft.scenes.forEach((s, i) => {
    if (!s.headline.trim() || !s.voiceover.trim() || !s.direction.trim()) errors.push(`Finish the headline, voiceover, and visual for scene ${i + 1}.`);
    if (s.voiceover.trim().split(/\s+/).length > s.seconds * 3) errors.push(`Scene ${i + 1}: shorten the voiceover or give it more time.`);
  });
  return errors;
}
export function buildVideoBrief(draft: VideoDraft): string {
  const errors = videoDraftErrors(draft);
  if (errors.length) throw Error(errors[0]);
  const t = VIDEO_TEMPLATES.find(item => item.id === draft.templateId)!;
  const header = `DARTH ALGO — VIDEO PRODUCTION BRIEF\n${t.name}; 1080x1920; ${draft.scenes.reduce((n,s) => n + s.seconds, 0)} seconds.\nPrepare an INTERNAL production package: final script, shot list, asset checklist, and QA notes. Do not publish, order paid media, or claim a render exists. Use existing budget controls.\nSTYLE: premium black/red, actual full-color DA logo, large real TradingView charts, bold short headlines, energetic natural voice, precise caption timing. No generic slideshow, tiny chart, invented trade, guarantee, or fake endorsement.\nREFERENCE CONCEPT: ${t.reference}\nSOURCE IMAGE: https://www.darthalgo.com${t.image}\nCTA: ${VIDEO_CTA}\nDISCLOSURE: ${VIDEO_DISCLOSURE}\n`;
  let offset = 0;
  const scenes = draft.scenes.map((s, i) => {
    const from = offset; offset += s.seconds;
    return `${i + 1}. ${from}–${offset}s\nHeadline: ${s.headline.trim()}\nVoice: ${s.voiceover.trim()}\nVisual: ${s.direction.trim()}`;
  }).join('\n');
  const result = `${header}${scenes}\nOwner direction: ${draft.notes.trim() || 'Follow the storyboard.'}\nQA: verify features against source; keep chart data unchanged; readable on iPhone; match voice to scene; licensed audio only. Price any future render before submission, reserve budget atomically, save results to owned storage, and require a publication receipt before calling it posted.`;
  if (result.length > 4000) throw Error('Shorten the visual directions or notes to fit the agent request.');
  return result;
}
export type OwnerView = 'home' | 'team' | 'queue' | 'bills';
export function ownerViewFromSearch(search: string): OwnerView {
  const v = new URLSearchParams(search).get('view');
  return v === 'team' || v === 'agents' ? 'team' : v === 'queue' || v === 'studio' ? 'queue' : v === 'bills' || v === 'money' ? 'bills' : 'home';
}
export function ownerViewParam(view: OwnerView): string {
  return ({ home: 'home', team: 'agents', queue: 'studio', bills: 'money' })[view];
}
export function isVideoJobReceipt(value: unknown): value is { id: string; status: string } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id) &&
    typeof v.status === 'string' && ['queued','running','succeeded','failed','unknown','cancelled'].includes(v.status);
}
