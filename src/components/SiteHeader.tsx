"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/family", label: "Family" },
  { href: "/check", label: "Check a message" },
  { href: "/shield", label: "Call Shield" },
  { href: "/evidence", label: "Evidence" },
] as const;

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  const ink = tone === "light" ? "#111418" : "#FFFFFF";
  return (
    <Link href="/" className="flex items-center gap-3 no-underline" style={{ color: ink }}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="15" fill="none" stroke={ink} strokeWidth="2" />
        <circle cx="17" cy="17" r="10" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="2 2" />
        <path d="M11 17.5l4 4 8-9" fill="none" stroke={tone === "light" ? "#E5381B" : "#FF6A4D"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[22px] font-extrabold uppercase tracking-[0.04em]" style={{ fontStretch: "75%" }}>
        Countersign
      </span>
    </Link>
  );
}

export function Nav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-1 text-[15px] font-semibold">
      {NAV.map((n) => {
        const active = path.startsWith(n.href);
        const cls = active
          ? tone === "light"
            ? "bg-ink text-white"
            : "bg-white text-ink"
          : tone === "light"
            ? "text-ink hover:bg-black/5"
            : "text-white hover:bg-white/10";
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`rounded-full px-4 py-2.5 no-underline transition-colors ${cls}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const path = usePathname();
  // Call Shield draws its own full-bleed header so it can change colour with the threat level.
  if (path.startsWith("/shield") || path.startsWith("/family/practice")) return null;
  return (
    <header className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8 print:hidden">
      <Logo />
      <Nav />
    </header>
  );
}
