import { useState } from "react";
import { UserRound } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { founders, type FounderProfile } from "@/config/founders";

function Portrait({ founder }: { founder: FounderProfile }) {
  const { c } = useLanguage();
  const [failed, setFailed] = useState(false);
  const showImage = !!founder.portraitSrc && !failed;
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#e9eff1]" data-testid={`img-portrait-${founder.id}`}>
      {showImage ? (
        <img src={founder.portraitSrc!} alt={founder.fullName} onError={() => setFailed(true)} loading="lazy" decoding="async" width="640" height="480" className="h-full w-full object-cover" />
      ) : (
        <div role="img" aria-label={`${c("Portrait placeholder")}: ${founder.fullName}`} className="flex flex-col items-center gap-2 text-[#647481]">
          <UserRound size={72} strokeWidth={1.25} aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-[.19em]">{c("PORTRAIT TO BE ADDED")}</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, id }: { label: string; children: React.ReactNode; id: string }) {
  return (
    <div className="grid gap-1 border-t border-[#dce3e8] py-4 sm:grid-cols-[8rem_1fr] sm:gap-4" data-testid={id}>
      <dt className="text-[11px] font-bold tracking-[.19em] text-[#168568]">{label}</dt>
      <dd className="min-w-0 break-words text-sm leading-6 text-[#10243a]">{children}</dd>
    </div>
  );
}

export function FoundersLeadership() {
  const { c } = useLanguage();
  const pending = c("Contact details pending confirmation");
  return (
    <section id="founders" className="mt-14 scroll-mt-28 border-t border-[#d5dfe4] pt-10" aria-labelledby="founders-heading">
      <div>
        <p className="max-w-2xl text-base leading-7 text-[#647481]" data-testid="text-founders-intro">
          {c("GEIT Ltd was founded in 2026 by Dr. Hyacinthe M. Nshuti and Mr. Noel Dushimiyimana.")}
        </p>
        <h2 id="founders-heading" className="mt-8 flex items-center gap-3 text-3xl font-bold text-[#10243a] sm:text-4xl">
          <span className="h-[2px] w-7 bg-[#e8b64b]" aria-hidden="true" />
          {c("Founders and Leadership")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {founders.map((f) => (
            <article key={f.id} aria-labelledby={`founder-${f.id}`} data-testid={`card-founder-${f.id}`} className="border-l-2 border-[#e8b64b] bg-[#f7f9fa] p-5 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6">
              <Portrait founder={f} />
              <h3 id={`founder-${f.id}`} className="mt-6 text-xl font-bold text-[#10243a]">{f.fullName}</h3>
              <dl className="mt-4">
                <Field id={`text-title-${f.id}`} label={c("TITLE")}>
                  {f.officialTitle ? f.officialTitle : <span className="text-[#647481]">{c("Official title pending confirmation")}</span>}
                </Field>
                <Field id={`text-name-${f.id}`} label={c("FULL NAME")}>{f.fullName}</Field>
                <Field id={`text-contact-${f.id}`} label={c("CONTACT")}>
                  {f.email || f.telephone ? (
                    <div className="space-y-1">
                      {f.email && <a href={`mailto:${f.email}`} className="block font-semibold text-[#168568] hover:underline">{f.email}</a>}
                      {f.telephone && <a href={`tel:${f.telephone.replace(/[^+\d]/g, "")}`} className="block font-semibold text-[#168568] hover:underline">{f.telephone}</a>}
                    </div>
                  ) : (
                    <span className="text-[#647481]">{pending}</span>
                  )}
                </Field>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FoundersLeadership;
