import { useLanguage } from "@/lib/language-context";
import { supportCopy, supportReview } from "@/lib/translations/support";

/** Support approval is separate from the website-wide draft review. */
export function SupportLanguageNotice() {
  const { language, setLanguage, t } = useLanguage();
  if (language === "en") return null;
  const reviewStatus: string = supportReview[language].status;
  return (
    <p className="mt-3 text-xs leading-5 text-[#647481]">
      {reviewStatus === "awaiting-human-review" && <>{t("contentLanguageNotice")}{" "}</>}
      <button type="button" onClick={() => setLanguage("en")} className="font-bold text-[#168568] underline">
        {supportCopy[language].english}
      </button>
    </p>
  );
}
