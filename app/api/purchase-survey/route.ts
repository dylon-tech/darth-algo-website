import { NextResponse } from "next/server";

const allowedSources = new Set([
  "tiktok",
  "instagram",
  "youtube",
  "x-twitter",
  "tradingview",
  "search",
  "referral",
  "other",
]);

const allowedReasons = new Set([
  "signals",
  "risk-planning",
  "trend-dashboard",
  "ai-updates",
  "free-trial",
  "price-value",
  "source-code",
]);

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Survey storage is not configured." }, { status: 503 });
  }

  let payload: {
    sessionId?: unknown;
    heardFrom?: unknown;
    purchaseReasons?: unknown;
    otherSource?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  const heardFrom = typeof payload.heardFrom === "string" ? payload.heardFrom : "";
  const purchaseReasons = Array.isArray(payload.purchaseReasons)
    ? payload.purchaseReasons.filter((reason): reason is string => typeof reason === "string" && allowedReasons.has(reason))
    : [];
  const otherSource = typeof payload.otherSource === "string" ? payload.otherSource.trim().slice(0, 120) : "";

  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId) || !allowedSources.has(heardFrom) || purchaseReasons.length === 0) {
    return NextResponse.json({ error: "Invalid survey response." }, { status: 400 });
  }

  const formData = new URLSearchParams();
  formData.set("metadata[heard_from]", heardFrom);
  formData.set("metadata[purchase_reasons]", purchaseReasons.join(","));
  formData.set("metadata[survey_completed_at]", new Date().toISOString());
  if (heardFrom === "other" && otherSource) formData.set("metadata[heard_from_other]", otherSource);

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-11-20.acacia",
    },
    body: formData.toString(),
    cache: "no-store",
  });

  if (!stripeResponse.ok) {
    return NextResponse.json({ error: "Unable to save the survey response." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
