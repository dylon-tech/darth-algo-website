import { NextResponse } from "next/server";
import { COOKIE_NAME, createAffiliateSession, verifyPassword } from "../../../lib/affiliate-auth";
import { db, ensureAffiliateSchema } from "../../../lib/affiliate-db";

export async function POST(request: Request) {
  try {
    await ensureAffiliateSchema();
    const { username, password } = await request.json();
    const credential = String(username).trim().toLowerCase();
    const rows = await db()`select id, password_hash from affiliate_applications where lower(email)=${credential} or lower(dashboard_username)=${credential} limit 1`;
    const affiliate = rows[0];
    if (!affiliate || !verifyPassword(String(password), affiliate.password_hash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, createAffiliateSession(affiliate.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 500 });
  }
}
