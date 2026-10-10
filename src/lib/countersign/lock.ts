"use client";

// Optional lock on the family words, using the phone's own Face ID, fingerprint or PIN
// (a WebAuthn platform authenticator with user verification). It stops someone who picks
// up an unlocked phone from reading the words. It is a local gate, not encryption: the
// secret itself stays in this browser's storage.

import { useSyncExternalStore } from "react";

export type WordLock = { credentialId: string };
export const UNLOCK_MS = 5 * 60_000;

export function lockState(lock: WordLock | null, unlockedAt: number, now: number): "open" | "locked" {
  if (!lock) return "open";
  return unlockedAt > 0 && now - unlockedAt < UNLOCK_MS ? "open" : "locked";
}

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export async function lockSupported(): Promise<boolean> {
  try {
    return typeof PublicKeyCredential !== "undefined" && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Register this phone's screen lock. Resolves to the lock to store, or throws if the user cancels. */
export async function createLock(): Promise<WordLock> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "Countersign" },
      user: { id: random(16), name: "family-words", displayName: "Family words" },
      challenge: random(32),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("No credential created");
  return { credentialId: b64url(cred.rawId) };
}

// Unlock time lives in memory only, so closing the app locks it again.
let unlockedAt = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function unlock(lock: WordLock): Promise<boolean> {
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: "public-key", id: fromB64url(lock.credentialId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (!got) return false;
    const at = Date.now();
    unlockedAt = at;
    notify();
    // Expire on a timer (render never reads the clock).
    setTimeout(() => {
      if (unlockedAt === at && lockState(lock, at, Date.now()) === "locked") relock();
    }, UNLOCK_MS + 50);
    return true;
  } catch {
    return false;
  }
}

export function relock() {
  unlockedAt = 0;
  notify();
}

/** For actions that reveal or change the secret (show the QR code, start fresh, leave, turn the lock off). */
export async function ensureOpen(lock: WordLock | null): Promise<boolean> {
  if (!lock || unlockedAt > 0) return true;
  return unlock(lock);
}

// Timers can fire late in a sleeping tab, so re-check expiry whenever the app comes back.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (unlockedAt > 0 && Date.now() - unlockedAt >= UNLOCK_MS) relock();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Whether words may be shown right now. */
export function useWordsOpen(lock: WordLock | null): boolean {
  const at = useSyncExternalStore(subscribe, () => unlockedAt, () => 0);
  return !lock || at > 0;
}
