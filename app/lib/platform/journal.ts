import type { PaperTrade } from "./engine";

export const PAPER_STARTING_BALANCE = 50_000;
export const MAX_JOURNAL_TRADES = 500;
export const MAX_BACKUP_BYTES = 2_000_000;
export type JournalMarket = {
  code: string;
  type: string;
  tick: number;
  pointValue: number;
};
export type JournalState = {
  completed: string[];
  saved: string[];
  trades: PaperTrade[];
};
export type JournalBackup = {
  format: "darth-algo-paper-journal";
  version: 2;
  startingBalance: number;
  exportedAt: string;
  data: JournalState;
};
const emptyState = (): JournalState => ({
  completed: [],
  saved: [],
  trades: [],
});
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function timestamp(value: unknown, name: string, now: number) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)
  )
    throw new Error(`${name} must be a UTC timestamp.`);
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < 0 || time > now + 60_000)
    throw new Error(`${name} is invalid or in the future.`);
  const normalized = new Date(time).toISOString();
  if (
    normalized !== (value.length === 20 ? value.slice(0, -1) + ".000Z" : value)
  )
    throw new Error(`${name} is not a valid calendar timestamp.`);
  return normalized;
}
function positive(value: unknown, name: string, zero = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value > 1e12 ||
    (zero ? value < 0 : value <= 0)
  )
    throw new Error(
      `${name} must be a valid ${zero ? "non-negative" : "positive"} number.`,
    );
  return value;
}
export function paperTradePnl(trade: PaperTrade): number | null {
  if (!trade.closedAt || trade.exit === undefined) return null;
  return (
    (trade.exit - trade.entry) *
      (trade.side === "long" ? 1 : -1) *
      trade.quantity *
      trade.pointValue -
    trade.fee
  );
}
export function initialRisk(trade: PaperTrade) {
  return (
    Math.abs(trade.entry - trade.stop) * trade.quantity * trade.pointValue +
    trade.fee
  );
}
export function validateJournalTrade(
  value: unknown,
  catalog: readonly JournalMarket[],
  now = Date.now(),
): PaperTrade {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(value.id)
  )
    throw new Error("A journal trade has an invalid identifier.");
  const market = catalog.find((m) => m.code === value.symbol);
  if (!market) throw new Error("A journal trade has an unsupported market.");
  if (value.side !== "long" && value.side !== "short")
    throw new Error("A journal trade must be long or short.");
  const entry = positive(value.entry, "Entry"),
    stop = positive(value.stop, "Stop"),
    target = positive(value.target, "Target");
  const quantity = positive(value.quantity, "Quantity"),
    fee = positive(value.fee, "Fee", true);
  if (value.pointValue !== market.pointValue)
    throw new Error(`${market.code} has an incorrect dollar value per point.`);
  if (
    value.side === "long"
      ? !(stop < entry && target > entry)
      : !(stop > entry && target < entry)
  )
    throw new Error(
      "A journal trade has a stop or target on the wrong side of entry.",
    );
  if (
    market.type === "Futures" &&
    (!Number.isInteger(quantity) ||
      [entry, stop, target].some(
        (p) => Math.abs(p / market.tick - Math.round(p / market.tick)) > 1e-5,
      ))
  )
    throw new Error(
      `${market.code} requires whole contracts and valid tick increments.`,
    );
  const trade: PaperTrade = {
    id: value.id,
    symbol: market.code,
    side: value.side,
    entry,
    stop,
    target,
    quantity,
    fee,
    pointValue: market.pointValue,
    openedAt: timestamp(value.openedAt, "Opened time", now),
  };
  const hasExit = value.exit !== undefined,
    hasClose = value.closedAt !== undefined;
  if (hasExit !== hasClose)
    throw new Error("A closed trade needs both an exit price and close time.");
  if (hasExit) {
    trade.exit = positive(value.exit, "Exit");
    trade.closedAt = timestamp(value.closedAt, "Closed time", now);
    if (trade.closedAt < trade.openedAt)
      throw new Error("A trade cannot close before it opens.");
    if (
      market.type === "Futures" &&
      Math.abs(
        trade.exit / market.tick - Math.round(trade.exit / market.tick),
      ) > 1e-5
    )
      throw new Error(`${market.code} exit must match its tick increment.`);
    // Stored totals are never trusted. Recalculate from the validated prices and instrument.
    trade.pnl = paperTradePnl(trade)!;
    if (!Number.isFinite(trade.pnl))
      throw new Error("Trade P&L is outside the supported range.");
  } else if (value.pnl !== undefined)
    throw new Error("An open trade cannot contain realized P&L.");
  return trade;
}
function validateState(
  value: unknown,
  catalog: readonly JournalMarket[],
  lessonIds: readonly string[],
  now: number,
): JournalState {
  if (!record(value)) throw new Error("The backup does not contain a journal.");
  const progress = (key: "completed" | "saved") => {
    const list = value[key] ?? [];
    if (
      !Array.isArray(list) ||
      list.length > lessonIds.length ||
      list.some((id) => typeof id !== "string" || !lessonIds.includes(id))
    )
      throw new Error("The backup has unsupported lesson progress.");
    return [...new Set(list)] as string[];
  };
  const rows = value.trades ?? [];
  if (!Array.isArray(rows) || rows.length > MAX_JOURNAL_TRADES)
    throw new Error(`A journal supports up to ${MAX_JOURNAL_TRADES} trades.`);
  const trades = rows.map((row) => validateJournalTrade(row, catalog, now));
  if (new Set(trades.map((t) => t.id)).size !== trades.length)
    throw new Error("The journal contains duplicate trade identifiers.");
  if (trades.filter((t) => !t.closedAt).length > 1)
    throw new Error("A journal can contain only one open paper plan.");
  return { completed: progress("completed"), saved: progress("saved"), trades };
}
export function readJournal(
  raw: string | null,
  catalog: readonly JournalMarket[],
  lessonIds: readonly string[],
  options: { allowLegacy?: boolean; now?: number } = {},
): JournalState {
  if (raw === null) return emptyState();
  if (raw.length > MAX_BACKUP_BYTES)
    throw new Error("The backup is too large (2 MB maximum).");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This is not a valid JSON journal backup.");
  }
  const now = options.now ?? Date.now();
  if (record(parsed) && parsed.format === "darth-algo-paper-journal") {
    if (
      parsed.version !== 2 ||
      parsed.startingBalance !== PAPER_STARTING_BALANCE
    )
      throw new Error(
        "This backup version or starting balance is not supported.",
      );
    timestamp(parsed.exportedAt, "Backup time", now);
    return validateState(parsed.data, catalog, lessonIds, now);
  }
  if (
    options.allowLegacy &&
    record(parsed) &&
    ("trades" in parsed || "completed" in parsed || "saved" in parsed)
  )
    return validateState(parsed, catalog, lessonIds, now);
  throw new Error(
    "Choose a Darth Algo JSON backup exported from this platform.",
  );
}
export function makeBackup(
  state: JournalState,
  now = new Date(),
): JournalBackup {
  return {
    format: "darth-algo-paper-journal",
    version: 2,
    startingBalance: PAPER_STARTING_BALANCE,
    exportedAt: now.toISOString(),
    data: state,
  };
}
export function mergeJournals(
  current: JournalState,
  imported: JournalState,
): JournalState {
  const rows = new Map(current.trades.map((t) => [t.id, t]));
  for (const trade of imported.trades) {
    const existing = rows.get(trade.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(trade))
      throw new Error(
        `Backup conflicts with existing trade ${trade.id}. Your current journal was not changed.`,
      );
    rows.set(trade.id, trade);
  }
  const trades = [...rows.values()];
  if (trades.length > MAX_JOURNAL_TRADES)
    throw new Error(
      `Merging would exceed ${MAX_JOURNAL_TRADES} trades. Your journal was not changed.`,
    );
  if (trades.filter((t) => !t.closedAt).length > 1)
    throw new Error(
      "Close the current paper plan before importing another open plan.",
    );
  return {
    completed: [...new Set([...current.completed, ...imported.completed])],
    saved: [...new Set([...current.saved, ...imported.saved])],
    trades,
  };
}
export type PerformanceFilter = { symbol?: string; days?: number };
export function paperPerformance(
  trades: readonly PaperTrade[],
  filter: PerformanceFilter = {},
  now = Date.now(),
) {
  const cutoff = filter.days ? now - filter.days * 86_400_000 : -Infinity;
  const closed = trades
    .filter(
      (t) =>
        t.closedAt &&
        t.exit !== undefined &&
        (!filter.symbol || t.symbol === filter.symbol) &&
        Date.parse(t.closedAt) >= cutoff &&
        Date.parse(t.closedAt) <= now,
    )
    .slice()
    .sort(
      (a, b) =>
        a.closedAt!.localeCompare(b.closedAt!) || a.id.localeCompare(b.id),
    );
  let net = 0,
    grossProfit = 0,
    grossLoss = 0,
    peak = PAPER_STARTING_BALANCE,
    maxDrawdown = 0,
    maxDrawdownPercent = 0,
    lossStreak = 0,
    maxLossStreak = 0,
    rTotal = 0;
  let wins = 0,
    losses = 0,
    breakeven = 0;
  const equity: { time: string | null; balance: number }[] = [
    { time: null, balance: PAPER_STARTING_BALANCE },
  ];
  for (const trade of closed) {
    const pnl = paperTradePnl(trade)!;
    net += pnl;
    rTotal += pnl / initialRisk(trade);
    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
      lossStreak = 0;
    } else if (pnl < 0) {
      losses++;
      grossLoss -= pnl;
      lossStreak++;
      maxLossStreak = Math.max(maxLossStreak, lossStreak);
    } else {
      breakeven++;
      lossStreak = 0;
    }
    const balance = PAPER_STARTING_BALANCE + net;
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak - balance);
    maxDrawdownPercent = Math.max(
      maxDrawdownPercent,
      ((peak - balance) / peak) * 100,
    );
    equity.push({ time: trade.closedAt!, balance });
  }
  const direction = (side: "long" | "short") => {
    const sample = closed.filter((t) => t.side === side),
      pnls = sample.map((t) => paperTradePnl(t)!);
    return {
      side,
      count: sample.length,
      net: pnls.reduce((a, b) => a + b, 0),
      winRate: sample.length
        ? (pnls.filter((p) => p > 0).length / sample.length) * 100
        : null,
    };
  };
  return {
    count: closed.length,
    wins,
    losses,
    breakeven,
    net,
    grossProfit,
    grossLoss,
    winRate: closed.length ? (wins / closed.length) * 100 : null,
    profitFactor: grossLoss ? grossProfit / grossLoss : null,
    expectancy: closed.length ? net / closed.length : null,
    averageR: closed.length ? rTotal / closed.length : null,
    maxDrawdown,
    maxDrawdownPercent,
    maxLossStreak,
    equity,
    directions: [direction("long"), direction("short")],
  };
}
