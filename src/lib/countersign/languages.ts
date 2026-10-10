import { WORDS as EN } from "./wordlist";

// BIP-39 lists, loaded only when a circle uses them.
export const LANGS = {
  en: { label: "English", speech: "en-US" },
  es: { label: "Español", speech: "es-ES" },
  fr: { label: "Français", speech: "fr-FR" },
  it: { label: "Italiano", speech: "it-IT" },
  pt: { label: "Português", speech: "pt-PT" },
} as const;
export type Lang = keyof typeof LANGS;

export function isLang(x: string | null | undefined): x is Lang {
  return !!x && Object.hasOwn(LANGS, x);
}

export async function loadWords(lang: Lang): Promise<readonly string[]> {
  switch (lang) {
    case "es":
      return (await import("./words/es")).WORDS;
    case "fr":
      return (await import("./words/fr")).WORDS;
    case "it":
      return (await import("./words/it")).WORDS;
    case "pt":
      return (await import("./words/pt")).WORDS;
    default:
      return EN;
  }
}
