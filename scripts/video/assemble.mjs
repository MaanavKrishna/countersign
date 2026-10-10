// Cuts the recording into scenes, fits each to its narration, adds the audio and joins them.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("video-out");
const { video, videoStart = 0, scenes } = JSON.parse(readFileSync(path.join(OUT, "manifest.json"), "utf8"));
const ff = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });

const parts = [];
scenes.forEach((s, i) => {
  const vidDur = s.end - s.start;
  const audioEnd = Math.max(0, ...s.audio.map((a) => a.at + a.seconds));
  // "speed" scenes are sped up (never slowed) to fit the narration; others keep real time.
  const target = s.fit === "speed" ? Math.max(audioEnd + 0.8, Math.min(vidDur, audioEnd + 0.8)) : Math.max(vidDur, audioEnd + 0.5);
  const factor = s.fit === "speed" ? Math.min(1, target / vidDur) : 1;
  const outDur = vidDur * factor;
  const pad = Math.max(0, target - outDur);
  const inputs = ["-ss", String(Math.max(0, s.start - videoStart)), "-t", String(vidDur), "-i", video];
  s.audio.forEach((a) => inputs.push("-i", a.file));
  const vf = `[0:v]setpts=${factor.toFixed(4)}*PTS,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},fps=30,format=yuv420p[v]`;
  const delays = s.audio.map((a, k) => `[${k + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(a.at * 1000)}|${Math.round(a.at * 1000)}[a${k}]`);
  const mix = s.audio.length
    ? `${delays.join(";")};${s.audio.map((_, k) => `[a${k}]`).join("")}amix=inputs=${s.audio.length}:normalize=0,apad,atrim=0:${target.toFixed(2)}[a]`
    : `anullsrc=r=48000:cl=stereo,atrim=0:${target.toFixed(2)}[a]`;
  const file = path.join(OUT, `scene-${String(i).padStart(2, "0")}.mp4`);
  ff([...inputs, "-filter_complex", `${vf};${mix}`, "-map", "[v]", "-map", "[a]", "-t", target.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", file]);
  console.log(`${s.name}: ${vidDur.toFixed(1)}s → ${target.toFixed(1)}s (x${(1 / factor).toFixed(2)})`);
  parts.push(file);
});

writeFileSync(path.join(OUT, "list.txt"), parts.map((p) => `file '${p}'`).join("\n"));
const final = path.join(OUT, "countersign-demo.mp4");
ff(["-f", "concat", "-safe", "0", "-i", path.join(OUT, "list.txt"), "-c", "copy", "-movflags", "+faststart", final]);
const secs = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).toString().trim();
console.log("final", final, `${Number(secs).toFixed(1)}s`);
