import type { LanguageCode } from "./i18n";
import fr from "./translations/fr.json";
import rw from "./translations/rw.json";
import sw from "./translations/sw.json";

// All non-English copy is a draft. Only change review status after a named
// human reviewer has checked the complete locale, including legal disclosures.
export const translationReview = {
  en: { status: "source", reviewer: null },
  fr: { status: "awaiting-human-review", reviewer: null },
  rw: { status: "awaiting-human-review", reviewer: null },
  sw: { status: "awaiting-human-review", reviewer: null },
} as const;

const catalogs: Record<Exclude<LanguageCode, "en">, Record<string, string>> = { fr, rw, sw };

export function normalizeCopy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function translatePageCopy(
  language: LanguageCode,
  source: string,
  values: Record<string, string> = {},
): string {
  const key = normalizeCopy(source);
  const translated = language === "en" ? key : catalogs[language][key];
  // A missed string must be visible, never silently presented as translated.
  const template = translated ?? `[English — translation missing] ${key}`;
  const result = template.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
  return `${/^\s/.test(source) ? " " : ""}${result}${/\s$/.test(source) ? " " : ""}`;
}
