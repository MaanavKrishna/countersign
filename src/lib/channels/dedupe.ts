// Best-effort per-instance dedupe; Agentboxd keeps the delivery id stable on retries.
const seen = new Set<string>();

export function firstDelivery(id: string): boolean {
  if (!id) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 10_000) seen.delete(seen.values().next().value!);
  return true;
}
