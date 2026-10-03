// October 3 retry activates the October 2 founder correction: a slanted regular-weight font is not the approved type.
export const socialTypographyVersion = 'condensed-italic-2026-10-02-v2';
export const socialTypographyReference = {
 path: '/creative-references/typography-2026-10-01/approved-type-548702605ab5.png',
 sha256: '548702605ab55b18f8caddd53d39a6eb99c94d2c8c4ebf90358b47350ede11ac',
} as const;
export const socialTypographyInstructions = 'Latest founder typography rule: use extra-heavy condensed forward-italic metallic silver/red headlines, tight tracking, strong natural hooks, concise benefit-led copy and matching bold CTAs. Inspect the actual approved typography crop at '+socialTypographyReference.path+'. Reject thin, outlined, upright, widely spaced lettering and merely slanting the old regular-weight font. No clipped text. Preserve real owned indicator captures and cinematic black/red scenes. Compare every final slide at full resolution and phone size. Set editorial.typographyVersion to '+socialTypographyVersion+' only after actual visual review; the signed digest binds that review to the exact assets and copy. Missing or failing current style review holds future publication; never stamp old assets compliant or substitute a retired template. This governs already queued unattempted work as well as new drafts. Preserve historical attempted/published records and receipts.';
export function requiresCurrentTypography(c:{day:string;slot:string}) {
 return c.day>'2026-10-03'||(c.day==='2026-10-03'&&c.slot==='afternoon');
}
