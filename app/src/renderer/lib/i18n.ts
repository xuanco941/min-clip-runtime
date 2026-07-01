import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/en.json";
import viRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/vi.json";
import zhRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/zh.json";
import deRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/de.json";
import esRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/es.json";
import ptRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/pt.json";
import ruRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/ru.json";
import trRaw from "../../../../api/MoneyPrinterTurbo/webui/i18n/tr.json";

export type LocaleCode = "en" | "vi" | "zh" | "de" | "es" | "pt" | "ru" | "tr";

interface WebuiLocale {
  Language: string;
  Translation: Record<string, string>;
}

function extract(raw: unknown): Record<string, string> {
  const r = raw as WebuiLocale;
  return r.Translation ?? (raw as Record<string, string>);
}

const resources = {
  en: { translation: extract(enRaw) },
  vi: { translation: extract(viRaw) },
  zh: { translation: extract(zhRaw) },
  de: { translation: extract(deRaw) },
  es: { translation: extract(esRaw) },
  pt: { translation: extract(ptRaw) },
  ru: { translation: extract(ruRaw) },
  tr: { translation: extract(trRaw) },
};

export const LOCALE_META: Array<{ code: LocaleCode; label: string; native: string; flag: string }> = [
  { code: "vi", label: "Tiếng Việt", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", native: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", native: "中文 (简体)", flag: "🇨🇳" },
  { code: "de", label: "Deutsch", native: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", native: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", native: "Português", flag: "🇵🇹" },
  { code: "ru", label: "Русский", native: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Türkçe", native: "Türkçe", flag: "🇹🇷" },
];

const stored = (typeof localStorage !== "undefined" && localStorage.getItem("minclip.locale")) as
  | LocaleCode
  | null;

i18n.use(initReactI18next).init({
  resources,
  lng: stored ?? "vi",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(code: LocaleCode) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem("minclip.locale", code);
  } catch {
    // ignore
  }
}

export { i18n };
export default i18n;