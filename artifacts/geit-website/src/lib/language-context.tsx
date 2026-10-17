import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLanguageCode, translate, type LanguageCode, type MessageKey } from "@/lib/i18n";

const LANGUAGE_STORAGE_KEY = "geit-language-preference";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getSavedLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(saved)) return saved;
  } catch {
    // Storage may be unavailable; the selector still works for this page view.
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(getSavedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      // Only the non-sensitive language preference is persisted; form values are never stored.
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Keep the current selection in memory when storage is unavailable.
    }
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key: MessageKey) => translate(language, key) }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}
