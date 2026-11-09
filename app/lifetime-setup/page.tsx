import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lifetime Pro | 10-step TradingView setup",
  description: "A visual 10-step guide to saving a private Darth Algo Pro Pine Script in TradingView, with actual TradingView Help Center screenshots.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/lifetime-setup" },
};

const sources = {
  start: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43627077702/original/oyZDZOtoHFqfpwa25vY5ny93h5yfUOrAlg.png?1781033624=",
  editorIcon: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43648784745/original/0C-8LOyagi_8D0PPpDy3ZtMK23d1bYnugA.png?1792330728=",
  editor: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43627077896/original/px9eTtdZSzCaVyLdgLDiZ-oX-IaQVItWIg.png?1781033699=",
  newScript: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43647564260/original/bR0knqACf7xQd-_HlwZ430cgJqO61uNSUw.png?1791560880=",
  add: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43648784824/original/UEA_8op9EYlrrMSdbJhZ0U5-r3vwUmnAUQ.png?1792330894=",
  rename: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43648784830/original/xXgEbMEypEwIcByPHujqpYcP9h5sJYMNxA.png?1792330914=",
  settings: "https://www.tradingview.com/pine-script-docs/_astro/FirstSteps-ChangingScriptSettings-02.CJECCf_u_27i2gM.webp",
  darth: "https://www.darthalgo.com/indicator-examples/darth-algo-feature-map-03.png",
};

type Step = { title: string; detail: string; tip?: string; image: string; alt: string; highlight: string; source: string };
const steps: Step[] = [
  {
    title: "Open your TradingView chart",
    detail: "On a desktop browser, sign in to TradingView and open Supercharts. You can begin with any symbol.",
    tip: "Use the full chart in a desktop browser, not the TradingView mobile app.",
    image: sources.start, alt: "Actual TradingView Supercharts interface showing chart and side tools",
    highlight: "Open Supercharts",
    source: "https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/",
  },
  {
    title: "Click the Pine Editor icon",
    detail: "On the chart's right-hand toolbar, hover over the pine-shaped icon until the tooltip reads 'Pine Editor', then click it.",
    tip: "The editor moved from the old bottom tab to the right toolbar in newer layouts.",
    image: sources.editorIcon, alt: "Official TradingView screenshot of the Pine Editor icon on the right chart toolbar",
    highlight: "Right toolbar → Pine Editor",
    source: "https://www.tradingview.com/support/solutions/43000561836-what-is-pine-script/",
  },
  {
    title: "Create a new Indicator",
    detail: "In Pine Editor, click the script name or small arrow (often 'Untitled script'). Choose 'Create new', then 'Indicator'.",
    image: sources.newScript, alt: "Official TradingView Pine Editor menu with Create new and Indicator",
    highlight: "Script name → Create new → Indicator",
    source: "https://www.tradingview.com/support/solutions/43000711497-how-to-create-a-new-script/",
  },
  {
    title: "Open the attached Pro .pine file",
    detail: "Download your private Darth Algo Pro .pine source attachment. Open it in a plain-text editor and copy the entire file.",
    tip: "Do not paste the file name, an email preview, or only part of the script. Copy from the first line through the last line.",
    image: sources.editor, alt: "Official TradingView Pine Editor showing the active code-editing area",
    highlight: "Use your private .pine file",
    source: "https://www.tradingview.com/support/solutions/43000561836-what-is-pine-script/",
  },
  {
    title: "Replace the example code",
    detail: "Click inside Pine Editor. Select ALL the existing template code (Ctrl+A on Windows / Cmd+A on Mac). Delete it, then paste the complete Darth Algo Pro code (Ctrl+V / Cmd+V).",
    tip: "The first line of your supplied file must be //@version=6. The full file should be present.",
    image: sources.editor, alt: "Official TradingView Pine Script editor with numbered lines where the code is pasted",
    highlight: "Select all → Delete → Paste",
    source: "https://www.tradingview.com/pine-script-docs/primer/first-indicator/",
  },
  {
    title: "Save your private script",
    detail: "Click the Save icon at the top of the editor or open the script-name menu and choose 'Save script'. Give it a memorable name.",
    tip: "Suggested name: 'My Darth Algo Pro'. Saving does not publish your code.",
    image: sources.add, alt: "TradingView Pine Editor toolbar showing Save and Add to chart buttons",
    highlight: "Click Save",
    source: "https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/",
  },
  {
    title: "Rename it whenever you like",
    detail: "Click the script-name dropdown again and select 'Rename'. Type your preferred personal script name and save it.",
    tip: "Renaming the saved copy is different from publishing or sharing it.",
    image: sources.rename, alt: "Official TradingView Pine Editor menu with Rename and Save script controls",
    highlight: "Script menu → Rename",
    source: "https://www.tradingview.com/support/solutions/43000763320-how-to-work-with-pine-editor/",
  },
  {
    title: "Click Add to chart",
    detail: "Select 'Add to chart' in the Pine Editor toolbar. TradingView compiles the script and applies it to the open chart.",
    tip: "If an error appears, check that the entire file was pasted. Do not modify the code to guess at a fix; contact Darth Algo support.",
    image: sources.add, alt: "Actual TradingView Pine Editor screenshot showing the Add to chart button",
    highlight: "Click Add to chart (play icon)",
    source: "https://www.tradingview.com/support/solutions/43000561836-what-is-pine-script/",
  },
  {
    title: "Choose your Scalp or Swing mode",
    detail: "On the chart, open the indicator's settings (gear icon) and choose the Inputs tab. 'Enable Scalp Mode' OFF means Swing; ON means Scalp. Other settings can stay at defaults initially.",
    tip: "The actual Darth Algo Pro indicator contains this toggle under '1. Trading Mode'.",
    image: sources.settings, alt: "TradingView official example screenshot showing where indicator Settings is located on the chart",
    highlight: "Chart indicator → gear → Inputs",
    source: "https://www.tradingview.com/pine-script-docs/primer/first-steps/",
  },
  {
    title: "Save your chart; keep the source private",
    detail: "Confirm the indicator is visible. Save your TradingView chart layout. Your personal script remains under 'My scripts' for future charts. Never click 'Publish script' or share your private Pro code.",
    tip: "TradingView's own appearance may vary between light and dark mode and different screen sizes.",
    image: sources.darth, alt: "Darth Algo's own indicator screenshot showing the combined chart information",
    highlight: "You're set — keep it private",
    source: "https://www.darthalgo.com/indicators",
  },
];

export default function LifetimeSetupPage() {
  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      <div className="border-t-[5px] border-[#d32038]" />
      <header className="mx-auto max-w-5xl px-5 pb-10 pt-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-extrabold tracking-[.08em] text-white">DARTH <span className="text-[#ed3b52]">ALGO</span></Link>
          <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Lifetime Owner Guide</span>
        </div>
        <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-[#fb7185]">Pine Script / Setup</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">Your Pro indicator.<br /><span className="text-[#fb7185]">Ready in 10 steps.</span></h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">Follow the actual TradingView interface screenshots below to create, save, rename and run your personal Darth Algo Pro Pine Script. Designed for desktop browsers.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#141922] p-4"><p className="text-xs uppercase text-zinc-500">You need</p><p className="mt-1 font-bold">TradingView account</p></div>
          <div className="rounded-xl border border-white/10 bg-[#141922] p-4"><p className="text-xs uppercase text-zinc-500">You need</p><p className="mt-1 font-bold">Private .pine attachment</p></div>
          <div className="rounded-xl border border-white/10 bg-[#141922] p-4"><p className="text-xs uppercase text-zinc-500">Time</p><p className="mt-1 font-bold">Around 10 minutes</p></div>
        </div>
        <div className="mt-6 rounded-xl border border-[#d32038]/35 bg-[#2a111a] p-4 text-sm leading-6 text-rose-100"><strong>Privacy:</strong> Your Lifetime source is for your personal use. Do not publish the script or send its code to anyone else. This page contains instructions only, not the source.</div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="grid gap-6">
          {steps.map((step, index) => (
            <section key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121720]">
              <div className="grid gap-0 lg:grid-cols-[.8fr_1.2fr]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-[#cb213a] px-3 text-base font-extrabold">{String(index + 1).padStart(2, "0")}</div>
                  <h2 className="mt-5 font-display text-xl font-bold sm:text-2xl">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-200">{step.detail}</p>
                  {step.tip && <div className="mt-5 rounded-lg border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-zinc-300"><span className="font-bold text-[#fb7185]">Tip:</span> {step.tip}</div>}
                </div>
                <figure className="flex flex-col justify-center border-t border-white/10 bg-[#080a0e] p-4 lg:border-l lg:border-t-0 sm:p-6">
                  <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-lg border border-[#e63850]/40 bg-[#3a101a] px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-rose-200"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fb7185]" />{step.highlight}</div>
                  <a href={step.image} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-lg border border-white/20 bg-white" aria-label={`Open screenshot for step ${index + 1}`}>
                    {/* Images are original TradingView Help Center screenshots. Links keep their source attribution. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.image} alt={step.alt} loading={index < 2 ? "eager" : "lazy"} className="block h-auto w-full object-contain" />
                  </a>
                  <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <span>{index === 9 ? "Original Darth Algo chart asset" : "Actual TradingView Help Center screenshot"}</span>
                    <a href={step.source} target="_blank" rel="noreferrer noopener" className="font-semibold text-[#fda4af] underline underline-offset-4">View original reference</a>
                  </figcaption>
                </figure>
              </div>
            </section>
          ))}
        </div>
        <div className="mt-9 rounded-xl border border-white/10 bg-[#141922] p-6 sm:p-8">
          <h2 className="text-xl font-bold">Need a hand?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">If your code displays an error or you cannot find the Pine Editor, email <a href="mailto:darthalgo67@gmail.com" className="font-semibold text-rose-300 underline">darthalgo67@gmail.com</a> with the error message and a screenshot. Do not email the full source to strangers or publish it publicly.</p>
          <p className="mt-4 text-xs leading-6 text-zinc-500">Screenshots are from TradingView&apos;s official support documentation, accessed November 2026; the interface may differ with theme, account tier, or a later update. Darth Algo is independent of TradingView. The original source package sent to Lifetime owners is archived as of October 28, 2026; verify any later live version before treating that file as the latest release.</p>
          <Link href="/support" className="mt-5 inline-flex rounded-lg bg-[#cb213a] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#ed3654]">Get help with your setup</Link>
        </div>
      </main>
    </div>
  );
}
