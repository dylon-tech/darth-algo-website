const commands = [
  { command: "start", description: "Open the Darth Algo control center" },
  { command: "plans", description: "Compare every indicator plan" },
  { command: "scalper", description: "Buy the Scalper Tool" },
  { command: "swing", description: "Start the 2-day Swing trial" },
  { command: "pro", description: "Buy the complete Pro Tool" },
  { command: "lifetime", description: "Buy lifetime access" },
  { command: "setup", description: "Set up your indicator in TradingView" },
  { command: "support", description: "Get customer support" },
  { command: "wins", description: "Submit a result or testimonial" },
  { command: "affiliate", description: "Join the affiliate program" },
  { command: "rules", description: "View community rules and risk notice" },
  { command: "briefing", description: "Owner: view the current support briefing" },
  { command: "status", description: "Owner: check assistant status" },
];

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const token = required("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = (await response.json()) as { ok: boolean; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || `${method} failed`);
  return result;
}

export async function POST(request: Request) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const contentType = request.headers.get("content-type") || "";
  let suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    suppliedSecret = String(form.get("setup_secret") || "");
  }

  if (!setupSecret || suppliedSecret !== setupSecret) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.darthalgo.com").replace(/\/$/, "");
    await telegram("setWebhook", {
      url: `${siteUrl}/api/telegram/webhook`,
      secret_token: required("TELEGRAM_WEBHOOK_SECRET"),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    await telegram("setMyCommands", { commands });
    await telegram("setChatMenuButton", {
      menu_button: { type: "commands" },
    });

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      return new Response("<!doctype html><html><body style=\"font-family:system-ui;background:#080808;color:#fff;padding:48px\"><h1>D.A. Assistant is live</h1><p>The webhook, commands, and menu were configured successfully.</p></body></html>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return Response.json({ ok: true, webhook: `${siteUrl}/api/telegram/webhook` });
  } catch (error) {
    console.error("Telegram setup error", error);
    return Response.json({ ok: false, error: "Telegram setup failed" }, { status: 500 });
  }
}

export async function GET() {
  return new Response(`<!doctype html><html><body style="font-family:system-ui;background:#080808;color:#fff;padding:48px;max-width:620px"><h1>Activate D.A. Assistant</h1><p>Enter the private setup key to connect Telegram and install the command menu.</p><form method="post"><input name="setup_secret" type="password" required autocomplete="off" style="display:block;width:100%;padding:12px;margin:18px 0;background:#171717;color:#fff;border:1px solid #444;border-radius:8px"><button type="submit" style="padding:12px 18px;background:#d4af37;color:#080808;border:0;border-radius:8px;font-weight:700">Activate assistant</button></form></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
