// Records the Countersign demo video: real app, staged at 1920x1080, with narration.
//
//   npm run build && npx next start -p 3300        (the app, with .env.local for the AI steps)
//   python3 -m http.server 3301 -d scripts/video   (serves stage.html)
//   node scripts/video/record.mjs && node scripts/video/assemble.mjs
//
// Output goes to video-out/ (git-ignored). Two phones are two origins (localhost and
// 127.0.0.1), so they keep separate storage, like two real devices.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import QRCode from "qrcode";

const OUT = path.resolve("video-out");
const A = "http://localhost:3300";
const B = "http://127.0.0.1:3300";
const STAGE = "http://localhost:3301/stage.html";

const NARRATOR = { voice: "Samantha", rate: 182 };
const SCAMMER = { voice: "Eddy (English (US))", rate: 195 };
const GRANDMA = { voice: "Grandma (English (US))", rate: 165 };
const ETHAN = { voice: "Eddy (English (US))", rate: 150 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(path.join(OUT, "audio"), { recursive: true });
mkdirSync(path.join(OUT, "frames"), { recursive: true });

let clip = 0;
/** Speak text to an audio file; returns { file, seconds }. */
function tts(text, who = NARRATOR) {
  const file = path.join(OUT, "audio", `${String(++clip).padStart(2, "0")}.aiff`);
  execFileSync("say", ["-v", who.voice, "-r", String(who.rate), "-o", file, text]);
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  return { file, seconds };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const t0 = Date.now();

// Crisp capture: Chrome's screencast sends a JPEG whenever the screen changes, with its timestamp.
const frames = [];
const writes = [];
const cdp = await context.newCDPSession(page);
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = path.join(OUT, "frames", `${String(frames.length).padStart(6, "0")}.jpg`);
  frames.push({ file, t: metadata.timestamp - t0 / 1000 });
  writes.push(writeFile(file, Buffer.from(data, "base64")));
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const now = () => (Date.now() - t0) / 1000;
const scenes = [];

let sceneStart = 0;
/** Seconds since the current scene started: pins an audio clip to this moment. */
const mark = () => now() - sceneStart;

async function scene(name, audio, run, { fit = "pad", minExtra = 0.8 } = {}) {
  const start = now();
  sceneStart = start;
  const extra = (await run()) ?? [];
  const parts = [...audio, ...extra];
  let t = 0;
  for (const p of parts) {
    p.at ??= t;
    t = Math.max(t, p.at + p.seconds + (p.gapAfter ?? 0.25));
  }
  const need = t + minExtra;
  if (fit === "pad") while (now() - start < need) await sleep(100);
  scenes.push({ name, start, end: now(), audio: parts, fit });
  console.log(`${name}: ${(now() - start).toFixed(1)}s video, ${need.toFixed(1)}s audio`);
}

const stage = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
const caption = (html) => stage("caption", html);
const frameOf = (origin) => page.frames().find((f) => f.url().startsWith(origin));

await page.goto(STAGE);
await page.waitForLoadState("networkidle");

// 1. Cold open: the call.
const ring = { file: path.join(OUT, "audio", "ring.wav"), seconds: 2.4, gapAfter: 0.3 };
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "aevalsrc=0.25*(sin(2*PI*440*t)+sin(2*PI*480*t))*lt(mod(t\\,1.2)\\,0.8):s=44100:d=2.4", ring.file]);
const scam = tts("Grandma? It's me. It's Ethan. I'm in trouble, I'm in jail, and the lawyer says bail is two thousand dollars. Please, don't tell Mom.", SCAMMER);
await scene("call", [ring, scam], async () => {
  await stage("card", `<div class="ring"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg></div><div class="callid">Unknown number</div><p class="sub">&ldquo;Grandma? It&rsquo;s me, Ethan. I&rsquo;m in jail&hellip; please, don&rsquo;t tell Mom.&rdquo;</p>`);
  await caption("");
});

const wasnt = tts("That wasn't Ethan. A few seconds of audio from social media is now enough to clone a voice. Listening for the wrong voice doesn't protect anyone anymore.");
await scene("wasnt", [wasnt], async () => {
  await stage("card", `<p class="big"><span class="red">That wasn&rsquo;t Ethan.</span></p><p class="sub">A few seconds of audio is enough to clone a voice.</p>`);
});

// 2. The idea.
const idea = tts("Countersign stops trying to detect fakes. It asks for the one thing a clone can't produce: your family's secret.");
await scene("idea", [idea], async () => {
  await stage("card", `<div class="eyebrow">Countersign</div><p class="big">AI can fake a voice.<br/><span class="hl">It can&rsquo;t fake our secret.</span></p>`);
});

// 3. Setup: one QR code, in person.
const setup = tts("A family scans one QR code, once, in person. Each person picks their name. No account, and no server.");
await scene("setup", [setup], async () => {
  await stage("phones", `${A}/family`, `${B}/`, ["Grandma's phone", "Ethan's phone"]);
  await caption("Grandma starts a <b>Family Circle</b>");
  await sleep(2500);
  const ga = page.frameLocator("#phone-a");
  await ga.getByLabel("Circle name").scrollIntoViewIfNeeded();
  await ga.getByLabel("Circle name").pressSequentially("The Krishna family", { delay: 40 });
  await ga.getByLabel("Your name (what family calls you)").pressSequentially("Grandma", { delay: 40 });
  await ga.getByLabel(/Everyone else/).pressSequentially("Ethan, Priya", { delay: 40 });
  await ga.getByRole("button", { name: "Create circle" }).click();
  await ga.getByAltText(/Join QR code/).scrollIntoViewIfNeeded();
  await caption("Ethan scans it with his camera");
  await sleep(2200);
  const circle = await frameOf(A).evaluate(() => JSON.parse(localStorage.getItem("countersign.family.v1")).circles[0]);
  const f = new URLSearchParams({ v: "2", s: circle.secret, c: circle.name, m: circle.members.join(","), l: circle.lang });
  await page.evaluate((src) => (document.getElementById("phone-b").src = src), `${B}/family/join#${f}`);
  await sleep(1800);
  await caption("…and taps his name");
  const gb = page.frameLocator("#phone-b");
  await gb.getByRole("button", { name: "Ethan", exact: true }).click();
  await sleep(1500);
});

// 4. Rolling words.
const words = tts("From then on, every phone shows its owner's three words, changing every minute. They're computed on the phone, so they work with no signal at all.");
await scene("words", [words], async () => {
  await page.evaluate(([a, b]) => { document.getElementById("phone-a").src = a; document.getElementById("phone-b").src = b; }, [`${A}/family`, `${B}/family`]);
  await caption("Each person has <b>their own three words</b>, changing every minute");
  await sleep(2500);
  for (const id of ["#phone-a", "#phone-b"]) await page.frameLocator(id).getByText("Your words, only when you call family").scrollIntoViewIfNeeded();
  await sleep(1000);
});

// 5. The check.
const checkIntro = tts("When a call asks for money, Grandma taps Who's calling, then the name, and asks.");
await scene("check", [checkIntro], async () => {
  await caption("A call asks for money? <b>Who&rsquo;s calling?</b>");
  const ga = page.frameLocator("#phone-a");
  await ga.getByRole("button", { name: /Who's calling\? Check now/ }).scrollIntoViewIfNeeded();
  await sleep(800);
  await ga.getByRole("button", { name: /Who's calling\? Check now/ }).click();
  await sleep(1400);
  await ga.getByRole("dialog").getByRole("button", { name: "Ethan", exact: true }).click();
  await sleep(1500);
  const expected = (await ga.getByRole("dialog").locator("p[aria-live]").innerText()).toLowerCase().split(/\s+/).filter(Boolean);
  const ask = tts("Ethan, what's our countersign?", GRANDMA);
  const reply = tts(expected.join(". "), ETHAN);
  const clone = tts("A clone can't. The real Ethan reads the words off his phone. They match.");
  while (mark() < checkIntro.seconds + 0.3) await sleep(50);
  await caption("&ldquo;Ethan, what&rsquo;s our countersign?&rdquo;");
  ask.at = mark();
  await sleep((ask.seconds + 0.4) * 1000);
  await caption(`&ldquo;${expected.join(" · ").toUpperCase()}&rdquo;`);
  reply.at = mark();
  await sleep((reply.seconds + 0.5) * 1000);
  await ga.getByRole("dialog").getByRole("button", { name: "The words match" }).click();
  await caption("The words match. <b>It&rsquo;s really Ethan.</b>");
  clone.at = mark();
  await sleep(clone.seconds * 1000 + 600);
  return [ask, reply, clone];
});

// 6. Call Shield.
const shield = tts("Call Shield listens on speaker and spots the scam script as it unfolds: an emergency, secrecy, gift cards. It tells you exactly what to ask. And because scams depend on secrecy, one tap texts someone you trust. It can even keep the whole call on the phone.");
await scene("shield", [shield], async () => {
  await stage("desktop", `${A}/shield`, "countersign.app/shield");
  await caption("<b>Call Shield</b>: a demo call");
  await sleep(2500);
  const s = page.frameLocator("#screen");
  await s.getByRole("button", { name: /grandson in jail/ }).click();
  await caption("Scam script detected as it unfolds");
  await s.getByText(/STOP\. DON'T SEND MONEY/i).waitFor({ timeout: 60_000 });
  await sleep(3500);
}, { fit: "speed" });

// 7. Practice.
const practice = tts("And because safety is a habit, families can rehearse with practice scam calls, add a weekly two-minute drill to the calendar, and print a card for the phone table, in five languages.");
await scene("practice", [practice], async () => {
  await stage("phones", `${A}/family/practice`, null, ["Practice call", ""]);
  await caption("Practise the habit: <b>ask for the countersign</b>");
  await sleep(2000);
  const p = page.frameLocator("#phone-a");
  await p.getByRole("button", { name: "Answer" }).click();
  for (let i = 0; i < 4; i++) {
    await sleep(1300);
    const next = p.getByRole("button", { name: /Next line/ });
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  await p.getByRole("button", { name: /What's our countersign/ }).click();
  await sleep(2200);
  await p.getByRole("button", { name: "Hang up and call back" }).click();
  await sleep(2500);
}, { fit: "speed" });

// 8. Message Investigator, with a QR code a prompt can't read.
const qrUrl = "https://usps-redelivery-schedule.top/notice/9400";
const shotPath = path.join(OUT, "usps-qr.png");
{
  const qr = await QRCode.toDataURL(qrUrl, { margin: 2, width: 360 });
  const shot = await browser.newPage({ viewport: { width: 520, height: 720 } });
  await shot.setContent(`<body style="margin:0;font-family:system-ui;background:#f4f4f4"><div style="margin:24px;padding:28px;background:#fff;border-radius:16px;box-shadow:0 2px 10px #0002"><div style="font-weight:800;font-size:26px;color:#333366">USPS</div><p style="font-size:20px;line-height:1.4">We attempted delivery of your package today. Scan the QR code to schedule a redelivery.</p><img src="${qr}" width="300" style="display:block;margin:12px auto"/></div></body>`);
  await shot.screenshot({ path: shotPath, fullPage: true });
  await shot.close();
}
const inv = tts("For messages, the AI investigator runs real lookups and shows its evidence. A plain AI prompt can't read a QR code. Countersign decodes it, checks where it really goes, and lets fixed rules, not the model, set the verdict. Or just forward an email to countersign at homingbox dot net.");
await scene("investigate", [inv], async () => {
  await stage("desktop", `${A}/check`, "countersign.app/check");
  await caption("<b>Check a message</b>: a screenshot with a QR code");
  await sleep(2500);
  const s = page.frameLocator("#screen");
  await s.locator('input[type="file"]').setInputFiles(shotPath);
  await sleep(1500);
  await s.getByRole("button", { name: "Investigate" }).click();
  await caption("Real lookups: domain age, DNS, lookalikes, where the link goes <span style=\"opacity:.6\">(sped up)</span>");
  await s.getByText("FORGERY").first().waitFor({ timeout: 180_000 });
  await caption("<b>FORGERY</b>: the QR code leads to a lookalike site");
  await sleep(4000);
}, { fit: "speed" });

// 9. Evidence.
const ev = tts("We tested against a plain AI prompt, on cases we published before running anything. On the hold-out, Countersign got seventeen out of eighteen right. The prompt got eight. And we publish every loss.");
await scene("evidence", [ev], async () => {
  await stage("desktop", `${A}/evidence`, "countersign.app/evidence");
  await caption("Pre-registered tests. <b>Every result published.</b>");
  await sleep(2500);
  const s = page.frameLocator("#screen");
  await s.getByRole("heading", { name: /Run-6 hold-out/ }).scrollIntoViewIfNeeded();
  await sleep(1500);
});

// 10. End card.
const end = tts("Countersign. Free, open source, with an open protocol. AI can fake a voice. It can't fake our secret.");
await scene("end", [end], async () => {
  await caption("");
  await stage("card", `<div class="eyebrow">Countersign</div><p class="big">AI can fake a voice.<br/><span class="hl">It can&rsquo;t fake our secret.</span></p><p class="sub">countersign-maanavkrishnas-projects.vercel.app<br/>github.com/MaanavKrishna/countersign</p>`);
}, { minExtra: 2 });

await cdp.send("Page.stopScreencast");
await Promise.all(writes);
await context.close();
await browser.close();

// Frames → one video with real timing (each frame shown until the next one arrived).
const stopAt = now();
const lines = ["ffconcat version 1.0"];
frames.forEach((f, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].t : stopAt;
  lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
});
lines.push(`file '${frames.at(-1).file}'`);
writeFileSync(path.join(OUT, "frames.ffconcat"), lines.join("\n"));
const video = path.join(OUT, "master.mp4");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(OUT, "frames.ffconcat"), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "fast", "-crf", "16", video]);
writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ video, videoStart: frames[0].t, scenes }, null, 2));
console.log("recorded", video, frames.length, "frames");
