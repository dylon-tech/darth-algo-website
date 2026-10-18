import type { CampaignAttribution } from './campaign-attribution';

// Exact public destinations only. Never collect query strings or arbitrary paths.
export const acquisitionPaths = new Set(['/', '/links', '/compare', '/alternatives', '/start', '/products/scalper', '/products/swing', '/products/pro']);
const sources = new Set(['x','instagram','threads','whop','tiktok','youtube','facebook','reddit','telegram','email','affiliate','search','ads']);
const campaigns = new Set(['default','welcome25','links','tool-comparison']);
const contents = new Set(['','profile','link_in_bio','caption','bio','welcome_test']);
export type AcquisitionLabels = {source:string;campaign:string;content:string};
export function acquisitionLabels(value: Pick<CampaignAttribution,'source'|'campaign'|'content'> | null): AcquisitionLabels {
  if (!value || !sources.has(value.source)) return {source:'unknown',campaign:'unknown',content:''};
  // Do not transmit arbitrary user-entered UTM text to the visit collector.
  const campaign = campaigns.has(value.campaign) || /^20\d{2}-\d{2}-\d{2}-(morning|afternoon)$/.test(value.campaign) || /^post-[a-f0-9]{32}$/.test(value.campaign) ? value.campaign : 'unregistered';
  return {source:value.source,campaign,content:contents.has(value.content) ? value.content : 'unregistered'};
}
export function validAcquisitionLabels(value: unknown): value is AcquisitionLabels {
  if (!value || typeof value !== 'object') return false;
  const v=value as AcquisitionLabels;
  if (typeof v.source!=='string'||typeof v.campaign!=='string'||typeof v.content!=='string') return false;
  if(v.source==='unknown') return v.campaign==='unknown'&&v.content==='';
  return sources.has(v.source)&&JSON.stringify(acquisitionLabels(v))===JSON.stringify({source:v.source,campaign:v.campaign,content:v.content});
}
export const acquisitionDailyLimit=500;
export const acquisitionRetainedLimit=15000;
export const acquisitionUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
