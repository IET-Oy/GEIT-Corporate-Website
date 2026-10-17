import { Mail, Phone } from "lucide-react";
import { companyContact } from "@/config/company-contact";
import { useLanguage } from "@/lib/language-context";

export function ContactMethods({ dark = false }: { dark?: boolean }) {
  const { c } = useLanguage();
  const linkClass = `flex min-h-11 min-w-0 items-center gap-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b] ${
    dark ? "text-white/80 hover:text-[#e8b64b]" : "text-[#10243a] hover:text-[#168568]"
  }`;
  return (
    <div className="space-y-2" data-testid="company-contact-methods">
      {companyContact.businessEmail && (
        <a href={`mailto:${companyContact.businessEmail}`} className={linkClass}>
          <Mail size={18} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]"><span className="sr-only">{c("Email")}: </span>{companyContact.businessEmail}</span>
        </a>
      )}
      {companyContact.businessTelephone && (
        <a href={`tel:${companyContact.businessTelephone.replace(/[^\d+]/g, "")}`} className={linkClass}>
          <Phone size={18} aria-hidden="true" className="shrink-0" />
          <span><span className="sr-only">{c("Telephone")}: </span>{companyContact.businessTelephone}</span>
        </a>
      )}
    </div>
  );
}
