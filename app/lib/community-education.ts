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

export async function getEducationCardData(index: number) {
  const lesson = lessons[((index % lessons.length) + lessons.length) % lessons.length];
  const marketSnapshot = await Promise.all([
    quote("ES=F", "S&P 500"),
    quote("NQ=F", "Nasdaq 100"),
    quote("GC=F", "Gold"),
    quote("CL=F", "Crude Oil"),
  ]);
  return { lesson, marketSnapshot, createdAt: new Date() };
}

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

// Owner replaced scheduled lessons with a preview of the confirmed social post.
// Keep the legacy entry point so /seteducation also follows the current policy.
export async function publishEducationPost(_options: { force?: boolean } = {}) {
  void _options; // Legacy callers cannot bypass the once-daily preview guard.
  const {publishCommunityPreview}=await import("./business-os/community-social");
  return publishCommunityPreview();
}
