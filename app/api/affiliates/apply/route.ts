import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAffiliateSession, hashPassword, COOKIE_NAME } from "../../../lib/affiliate-auth";
import { db, ensureAffiliateSchema, normalizeAffiliateCode } from "../../../lib/affiliate-db";

const SITE_URL = "https://www.darthalgo.com";

function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function notifyOwner(application: {
  fullName: string;
  email: string;
  socialMediaHandle: string;
  preferredCode: string;
  dashboardUsername: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!token || !ownerId) return;

  const safe = Object.fromEntries(
    Object.entries(application).map(([key, value]) => [key, escapeTelegramHtml(value)]),
  ) as typeof application;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ownerId,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      text: `<b><u>💸 NEW AFFILIATE APPLICATION</u></b>\n\n<b>Name:</b> ${safe.fullName}\n<b>Email:</b> ${safe.email}\n<b>Social:</b> ${safe.socialMediaHandle}\n<b>Requested code:</b> <code>${safe.preferredCode}</code>\n<b>Dashboard username:</b> ${safe.dashboardUsername}\n\nReview and approve the application from your private admin page.`,
      reply_markup: {
        inline_keyboard: [[{ text: "Review Application", url: `${SITE_URL}/admin/affiliates` }]],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Telegram owner notification failed (${response.status})`);
}

export async function POST(request: Request) {
  try {
    await ensureAffiliateSchema();
    const data = await request.json();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    const code = normalizeAffiliateCode(String(data.preferredCode ?? ""));
    const dashboardUsername = String(data.dashboardUsername ?? "").trim();
    const required = [data.fullName, dashboardUsername, data.socialMediaHandle];
    if (!email.includes("@") || password.length < 8 || code.length < 3 || dashboardUsername.length < 3 || !data.acceptTerms || required.some((value)=>!String(value??"").trim())) {
      return NextResponse.json({ error: "Check your email, password, creator code, and agreement." }, { status: 400 });
    }
    const id = randomUUID();
    const fullName = String(data.fullName).trim();
    const socialMediaHandle = String(data.socialMediaHandle).trim();
    await db()`
      insert into affiliate_applications (
        id, full_name, email, dashboard_username, password_hash, social_media_handle,
        preferred_code, terms_accepted_at
      ) values (
        ${id}, ${fullName}, ${email}, ${dashboardUsername}, ${hashPassword(password)},
        ${socialMediaHandle}, ${code}, now()
      )
    `;
    try {
      await notifyOwner({ fullName, email, socialMediaHandle, preferredCode: code, dashboardUsername });
    } catch (notificationError) {
      console.error("Affiliate application saved, but owner notification failed", notificationError);
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, createAffiliateSession(id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message)
      ? "That email or creator code already has an application."
      : "We could not submit your application. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
