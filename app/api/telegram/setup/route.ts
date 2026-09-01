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
  if (!setupSecret || request.headers.get("authorization") !== `Bearer ${setupSecret}`) {
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

    return Response.json({ ok: true, webhook: `${siteUrl}/api/telegram/webhook` });
  } catch (error) {
    console.error("Telegram setup error", error);
    return Response.json({ ok: false, error: "Telegram setup failed" }, { status: 500 });
  }
}
