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
    const dashboardUsername = String(data.dashboardUsername ?? "").trim();
    const required = [data.fullName, dashboardUsername, data.socialMediaHandle];
    if (!email.includes("@") || password.length < 8 || code.length < 3 || dashboardUsername.length < 3 || !data.acceptTerms || required.some((value)=>!String(value??"").trim())) {
      return NextResponse.json({ error: "Check your email, password, creator code, and agreement." }, { status: 400 });
    }
    const id = randomUUID();
    await db()`
      insert into affiliate_applications (
        id, full_name, email, dashboard_username, password_hash, social_media_handle,
        preferred_code, terms_accepted_at
      ) values (
        ${id}, ${String(data.fullName).trim()}, ${email}, ${dashboardUsername}, ${hashPassword(password)},
        ${String(data.socialMediaHandle).trim()}, ${code}, now()
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
