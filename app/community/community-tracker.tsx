"use client";

import { useEffect } from "react";

function visitorId() {
  const key = "darth-algo-growth-visitor";
  const current = localStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export default function CommunityTracker({ source, campaign }: { source: string; campaign: string }) {
  useEffect(() => {
    const id = visitorId();
    document.cookie = `da_growth_visitor=${id}; Max-Age=15552000; Path=/; SameSite=Lax; Secure`;
    const viewKey = `darth-algo-community-view:${source}:${campaign}`;
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");
    void fetch("/api/community/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, campaign, visitorId: id }),
      keepalive: true,
    });
  }, [source, campaign]);
  return null;
}
