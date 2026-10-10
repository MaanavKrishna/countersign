import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Family card — Countersign" };

// A printable card for the fridge or the phone table: the habit, on paper.
export default function FamilyCardPage() {
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pt-6 pb-20 sm:px-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="m-0 text-body">Print this and keep it by the phone. It never contains your family&apos;s words.</p>
        <PrintButton />
      </div>
      <article className="flex flex-col gap-6 rounded-md border-[3px] border-ink bg-white p-8 print:rounded-none print:border-[3px]">
        <header className="flex flex-col gap-1 border-b-2 border-dashed border-ink pb-4">
          <p className="m-0 font-mono text-sm tracking-[0.14em] uppercase">Countersign · keep by the phone</p>
          <h1 className="condensed m-0 text-[52px] leading-[0.92] font-black uppercase">
            A call asks for money?
            <br />
            Check it first.
          </h1>
        </header>
        <ol className="m-0 flex flex-col gap-5 pl-0 text-[22px] leading-snug" style={{ listStyle: "none" }}>
          <li className="flex gap-4">
            <span className="condensed text-[44px] leading-none font-black">1</span>
            <span>
              Ask: <b>&ldquo;What&apos;s our countersign?&rdquo;</b>
            </span>
          </li>
          <li className="flex gap-4">
            <span className="condensed text-[44px] leading-none font-black">2</span>
            <span>
              Open <b>Countersign</b> → <b>Who&apos;s calling?</b> → tap their name. Check their words match.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="condensed text-[44px] leading-none font-black">3</span>
            <span>
              Wrong words, or they won&apos;t say? <b>Hang up.</b> Call them back on the number below.
            </span>
          </li>
        </ol>
        <div className="flex flex-col gap-3 rounded border-2 border-ink p-5 text-lg">
          <p className="m-0 font-bold">Numbers I already trust:</p>
          {["", "", ""].map((_, i) => (
            <p key={i} className="m-0 flex gap-3">
              <span className="w-40 border-b border-ink">&nbsp;</span>
              <span className="flex-1 border-b border-ink">&nbsp;</span>
            </p>
          ))}
        </div>
        <ul className="m-0 flex flex-col gap-2 pl-5 text-lg">
          <li>Real family never minds being asked.</li>
          <li>Never read <i>your</i> words to someone who called <i>you</i>.</li>
          <li>Banks, police and the government never ask for gift cards, crypto or codes.</li>
        </ul>
      </article>
    </main>
  );
}
