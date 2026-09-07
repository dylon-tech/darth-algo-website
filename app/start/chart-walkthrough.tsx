"use client";

import Image from "next/image";
import { useState } from "react";

const steps = [
  { title: "Read the context", label: "Context", image: "/indicators/swing-dashboard.png", width: 212, height: 177, alt: "Recorded Swing dashboard displaying an uptrend, BUY guidance and a completed target", heading: "Direction comes before a signal.", copy: "The dashboard summarizes the market environment. In this recorded example it shows an uptrend and BUY guidance. Compare that context with the chart before interpreting a marker.", caution: "This dashboard was captured after the move. Its completed target is not information you would have had before entering.", question: "Does a BUY marker guarantee that price will rise?", answers: ["Yes, if the dashboard agrees", "No. It still needs context and defined risk"], correct: 1, explanation: "A signal describes a condition. It cannot guarantee what the market will do next." },
  { title: "Find the invalidation", label: "Risk", image: "/indicators/swing-risk-plan.png", width: 514, height: 325, alt: "Recorded long setup with entry, stop below entry, and two targets above entry", heading: "Know where the idea stops working.", copy: "The green ENTRY line and red STOP line show the planned entry and downside boundary in this long example. The distance between them matters before considering a target.", caution: "An indicator stop level does not set your position size or guarantee your fill price.", question: "What belongs in your plan before entering?", answers: ["Only the target", "Invalidation and the amount you could lose"], correct: 1, explanation: "Decide where the setup is invalid and evaluate your exposure before participating. Execution can differ from chart levels." },
  { title: "Evaluate the targets", label: "Targets", image: "/indicators/swing-risk-plan.png", width: 514, height: 325, alt: "Recorded Swing chart showing Target 1 and Target 2 above a long entry", heading: "A target is a plan, not a promise.", copy: "TARGET 1 and TARGET 2 mark possible exit areas. Compare their distance from entry with the planned downside. A clear setup can still lose, and skipping a setup is an option.", caution: "This selected historical example shows a favorable move. It is not a live signal, a backtest, or representative performance evidence.", question: "What does a target line tell you?", answers: ["A possible exit area to evaluate", "The profit the trade will make"], correct: 0, explanation: "Targets help organize a scenario. They do not promise a price will be reached or a trade will be profitable." },
] as const;

export default function ChartWalkthrough() {
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const step = steps[active];
  const answered = answers[active];
  const completed = steps.every((item, index) => answers[index] === item.correct);

  return (
    <section aria-labelledby="walkthrough-title" className="rounded-2xl border border-white/15 bg-[#141c28] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="walkthrough-title" className="text-2xl font-bold">Read one chart, step by step.</h2>
        <span className="text-sm text-zinc-400">Recorded product example</span>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Walkthrough steps">
        {steps.map((item, index) => <button key={item.label} type="button" onClick={() => setActive(index)} aria-pressed={active === index} aria-controls="chart-step" className={`min-h-12 rounded-lg border px-2 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 ${active === index ? "border-blue-400 bg-blue-400/15 text-blue-100" : "border-white/10 text-zinc-300 hover:bg-white/5"}`}>{index + 1}. {item.label}</button>)}
      </div>
      <div id="chart-step" className="mt-6 grid gap-7 lg:grid-cols-[1.1fr_1fr]">
        <figure className="min-w-0">
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] p-3 sm:min-h-80">
            <Image src={step.image} alt={step.alt} width={step.width} height={step.height} priority={active === 0} sizes={active === 0 ? "212px" : "(max-width: 768px) 90vw, 514px"} className={`h-auto ${active === 0 ? "w-[212px]" : "w-full max-w-[514px]"}`} />
          </div>
          <figcaption className="mt-3 text-sm leading-6 text-zinc-400">Existing Darth Algo chart capture. Open the <a href={step.image} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline underline-offset-4">original image</a> to inspect it.</figcaption>
        </figure>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-300">{step.title}</p>
          <h3 className="mt-3 text-2xl font-bold">{step.heading}</h3>
          <p className="mt-4 text-base leading-7 text-zinc-300">{step.copy}</p>
          <p className="mt-4 border-l-2 border-blue-400/50 pl-4 text-sm leading-6 text-zinc-400">{step.caution}</p>
          <fieldset className="mt-6">
            <legend className="text-base font-semibold">{step.question}</legend>
            <div className="mt-3 grid gap-2">{step.answers.map((answer, index) => <label key={answer} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-white/15 p-3 text-sm text-zinc-200 hover:bg-white/5"><input type="radio" name={`step-${active}`} checked={answered === index} onChange={() => setAnswers((previous) => ({ ...previous, [active]: index }))} className="h-4 w-4 shrink-0 accent-blue-400" />{answer}</label>)}</div>
          </fieldset>
          <div aria-live="polite" className="mt-3 text-sm leading-6 text-blue-200">{answered !== undefined && `${answered === step.correct ? "That's right." : "Take another look."} ${step.explanation}`}</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={active === 0} onClick={() => setActive((value) => value - 1)} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-bold disabled:opacity-30">Back</button>
            {active < steps.length - 1 && <button type="button" onClick={() => setActive((value) => value + 1)} className="min-h-11 rounded-lg bg-white px-5 text-sm font-bold text-black">Next step</button>}
          </div>
        </div>
      </div>
      {completed && <p role="status" className="mt-6 rounded-lg border border-blue-400/30 bg-blue-400/10 p-4 text-base text-blue-100">You’ve covered context, invalidation, and targets. Use the checklist below when reviewing another chart.</p>}
    </section>
  );
}
