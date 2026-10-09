"use client";

import { useSyncExternalStore } from "react";
import type { Pairing } from "./protocol";

// Pairings and the trusted contact live only in this browser's localStorage.

export type TrustedContact = { name: string; phone: string };
type State = { pairings: Pairing[]; contact: TrustedContact | null };

const KEY = "countersign.family.v1";
const EMPTY: State = { pairings: [], contact: null };
const listeners = new Set<() => void>();
let cache: State | null = null;

export function addPairing(list: Pairing[], p: Omit<Pairing, "id" | "createdAt">): Pairing[] {
  if (list.some((x) => x.secret === p.secret && x.role === p.role)) return list;
  return [...list, { ...p, id: crypto.randomUUID(), createdAt: Date.now() }];
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
    contact: state.contact,
    add: (p: Omit<Pairing, "id" | "createdAt">) => write({ ...read(), pairings: addPairing(read().pairings, p) }),
    remove: (id: string) => write({ ...read(), pairings: read().pairings.filter((x) => x.id !== id) }),
    setContact: (c: TrustedContact | null) => write({ ...read(), contact: c }),
  };
}
