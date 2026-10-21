import { useId, useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Search } from "lucide-react";
import { Link } from "wouter";
import { SUPPORT_OPEN_EVENT, getSaasFaq, searchFaq } from "@/data/saas-faq";
import { useLanguage } from "@/lib/language-context";
import { supportCopy } from "@/lib/translations/support";
import { SupportLanguageNotice } from "./support-language-notice";

export function SaasFaqSection() {
  const { language } = useLanguage();
  // A keyed child clears stale searches and open panels when the shared selector changes.
  return <LocalizedFaq key={language} />;
}

function LocalizedFaq() {
  const { language } = useLanguage();
  const copy = supportCopy[language];
  const faq = useMemo(() => getSaasFaq(language), [language]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const uid = useId();
  const items = useMemo(() => searchFaq(query, faq), [query, faq]);

  return (
    <section id="saas-faq" lang={language} tabIndex={-1} className="scroll-mt-28 bg-white" aria-labelledby="saas-faq-heading">
      <div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="geit-section-label mb-5 flex items-center gap-3 text-[11px] font-bold tracking-[.19em] text-[#168568]"><span className="h-[2px] w-7 bg-[#e8b64b]" />{copy.eyebrow}</p>
            <h2 id="saas-faq-heading" className="text-3xl font-bold leading-tight text-[#10243a] sm:text-4xl">{copy.heading}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#647481]">{copy.intro}</p>
            <SupportLanguageNotice />
            <label htmlFor={`${uid}-q`} className="mt-7 block text-xs font-bold tracking-[.12em] text-[#10243a]">{copy.search}</label>
            <div className="relative mt-2 max-w-md">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#647481]" />
              <input id={`${uid}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.placeholder} className="w-full border border-[#c9d5db] bg-[#f7f9fa] py-3 pl-9 pr-3 text-sm text-[#10243a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168568]" aria-describedby={`${uid}-count`} />
            </div>
            <p id={`${uid}-count`} role="status" className="mt-2 text-xs text-[#647481]">{items.length === 0 ? copy.noMatch : copy.count.replace("{shown}", String(items.length)).replace("{total}", String(faq.length))}</p>
          </div>
          <div>
            {items.length === 0 ? (
              <div className="border border-dashed border-[#c9d5db] bg-[#f7f9fa] p-6 text-sm text-[#415763]">
                {copy.empty} <button type="button" onClick={() => setQuery("")} className="font-bold text-[#168568] underline">{copy.clear}</button> {copy.or} <Link href="/contact" className="font-bold text-[#168568] underline">{copy.contact}</Link>.
              </div>
            ) : (
              <ul className="divide-y divide-[#dce3e8] border-y border-[#dce3e8]">
                {items.map((f) => {
                  const isOpen = open === f.id;
                  return (
                    <li key={f.id}>
                      <h3>
                        <button type="button" id={`${uid}-b-${f.id}`} aria-expanded={isOpen} aria-controls={`${uid}-p-${f.id}`} onClick={() => setOpen(isOpen ? null : f.id)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-bold text-[#10243a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168568]">
                          <span>{f.question}</span>
                          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#168568] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </h3>
                      <div id={`${uid}-p-${f.id}`} role="region" aria-labelledby={`${uid}-b-${f.id}`} hidden={!isOpen} className="geit-readable-glass rounded pb-6 pl-4 pr-8 pt-4">
                        <p className="mb-3 inline-block border border-[#c9d5db] bg-[#f2f5f7] px-2 py-1 text-[11px] font-bold tracking-[.08em] text-[#10243a]">{copy[f.status].toUpperCase()}: {f.statusNote}</p>
                        <p className="text-sm leading-7 text-[#4f6370]">{f.answer}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold">
                          {f.links.map((l) => <Link key={l.href} href={l.href} className="text-[#168568] underline underline-offset-4">{l.label}</Link>)}
                          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(SUPPORT_OPEN_EVENT, { detail: { question: f.question } }))} className="inline-flex items-center gap-2 text-[#10243a] underline underline-offset-4"><MessageCircle size={15} aria-hidden="true" />{copy.ask}</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SaasFaqSection;
