import { configureEducationDestination, publishEducationPost } from "../../../lib/community-education";
import { growthSources, saveGrowthInvite, sourceFromInvite, trackGrowthEvent } from "../../../lib/growth-db";

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
  message_thread_id?: number;
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

type TelegramChatMemberUpdated = {
  chat: TelegramChat;
  from: TelegramUser;
  old_chat_member: { status: string; user: TelegramUser };
  new_chat_member: { status: string; user: TelegramUser };
  invite_link?: { invite_link?: string; name?: string };
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  chat_member?: TelegramChatMemberUpdated;
};

type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

const SITE_URL = "https://www.darthalgo.com";
const PRICING_URL = `${SITE_URL}/#pricing`;
const COMMUNITY_URL = process.env.TELEGRAM_COMMUNITY_URL || SITE_URL;
const AFFILIATE_URL = "https://www.darthalgo.com/affiliates";
const AFFILIATE_DASHBOARD_URL = "https://www.darthalgo.com/affiliate-dashboard";

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
  [{ text: "🧭 Find My Plan", callback_data: "plan_finder" }, { text: "⚡ View All Plans", callback_data: "plans" }],
  [{ text: "🚀 5-Minute Quick Start", callback_data: "quickstart" }, { text: "🛠 Setup Help", callback_data: "setup" }],
  [{ text: "❓ FAQ", callback_data: "faq" }, { text: "🆘 Customer Support", callback_data: "support" }],
  [{ text: "🏆 Submit a Win", callback_data: "wins" }, { text: "💸 Affiliate Program", callback_data: "affiliate" }],
  [{ text: "📌 Community Rules", callback_data: "rules" }, { text: "👥 Join Community", url: COMMUNITY_URL }],
];

const planFinderKeyboard: InlineKeyboardButton[][] = [
  [{ text: "⚡ Fast Intraday Trades", callback_data: "recommend_scalper" }, { text: "📈 Swing Trades", callback_data: "recommend_swing" }],
  [{ text: "🔥 I Want Both", callback_data: "recommend_pro" }, { text: "👑 Lifetime Access", callback_data: "recommend_lifetime" }],
  [{ text: "🤔 Help Me Decide", callback_data: "support" }],
  [{ text: "⬅️ Main Menu", callback_data: "menu" }],
];

const faqKeyboard: InlineKeyboardButton[][] = [
  [{ text: "🔓 Access Time", callback_data: "faq_access" }, { text: "📱 Devices", callback_data: "faq_devices" }],
  [{ text: "🧾 Billing", callback_data: "faq_billing" }, { text: "🔍 Indicator Missing", callback_data: "faq_missing" }],
  [{ text: "🧑‍💼 Ask the Owner", callback_data: "owner_help" }, { text: "⬅️ Main Menu", callback_data: "menu" }],
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

  const result = (await response.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} failed`);
  }
  return result;
}

async function createGrowthInviteLinks(chatId: number) {
  const created: string[] = [];
  for (const source of growthSources) {
    const result = await telegram("createChatInviteLink", {
      chat_id: chatId,
      name: `Darth Algo — ${source}`.slice(0, 32),
    }) as { result?: { invite_link?: string } };
    const inviteLink = result.result?.invite_link;
    if (!inviteLink) throw new Error(`Telegram did not return an invite for ${source}`);
    await saveGrowthInvite(source, inviteLink);
    created.push(source);
  }
  return created;
}

async function sendMessage(
  chatId: number | string,
  text: string,
  keyboard?: InlineKeyboardButton[][],
  messageThreadId?: number,
) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

async function sendPhoto(
  chatId: number | string,
  photo: string,
  caption: string,
  keyboard?: InlineKeyboardButton[][],
  messageThreadId?: number,
) {
  return telegram("sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
    ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

const postMessage = sendMessage;

async function editInteractiveMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboardButton[][],
) {
  try {
    return await telegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("message is not modified")) return { ok: true };
    throw error;
  }
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
    await sendMessage(message.chat.id, `<b><u>🤖 D.A. ASSISTANT</u></b>\n\n${escapeHtml(result.answer)}${result.resolution === "needs_owner" ? "\n\n<b>I've sent this to the Darth Algo owner for review.</b>" : ""}`, [[{ text: "⚡ View Plans", callback_data: "plans" }, { text: "🏠 Main Menu", callback_data: "menu" }]], message.message_thread_id);
    await notifyOwner(message, result);
  } catch (error) {
    console.error("AI support error", error);
    await sendMessage(message.chat.id, "<b><u>🤖 D.A. ASSISTANT</u></b>\n\nI can still help with the menu below, but my live support brain is temporarily unavailable. Please tap Customer Support and try again shortly.", mainKeyboard, message.message_thread_id);
  }
}

function commandFrom(text?: string) {
  return text?.trim().split(/\s+/)[0].toLowerCase().split("@")[0] || "";
}

function isHighConfidenceSpam(text: string) {
  const normalized = text.toLowerCase();
  const credentialScam = /(send|share|verify|give).{0,30}(password|seed phrase|recovery phrase|telegram code|login code|private key)/i.test(normalized);
  const guaranteedPitch = /(guaranteed|risk[- ]?free).{0,30}(profit|returns?|payout)/i.test(normalized);
  const unsolicitedPromotion = /(dm me|message me|contact me).{0,80}(signals?|account management|investment|crypto recovery)/i.test(normalized);
  const outsideInvite = /t\.me\/[a-z0-9_+/-]+/i.test(normalized) && !normalized.includes("darthalgo");
  return credentialScam || guaranteedPitch || unsolicitedPromotion || outsideInvite;
}

const copy = {
  menu:
    "<b><u>⚡ DARTH ALGO CONTROL CENTER ⚡</u></b>\n\n<b>Fast answers. Direct access. Zero confusion.</b>\n\nChoose what you need below and D.A. Assistant will take you there.\n\n<i>Educational purposes only—not financial advice. Trading involves risk.</i>",
  plans:
    "<b><u>⚡ CHOOSE YOUR DARTH ALGO PLAN ⚡</u></b>\n\n🎯 <b>SCALPER — $18.99/MONTH</b>\nFast signals for active intraday sessions.\n\n📈 <b>SWING — 2 DAYS FREE</b>\nThen $14.99/month. Cancel anytime.\n\n🔥 <b>PRO — $29/MONTH</b>\nScalper + Swing in one complete workflow.\n\n👑 <b>LIFETIME — $134.99 ONE TIME</b>\nComplete suite, future updates, source code, and commercial-use rights.\n\n<b>Next step:</b> Enter your exact TradingView username at checkout. Access is normally activated within 24 hours.",
  setup:
    "<b><u>🛠 INDICATOR SETUP</u></b>\n\n1️⃣ Choose a plan and enter your exact TradingView username at checkout.\n2️⃣ Wait for invite-only access—normally within 24 hours.\n3️⃣ Open TradingView.\n4️⃣ Select <b>Indicators → Invite-only Scripts</b>.\n5️⃣ Add your Darth Algo indicator to the chart.\n\nIf it does not appear, refresh TradingView and verify your username spelling. Never share passwords, login codes, or payment information.",
  support:
    "<b><u>🆘 CUSTOMER SUPPORT</u></b>\n\nSend a short description containing:\n• Your indicator or plan\n• Mobile or desktop\n• What you expected\n• What happened instead\n• A screenshot with private information hidden\n\nNever post passwords, payment details, Telegram codes, full order numbers, or private account information.",
  planFinder:
    "<b><u>🧭 FIND YOUR BEST DARTH ALGO PLAN</u></b>\n\nChoose the option that best matches how you trade. D.A. Assistant will recommend the simplest fit and give you a direct checkout button.",
  quickstart:
    "<b><u>🚀 YOUR 5-MINUTE QUICK START</u></b>\n\n1️⃣ Choose your plan.\n2️⃣ Enter your exact TradingView username at checkout.\n3️⃣ Watch for invite-only access—normally within 24 hours.\n4️⃣ Open TradingView → Indicators → Invite-only Scripts.\n5️⃣ Add Darth Algo and review the setup guide before trading.\n\n<b>Important:</b> Start with a simulator or small risk while learning the signals. Educational purposes only—not financial advice.",
  faq:
    "<b><u>❓ DARTH ALGO FAQ</u></b>\n\nTap a question below for a fast answer. If your issue is account-specific or still unresolved, D.A. Assistant can escalate it to the owner.",
  wins:
    "<b><u>🏆 SUBMIT A WIN</u></b>\n\nShare your result in the Results & Wins community topic. Include the Darth Algo tool, market, timeframe, and a short factual recap. Hide account numbers and private details.\n\nPosting allows community discussion only. Darth Algo will ask separately before using any result as a testimonial.",
  rules:
    "<b><u>📌 COMMUNITY RULES</u></b>\n\n✅ Be respectful and useful.\n🚫 No spam, scams, unsolicited DMs, or outside promotions.\n🔒 Never share passwords, login codes, or payment information.\n⚠️ No guaranteed-profit claims or account-management offers.\n📉 Results are not guaranteed. Trading involves risk.\n🎓 All content is educational and is not financial advice.",
  features:
    "<b><u>⚡ DARTH ALGO FEATURES</u></b>\n\n🎯 Clear buy and sell signals\n🧭 Trend and directional guidance\n📍 Structured entry, risk, and target planning\n🔔 TradingView alert support\n📈 Workflows for scalping and swing trading\n\nUse the plan finder to match the tool to your trading style. Signals are educational decision-support—not guarantees.",
};

async function handleAction(chatId: number, action: string, messageThreadId?: number, editMessageId?: number) {
  const sendMessage: typeof postMessage = editMessageId
    ? (targetChatId, text, keyboard) => editInteractiveMessage(targetChatId, editMessageId, text, keyboard)
    : postMessage;
  switch (action) {
    case "plans":
      return sendMessage(chatId, copy.plans, plansKeyboard, messageThreadId);
    case "plan_finder":
      return sendMessage(chatId, copy.planFinder, planFinderKeyboard, messageThreadId);
    case "recommend_scalper":
      return sendMessage(chatId, "<b><u>🎯 YOUR BEST FIT: SCALPER</u></b>\n\nFor active intraday traders who want faster-market setups. <b>$18.99/month.</b>", [[{ text: "🎯 Buy Scalper", url: CHECKOUT.scalper }], [{ text: "🔄 Try Again", callback_data: "plan_finder" }]], messageThreadId);
    case "recommend_swing":
      return sendMessage(chatId, "<b><u>📈 YOUR BEST FIT: SWING</u></b>\n\nFor broader directional moves and less frequent setups. <b>2 days free, then $14.99/month.</b>", [[{ text: "📈 Start Swing Trial", url: CHECKOUT.swing }], [{ text: "🔄 Try Again", callback_data: "plan_finder" }]], messageThreadId);
    case "recommend_pro":
      return sendMessage(chatId, "<b><u>🔥 YOUR BEST FIT: PRO</u></b>\n\nFor both Scalper and Swing in one workflow. <b>$29/month.</b>", [[{ text: "🔥 Buy Pro", url: CHECKOUT.pro }], [{ text: "🔄 Try Again", callback_data: "plan_finder" }]], messageThreadId);
    case "recommend_lifetime":
      return sendMessage(chatId, "<b><u>👑 YOUR BEST FIT: LIFETIME</u></b>\n\nThe complete suite without a recurring subscription. <b>$134.99 one time.</b>", [[{ text: "👑 Buy Lifetime", url: CHECKOUT.lifetime }], [{ text: "🔄 Try Again", callback_data: "plan_finder" }]], messageThreadId);
    case "quickstart":
      return sendMessage(chatId, copy.quickstart, [[{ text: "🧭 Find My Plan", callback_data: "plan_finder" }], [{ text: "🛠 Setup Help", callback_data: "setup" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "faq":
      return sendMessage(chatId, copy.faq, faqKeyboard, messageThreadId);
    case "faq_access":
      return sendMessage(chatId, "<b><u>🔓 WHEN WILL I GET ACCESS?</u></b>\n\nInvite-only access is normally activated within 24 hours. Make sure your TradingView username is exact. If 24 hours have passed, contact support for owner review.", [[{ text: "🆘 Contact Support", callback_data: "support" }, { text: "⬅️ FAQ", callback_data: "faq" }]], messageThreadId);
    case "faq_devices":
      return sendMessage(chatId, "<b><u>📱 MOBILE AND DESKTOP</u></b>\n\nDarth Algo runs inside TradingView. Use the same TradingView account on supported mobile or desktop devices. Initial chart setup is usually easier on desktop.", [[{ text: "🛠 Setup Guide", callback_data: "setup" }, { text: "⬅️ FAQ", callback_data: "faq" }]], messageThreadId);
    case "faq_billing":
      return sendMessage(chatId, "<b><u>🧾 BILLING QUESTIONS</u></b>\n\nNever post payment details publicly. Refunds, disputes, cancellation problems, and payment verification require owner review.", [[{ text: "🧑‍💼 Ask the Owner", callback_data: "owner_help" }, { text: "⬅️ FAQ", callback_data: "faq" }]], messageThreadId);
    case "faq_missing":
      return sendMessage(chatId, "<b><u>🔍 INDICATOR MISSING</u></b>\n\n1️⃣ Verify your TradingView username.\n2️⃣ Wait up to 24 hours.\n3️⃣ Refresh TradingView.\n4️⃣ Open Indicators → Invite-only Scripts.\n5️⃣ Contact support if it is still missing.", [[{ text: "🆘 Contact Support", callback_data: "support" }, { text: "⬅️ FAQ", callback_data: "faq" }]], messageThreadId);
    case "scalper":
      return sendMessage(chatId, "<b><u>🎯 DARTH ALGO SCALPER</u></b>\n\n$18.99/month for active intraday setups.", [[{ text: "Buy Scalper", url: CHECKOUT.scalper }], [{ text: "⬅️ All Plans", callback_data: "plans" }]], messageThreadId);
    case "swing":
      return sendMessage(chatId, "<b><u>📈 DARTH ALGO SWING</u></b>\n\nTry it free for 2 days, then $14.99/month. Cancel anytime.", [[{ text: "Start Free Trial", url: CHECKOUT.swing }], [{ text: "⬅️ All Plans", callback_data: "plans" }]], messageThreadId);
    case "pro":
      return sendMessage(chatId, "<b><u>🔥 DARTH ALGO PRO</u></b>\n\nScalper + Swing together for $29/month.", [[{ text: "Buy Pro", url: CHECKOUT.pro }], [{ text: "⬅️ All Plans", callback_data: "plans" }]], messageThreadId);
    case "lifetime":
      return sendMessage(chatId, "<b><u>👑 DARTH ALGO LIFETIME</u></b>\n\nOwn the complete suite for $134.99 one time.", [[{ text: "Buy Lifetime", url: CHECKOUT.lifetime }], [{ text: "⬅️ All Plans", callback_data: "plans" }]], messageThreadId);
    case "setup":
      return sendMessage(chatId, copy.setup, [[{ text: "View Plans", url: PRICING_URL }], [{ text: "🆘 Still Need Help", callback_data: "support" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "support":
      return sendMessage(chatId, copy.support, [[{ text: "🧑‍💼 Ask the Owner", callback_data: "owner_help" }], [{ text: "🛠 Setup Guide", callback_data: "setup" }, { text: "❓ FAQ", callback_data: "faq" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "owner_help":
      return sendMessage(chatId, "<b><u>🧑‍💼 OWNER ESCALATION</u></b>\n\nSend D.A. Assistant one clear private message describing what you need. Include your plan and TradingView username only if relevant. Never send passwords, login codes, card details, or Telegram verification codes. Your request will be summarized for the Darth Algo owner.", [[{ text: "🤖 Message D.A. Assistant", url: "https://t.me/DarthAlgoAssistantBot" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "wins":
      return sendMessage(chatId, copy.wins, [[{ text: "👥 Open Community", url: COMMUNITY_URL }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "affiliate":
      return sendMessage(chatId, "<b><u>💸 DARTH ALGO CREATOR AFFILIATE PROGRAM</u></b>\n\nEarn <b>25% commission</b> on each new customer's first paid purchase using your personal code. Renewals do not earn additional commission. Your audience receives <b>10% off</b>.\n\n✅ New customers and commissions tracked automatically\n✅ Private earnings dashboard\n✅ Monthly payouts after a 30-day hold\n✅ Direct support from the Darth Algo team\n\nThe application takes about two minutes. You only need your name, email, social handle, preferred promo code, and dashboard login.", [[{ text: "🚀 Apply to Become an Affiliate", url: AFFILIATE_URL }], [{ text: "📊 Creator Earnings Dashboard", url: AFFILIATE_DASHBOARD_URL }], [{ text: "🆘 Affiliate Help", callback_data: "support" }, { text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "rules":
      return sendMessage(chatId, copy.rules, [[{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "features":
      return sendMessage(chatId, copy.features, [[{ text: "🧭 Find My Plan", callback_data: "plan_finder" }, { text: "⚡ View Plans", callback_data: "plans" }], [{ text: "⬅️ Main Menu", callback_data: "menu" }]], messageThreadId);
    case "menu":
    default:
      return sendMessage(chatId, copy.menu, mainKeyboard, messageThreadId);
  }
}

async function handleOwnerCommand(message: TelegramMessage) {
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId || String(message.from?.id) !== ownerId) return false;

  const text = message.text?.trim() || "";
  const command = commandFrom(text);

  if (command === "/seteducation") {
    if (!message.message_thread_id) {
      await sendMessage(message.chat.id, "Run this command inside the Trading Education topic.");
      return true;
    }
    await configureEducationDestination(message.chat.id, message.message_thread_id);
    await publishEducationPost({ force: true });
    return true;
  }

  if (command === "/publishsetup") {
    await sendPhoto(
      message.chat.id,
      `${SITE_URL}/api/community/setup-card`,
      "<b><u>INDICATOR SETUP — PURCHASE TO CHART</u></b>\n\n1. Choose a plan at darthalgo.com/#pricing.\n2. Enter your exact TradingView username at checkout.\n3. Wait for invite-only access—normally within 24 hours.\n4. Open TradingView and select Indicators.\n5. Open Invite-only Scripts and add your Darth Algo indicator.\n6. Begin in paper trading while learning the signals.\n\nNever share passwords or login codes. Educational purposes only; trading involves risk.",
      [[{ text: "Choose Your Indicator", url: PRICING_URL }], [{ text: "Open TradingView", url: "https://www.tradingview.com/chart/" }], [{ text: "Message D.A. Assistant", url: "https://t.me/DarthAlgoAssistantBot" }]],
      message.message_thread_id,
    );
    return true;
  }

  if (command === "/setupgrowth") {
    const sources = await createGrowthInviteLinks(message.chat.id);
    await sendMessage(message.chat.id, `<b>✅ COMMUNITY GROWTH TRACKING IS LIVE</b>\n\n${sources.length} source-specific invitation routes were created. New verified joins will now appear in the private growth dashboard.`, undefined, message.message_thread_id);
    return true;
  }

  if (command === "/launch") {
    await sendMessage(message.chat.id, "<b><u>🚀 DARTH ALGO COMMUNITY IS OPEN</u></b>\n\nThe official Darth Algo community is ready for traders who want cleaner chart structure, indicator setup support, futures education, product updates, and a place to learn with other members.\n\n<b>What happens here:</b>\n• Product and indicator updates\n• New setup guides and tutorials\n• Futures education drops every 72 hours\n• Community events and important maintenance notices\n\nTurn on notifications for this topic so you do not miss important updates. Educational purposes only—not financial advice. Trading involves risk.", [[{ text: "⚡ View Indicator Plans", url: PRICING_URL }], [{ text: "🤖 Message D.A. Assistant", url: "https://t.me/DarthAlgoAssistantBot" }]], message.message_thread_id);
    return true;
  }

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
    await sendMessage(message.chat.id, `<b><u>⚡ WELCOME TO DARTH ALGO ⚡</u></b>\n\n👋 Welcome, <b>${escapeHtml(names)}</b>!\n\nYou are now inside the official community for traders using—or exploring—the Darth Algo indicator suite.\n\n<b><u>START HERE</u></b>\n1️⃣ Compare the indicator plans\n2️⃣ Get TradingView setup help\n3️⃣ Ask D.A. Assistant a question\n4️⃣ Share results and learn with the community\n\n<b>Need help?</b> Mention <b>@DarthAlgoAssistantBot</b> in any topic.\n\n<i>Educational purposes only. Trading involves risk.</i>`, mainKeyboard, message.message_thread_id);
  }

  if (await handleOwnerCommand(message)) return;

  const command = commandFrom(message.text);
  const actionByCommand: Record<string, string> = {
    "/start": "menu",
    "/help": "menu",
    "/plans": "plans",
    "/findplan": "plan_finder",
    "/quickstart": "quickstart",
    "/faq": "faq",
    "/owner": "owner_help",
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
    "/features": "features",
  };

  if (actionByCommand[command]) {
    await handleAction(message.chat.id, actionByCommand[command], message.message_thread_id);
    return;
  }

  const text = message.text?.trim();
  if (!text || text.startsWith("/")) return;

  if (message.chat.type !== "private" && message.from && isHighConfidenceSpam(text)) {
    try {
      await telegram("deleteMessage", { chat_id: message.chat.id, message_id: message.message_id });
      await sendMessage(message.chat.id, "<b>🛡 D.A. Assistant removed a high-risk spam or scam message.</b>\n\nNever trust guaranteed-profit claims, credential requests, seed-phrase requests, or unsolicited promotions.", undefined, message.message_thread_id);
      return;
    } catch (error) {
      console.error("Anti-spam moderation error", error);
    }
  }

  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || "DarthAlgoAssistantBot").toLowerCase();
  const isPrivate = message.chat.type === "private";
  const addressesBot = text.toLowerCase().includes(`@${botUsername}`) ||
    message.reply_to_message?.from?.username?.toLowerCase() === botUsername;
  if (isPrivate || addressesBot) await handleSupportQuestion(message);
}

async function handleCallback(query: TelegramCallbackQuery) {
  await telegram("answerCallbackQuery", { callback_query_id: query.id });
  if (query.message?.chat.id && query.data) {
    await handleAction(query.message.chat.id, query.data, query.message.message_thread_id, query.message.message_id);
  }
}

async function handleChatMember(update: TelegramChatMemberUpdated) {
  const wasMember = ["member", "administrator", "creator"].includes(update.old_chat_member.status);
  const isMember = ["member", "administrator", "creator"].includes(update.new_chat_member.status);
  if (wasMember || !isMember) return;
  const source = await sourceFromInvite(update.invite_link?.invite_link);
  await trackGrowthEvent({
    eventType: "telegram_join",
    source,
    campaign: "telegram-invite",
    telegramUserId: update.new_chat_member.user.id,
  });
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
    if (update.chat_member) await handleChatMember(update.chat_member);
    if (update.message) await handleMessage(update.message);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
