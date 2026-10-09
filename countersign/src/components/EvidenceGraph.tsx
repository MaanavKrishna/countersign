"use client";

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { useEffect, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "@/lib/types";

type SimNode = SimulationNodeDatum & GraphNode & { w: number; h: number };
type SimLink = { source: SimNode | string; target: SimNode | string; edge: GraphEdge };

const HEIGHT = 440;

function nodeWidth(n: GraphNode) {
  return Math.min(240, n.label.length * 7.4 + 28);
}

function safeLabel(label: string) {
  // Never render a live-looking domain: defang dots in hostnames.
  return label.replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,24}\b/gi, (h) => h.replace(/\./g, "[.]"));
}

export function EvidenceGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const box = useRef<HTMLDivElement>(null);
  const sim = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodes = useRef<Map<string, SimNode>>(new Map());
  const [width, setWidth] = useState(800);
  const [layout, setLayout] = useState<SimNode[]>([]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = simNodes.current;
    const ids = new Set(nodes.map((n) => n.id));
    for (const id of [...map.keys()]) if (!ids.has(id)) map.delete(id);
    for (const n of nodes) {
      const existing = map.get(n.id);
      if (existing) Object.assign(existing, n, { w: nodeWidth(n) });
      else {
        // New nodes appear next to whatever they connect to.
        const anchorId = edges.find((e) => e.target === n.id)?.source ?? edges.find((e) => e.source === n.id)?.target;
        const anchor = anchorId ? map.get(anchorId) : undefined;
        map.set(n.id, {
          ...n,
          w: nodeWidth(n),
          h: 34,
          x: (anchor?.x ?? width / 2) + (Math.random() - 0.5) * 60,
          y: (anchor?.y ?? HEIGHT / 2) + (Math.random() - 0.5) * 60,
          ...(n.kind === "exhibit" ? { fx: width / 2, fy: HEIGHT / 2 } : {}),
        });
      }
    }
    const list = [...map.values()];
    const links: SimLink[] = edges.filter((e) => map.has(e.source) && map.has(e.target)).map((e) => ({ source: e.source, target: e.target, edge: e }));

    sim.current?.stop();
    const s = forceSimulation<SimNode, SimLink>(list)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(120).strength(0.5))
      .force("charge", forceManyBody().strength(-520))
      .force("x", forceX(width / 2).strength(0.04))
      .force("y", forceY(HEIGHT / 2).strength(0.09))
      .force("collide", forceCollide<SimNode>().radius((d) => d.w / 2 + 6).strength(0.9))
      .alpha(0.7)
      .alphaDecay(0.035)
      .on("tick", () => {
        for (const n of list) {
          n.x = Math.max(n.w / 2 + 8, Math.min(width - n.w / 2 - 8, n.x ?? 0));
          n.y = Math.max(24, Math.min(HEIGHT - 24, n.y ?? 0));
        }
        setLayout(list.map((n) => ({ ...n })));
      });
    sim.current = s;
    return () => {
      s.stop();
    };
  }, [nodes, edges, width]);

  const byId = new Map(layout.map((n) => [n.id, n]));
  const pos = (id: string) => byId.get(id);

  return (
    <section aria-labelledby="graph-h" className="flex flex-col rounded-md bg-night text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-night-line px-5 py-3.5">
        <h2 id="graph-h" className="m-0 font-mono text-xs font-semibold tracking-[0.12em] text-[#AEB6C2] uppercase">
          Evidence graph
        </h2>
        <span className="flex gap-4 font-mono text-xs text-[#AEB6C2]">
          <span>
            <span className="text-[#FF6A4D]">━━</span> deception
          </span>
          <span>
            <span className="text-[#8A93A0]">━━</span> relation
          </span>
        </span>
      </div>
      <div ref={box} className="relative overflow-hidden" style={{ height: HEIGHT }} role="img" aria-label={`Evidence graph with ${nodes.length} entities and ${edges.filter((e) => e.deceptive).length} deceptive links`}>
        <svg width="100%" height={HEIGHT} className="absolute inset-0" aria-hidden="true">
          {edges.map((e) => {
            const a = pos(e.source);
            const b = pos(e.target);
            if (!a || !b) return null;
            return (
              <line
                key={`${e.source}>${e.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.deceptive ? "#FF6A4D" : "#8A93A0"}
                strokeWidth={e.deceptive ? 2.5 : 1.5}
                strokeDasharray={e.deceptive ? "6 5" : undefined}
              />
            );
          })}
        </svg>
        {edges
          .filter((e) => e.deceptive && e.label)
          .map((e) => {
            const a = pos(e.source);
            const b = pos(e.target);
            if (!a || !b) return null;
            return (
              <span
                key={`lbl-${e.source}>${e.target}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-[#FF6A4D] px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap text-ink"
                style={{ left: ((a.x ?? 0) + (b.x ?? 0)) / 2, top: ((a.y ?? 0) + (b.y ?? 0)) / 2 }}
              >
                {e.label}
              </span>
            );
          })}
        {layout.map((n) => {
          const cls =
            n.kind === "exhibit"
              ? "bg-white text-ink font-extrabold uppercase tracking-[0.04em] text-[15px] font-sans"
              : n.kind === "brand"
                ? "bg-white text-ink border-white font-semibold"
                : n.suspicious
                  ? "bg-[#3A1710] border-[#FF6A4D] text-white"
                  : "bg-night-2 border-[#8A93A0] text-white";
          return (
            <div
              key={n.id}
              className={`animate-pop absolute -translate-x-1/2 -translate-y-1/2 rounded border-[1.5px] px-3 py-2 font-mono text-[12.5px] whitespace-nowrap ${cls}`}
              style={{ left: n.x, top: n.y, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", fontStretch: n.kind === "exhibit" ? "80%" : undefined }}
              title={safeLabel(n.label)}
            >
              {n.kind === "exhibit" ? "Exhibit A" : safeLabel(n.label)}
            </div>
          );
        })}
        {nodes.length <= 1 && (
          <p className="absolute bottom-4 left-0 w-full text-center font-mono text-xs text-[#8A93A0]">Entities appear here as the investigator finds them.</p>
        )}
      </div>
    </section>
  );
}
