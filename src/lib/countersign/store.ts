"use client";

import { useSyncExternalStore } from "react";
import { cleanName, normalizeName, type Circle } from "./circle";
import type { WordLock } from "./lock";
import type { Pairing } from "./protocol";

// Pairings and the trusted contact live only in this browser's localStorage.

export type TrustedContact = { name: string; phone: string };
type State = { pairings: Pairing[]; circles: Circle[]; contact: TrustedContact | null; lock: WordLock | null };

const KEY = "countersign.family.v1";
const EMPTY: State = { pairings: [], circles: [], contact: null, lock: null };
const listeners = new Set<() => void>();
let cache: State | null = null;

export function addPairing(list: Pairing[], p: Omit<Pairing, "id" | "createdAt">): Pairing[] {
  if (list.some((x) => x.secret === p.secret && x.role === p.role)) return list;
  return [...list, { ...p, id: crypto.randomUUID(), createdAt: Date.now() }];
}

export function addCircle(list: Circle[], c: Circle, replaceId?: string | null): Circle[] {
  if (list.some((x) => x.secret === c.secret)) return list;
  return [...list.filter((x) => x.id !== replaceId), c];
}

/** Start a circle fresh: new secret (old words stop working), optionally without one member. */
export function rekeyCircle(list: Circle[], id: string, secret: string, replaces: string, remove: string | null): Circle[] {
  return list.map((c) => {
    if (c.id !== id) return c;
    const drop = remove && normalizeName(remove) !== normalizeName(c.me) ? normalizeName(remove) : null;
    return { ...c, secret, replaces, members: c.members.filter((m) => normalizeName(m) !== drop) };
  });
}

export function joinStatus(list: Circle[], secret: string): "ok" | "member" {
  return list.some((x) => x.secret === secret) ? "member" : "ok";
}

export function canAccept(list: Pairing[], parsed: { secret: string }): "ok" | "self" | "duplicate" {
  const hit = list.find((x) => x.secret === parsed.secret);
  if (!hit) return "ok";
  return hit.role === "a" ? "self" : "duplicate";
}

function read(): State {
  if (cache) return cache;
  try {
    cache = { ...EMPTY, ...(JSON.parse(window.localStorage.getItem(KEY) ?? "null") ?? {}) };
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function write(next: State) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFamily() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    pairings: state.pairings,
    circles: state.circles,
    contact: state.contact,
    lock: state.lock,
    setLock: (lock: WordLock | null) => write({ ...read(), lock }),
    add: (p: Omit<Pairing, "id" | "createdAt">) => write({ ...read(), pairings: addPairing(read().pairings, p) }),
    remove: (id: string) => write({ ...read(), pairings: read().pairings.filter((x) => x.id !== id) }),
    setContact: (c: TrustedContact | null) => write({ ...read(), contact: c }),
    addCircle: (c: Omit<Circle, "id" | "createdAt">, replaceId?: string | null) =>
      write({ ...read(), circles: addCircle(read().circles, { ...c, id: crypto.randomUUID(), createdAt: Date.now() }, replaceId) }),
    rekeyCircle: (id: string, secret: string, replaces: string, remove: string | null) =>
      write({ ...read(), circles: rekeyCircle(read().circles, id, secret, replaces, remove) }),
    removeCircle: (id: string) => write({ ...read(), circles: read().circles.filter((x) => x.id !== id) }),
    addMember: (id: string, raw: string) => {
      const name = cleanName(raw);
      if (!name) return;
      write({
        ...read(),
        circles: read().circles.map((x) =>
          x.id === id && !x.members.some((m) => normalizeName(m) === normalizeName(name)) ? { ...x, members: [...x.members, name] } : x,
        ),
      });
    },
  };
}
