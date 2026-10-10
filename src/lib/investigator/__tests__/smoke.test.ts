import { it } from "vitest";
import { runInvestigation } from "@/lib/investigator/pipeline";
import { SAMPLES } from "@/lib/investigator/samples";

// One sample, printing the event stream. SMOKE=paypal npx vitest run smoke
it.skipIf(!process.env.SMOKE)("smoke", async () => {
  const s = SAMPLES.find((x) => x.id === process.env.SMOKE)!;
  const t0 = Date.now();
  await runInvestigation({ text: s.text, image: null }, (e) => {
    const t = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
    if (e.type === "graph" || e.type === "indicators") return;
    if (e.type === "tool_result") console.log(t, "RESULT", e.name, "|", e.summary, "|", e.findings.map((f) => `${f.signalId}:${f.weight}`).join(","));
    else if (e.type === "report") console.log(t, "REPORT", JSON.stringify(e.report, null, 1));
    else console.log(t, e.type, JSON.stringify(e).slice(0, 300));
  });
}, 180_000);
