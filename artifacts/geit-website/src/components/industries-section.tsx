import { useLanguage } from "@/lib/language-context";
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { sectors, type Sector } from '@/data/industries';

export function SectorArt({ sector }: { sector: Sector }) {
  const { c } = useLanguage();

  return <img
    src={`${import.meta.env.BASE_URL}images/industries/${sector.id}.webp`}
    alt={c(sector.name)}
    width={768}
    height={403}
    loading="lazy"
    decoding="async"
    className="h-full w-full bg-[#e9eff1] object-contain"
    data-testid={`sector-image-${sector.id}`}
  />;
}
export function IndustriesContent() {
  const { c } = useLanguage();

  return <div className="space-y-6">{sectors.map((s, i) => (
    <article key={s.id} id={s.id} tabIndex={-1} data-testid={`section-industry-${s.id}`} className="scroll-mt-36 grid overflow-hidden border border-[#dce3e8] bg-white lg:grid-cols-2">
      <div className={`aspect-[400/210] lg:aspect-auto lg:min-h-[320px] ${i % 2 ? 'lg:order-2' : ''}`}><SectorArt sector={s}/></div>
      <div className="p-7 sm:p-9">
        <p className="font-mono text-xs font-bold text-[#168568]">{c("SECTOR / 0")}{i + 1}</p>
        <h2 className="mt-3 text-sm font-bold tracking-[.06em] text-[#60717e]">{c(s.name).toUpperCase()}</h2>
        <h3 className="mt-2 text-2xl font-bold leading-snug text-[#10243a]">{c(s.headline)}</h3>
        <h4 className="mt-5 text-xs font-bold tracking-[.14em] text-[#10243a]">{c("THE CHALLENGE")}</h4>
        <p className="mt-1 text-sm leading-6 text-[#5b6c78]">{c(s.challenge)}</p>
        <h4 className="mt-4 text-xs font-bold tracking-[.14em] text-[#10243a]">{c("HOW GEIT HELPS")}</h4>
        <p className="mt-1 text-sm leading-6 text-[#5b6c78]">{c(s.help)}</p>
        <ul className="mt-5 flex flex-wrap gap-2">{s.services.map(v => <li key={v.label}><Link href={v.href} className="inline-block border border-[#cfe0da] bg-[#e8f2ef] px-3 py-1.5 text-xs font-semibold text-[#116d55] hover:bg-[#d8ebe5]">{c(v.label)}</Link></li>)}</ul>
        <Link href="/contact" data-testid={`link-discuss-${s.id}`} className="mt-6 inline-flex items-center gap-2 bg-[#168568] px-5 py-3 text-sm font-bold text-white hover:bg-[#116d55]">{c("Discuss Your Project ")}<ArrowRight size={16}/></Link>
      </div>
    </article>))}
    <p className="text-xs leading-5 text-[#73828d]">{c("These sectors are target markets and service capabilities. Scope and findings depend on the data and access available for each assignment.")}</p></div>;
}
export function IndustriesPreview() {
  const { c } = useLanguage();

  return <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{sectors.map((s, i) => (
    <Link key={s.id} href={`/industries#${s.id}`} data-testid={`card-sector-${s.id}`} className="group flex flex-col border border-[#dce3e8] bg-white transition hover:-translate-y-1 hover:border-[#168568]/50">
      <div className="aspect-[400/210]"><SectorArt sector={s}/></div>
      <div className="flex flex-1 flex-col p-4"><span className="font-mono text-xs text-[#168568]">0{i + 1}</span><span className="mt-1 text-sm font-bold leading-5 text-[#10243a]">{c(s.name)}</span><span className="mt-3 inline-flex items-center gap-1 pt-1 text-xs font-bold text-[#168568]">{c("View sector ")}<ArrowRight size={13} className="transition group-hover:translate-x-1"/></span></div>
    </Link>))}</div>;
}
