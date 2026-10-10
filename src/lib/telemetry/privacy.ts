// Anything that reports a URL (analytics, error logs) must go through this.
// Family secrets live in the #fragment and shared messages arrive in the ?query.
export function scrubUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

/** Path only, for server logs of relative request paths like "/share?text=…". */
export function scrubPath(path: string): string {
  return path.split(/[?#]/)[0];
}
