import assert from "node:assert/strict";
import { markets } from "../app/lib/platform/engine.ts";
import {
  readJournal,
  makeBackup,
  mergeJournals,
  paperPerformance,
  validateJournalTrade,
} from "../app/lib/platform/journal.ts";
const now = Date.parse("2026-10-30T20:00:00.000Z"),
  lessonIds = ["structure", "risk"];
const make = (id, side, exit, day = 28) => ({
  id,
  symbol: "MGC",
  side,
  entry: 3000,
  stop: side === "long" ? 2990 : 3010,
  target: side === "long" ? 3020 : 2980,
  quantity: 1,
  pointValue: 10,
  fee: 2,
  openedAt: `2026-10-${day}T10:00:00.000Z`,
  ...(exit === undefined
    ? {}
    : { exit, closedAt: `2026-10-${day}T11:00:00.000Z`, pnl: 999999 }),
});
const normalize = (t) => validateJournalTrade(t, markets, now);
const trades = [
  normalize(make("long-win", "long", 3020, 25)),
  normalize(make("long-loss", "long", 2990, 26)),
  normalize(make("short-win", "short", 2990, 27)),
  normalize(make("short-loss", "short", 3010, 28)),
];
assert.deepEqual(
  trades.map((t) => t.pnl),
  [198, -102, 98, -102],
  "Stored P&L must be recomputed",
);
const state = { completed: ["structure"], saved: ["risk"], trades };
const serialized = JSON.stringify(makeBackup(state, new Date(now)));
assert.deepEqual(readJournal(serialized, markets, lessonIds, { now }), state);
assert.deepEqual(
  readJournal(JSON.stringify(state), markets, lessonIds, {
    allowLegacy: true,
    now,
  }),
  state,
  "Existing saved journals must migrate",
);
assert.throws(
  () => readJournal(JSON.stringify(state), markets, lessonIds, { now }),
  /exported/,
  "Imported files need a recognizable version",
);
assert.deepEqual(readJournal(null, markets, lessonIds, { now }), {
  completed: [],
  saved: [],
  trades: [],
});
assert.throws(() => readJournal("{bad}", markets, lessonIds, { now }), /JSON/);
assert.throws(
  () => readJournal("x".repeat(2000001), markets, lessonIds, { now }),
  /large/,
);
assert.throws(
  () =>
    readJournal(
      JSON.stringify({ ...makeBackup(state, new Date(now)), version: 99 }),
      markets,
      lessonIds,
      { now },
    ),
  /version/,
);
for (const change of [
  { pointValue: 100 },
  { side: "up" },
  { quantity: 0.5 },
  { stop: 3010 },
  { entry: 3000.01 },
  { openedAt: "2026-02-31T10:00:00.000Z" },
  { openedAt: "2099-01-01T00:00:00.000Z" },
  { closedAt: "2026-10-24T10:00:00.000Z" },
  { exit: 2999.99 },
  { id: '=HYPERLINK("bad")' },
])
  assert.throws(() =>
    normalize({ ...make("bad", "long", 3020, 25), ...change }),
  );
assert.throws(
  () => normalize({ ...make("open", "long", undefined), pnl: 50 }),
  /open trade/,
);
assert.throws(
  () => normalize({ ...make("bad", "long", 3020), closedAt: undefined }),
  /both/,
);
assert.throws(
  () =>
    readJournal(
      JSON.stringify({ ...state, trades: [trades[0], trades[0]] }),
      markets,
      lessonIds,
      { allowLegacy: true, now },
    ),
  /duplicate/,
);
assert.throws(
  () =>
    readJournal(
      JSON.stringify({
        ...state,
        trades: [make("a", "long", undefined), make("b", "short", undefined)],
      }),
      markets,
      lessonIds,
      { allowLegacy: true, now },
    ),
  /one open/,
);
assert.throws(
  () =>
    readJournal(
      JSON.stringify({ ...state, saved: ["unknown"] }),
      markets,
      lessonIds,
      { allowLegacy: true, now },
    ),
  /lesson/,
);
const merged = mergeJournals(state, {
  completed: ["risk"],
  saved: [],
  trades: [trades[0]],
});
assert.equal(merged.trades.length, 4);
assert.deepEqual(merged.completed, ["structure", "risk"]);
assert.equal(state.trades.length, 4);
assert.throws(
  () =>
    mergeJournals(state, {
      completed: [],
      saved: [],
      trades: [{ ...trades[0], exit: 3021 }],
    }),
  /conflicts/,
);
const stats = paperPerformance([...trades].reverse(), {}, now);
assert.equal(stats.count, 4);
assert.equal(stats.net, 92);
assert.equal(stats.expectancy, 23);
assert.equal(stats.winRate, 50);
assert.equal(stats.grossProfit, 296);
assert.equal(stats.grossLoss, 204);
assert.equal(stats.profitFactor, 296 / 204);
assert.equal(stats.maxDrawdown, 106);
assert.equal(stats.maxLossStreak, 1);
assert.deepEqual(
  stats.equity.map((x) => x.balance),
  [50000, 50198, 50096, 50194, 50092],
);
assert.deepEqual(
  stats.directions.map((x) => [x.count, x.net, x.winRate]),
  [
    [2, 96, 50],
    [2, -4, 50],
  ],
);
assert.ok(Math.abs(stats.averageR - 92 / 102 / 4) < 1e-12);
assert.ok(Math.abs(stats.maxDrawdownPercent - (106 / 50198) * 100) < 1e-12);
const empty = paperPerformance(
  [normalize(make("open", "long", undefined))],
  {},
  now,
);
assert.equal(empty.count, 0);
assert.equal(empty.winRate, null);
assert.equal(empty.profitFactor, null);
assert.equal(empty.expectancy, null);
assert.equal(paperPerformance(trades, { symbol: "MNQ" }, now).count, 0);
assert.equal(paperPerformance(trades, { days: 3 }, now).count, 1);
assert.equal(
  paperPerformance([trades[0]], {}, now).profitFactor,
  null,
  "No-loss samples must not display an invented factor",
);
assert.equal(paperPerformance([trades[1]], {}, now).profitFactor, 0);
const breakeven = normalize({ ...make("flat", "long", 3000, 29), fee: 0 });
assert.equal(paperPerformance([breakeven], {}, now).breakeven, 1);
assert.equal(paperPerformance([breakeven], {}, now).winRate, 0);
assert.equal(
  paperPerformance([{ ...trades[0], pnl: 999999 }], {}, now).net,
  198,
  "Analytics must not trust stored totals",
);
console.log(
  "Paper journal: backup roundtrip/migration, integrity rejection, lossless merge, fee-aware analytics, drawdown, filters and directional breakdown passed.",
);
