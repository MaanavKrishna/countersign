import { describe, expect, it } from "vitest";
import { collectCase } from "../report/collect";

// Live check (model API + network): EVAL=1 npx vitest run language
describe.skipIf(!process.env.EVAL)("verdict language", () => {
  it("answers a Spanish scam in Spanish without changing the band", async () => {
    const r = await collectCase({
      text: "BBVA: Su cuenta ha sido bloqueada por actividad sospechosa. Verifique su identidad en las próximas 2 horas en https://bbva-seguridad-verificacion.top o perderá el acceso.",
      image: null,
    });
    console.log(r.report.headline, "|", r.report.summary);
    expect(r.report.band).toBe("forgery");
    expect(`${r.report.headline} ${r.report.summary}`).toMatch(/\b(no|es|su|la|el|cuenta|estafa|banco|este|esta)\b/i);
  }, 120_000);
});
