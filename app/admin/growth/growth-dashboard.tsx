"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type MetricRow = { source: string; page_views: number; unique_visitors: number; outbound_clicks: number; telegram_joins: number };
type CampaignRow = { source: string; campaign: string; page_views: number; outbound_clicks: number; telegram_joins: number };
type DailyRow = { day: string; page_views: number; outbound_clicks: number; telegram_joins: number };
type LinkRow = { source: string; invite_name: string; active: boolean };
type Payload = { sources: MetricRow[]; campaigns: CampaignRow[]; daily: DailyRow[]; links: LinkRow[]; windowDays: number };

const sourceLabel = (value: string) => value === "x" ? "X" : value.replace(/(^|[-_])\w/g, (letter) => letter.toUpperCase());
const percent = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(1)}%` : "—";

export default function GrowthDashboard() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  async function load(value = key) {
    const response = await fetch("/api/admin/growth", { headers: { "x-admin-key": value } });
    if (!response.ok) { setData(null); setError("Admin key is incorrect."); return; }
    sessionStorage.setItem("growth-admin-key", value);
    setData(await response.json());
    setError("");
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("growth-admin-key") || sessionStorage.getItem("affiliate-admin-key");
    if (saved) { setKey(saved); void load(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => (data?.sources || []).reduce((all, row) => ({
    views: all.views + row.page_views,
    visitors: all.visitors + row.unique_visitors,
    clicks: all.clicks + row.outbound_clicks,
    joins: all.joins + row.telegram_joins,
  }), { views: 0, visitors: 0, clicks: 0, joins: 0 }), [data]);

  if (!data) return <form onSubmit={(event: FormEvent) => { event.preventDefault(); void load(); }} className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#111720] p-7"><p className="text-xs font-black uppercase tracking-[.2em] text-ember">Private workspace</p><h1 className="mt-2 text-2xl font-black">Community growth dashboard</h1><p className="mt-2 text-sm text-zinc-400">Use the same private key as the affiliate owner dashboard.</p><input aria-label="Private admin key" value={key} onChange={(event) => setKey(event.target.value)} type="password" required className="mt-6 min-h-12 w-full rounded-md border border-white/10 bg-black/30 px-4 outline-none focus:border-ember"/><button className="mt-4 min-h-12 w-full rounded-md bg-ember font-black">Open dashboard</button>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}</form>;

  const maxDaily = Math.max(1, ...data.daily.map((row) => row.page_views));
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-ember">Private workspace · Last {data.windowDays} days</p><h1 className="mt-2 text-3xl font-black">Community growth dashboard</h1><p className="mt-2 text-sm text-zinc-400">See which platforms turn attention into Telegram members.</p></div><div className="flex gap-3"><Link href="/admin/affiliates" className="rounded-md border border-white/10 px-4 py-2 text-sm font-bold">Affiliates</Link><button onClick={() => load()} className="rounded-md border border-white/10 px-4 py-2 text-sm font-bold">Refresh</button></div></div>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      ["Page views", totals.views], ["Unique visitors", totals.visitors], ["Telegram clicks", totals.clicks], ["Verified joins", totals.joins], ["Click-to-join", percent(totals.joins, totals.clicks)],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-[#111720] p-5"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</section>

    <section className="mt-8 rounded-xl border border-white/10 bg-[#111720] p-6"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-black">30-day activity</h2><p className="mt-1 text-sm text-zinc-500">Page views, Telegram clicks, and verified joins</p></div></div><div className="mt-7 flex h-44 items-end gap-1 overflow-hidden" aria-label="Thirty day growth chart">{data.daily.length ? data.daily.map((row) => <div key={row.day} title={`${row.day}: ${row.page_views} views, ${row.outbound_clicks} clicks, ${row.telegram_joins} joins`} className="group relative flex min-w-1 flex-1 items-end"><span className="w-full rounded-t bg-ember/70 transition group-hover:bg-ember" style={{ height: `${Math.max(4, (row.page_views / maxDaily) * 100)}%` }} /></div>) : <div className="m-auto text-sm text-zinc-500">Tracking begins when the community page receives its first visit.</div>}</div></section>

    <section className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-[#111720]"><div className="border-b border-white/10 p-6"><h2 className="text-xl font-black">Performance by source</h2><p className="mt-1 text-sm text-zinc-500">Use this table to decide where content and advertising should be increased.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wide text-zinc-500"><tr>{["Source","Views","Unique","Telegram clicks","Verified joins","Page → click","Click → join"].map((item) => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead><tbody>{data.sources.map((row) => <tr key={row.source} className="border-t border-white/10"><td className="px-5 py-4 font-black">{sourceLabel(row.source)}</td><td className="px-5 py-4">{row.page_views}</td><td className="px-5 py-4">{row.unique_visitors}</td><td className="px-5 py-4">{row.outbound_clicks}</td><td className="px-5 py-4 text-emerald-300">{row.telegram_joins}</td><td className="px-5 py-4">{percent(row.outbound_clicks,row.page_views)}</td><td className="px-5 py-4">{percent(row.telegram_joins,row.outbound_clicks)}</td></tr>)}{!data.sources.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-500">No traffic recorded yet.</td></tr>}</tbody></table></div></section>

    <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-xl border border-white/10 bg-[#111720] p-6"><h2 className="text-xl font-black">Campaign breakdown</h2><div className="mt-5 space-y-3">{data.campaigns.slice(0,12).map((row) => <div key={`${row.source}:${row.campaign}`} className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-white/10 bg-black/20 p-4"><div><p className="font-black">{sourceLabel(row.source)}</p><p className="text-xs text-zinc-500">{row.campaign}</p></div><p className="text-right text-sm"><b>{row.telegram_joins}</b> joins<br/><span className="text-zinc-500">{row.outbound_clicks} clicks · {row.page_views} views</span></p></div>)}{!data.campaigns.length && <p className="text-sm text-zinc-500">Campaign data will appear here.</p>}</div></div><div className="rounded-xl border border-white/10 bg-[#111720] p-6"><h2 className="text-xl font-black">Telegram source links</h2><p className="mt-2 text-sm text-zinc-500">These links are created by D.A. Assistant and identify where verified members came from.</p><div className="mt-5 grid grid-cols-2 gap-3">{data.links.map((row) => <div key={row.source} className="rounded-lg border border-white/10 bg-black/20 p-4"><p className="font-black">{sourceLabel(row.source)}</p><p className="mt-1 text-xs text-emerald-300">{row.active ? "Active" : "Paused"}</p></div>)}{!data.links.length && <p className="col-span-2 text-sm text-zinc-500">Run <code>/setupgrowth</code> in the Telegram community after deployment.</p>}</div></div></section>
  </div>;
}
