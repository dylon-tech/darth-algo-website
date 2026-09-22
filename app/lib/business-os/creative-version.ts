// Bump whenever the approved visual system or slide copy changes. A deployment
// alone cannot invalidate images already saved in the daily campaign cache.
export const currentCreativeVersion = 'premium-black-red-2026-09-22-v4';
export function isCurrentCreative(campaign: {creativeVersion?: string}) {
  return campaign.creativeVersion === currentCreativeVersion;
}
