import { languageOptions } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{t("language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        aria-label={t("language")}
        className="h-10 w-[82px] cursor-pointer rounded-md border border-[#cfd9df] bg-white px-2 text-xs font-semibold text-[#10243a] outline-none transition focus-visible:ring-2 focus-visible:ring-[#168568] sm:w-auto sm:px-3 sm:text-sm"
        data-testid="select-language"
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
