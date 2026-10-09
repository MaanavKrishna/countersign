"use client";

import { useSyncExternalStore } from "react";
import { matchesPerson } from "./people";

// The Memory Vault lives only in this browser's localStorage. It is never sent
// to the server: the Call Shield API only says *when* to challenge, and the
// question is chosen here, on the device.

export type VaultEntry = { id: string; person: string; question: string; hint: string };

const KEY = "countersign.vault.v1";
const listeners = new Set<() => void>();
let cache: VaultEntry[] | null = null;
const EMPTY: VaultEntry[] = [];

function read(): VaultEntry[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as VaultEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(entries: VaultEntry[]) {
  cache = entries;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable (private mode) — keep in memory for this session */
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

export function useVault() {
  const entries = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    entries,
    add: (e: Omit<VaultEntry, "id">) => write([...read(), { ...e, id: crypto.randomUUID() }]),
    remove: (id: string) => write(read().filter((x) => x.id !== id)),
  };
}

/** Pick vault questions for whoever the caller claims to be (first-name match), others after. */
export function questionsFor(entries: VaultEntry[], claimed: string | null): VaultEntry[] {
  if (!claimed) return entries;
  const hit = (e: VaultEntry) => matchesPerson(e.person, claimed);
  return [...entries.filter(hit), ...entries.filter((e) => !hit(e))];
}
