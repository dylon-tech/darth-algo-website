type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
};

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

const SITE_URL = "https://www.darthalgo.com";
const PRICING_URL = `${SITE_URL}/#pricing`;
const COMMUNITY_URL = "https://t.me/+swxeZlm3_y8yZWMx";
const AFFILIATE_URL = "https://whop.com/darth-algo-5c99/affiliates";

type SupportResult = {
  answer: string;
  category: "plans" | "setup" | "access" | "billing" | "technical" | "general";
  resolution: "resolved" | "needs_owner";
  owner_summary: string;
};

type SupportCase = {
  userId: number;
  displayName: string;
  category: SupportResult["category"];
  resolution: SupportResult["resolution"];
  summary: string;
};

const pendingBriefing: SupportCase[] = [];

const CHECKOUT = {
  scalper: "https://buy.stripe.com/14AfZi4T5fRidqS2oc6kg03",
  swing: "https://buy.stripe.com/28EcN699l8oQ9aC5Ao6kg02",
  pro: "https://buy.stripe.com/4gM8wQfxJ6gI1IabYM6kg05",
  lifetime: "https://buy.stripe.com/6oUcN62KX0WoeuW1k86kg04",
} as const;

const mainKeyboard: InlineKeyboardButton[][] = [
  [{ text: "⚡ View Indicator Plans", callback_data: "plans" }],
  [
    { text: "🛠 Setup Help", callback_data: "setup" },
    { text: "🆘 Customer Support", callback_data: "support" },
  ],
  [
    { text: "🏆 Submit a Win", callback_data: "wins" },
    { text: "💸 Affiliate Program", url: AFFILIATE_URL },
  ],
  [
    { text: "📌 Community Rules", callback_data: "rules" },
    { text: "👥 Join Community", url: COMMUNITY_URL },
  ],
];

const plansKeyboard: InlineKeyboardButton[][] = [
  [{ text: "🎯 Buy Scalper — $18.99/mo", url: CHECKOUT.scalper }],
  [{ text: "📈 Start Swing Trial — 2 Days Free", url: CHECKOUT.swing }],
  [{ text: "🔥 Buy Pro — $29/mo", url: CHECKOUT.pro }],
  [{ text: "👑 Buy Lifetime — $134.99", url: CHECKOUT.lifetime }],
  [{ text: "🔍 Compare All Plans", url: PRICING_URL }],
  [{ text: "⬅️ Main Menu", callback_data: "menu" }],
];

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${getToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const result = (await response.json()) as { ok: boolean; description?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} failed`);
  }
  return result;
}

async function sendMessage(
  chatId: number | string,
  text: string,
  keyboard?: InlineKeyboardButton[][],
) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function displayName(user?: TelegramUser) {
  if (!user) return "Unknown user";
  return user.username ? `@${user.username}` : user.first_name || `Telegram user ${user.id}`;
}

function supportInstructions() {
  return `You are D.A. Assistant, the official customer support manager for Darth Algo.

Your job is to answer clearly and briefly, help people choose or access Darth Algo indicators, troubleshoot setup, and escalate anything that needs the owner.

Verified business facts:
- Official site and plan comparison: ${PRICING_URL}
- Scalper: $18.99/month. Checkout: ${CHECKOUT.scalper}
- Swing: 2-day free trial, then $14.99/month. Checkout: ${CHECKOUT.swing}
- Pro: Scalper + Swing, $29/month. Checkout: ${CHECKOUT.pro}
- Lifetime: complete suite, future updates, source code, and commercial-use rights, $134.99 one time. Checkout: ${CHECKOUT.lifetime}
- Customers must enter their exact TradingView username at checkout.
- Invite-only access is normally activated within 24 hours.
- In TradingView, use Indicators > Invite-only Scripts, then add the purchased Darth Algo indicator.
- Affiliate application: ${AFFILIATE_URL}
- Community: ${COMMUNITY_URL}

Operating rules:
- Never claim guaranteed profits, provide personalized financial advice, tell someone what to trade, or imply results are guaranteed.
- Never ask for passwords, login codes, full payment-card details, Telegram codes, API keys, or seed phrases.
- Never claim a payment was received or access was activated unless the owner confirms it.
- Mark needs_owner for refunds, charge disputes, missing access after 24 hours, payment verification, account-specific access changes, partnership/legal/media requests, threats, harassment, or anything you cannot verify confidently.
- For technical help, give at most five concrete steps and ask one focused follow-up if important information is missing.
- Do not invent features, plan terms, discounts, policies, or timelines.
- Speak as the Darth Algo team using a warm, confident, concise tone. Make clear you are the D.A. Assistant when relevant.
- End trading-related guidance with a brief educational-only/risk reminder when appropriate, without overusing disclaimers.
- Keep the answer under 900 characters.

Return only data that matches the requested JSON schema.`;
}

async function askAssistant(message: TelegramMessage): Promise<SupportResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey && !gatewayToken) throw new Error("AI authentication is not configured");

  const usingGateway = !apiKey;
  const endpoint = usingGateway
    ? "https://ai-gateway.vercel.sh/v1/responses"
    : "https://api.openai.com/v1/responses";
  const model = process.env.OPENAI_SUPPORT_MODEL ||
    (usingGateway ? "openai/gpt-5.4-mini" : "gpt-5.6-luna");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey || gatewayToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: supportInstructions(),
      input: [{ role: "user", content: `Customer: ${displayName(message.from)}\nQuestion: ${message.text || ""}` }],
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "darth_algo_support",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: { type: "string" },
              category: { type: "string", enum: ["plans", "setup", "access", "billing", "technical", "general"] },
              resolution: { type: "string", enum: ["resolved", "needs_owner"] },
              owner_summary: { type: "string" },
            },
            required: ["answer", "category", "resolution", "owner_summary"],
          },
        },
      },
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as {
    error?: { message?: string };
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (!response.ok) throw new Error(result.error?.message || "OpenAI support request failed");
  const raw = result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!raw) throw new Error("OpenAI returned no support answer");
  return JSON.parse(raw) as SupportResult;
}

function briefingText(cases: SupportCase[]) {
  if (!cases.length) return "<b>📋 SUPPORT BRIEFING</b>\n\nNo support cases are waiting in the current briefing batch.";
  const resolved = cases.filter((item) => item.resolution === "resolved").length;
  const escalated = cases.length - resolved;
  const lines = cases.slice(-10).map((item, index) =>
    `${index + 1}. <b>${escapeHtml(item.category)}</b> — ${escapeHtml(item.displayName)} — ${escapeHtml(item.summary)}`,
  );
  return `<b>📋 SUPPORT BRIEFING</b>\n\nHandled: <b>${cases.length}</b>\nResolved by D.A.: <b>${resolved}</b>\nEscalated: <b>${escalated}</b>\n\n${lines.join("\n")}`;
}

async function notifyOwner(message: TelegramMessage, result: SupportResult) {
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId || !message.from) return;
  const supportCase: SupportCase = {
    userId: message.from.id,
    displayName: displayName(message.from),
    category: result.category,
    resolution: result.resolution,
    summary: result.owner_summary,
  };
  pendingBriefing.push(supportCase);

  if (result.resolution === "needs_owner") {
    await sendMessage(ownerId, `<b>🚨 SUPPORT ESCALATION</b>\n\nCustomer: ${escapeHtml(supportCase.displayName)}\nUser ID: <code>${supportCase.userId}</code>\nCategory: ${escapeHtml(result.category)}\nIssue: ${escapeHtml(result.owner_summary)}\n\nReply with:\n<code>/reply ${supportCase.userId} your message</code>`);
  }

  const threshold = Math.max(1, Number(process.env.TELEGRAM_BRIEFING_THRESHOLD || "10"));
  if (pendingBriefing.length >= threshold) {
    await sendMessage(ownerId, briefingText(pendingBriefing));
    pendingBriefing.length = 0;
  }
}

async function handleSupportQuestion(message: TelegramMessage) {
  try {
    await telegram("sendChatAction", { chat_id: message.chat.id, action: "typing" });
    const result = await askAssistant(message);
    await sendMessage(message.chat.id, `${escapeHtml(result.answer)}${result.resolution === "needs_owner" ? "\n\n<b>I've sent this to the Darth Algo owner for review.</b>" : ""}`, [[{ text: "⚡ View Plans", callback_data: "plans" }, { text: "🏠 Main Menu", callback_data: "menu" }]]);
    await notifyOwner(message, result);
  } catch (error) {
    console.error("AI support error", error);
    await sendMessage(message.chat.id, "I can still help with the menu below, but my live support brain is temporarily unavailable. Please tap Customer Support and try again shortly.", mainKeyboard);
  }
}

function commandFrom(text?: string) {
  return text?.trim().split(/\s+/)[0].toLowerCase().split("@")[0] || "";
}

const copy = {
  menu:
    "<b>⚡ DARTH ALGO CONTROL CENTER</b>\n\nChoose what you need below. I can take you directly to a plan, guide your TradingView setup, route support questions, or help with community resources.\n\n<i>Educational purposes only—not financial advice. Trading involves risk.</i>",
  plans:
    "<b>⚡ CHOOSE YOUR DARTH ALGO PLAN</b>\n\n🎯 <b>Scalper — $18.99/month</b>\nFast signals for active intraday sessions.\n\n📈 <b>Swing — 2 days free, then $14.99/month</b>\nBroader trend-following signals. Cancel anytime.\n\n🔥 <b>Pro — $29/month</b>\nScalper + Swing in one complete workflow.\n\n👑 <b>Lifetime — $134.99 one time</b>\nComplete suite, future updates, source code, and commercial-use rights.\n\nEnter your exact TradingView username at checkout. Access is normally activated within 24 hours.",
  setup:
    "<b>🛠 INDICATOR SETUP</b>\n\n1. Choose a plan and enter your exact TradingView username at checkout.\n2. Wait for invite-only access—normally within 24 hours.\n3. Open TradingView.\n4. Select <b>Indicators → Invite-only Scripts</b>.\n5. Add your Darth Algo indicator to the chart.\n\nIf it does not appear, refresh TradingView and verify your username spelling. Never share passwords, login codes, or payment information.",
  support:
    "<b>🆘 CUSTOMER SUPPORT</b>\n\nSend a short description containing:\n• Your indicator or plan\n• Mobile or desktop\n• What you expected\n• What happened instead\n• A screenshot with private information hidden\n\nNever post passwords, payment details, Telegram codes, full order numbers, or private account information.",
  wins:
    "<b>🏆 SUBMIT A WIN</b>\n\nShare your result in the Results & Wins community topic. Include the Darth Algo tool, market, timeframe, and a short factual recap. Hide account numbers and private details.\n\nPosting allows community discussion only. Darth Algo will ask separately before using any result as a testimonial.",
  rules:
    "<b>📌 COMMUNITY RULES</b>\n\n• Be respectful and useful.\n• No spam, scams, unsolicited DMs, or outside promotions.\n• Never share passwords, login codes, or payment information.\n• No guaranteed-profit claims or account-management offers.\n• Results are not guaranteed. Trading involves risk.\n• All content is educational and is not financial advice.",
};

async function handleAction(chatId: number, action: string) {
  switch (action) {
    case "plans":
      return sendMessage(chatId, copy.plans, plansKeyboard);
    case "scalper":
      return sendMessage(chatId, "<b>🎯 Darth Algo Scalper</b>\n\n$18.99/month for active intraday setups.", [[{ text: "Buy Scalper", url: CHECKOUT.scalper }], [{ text: "⬅️ All Plans", callback_data: "plans" }]]);
    case "swing":
      return sendMessage(chatId, "<b>📈 Darth Algo Swing</b>\n\nTry it free for 2 days, then $14.99/month. Cancel anytime.", [[{ text: "Start Free Trial", url: CHECKOUT.swing }], [{ text: "⬅️ All Plans", callback_data: "plans" }]]);
    case "pro":
      return sendMessage(chatId, "<b>🔥 Darth Algo Pro</b>\n\nScalper + Swing together for $29/month.", [[{ text: "Buy Pro", url: CHECKOUT.pro }], [{ text: "⬅️ All Plans", callback_data: "plans" }]]);
    case "lifetime":
      return sendMessage(chatId, "<b>👑 Darth Algo Lifetime</b>\n\nOwn the complete suite for $134.99 one time.", [[{ text: "Buy Lifetime", url: CHECKOUT.lifetime }], [{ text: "⬅️ All Plans", callback_data: "plans" }]]);
    case "setup":
      return sendMessage(chatId, copy.setup, [[{ text: "View Plans", url: PRICING_URL }], [{ text: "🆘 Still Need Help", callback_data: "support" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]]);
    case "support":
      return sendMessage(chatId, copy.support, [[{ text: "👥 Open Community", url: COMMUNITY_URL }], [{ text: "🛠 Setup Guide", callback_data: "setup" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]]);
    case "wins":
      return sendMessage(chatId, copy.wins, [[{ text: "👥 Open Community", url: COMMUNITY_URL }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]]);
    case "affiliate":
      return sendMessage(chatId, "<b>💸 DARTH ALGO AFFILIATE PROGRAM</b>\n\nApply to promote Darth Algo and earn tracked commissions.", [[{ text: "Apply Now", url: AFFILIATE_URL }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]]);
    case "rules":
      return sendMessage(chatId, copy.rules, [[{ text: "⬅️ Main Menu", callback_data: "menu" }]]);
    case "menu":
    default:
      return sendMessage(chatId, copy.menu, mainKeyboard);
  }
}

async function handleOwnerCommand(message: TelegramMessage) {
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId || String(message.from?.id) !== ownerId) return false;

  const text = message.text?.trim() || "";
  if (text.startsWith("/announce ")) {
    const destination = process.env.TELEGRAM_CHANNEL_ID;
    if (!destination) {
      await sendMessage(message.chat.id, "TELEGRAM_CHANNEL_ID is not configured.");
      return true;
    }
    await sendMessage(destination, text.slice(10));
    await sendMessage(message.chat.id, "✅ Announcement published.");
    return true;
  }

  if (commandFrom(text) === "/status") {
    const aiConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
    await sendMessage(message.chat.id, `✅ D.A. Assistant is online.\n\nAI support: ${aiConfigured ? "configured" : "waiting for AI authentication"}\nCurrent briefing batch: ${pendingBriefing.length}`);
    return true;
  }

  if (commandFrom(text) === "/briefing") {
    await sendMessage(message.chat.id, briefingText(pendingBriefing));
    pendingBriefing.length = 0;
    return true;
  }

  if (text.startsWith("/reply ")) {
    const match = text.match(/^\/reply\s+(\d+)\s+([\s\S]+)/);
    if (!match) {
      await sendMessage(message.chat.id, "Use: <code>/reply USER_ID your message</code>");
      return true;
    }
    await sendMessage(match[1], `<b>Message from the Darth Algo owner:</b>\n\n${escapeHtml(match[2])}`);
    await sendMessage(message.chat.id, "✅ Reply delivered through D.A. Assistant.");
    return true;
  }
  return false;
}

async function handleMessage(message: TelegramMessage) {
  if (message.new_chat_members?.length) {
    const names = message.new_chat_members.map((member) => member.first_name || "trader").join(", ");
    await sendMessage(message.chat.id, `<b>👋 Welcome, ${names}!</b>\n\nStart with the buttons below. D.A. Assistant can guide you to plans, setup, support, rules, and community resources.`, mainKeyboard);
  }

  if (await handleOwnerCommand(message)) return;

  const command = commandFrom(message.text);
  const actionByCommand: Record<string, string> = {
    "/start": "menu",
    "/help": "menu",
    "/plans": "plans",
    "/access": "plans",
    "/indicators": "plans",
    "/scalper": "scalper",
    "/swing": "swing",
    "/pro": "pro",
    "/lifetime": "lifetime",
    "/setup": "setup",
    "/support": "support",
    "/wins": "wins",
    "/affiliate": "affiliate",
    "/rules": "rules",
  };

  if (actionByCommand[command]) {
    await handleAction(message.chat.id, actionByCommand[command]);
    return;
  }

  const text = message.text?.trim();
  if (!text || text.startsWith("/")) return;

  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || "DarthAlgoAssistantBot").toLowerCase();
  const isPrivate = message.chat.type === "private";
  const addressesBot = text.toLowerCase().includes(`@${botUsername}`) ||
    message.reply_to_message?.from?.username?.toLowerCase() === botUsername;
  if (isPrivate || addressesBot) await handleSupportQuestion(message);
}

async function handleCallback(query: TelegramCallbackQuery) {
  await telegram("answerCallbackQuery", { callback_query_id: query.id });
  if (query.message?.chat.id && query.data) {
    await handleAction(query.message.chat.id, query.data);
  }
}

export async function GET() {
  return Response.json({ ok: true, service: "darth-algo-telegram-assistant" });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    if (update.callback_query) await handleCallback(update.callback_query);
    if (update.message) await handleMessage(update.message);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
