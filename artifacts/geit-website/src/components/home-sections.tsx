import { useLanguage } from "@/lib/language-context";
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { HeroLightField } from '@/components/hero-light-field';
import { IndustriesPreview } from '@/components/industries-section';

const Tag = ({ children, light = false }: { children: string; light?: boolean }) => <p className={`mb-5 flex items-center gap-3 text-[11px] font-bold tracking-[.19em] ${light ? 'text-[#e8b64b]' : 'text-[#168568]'}`}><span className="h-[2px] w-7 bg-[#e8b64b]"/>{children}</p>;

export function HeroOrb() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 select-none overflow-hidden" data-testid="hero-orb">
    <img src={`${import.meta.env.BASE_URL}images/homepage-background.webp`} alt="" width="1024" height="558" decoding="async" fetchPriority="high" className="hero-photo absolute inset-0 h-full w-full object-cover" data-testid="hero-photo"/>
    <HeroLightField/>
  </div>;
}

const does = [
  ['Understand', 'We measure and interpret how energy is bought, used and managed across your sites.'],
  ['Evaluate', 'We test technical and commercial options against your load, tariff and site constraints.'],
  ['Develop', 'We shape projects into decision-ready documentation, from concept to procurement planning.'],
  ['Digitise and decarbonise', 'We define fit-for-purpose analytics and transparent carbon baselines.'],
];
export function WhatGeitDoes() {
  const { c } = useLanguage();

  return <section className="bg-white"><div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-20"><div><Tag>{c("WHAT GEIT DOES")}</Tag><h2 className="text-3xl font-bold leading-tight text-[#10243a] sm:text-4xl">{c("An energy advisory built on engineering and economics.")}</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#647481]">{c("GEIT Ltd is a global energy and technology company helping businesses and institutions make informed decisions about energy use, investment and low-carbon planning. We state our assumptions and the limits of our evidence.")}</p><Link href="/services" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#168568]">{c("See all eleven services ")}<ArrowRight size={16}/></Link></div><div className="grid gap-px bg-[#dce3e8] sm:grid-cols-2">{does.map(([t, x]) => <div key={t} className="bg-[#f7f9fa] p-6"><h3 className="text-lg font-bold text-[#10243a]">{c(t)}</h3><p className="mt-2 text-sm leading-6 text-[#647481]">{c(x)}</p></div>)}</div></div></section>;
}
const steps = [['Discover', 'Understand your energy challenge, objectives and the decision you need to make.'], ['Assess', 'Collect and assess available data, sites and systems to establish a factual baseline.'], ['Analyse', 'Evaluate technical and commercial options, risks and sensitivities.'], ['Recommend', 'Develop recommendations and an implementation roadmap with clear priorities.'], ['Support', 'Support monitoring and performance evaluation where agreed in the assignment.']];
export function HowWeWork() {
  const { c } = useLanguage();

  return <section className="bg-[#10243a] text-white"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><Tag light>{c("HOW WE WORK")}</Tag><h2 className="max-w-xl text-3xl font-bold sm:text-4xl">{c("Five steps from question to decision.")}</h2><ol className="mt-10 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-5">{steps.map(([t, x], i) => <li key={t} className="bg-[#10243a] p-6"><span className="font-mono text-sm text-[#e8b64b]">0{i + 1}</span><h3 className="mt-3 text-lg font-bold">{c(t)}</h3><p className="mt-2 text-sm leading-6 text-white/65">{c(x)}</p></li>)}</ol></div></section>;
}
const why = [['Engineering-led', 'Start with the physical system, its loads, resources and operating constraints.'], ['Independent and evidence-based', 'Evaluate alternatives on their merits and make the supporting evidence clear.'], ['Technical and economic', 'Consider engineering requirements alongside costs, risks and investment assumptions.'], ['Practical digital energy', 'Connect useful analytics and monitoring to the decisions your team needs to make.'], ['Local context, global perspective', 'Account for local tariffs, infrastructure and operating conditions.'], ['Transparent objectives', 'Agree measurable objectives and document assumptions, scope and limitations.']];
export function WhyGeit() {
  const { c } = useLanguage();

  return <section className="bg-[#e9eff1]"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><Tag>{c("WHY GEIT")}</Tag><h2 className="max-w-xl text-3xl font-bold text-[#10243a] sm:text-4xl">{c("Six working principles.")}</h2><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{why.map(([t, x], i) => <article key={t} className="border-l-2 border-[#e8b64b] bg-white p-6"><span className="font-mono text-xs text-[#168568]">0{i + 1}</span><h3 className="mt-2 text-lg font-bold text-[#10243a]">{c(t)}</h3><p className="mt-2 text-sm leading-6 text-[#647481]">{c(x)}</p></article>)}</div></div></section>;
}
export function SectorsHome() {
  const { c } = useLanguage();

  return <section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><Tag>{c("INDUSTRIES & SOLUTIONS")}</Tag><h2 className="max-w-xl text-3xl font-bold text-[#10243a] sm:text-4xl">{c("Eight sectors, each with its own energy logic.")}</h2></div><Link href="/industries" className="inline-flex items-center gap-2 text-sm font-bold text-[#168568]">{c("All sectors ")}<ArrowRight size={16}/></Link></div><IndustriesPreview/></div></section>;
}
