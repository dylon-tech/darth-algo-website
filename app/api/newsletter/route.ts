import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBrevoListIds(value?: string) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      consent?: unknown;
      company?: unknown;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";

    if (company) return NextResponse.json({ ok: true });

    if (!email || email.length > 254 || !emailPattern.test(email)) {
      return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    }

    if (body.consent !== true) {
      return NextResponse.json({ message: "Email consent is required." }, { status: 400 });
    }

    const subscribedAt = new Date().toISOString();
    const brevoApiKey = process.env.BREVO_API_KEY;
    const brevoListIds = parseBrevoListIds(process.env.BREVO_LIST_ID ?? process.env.BREVO_LIST_IDS);

    if (brevoApiKey && brevoListIds.length > 0) {
      const response = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          email,
          listIds: brevoListIds,
          updateEnabled: true,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        return NextResponse.json({ message: "We could not add you right now. Please try again." }, { status: 502 });
      }

      return NextResponse.json({ ok: true });
    }

    const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { message: "Newsletter enrollment is being connected. Please check back shortly." },
        { status: 503 },
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        consent: true,
        source: "darthalgo-website",
        subscribedAt,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ message: "We could not add you right now. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Invalid signup request." }, { status: 400 });
  }
}
