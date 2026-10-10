import { Suspense } from "react";
import { Investigator } from "@/components/Investigator";
import { composeSharedText } from "@/lib/investigator/share";

async function SharedInvestigation({ searchParams }: { searchParams: PageProps<"/share">["searchParams"] }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const text = composeSharedText({ title: one(p.title), text: one(p.text), url: one(p.url) });
  return <Investigator initialText={text} autorun={text.length > 0} />;
}

// Android share sheet lands here (see manifest share_target).
export default function SharePage({ searchParams }: PageProps<"/share">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-8" aria-busy="true" />}>
      <SharedInvestigation searchParams={searchParams} />
    </Suspense>
  );
}
