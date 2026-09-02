import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAffiliateSession, hashPassword, COOKIE_NAME } from "../../../lib/affiliate-auth";
import { db, ensureAffiliateSchema, normalizeAffiliateCode } from "../../../lib/affiliate-db";

export async function POST(request: Request) {
  try {
    await ensureAffiliateSchema();
    const data = await request.json();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    const code = normalizeAffiliateCode(String(data.preferredCode ?? ""));
    const required = [data.fullName, data.tradingViewUsername, data.primaryPlatform, data.profileUrl, data.audienceSize, data.contentPlan, data.payoutMethod, data.payoutHandle];
    if (!email.includes("@") || password.length < 8 || code.length < 3 || !data.acceptTerms || required.some((value)=>!String(value??"").trim()) || String(data.contentPlan).trim().length < 40) {
      return NextResponse.json({ error: "Check your email, password, creator code, and agreement." }, { status: 400 });
    }
    const id = randomUUID();
    await db()`
      insert into affiliate_applications (
        id, full_name, email, password_hash, tradingview_username, primary_platform,
        profile_url, audience_size, content_plan, preferred_code, payout_method,
        payout_handle, terms_accepted_at
      ) values (
        ${id}, ${String(data.fullName).trim()}, ${email}, ${hashPassword(password)},
        ${String(data.tradingViewUsername).trim()}, ${String(data.primaryPlatform).trim()},
        ${String(data.profileUrl).trim()}, ${String(data.audienceSize).trim()},
        ${String(data.contentPlan).trim()}, ${code}, ${String(data.payoutMethod).trim()},
        ${String(data.payoutHandle).trim()}, now()
      )
    `;
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
