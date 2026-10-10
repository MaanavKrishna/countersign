// Family Circle (protocol v2): one shared secret for a whole family. Each
// member has their own rolling three words, derived from the secret and their
// name, so anyone in the circle can verify anyone else after a single pairing.
import { GRACE_SECONDS, STEP_SECONDS, stepAt, wordsFor } from "./protocol";

export type WordLang = "en";
export type Circle = { id: string; name: string; secret: string; members: string[]; me: string; lang: WordLang; createdAt: number };

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function memberCode(secret: string, member: string, step: number): Promise<string[]> {
  return wordsFor(secret, `countersign/v2|member|${normalizeName(member)}|${step}`);
}

/** Current words for a member, plus the neighbouring step's words near a minute boundary (clock skew). */
export async function memberCodesForDisplay(c: Circle, member: string, ms: number) {
  const step = stepAt(ms);
  const into = (ms / 1000) % STEP_SECONDS;
  const altStep = into < GRACE_SECONDS ? step - 1 : into >= STEP_SECONDS - GRACE_SECONDS ? step + 1 : null;
  const [words, alt] = await Promise.all([
    memberCode(c.secret, member, step),
    altStep === null ? Promise.resolve(null) : memberCode(c.secret, member, altStep),
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
  const members = (f.get("m") ?? "").split(",").map((m) => m.trim().slice(0, 60)).filter(Boolean).slice(0, 30);
  if (f.get("v") !== "2" || !/^[A-Za-z0-9_-]{43}$/.test(secret) || !name || members.length === 0) return null;
  return { secret, name, members, lang: "en" };
}
