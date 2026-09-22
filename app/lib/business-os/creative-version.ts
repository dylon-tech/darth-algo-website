export const currentCreativeVersion='cinematic-reviewed-2026-09-22-v5';
export function isCurrentCreative(campaign:{creativeVersion?:string}) {
 return campaign.creativeVersion===currentCreativeVersion;
}
