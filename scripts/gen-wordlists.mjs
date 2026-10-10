// Run once: node scripts/gen-wordlists.mjs
// Source: BIP-39 wordlists (MIT License, github.com/bitcoin/bips).
import { writeFileSync } from "node:fs";
const LANGS = { es: "spanish", fr: "french", it: "italian", pt: "portuguese" };
for (const [code, file] of Object.entries(LANGS)) {
  const res = await fetch(`https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/${file}.txt`);
  const words = (await res.text()).trim().split("\n").map((w) => w.trim().normalize("NFC"));
  if (words.length !== 2048) throw new Error(`${file}: expected 2048 words, got ${words.length}`);
  writeFileSync(
    `src/lib/countersign/words/${code}.ts`,
    `// BIP-39 ${file} wordlist (MIT License, https://github.com/bitcoin/bips).\nexport const WORDS: readonly string[] = ${JSON.stringify(words)};\n`,
  );
  console.log("wrote", code, words.length);
}
