// One campaign identifier per draft; the selected URL is part of exact approval.
export function contentDestinations(requestKey: string) {
  const campaign=`post-${requestKey.replace(/[^a-zA-Z0-9]/g,"").slice(-32).toLowerCase()}`;
  const query=`source=x&campaign=${campaign}`;
  return {
    linksUrl:`https://www.darthalgo.com/links?${query}`,
    communityUrl:`https://www.darthalgo.com/community?${query}`,
    primaryDestination:"links",
    purpose:"Owner priority: actively promote the links page, not only the community. Use linksUrl for indicator discovery, buying or comparing plans, and finding Darth Algo's other official pages. Use communityUrl for a specifically community-focused invitation. Choose one relevant CTA and include its supplied URL in the exact xDraft before approval; never append or change links after approval. For Instagram drafts, describe a link-in-bio CTA only after the profile link has been verified; do not claim the profile or account has been updated.",
  };
}
