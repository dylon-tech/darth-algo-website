import { randomUUID } from "crypto";
import { db } from "./affiliate-db";

export type FuturesQuote = {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
};

export type EducationPost = {
  id: string;
  created_at: Date;
  title: string;
  market: string;
  bullets: string[];
  chart_focus: string;
  market_snapshot: FuturesQuote[];
};

const SITE_URL = "https://www.darthalgo.com";
const MARKET_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const lessons = [
  {
    market: "ES & NQ",
    title: "Trend Day or Choppy Session?",
    bullets: [
      "Mark the overnight high, overnight low, and prior-day close before the opening bell.",
      "Repeated closes on one side of VWAP can support trend continuation; constant VWAP crosses often signal chop.",
      "If conditions are unclear, reduce size and wait for structure instead of forcing a trade.",
    ],
    chartFocus: "Compare price location with VWAP and the overnight range.",
  },
  {
    market: "ES",
    title: "Build the Trade Around Invalidation",
    bullets: [
      "Choose the price level that proves your trade idea wrong before choosing position size.",
      "Calculate size from the stop distance and the maximum dollars you are willing to risk.",
      "A strong signal does not remove risk; it only gives you a structured reason to enter.",
    ],
    chartFocus: "Mark entry, invalidation, and target before placing the order.",
  },
  {
    market: "NQ",
    title: "Respect Volatility Expansion",
    bullets: [
      "NQ can move quickly when major technology stocks or economic releases shift expectations.",
      "Wider candles require smaller size if you want to keep the same dollar risk.",
      "Avoid chasing an extended candle; wait for a pullback, base, or clear continuation structure.",
    ],
    chartFocus: "Compare current candle ranges with the prior five sessions.",
  },
  {
    market: "GC & CL",
    title: "Know the Catalyst Before the Setup",
    bullets: [
      "Gold often reacts to the dollar, yields, inflation expectations, and risk sentiment.",
      "Crude oil can react sharply to inventory data, supply headlines, and geopolitical news.",
      "Check the economic calendar before entering so a scheduled release does not surprise you.",
    ],
    chartFocus: "Note the next scheduled catalyst beside your key price levels.",
  },
  {
    market: "All Futures",
    title: "Use Higher-Timeframe Context",
    bullets: [
      "Start with the daily and hourly trend before dropping to your execution timeframe.",
      "A lower-timeframe signal is stronger when it agrees with important higher-timeframe structure.",
      "When timeframes conflict, expect more failed breakouts and manage risk accordingly.",
    ],
    chartFocus: "Review daily, hourly, and execution charts in that order.",
  },
  {
    market: "All Futures",
    title: "Separate a Breakout From a Fakeout",
    bullets: [
      "A breakout should gain acceptance beyond the level, not only wick through it.",
      "Watch for follow-through, retests, and volume instead of entering only because price touched a level.",
      "If price immediately returns inside the range, treat the breakout as unconfirmed.",
    ],
    chartFocus: "Mark the range edge and wait for acceptance or a confirmed retest.",
  },
];

let communitySchemaReady: Promise<void> | undefined;

export function ensureCommunityEducationSchema() {
  communitySchemaReady ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists community_settings (
        key text primary key,
        value text not null,
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists community_education_posts (
        id uuid primary key,
        created_at timestamptz not null default now(),
        posted_at timestamptz,
        status text not null default 'pending' check (status in ('pending','posted','failed')),
        title text not null,
        market text not null,
        bullets text[] not null,
        chart_focus text not null,
        market_snapshot jsonb not null default '[]'::jsonb,
        telegram_message_id text
      )
    `;
    await sql`create index if not exists community_education_posts_posted_at_idx on community_education_posts(posted_at desc)`;
  })();
  return communitySchemaReady;
}

async function quote(symbol: string, label: string): Promise<FuturesQuote> {
  try {
    const response = await fetch(`${MARKET_URL}/${encodeURIComponent(symbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": "DarthAlgo-Education/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Market data returned ${response.status}`);
    const payload = await response.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }> } };
    const meta = payload.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const previous = meta?.chartPreviousClose ?? meta?.previousClose;
    return {
      symbol,
      label,
      price: typeof price === "number" ? price : null,
      changePercent: typeof price === "number" && typeof previous === "number" && previous !== 0
        ? ((price - previous) / previous) * 100
        : null,
    };
  } catch {
    return { symbol, label, price: null, changePercent: null };
  }
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await response.json() as { ok: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram ${method} failed`);
  return result;
}

export async function configureEducationDestination(chatId: number, threadId: number) {
  await ensureCommunityEducationSchema();
  const sql = db();
  await sql`insert into community_settings(key,value) values('education_chat_id',${String(chatId)}) on conflict(key) do update set value=excluded.value,updated_at=now()`;
  await sql`insert into community_settings(key,value) values('education_thread_id',${String(threadId)}) on conflict(key) do update set value=excluded.value,updated_at=now()`;
}

export async function getEducationPost(id: string) {
  await ensureCommunityEducationSchema();
  const [post] = await db()<EducationPost[]>`select id,created_at,title,market,bullets,chart_focus,market_snapshot from community_education_posts where id=${id}`;
  return post || null;
}

export async function publishEducationPost(options: { force?: boolean } = {}) {
  await ensureCommunityEducationSchema();
  const sql = db();
  if (!options.force) {
    const [recent] = await sql`select id from community_education_posts where status='posted' and posted_at>now()-interval '72 hours' limit 1`;
    if (recent) return { posted: false, reason: "not_due" } as const;
  }

  const settings = await sql`select key,value from community_settings where key in ('education_chat_id','education_thread_id')`;
  const values = new Map(settings.map((row) => [String(row.key), String(row.value)]));
  const chatId = values.get("education_chat_id");
  const threadId = values.get("education_thread_id");
  if (!chatId || !threadId) throw new Error("Trading Education topic is not configured");

  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from community_education_posts where status='posted'`;
  const lesson = lessons[Number(count) % lessons.length];
  const marketSnapshot = await Promise.all([
    quote("ES=F", "S&P 500"),
    quote("NQ=F", "Nasdaq 100"),
    quote("GC=F", "Gold"),
    quote("CL=F", "Crude Oil"),
  ]);
  const id = randomUUID();
  await sql`
    insert into community_education_posts(id,title,market,bullets,chart_focus,market_snapshot)
    values(${id},${lesson.title},${lesson.market},${lesson.bullets},${lesson.chartFocus},${sql.json(marketSnapshot)})
  `;

  try {
    const result = await telegram("sendPhoto", {
      chat_id: chatId,
      message_thread_id: Number(threadId),
      photo: `${SITE_URL}/api/community/education-card/${id}`,
      caption: `<b><u>FUTURES EDUCATION DROP</u></b>\n\n<b>${lesson.title}</b>\n${lesson.chartFocus}\n\nMarket figures in the graphic may be delayed. Verify prices on your live chart. Educational purposes only—not financial advice. Trading involves risk.`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Open TradingView", url: "https://www.tradingview.com/chart/" }], [{ text: "View Darth Algo Plans", url: `${SITE_URL}/#pricing` }]] },
    });
    const messageId = result.result?.message_id;
    await sql`update community_education_posts set status='posted',posted_at=now(),telegram_message_id=${messageId ? String(messageId) : null} where id=${id}`;
    return { posted: true, id, messageId } as const;
  } catch (error) {
    await sql`update community_education_posts set status='failed' where id=${id}`;
    throw error;
  }
}
