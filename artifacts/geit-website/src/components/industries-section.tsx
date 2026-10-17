import { useLanguage } from "@/lib/language-context";
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { sectors, type Sector } from '@/data/industries';

const N = '#10243a', G = '#168568', A = '#e8b64b';
function Art({ id }: { id: string }) {
  const { c } = useLanguage();

  const p = { fill: 'none', stroke: G, strokeWidth: 2 } as const;
  const w = { fill: 'none', stroke: '#9db3c2', strokeWidth: 1.5 } as const;
  const a = { fill: 'none', stroke: A, strokeWidth: 2.5 } as const;
  switch (id) {
    case 'commercial-buildings': return <g><rect x="150" y="30" width="100" height="150" {...w}/><rect x="60" y="100" width="80" height="80" {...w}/>{[50,75,100,125,150].map(y=><line key={y} x1="150" x2="250" y1={y} y2={y} {...p}/>)}<rect x="165" y="55" width="14" height="14" fill={A}/><path d="M270 180V60M270 60l-8 12M270 60l8 12" {...a}/></g>;
    case 'industrial-manufacturing': return <g><path d="M30 180V110l50-30v30l50-30v30l50-30v100z" {...w}/><rect x="210" y="40" width="14" height="60" {...w}/><path d="M230 170c20-10 30-90 50-90s30 60 60 40" {...a} transform="translate(-20 -20)"/><line x1="30" x2="380" y1="180" y2="180" {...p}/></g>;
    case 'renewable-developers-investors': return <g><path d="M120 180V90" {...w}/><circle cx="120" cy="90" r="5" fill={A}/><path d="M120 90V35M120 90l-45 28M120 90l45 28" {...p}/><path d="M220 150l30-40h90l-30 40zM235 130h90M250 150l15-40M290 150l15-40" {...w}/><line x1="30" x2="380" y1="180" y2="180" {...w}/></g>;
    case 'solar-battery-storage': return <g><line x1="30" x2="380" y1="170" y2="170" {...w}/><path d="M30 170C90 170 110 40 200 40s110 130 180 130" {...a}/><path d="M30 130c60 0 100-20 170-20s120 30 180 30" {...p}/><rect x="300" y="55" width="50" height="28" {...w}/><rect x="304" y="59" width="26" height="20" fill={G}/></g>;
    case 'transport-ev-charging': return <g><path d="M60 150l20-40h110l25 40z" {...w}/><circle cx="95" cy="155" r="12" {...w}/><circle cx="175" cy="155" r="12" {...w}/><rect x="270" y="70" width="40" height="95" {...p}/><path d="M290 90l-8 18h14l-8 18" {...a}/><path d="M310 120c30 0 20 35-40 35h-80" {...a} transform="translate(0 5)"/></g>;
    case 'financial-investors': return <g><rect x="80" y="30" width="240" height="150" {...w}/>{[80,130,180,230].map(x=><line key={x} x1={x+70} x2={x+70} y1="30" y2="180" {...w} opacity=".5"/>)}{[80,130].map(y=><line key={y} x1="80" x2="320" y1={y} y2={y} {...w} opacity=".5"/>)}<circle cx="150" cy="60" r="12" fill={G}/><circle cx="260" cy="105" r="18" fill={A} opacity=".85"/><circle cx="190" cy="150" r="9" fill={G} opacity=".6"/></g>;
    case 'public-development': return <g>{[[80,60],[200,40],[320,70],[130,150],[270,150]].map(([x,y],i)=><g key={i}><rect x={x-14} y={y-14} width="28" height="28" {...(i===1?a:w)}/></g>)}<path d="M80 60L200 40L320 70M80 60L130 150M200 40L270 150M320 70L270 150M130 150L270 150" {...p}/></g>;
    default: return <g><path d="M30 170c60-20 90 10 170-5s120-20 170-5" {...w}/><path d="M60 140V90h40v50M120 140v-60l30 20v40" {...w}/><path d="M250 40v90M250 40h30l10 20" {...p}/><circle cx="300" cy="150" r="14" {...a}/><path d="M250 130c0 10 15 12 15 0" {...a}/></g>;
  }
}
export function SectorArt({ sector }: { sector: Sector }) {
  const { c } = useLanguage();

  return <svg viewBox="0 0 400 210" role="img" aria-label={c(sector.alt)} className="h-full w-full"><rect width="400" height="210" fill={N}/><g opacity=".12">{Array.from({length:10}).map((_,i)=><line key={i} x1={i*44} x2={i*44} y1="0" y2="210" stroke="#fff"/>)}</g><Art id={sector.id}/></svg>;
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
