"use client";

import { useState } from "react";
import { useVault } from "@/lib/vault";

const EXAMPLES = [
  { person: "Ethan (grandson)", question: "What did we name the dog we got the summer you broke your arm?", hint: "Biscuit" },
  { person: "Ethan (grandson)", question: "What did you call me when you were little?", hint: "Gaga" },
];

export default function VaultPage() {
  const { entries, add, remove } = useVault();
  const [person, setPerson] = useState("");
  const [question, setQuestion] = useState("");
  const [hint, setHint] = useState("");

  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-10 px-4 pt-6 pb-20 sm:px-8">
      <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-4.5">
        <p className="eyebrow m-0 text-[13px]">Set up once · protects every call</p>
        <h1 className="condensed m-0 text-[48px] leading-[0.95] font-black uppercase sm:text-[64px]">A voice can be cloned. A memory can&apos;t.</h1>
        <p className="m-0 text-lg leading-relaxed text-body">
          Write down a few questions only your people could answer. When a call sounds like a scam, Countersign picks one for you to ask.
        </p>
        <div className="flex items-start gap-3 rounded-md border-[1.5px] border-line bg-card p-4.5">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#1E4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[15px] leading-normal text-body">
            <b className="text-ink">Stays on this device.</b> Questions and answer hints are stored in your browser only. They are never uploaded, and the AI never sees them.
          </span>
        </div>
      </section>

      <section className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <form
          className="flex flex-col gap-4 rounded-md border-2 border-ink bg-card p-6 shadow-block"
          onSubmit={(e) => {
            e.preventDefault();
            if (!person.trim() || !question.trim()) return;
            add({ person: person.trim(), question: question.trim(), hint: hint.trim() });
            setQuestion("");
            setHint("");
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Who is this for?
              <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ethan (grandson)" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Answer hint (for you)
              <input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Biscuit" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Question only they could answer
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What did we name the dog we got the summer you broke your arm?" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <p className="m-0 text-sm text-muted">Good questions aren&apos;t on social media: shared moments, private nicknames, inside jokes.</p>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="min-h-12 rounded bg-ink px-5.5 text-[15px] font-extrabold tracking-[0.06em] text-white uppercase">
              Add to vault
            </button>
            {entries.length === 0 && (
              <button type="button" onClick={() => EXAMPLES.forEach(add)} className="min-h-12 rounded px-4 text-[15px] font-bold text-trust hover:bg-trust-wash">
                Load demo questions
              </button>
            )}
          </div>
        </form>

        {entries.length === 0 ? (
          <p className="m-0 rounded-md border-[1.5px] border-dashed border-dash p-6 text-center text-muted">Your vault is empty.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border-[1.5px] border-line bg-card px-5 py-4.5">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                  <span className="eyebrow">{e.person}</span>
                  <span className="text-[17px] font-semibold">{e.question}</span>
                  {e.hint && <span className="text-sm text-muted">Answer hint: {e.hint}</span>}
                </div>
                <button type="button" aria-label={`Delete question for ${e.person}`} onClick={() => remove(e.id)} className="flex h-11 w-11 items-center justify-center rounded border-[1.5px] border-line bg-card hover:border-alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A525E" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
