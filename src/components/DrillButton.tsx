"use client";

import { drillCalendar, nextDrillTime } from "@/lib/drill";

/** Downloads a weekly calendar reminder: two minutes to practise the countersign. */
export function DrillButton({ className = "" }: { className?: string }) {
  const download = () => {
    const ics = drillCalendar(window.location.origin, nextDrillTime());
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "countersign-weekly-drill.ics" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button type="button" onClick={download} className={className}>
      Add a weekly 2-minute drill to my calendar
    </button>
  );
}
