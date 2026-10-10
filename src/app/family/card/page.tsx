import { FamilyCard } from "@/components/FamilyCard";

export const metadata = { title: "Family card — Countersign" };

// A printable card for the fridge or the phone table: the habit, on paper.
export default function FamilyCardPage() {
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pt-6 pb-20 sm:px-8 print:max-w-none print:p-0">
      <FamilyCard />
    </main>
  );
}
