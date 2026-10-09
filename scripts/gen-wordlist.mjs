// Run once: node scripts/gen-wordlist.mjs
// Source: BIP-39 English wordlist (MIT License, github.com/bitcoin/bips).
import { writeFileSync } from "node:fs";
const res = await fetch("https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt");
const words = (await res.text()).trim().split("\n").map((w) => w.trim());
if (words.length !== 2048) throw new Error(`expected 2048 words, got ${words.length}`);
writeFileSync(
  "src/lib/countersign/wordlist.ts",
  `// BIP-39 English wordlist (MIT License, https://github.com/bitcoin/bips). 2048 words = 11 bits each.\nexport const WORDS: readonly string[] = ${JSON.stringify(words)};\n`,
);
console.log("wrote", words.length, "words");
