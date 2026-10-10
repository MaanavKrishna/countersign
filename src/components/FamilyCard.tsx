"use client";

import { useState } from "react";
import { LANGS, type Lang } from "@/lib/countersign/languages";
import { useFamily } from "@/lib/countersign/store";
import { UI } from "@/lib/countersign/ui";
import { PrintButton } from "./PrintButton";

/** The printable phone-table card, in the family's language. It never contains the words. */
export function FamilyCard() {
  const { circles } = useFamily();
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang: Lang = picked ?? circles[0]?.lang ?? "en";
  const c = (UI[lang] ?? UI.en).card;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="m-0 text-body">Print this and keep it by the phone. It never contains your family&apos;s words.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold">
            Language
            <select value={lang} onChange={(e) => setPicked(e.target.value as Lang)} className="min-h-11 rounded border-[1.5px] border-faint bg-card px-3 text-base font-normal">
              {(Object.keys(LANGS) as Lang[]).map((l) => (
                <option key={l} value={l}>
                  {LANGS[l].label}
                </option>
              ))}
            </select>
          </label>
          <PrintButton />
        </div>
      </div>
      <article lang={lang} className="flex flex-col gap-6 rounded-md border-[3px] border-ink bg-white p-8 print:rounded-none print:border-[3px]">
        <header className="flex flex-col gap-1 border-b-2 border-dashed border-ink pb-4">
          <p className="m-0 font-mono text-sm tracking-[0.14em] uppercase">{c.eyebrow}</p>
          <h1 className="condensed m-0 text-[44px] leading-[0.92] font-black uppercase sm:text-[52px]">
            {c.title[0]}
            <br />
            {c.title[1]}
          </h1>
        </header>
        <ol className="m-0 flex flex-col gap-5 pl-0 text-[22px] leading-snug" style={{ listStyle: "none" }}>
          {[c.step1, c.step2, c.step3].map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="condensed text-[44px] leading-none font-black">{i + 1}</span>
              <span className={i === 0 ? "font-bold" : undefined}>{s}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 rounded border-2 border-ink p-5 text-lg">
          <p className="m-0 font-bold">{c.numbers}</p>
          {[0, 1, 2].map((i) => (
            <p key={i} className="m-0 flex gap-3">
              <span className="w-40 border-b border-ink">&nbsp;</span>
              <span className="flex-1 border-b border-ink">&nbsp;</span>
            </p>
          ))}
        </div>
        <ul className="m-0 flex flex-col gap-2 pl-5 text-lg">
          {c.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </article>
    </>
  );
}
