import { Facebook, Instagram, Linkedin, Youtube, X, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { companyContact, type SocialProfileKey } from "@/config/company-contact";
import { useLanguage } from "@/lib/language-context";

const footerServices = [
  { label: "Energy Management", href: "/services/energy-management" },
  { label: "Energy Consulting", href: "/services/energy-consulting" },
  { label: "Renewable Energy Advisory", href: "/services/renewable-energy-advisory" },
  { label: "Energy Efficiency & Energy Auditing", href: "/services/energy-efficiency-auditing" },
  { label: "Battery Storage & Flexibility", href: "/services/battery-energy-storage-flexibility" },
  { label: "AI & Digital Energy Solutions", href: "/services/ai-energy-analytics-digital-solutions" },
  { label: "Carbon Footprint Services", href: "/services/carbon-footprint-services" },
];

const socialItems: { key: SocialProfileKey; name: string; Icon: LucideIcon }[] = [
  { key: "linkedin", name: "LinkedIn", Icon: Linkedin },
  { key: "facebook", name: "Facebook", Icon: Facebook },
  { key: "instagram", name: "Instagram", Icon: Instagram },
  { key: "youtube", name: "YouTube", Icon: Youtube },
  { key: "x", name: "X", Icon: X },
];

export function SiteFooter() {
  const { t } = useLanguage();
  const configuredSocials = socialItems.filter(({ key }) => companyContact.socialProfiles[key]);

  return (
    <footer className="bg-[#10243a] text-white">
      <div className="mx-auto max-w-[1320px] px-5 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1.35fr_1fr] lg:gap-8">
          <section>
            <Link
              href="/"
              className="inline-flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
              aria-label="GEIT Ltd. — Global Energy Innovation Technologies, home"
            >
              <span className="bg-white p-1">
                <img
                  src="/images/geit-logo.jpg"
                  alt="GEIT Ltd. — Global Energy Innovation Technologies"
                  className="h-[48px] w-[116px] object-contain"
                  width="373"
                  height="157"
                />
              </span>
            </Link>
            <p className="mt-4 text-sm font-semibold">{companyContact.companyName}</p>
            <p className="mt-2 text-sm text-white/65">Energy Intelligence. Measurable Impact.</p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">Engineering analysis, investment advice and digital tools to help organisations make informed energy and carbon decisions.</p>
            <p className="mt-5 text-xs font-semibold tracking-[.12em] text-[#e8b64b]">
              {companyContact.officeAddress.toUpperCase()}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold">{t("footerCompany")}</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/65">
              <Link href="/" className="hover:text-white">{t("navHome")}</Link>
              <Link href="/about" className="hover:text-white">{t("footerAbout")}</Link>
              <Link href="/services" className="hover:text-white">{t("footerOurServices")}</Link>
              <Link href="/industries" className="hover:text-white">{t("footerIndustries")}</Link>
              <Link href="/digital-energy-solutions" className="hover:text-white">{t("footerDigital")}</Link>
              <Link href="/insights" className="hover:text-white">{t("footerInsights")}</Link>
              <Link href="/contact" className="hover:text-white">{t("navContact")}</Link>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold">{t("footerServices")}</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/65">
              {footerServices.map((service) => (
                <Link key={service.href} href={service.href} className="hover:text-white">
                  {service.label}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold">{t("footerContact")}</h2>
            <p className="mt-5 text-sm leading-6 text-white/65">{companyContact.officeAddress}</p>
            {companyContact.businessEmail && (
              <a className="mt-3 block text-sm text-white/65 hover:text-white" href={`mailto:${companyContact.businessEmail}`}>
                {companyContact.businessEmail}
              </a>
            )}
            {companyContact.businessTelephone && (
              <a className="mt-3 block text-sm text-white/65 hover:text-white" href={`tel:${companyContact.businessTelephone}`}>
                {companyContact.businessTelephone}
              </a>
            )}
            <Link href="/contact" className="mt-5 inline-flex items-center text-sm font-bold text-[#e8b64b] hover:text-white">
              {t("footerContactLink")}
            </Link>
            <Link href="/contact" className="mt-3 block text-sm text-white/65 hover:text-white">
              {t("footerRequestConsultation")}
            </Link>
            <div className="mt-8 border-t border-white/15 pt-5">
              <h3 className="text-sm font-bold">{t("footerFollow")}</h3>
              {configuredSocials.length > 0 ? (
                <div className="mt-4 flex gap-3">
                  {configuredSocials.map(({ key, name, Icon }) => (
                    <a
                      key={key}
                      href={companyContact.socialProfiles[key] ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`GEIT on ${name}`}
                      className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white/75 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8b64b]"
                    >
                      <Icon size={16} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-white/55">{t("footerProfilesPending")}</p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} {companyContact.companyName}.</span>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-white">Privacy policy</Link>
            <Link href="/terms-of-use" className="hover:text-white">Terms of use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
