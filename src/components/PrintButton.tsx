"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-12 rounded bg-ink px-5 font-extrabold tracking-[0.04em] text-white uppercase print:hidden">
      Print this card
    </button>
  );
}
