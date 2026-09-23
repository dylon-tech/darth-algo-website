export const verifiedAt='2026-09-23T03:14:00Z';
export const capabilityInventory=[
 {platform:'instagram',account:'@darth.algo — observed in authenticated Manychat settings',provider:'Manychat native; workspace fb5646156',trigger:'Saved draft: exact inbound WELCOME (case-insensitive) → offer within messaging window',permissions:'Instagram channel connected in Manychat. Permission expiry and API telemetry unavailable.',eligibility:'Follow-to-DM: Unavailable yet; Meta limited the use of this functionality. Keyword draft saved, not activated or recipient-tested.',restrictions:'User must request the offer. Native STOP/Unsubscribe action exists; suppression and repeat-request behavior still require a controlled test. No reminders.',cost:'Observed Free plan, contact limit 0/25. $0 new spend. No trial or upgrade started; capacity must be rechecked before activation.',blocker:'Follower trigger unavailable for this account. Keyword draft awaits owner-controlled test and final offer validation; owner handles promo configuration.',verifiedAt:'2026-09-23T10:14:42Z'},
 {platform:'x',account:'Messaging account not verified',provider:'X API (not connected)',trigger:'Inbound WELCOME or another explicit request for this offer',permissions:'User-context DM read/write authorization and approved event subscription',eligibility:'Developer console sign-in, app scopes and credits unverified',restrictions:'Following/open DMs/old conversation is not promotional opt-in. STOP suppresses; no reminders.',cost:'Official list: DM received/read $0.010; DM create $0.015. Account rate/credits unavailable; $0.025 per inbound+reply estimate excludes extras.',blocker:'X developer sign-in, scopes, explicit spending approval if existing credits unavailable',verifiedAt},
 {platform:'tiktok',account:'Business account/region not verified',provider:'TikTok native preferred',trigger:'User starts chat or sends exact WELCOME keyword; not follower-triggered',permissions:'Advanced Access and Verified Business Account; messages from Everyone',eligibility:'Business Center sign-in required; region and commercial-content eligibility unverified',restrictions:'Welcome 250 characters, keyword reply 500, keyword 40; moderation 1–5 business days. STOP behavior must be tested before activation.',cost:'No purchase made; account-specific native/provider cost unavailable',blocker:'Verified business/region inspection, message moderation and opt-out test',verifiedAt}
];
export const instagramProviderObservation={
 id:'instagram-manychat-20260923-1014',checkedAt:'2026-09-23T10:14:42Z',provider:'Manychat',workspaceId:'fb5646156',
 flowId:'content20260923101152_967121',flowUrl:'https://app.manychat.com/fb5646156/cms/files/content20260923101152_967121/edit',
 account:'@darth.algo',state:'draft',followerTrigger:'unavailable_for_account',telemetry:'unavailable',
 source:'Authenticated provider UI; draft reloaded and read back. Manual observation, not continuous status sync.'
};
export const ownerActions=[
 'Choose an Instagram account you control for the WELCOME and STOP test. The native draft is saved; no message has been sent.',
 'You are handling WELCOME in Stripe. Confirm final advertised terms before offer activation: 25% on the first paid purchase/invoice for first-time customers. No Stripe configuration is changed by this workflow.',
 'Follow-to-DM is unavailable for @darth.algo. The saved fallback answers an exact inbound WELCOME request; it does not message new followers automatically.',
 'X and TikTok welcome sending remain off while work is focused on Instagram.'
];
