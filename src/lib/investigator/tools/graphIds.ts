// Stable node ids so findings from different tools merge into one graph.
export const EXHIBIT_ID = "exhibit";
export const domainNodeId = (d: string) => `domain:${d.toLowerCase()}`;
export const urlNodeId = (u: string) => `url:${u}`;
export const brandNodeId = (name: string) => `brand:${name.toLowerCase()}`;
export const senderNodeId = (addr: string) => `sender:${addr.toLowerCase()}`;
export const factNodeId = (scope: string, key: string) => `fact:${scope}:${key}`;
