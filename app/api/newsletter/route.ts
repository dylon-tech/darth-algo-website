import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        subscribedAt: new Date().toISOString(),
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
