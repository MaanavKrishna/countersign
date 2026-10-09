"use client";

import { useCallback, useReducer, useRef } from "react";
import type { Band, Finding, GraphEdge, GraphNode, Indicators, InvestigationEvent, Report, Tactic } from "./types";

export type TimelineItem =
  | { kind: "thought"; key: string; text: string }
  | {
      kind: "tool";
      key: string;
      name: string;
      args: Record<string, unknown>;
      status: "running" | "done";
      summary?: string;
      findings: Finding[];
    };

export type InvestigationState = {
  status: "idle" | "running" | "done" | "error";
  indicators: Indicators | null;
  timeline: TimelineItem[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  risk: number;
  band: Band;
  tactics: Tactic[];
  screenshot: { url: string; src: string } | null;
  debate: { prosecution?: string; defense?: string; judge?: string };
  report: Report | null;
  errors: string[];
  elapsedMs: number | null;
};

const initial: InvestigationState = {
  status: "idle",
  indicators: null,
  timeline: [],
  nodes: [],
  edges: [],
  risk: 0,
  band: "countersigned",
  tactics: [],
  screenshot: null,
  debate: {},
  report: null,
  errors: [],
  elapsedMs: null,
};

type Action = { type: "start" } | { type: "reset" } | { type: "fail"; message: string } | { type: "event"; event: InvestigationEvent };

let thoughtSeq = 0;

function reduce(s: InvestigationState, a: Action): InvestigationState {
  if (a.type === "start") return { ...initial, status: "running" };
  if (a.type === "reset") return initial;
  if (a.type === "fail") return { ...s, status: "error", errors: [...s.errors, a.message] };
  const e = a.event;
  switch (e.type) {
    case "indicators":
      return { ...s, indicators: e.indicators };
    case "thought":
      return { ...s, timeline: [...s.timeline, { kind: "thought", key: `t${thoughtSeq++}`, text: e.text }] };
    case "tool_start":
      return { ...s, timeline: [...s.timeline, { kind: "tool", key: e.id, name: e.name, args: e.args, status: "running", findings: [] }] };
    case "tool_result":
      return {
        ...s,
        timeline: s.timeline.map((t) => (t.kind === "tool" && t.key === e.id ? { ...t, status: "done", summary: e.summary, findings: e.findings } : t)),
      };
    case "graph": {
      const nodes = [...s.nodes];
      for (const n of e.delta.nodes) {
        const i = nodes.findIndex((x) => x.id === n.id);
        if (i === -1) nodes.push(n);
        else nodes[i] = { ...nodes[i], ...n, suspicious: nodes[i].suspicious || n.suspicious, label: nodes[i].kind === "brand" ? nodes[i].label : n.label };
      }
      const edges = [...s.edges];
      for (const ed of e.delta.edges) {
        const i = edges.findIndex((x) => x.source === ed.source && x.target === ed.target);
        if (i === -1) edges.push(ed);
        else if (ed.deceptive && !edges[i].deceptive) edges[i] = ed;
      }
      return { ...s, nodes, edges };
    }
    case "score":
      return { ...s, risk: e.risk, band: e.band };
    case "tactics":
      return { ...s, tactics: e.tactics };
    case "sandbox":
      return { ...s, screenshot: { url: e.url, src: e.screenshot } };
    case "debate":
      return { ...s, debate: { ...s.debate, [e.role]: e.text } };
    case "report":
      return { ...s, report: e.report, risk: e.report.risk, band: e.report.band };
    case "error":
      return { ...s, errors: [...s.errors, e.message], status: e.recoverable ? s.status : "error" };
    case "done":
      return { ...s, status: s.status === "error" ? "error" : "done", elapsedMs: e.elapsedMs };
  }
}

export type ImageInput = { mediaType: string; base64: string; previewUrl: string } | null;

export function useInvestigation() {
  const [state, dispatch] = useReducer(reduce, initial);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (text: string, image: ImageInput) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    dispatch({ type: "start" });
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, image: image ? { mediaType: image.mediaType, base64: image.base64 } : null }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.json().then((j: { error?: string }) => j.error).catch(() => null);
        dispatch({ type: "fail", message: msg ?? `Request failed (${res.status})` });
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            dispatch({ type: "event", event: JSON.parse(line.slice(6)) as InvestigationEvent });
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") dispatch({ type: "fail", message: (err as Error).message });
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  return { state, run, reset };
}
