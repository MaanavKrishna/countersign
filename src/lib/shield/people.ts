const STOP = new Set(["it", "its", "it's", "me", "the", "your", "my", "a", "from", "grandson", "granddaughter", "son", "daughter", "mom", "dad"]);

/** True when any meaningful word of the saved name appears in the caller's claimed identity. */
export function matchesPerson(name: string, claimed: string | null): boolean {
  if (!claimed) return false;
  const words = (s: string) => s.normalize("NFC").toLowerCase().split(/[^\p{L}\p{M}']+/u).filter((w) => w.length > 1 && !STOP.has(w));
  const said = new Set(words(claimed));
  return words(name).some((w) => said.has(w));
}
