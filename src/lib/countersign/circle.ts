// Family Circle (protocol v2): one shared secret for a whole family. Each
// member has their own rolling three words, derived from the secret and their
// name, so anyone in the circle can verify anyone else after a single pairing.
import { isLang, loadWords, type Lang } from "./languages";
import { GRACE_SECONDS, STEP_SECONDS, stepAt, wordsFor } from "./protocol";

export type WordLang = Lang;
export type Circle = { id: string; name: string; secret: string; members: string[]; me: string; lang: WordLang; createdAt: number };

export const MAX_NAME = 60;
export const MAX_MEMBERS = 30;

/** The one rule every phone applies to a name before storing or sharing it.
 *  Commas are the link's member separator, so they can never be part of a name. */
export function cleanName(name: string): string {
  return name.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();
}

/** Unique, cleaned member list (case/spacing duplicates removed, first spelling kept). */
export function cleanMembers(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = cleanName(raw);
    if (n && !seen.has(normalizeName(n))) {
      seen.add(normalizeName(n));
      out.push(n);
    }
  }
  return out;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function memberCode(secret: string, member: string, step: number, lang: WordLang = "en"): Promise<string[]> {
  return wordsFor(secret, `countersign/v2|member|${normalizeName(member)}|${step}`, await loadWords(lang));
}

/** Current words for a member, plus the neighbouring step's words near a minute boundary (clock skew). */
export async function memberCodesForDisplay(c: Circle, member: string, ms: number) {
  const step = stepAt(ms);
  const into = (ms / 1000) % STEP_SECONDS;
  const altStep = into < GRACE_SECONDS ? step - 1 : into >= STEP_SECONDS - GRACE_SECONDS ? step + 1 : null;
  const [words, alt] = await Promise.all([
    memberCode(c.secret, member, step, c.lang),
    altStep === null ? Promise.resolve(null) : memberCode(c.secret, member, altStep, c.lang),
  ]);
  return { words, alt, secondsLeft: Math.ceil(STEP_SECONDS - into) };
}

export function circleJoinLink(origin: string, c: Pick<Circle, "secret" | "name" | "members" | "lang">): string {
  const f = new URLSearchParams({ v: "2", s: c.secret, c: c.name, m: c.members.join(","), l: c.lang });
  return `${origin}/family/join#${f.toString()}`;
}

export function parseJoinFragment(hash: string): { secret: string; name: string; members: string[]; lang: WordLang } | null {
  const f = new URLSearchParams(hash.replace(/^#/, ""));
  const secret = f.get("s") ?? "";
  const name = (f.get("c") ?? "").trim().slice(0, 80);
  const members = cleanMembers((f.get("m") ?? "").split(","));
  if (f.get("v") !== "2" || !/^[A-Za-z0-9_-]{43}$/.test(secret) || !name || members.length === 0 || members.length > MAX_MEMBERS) return null;
  const l = f.get("l");
  return { secret, name, members, lang: isLang(l) ? l : "en" };
}
