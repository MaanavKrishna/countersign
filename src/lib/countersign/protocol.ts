// Family Countersign v1: a rolling, speakable passphrase two paired devices
// derive independently from a shared secret. No server is involved.
import { WORDS } from "./wordlist";

export type Role = "a" | "b";
export type Pairing = { id: string; me: string; them: string; role: Role; secret: string; createdAt: number };

export const STEP_SECONDS = 60;
export const GRACE_SECONDS = 20;

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function newSecret(): string {
  return toB64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function stepAt(ms: number): number {
  return Math.floor(ms / 1000 / STEP_SECONDS);
}

const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string): Promise<CryptoKey> {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", fromB64url(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    keyCache.set(secret, k);
  }
  return k;
}

export async function codeFor(secret: string, from: Role, to: Role, step: number): Promise<string[]> {
  const msg = new TextEncoder().encode(`countersign/v1|${from}>${to}|${step}`);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), msg));
  // First 33 bits of the MAC → three 11-bit indexes into the 2048-word list.
  const i0 = (mac[0] << 3) | (mac[1] >> 5);
  const i1 = ((mac[1] & 0x1f) << 6) | (mac[2] >> 2);
  const i2 = ((mac[2] & 0x03) << 9) | (mac[3] << 1) | (mac[4] >> 7);
  return [WORDS[i0], WORDS[i1], WORDS[i2]];
}

export async function codesForDisplay(p: Pairing, ms: number) {
  const step = stepAt(ms);
  const other: Role = p.role === "a" ? "b" : "a";
  const into = (ms / 1000) % STEP_SECONDS;
  const [mine, theirs, theirsPrevious] = await Promise.all([
    codeFor(p.secret, p.role, other, step),
    codeFor(p.secret, other, p.role, step),
    into < GRACE_SECONDS ? codeFor(p.secret, other, p.role, step - 1) : Promise.resolve(null),
  ]);
  return { mine, theirs, theirsPrevious, secondsLeft: Math.ceil(STEP_SECONDS - into) };
}

export function pairingLink(origin: string, me: string, them: string, secret: string): string {
  const f = new URLSearchParams({ v: "1", s: secret, a: me, b: them });
  return `${origin}/family/pair#${f.toString()}`;
}

export function parsePairingFragment(hash: string): { secret: string; a: string; b: string } | null {
  const f = new URLSearchParams(hash.replace(/^#/, ""));
  const secret = f.get("s") ?? "";
  const a = (f.get("a") ?? "").trim().slice(0, 60);
  const b = (f.get("b") ?? "").trim().slice(0, 60);
  if (f.get("v") !== "1" || !/^[A-Za-z0-9_-]{43}$/.test(secret) || !a || !b) return null;
  return { secret, a, b };
}
