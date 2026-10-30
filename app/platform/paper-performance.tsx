"use client";
import { useMemo, useState } from "react";
import type { PaperTrade } from "../lib/platform/engine";
import { paperPerformance } from "../lib/platform/journal";
import s from "./platform.module.css";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
export default function PaperPerformance({ trades }: { trades: PaperTrade[] }) {
  const [symbol, setSymbol] = useState(""),
    [days, setDays] = useState("");
  const stats = useMemo(
    () =>
      paperPerformance(trades, {
        symbol,
        days: days ? Number(days) : undefined,
      }),
    [trades, symbol, days],
  );
  const symbols = [
    ...new Set(trades.filter((t) => t.closedAt).map((t) => t.symbol)),
  ].sort();
  const balances = stats.equity.map((point) => point.balance),
    high = Math.max(...balances),
    low = Math.min(...balances),
    range = high - low || 1;
  const points = stats.equity
    .map(
      (point, i) =>
        `${42 + (i / (stats.equity.length - 1 || 1)) * 700},${162 - ((point.balance - low) / range) * 125}`,
    )
    .join(" ");
  return (
    <section className={s.performance} aria-label="Paper performance analytics">
      <div className={s.performanceHeader}>
        <div>
          <span className={s.eyebrow}>LEARN FROM YOUR OWN JOURNAL</span>
          <h2>Performance, with context.</h2>
          <p className={s.muted}>
            Closed manual paper trades only. Fees included. Open plans are
            excluded.
          </p>
        </div>
        <div className={s.performanceFilters}>
          <label className={s.label}>
            Performance market
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              <option value="">All markets</option>
              {symbols.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
          <label className={s.label}>
            Performance period
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="">All history</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
        </div>
      </div>
      <div className={s.analyticsStats}>
        {[
          {
            label: "Profit factor",
            value:
              stats.profitFactor === null ? "—" : stats.profitFactor.toFixed(2),
            note: !stats.count
              ? "No closed trades"
              : !stats.grossLoss
                ? "No losing trades in this sample"
                : "Gross profit ÷ gross loss",
          },
          {
            label: "Expectancy / trade",
            value: stats.expectancy === null ? "—" : money(stats.expectancy),
            note: "Average net paper result",
          },
          {
            label: "Maximum drawdown",
            value: stats.count ? money(stats.maxDrawdown) : "—",
            note: stats.count
              ? `${stats.maxDrawdownPercent.toFixed(2)}% peak-to-trough · closed equity`
              : "No closed trades",
          },
          {
            label: "Average risk multiple",
            value:
              stats.averageR === null ? "—" : `${stats.averageR.toFixed(2)} R`,
            note: "Net result ÷ original planned risk",
          },
        ].map((item) => (
          <div key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </div>
        ))}
      </div>
      {stats.count ? (
        <>
          <div className={s.equityHeader}>
            <strong>
              {symbol || "All markets"} · {stats.count} closed trades
            </strong>
            <span>
              {money(stats.net)} net · {stats.breakeven} breakeven · longest
              losing streak {stats.maxLossStreak}
            </span>
          </div>
          <svg
            className={s.equityChart}
            viewBox="0 0 780 205"
            role="img"
            aria-label={`Filtered closed-trade equity: starts at $50,000, ends at ${money(stats.equity.at(-1)!.balance)}. Maximum drawdown ${money(stats.maxDrawdown)}.`}
          >
            <path d="M42 37H742M42 99H742M42 162H742" stroke="#2b303d" />
            <polyline
              points={points}
              fill="none"
              stroke={stats.net >= 0 ? "#63d7b0" : "#f57685"}
              strokeWidth="2.5"
            />
            <text x="42" y="18" fill="#969fb3" fontSize="10">
              {money(high)}
            </text>
            <text x="42" y="193" fill="#969fb3" fontSize="10">
              Start · $50,000
            </text>
            <text x="742" y="193" textAnchor="end" fill="#969fb3" fontSize="10">
              After {stats.count} closed trades
            </text>
            <text x="742" y="18" textAnchor="end" fill="#969fb3" fontSize="10">
              Low {money(low)}
            </text>
          </svg>
          <div className={s.directionTable}>
            <table>
              <caption>Compare long and short decisions in this sample</caption>
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Trades</th>
                  <th>Win rate</th>
                  <th>Net P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {stats.directions.map((row) => (
                  <tr key={row.side}>
                    <th>{row.side === "long" ? "Long" : "Short"}</th>
                    <td>{row.count}</td>
                    <td>
                      {row.winRate === null
                        ? "—"
                        : `${row.winRate.toFixed(1)}%`}
                    </td>
                    <td className={row.net >= 0 ? s.positive : s.negative}>
                      {money(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={s.waiting}>
          <h3>No closed trades in this sample.</h3>
          <p>
            Close a paper plan or change the filters. Your results will appear
            here.
          </p>
        </div>
      )}
      <p className={s.small}>
        A filtered equity curve restarts at $50,000 and shows only selected
        closed trades in close-time order; it is not your full-account balance
        or an intratrade drawdown measure. Win rate counts all closed trades,
        including breakeven trades. These manually entered, unverified results
        do not establish indicator performance or future returns.
      </p>
    </section>
  );
}
