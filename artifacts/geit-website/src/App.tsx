import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FloatingConsultation from '@/components/floating-consultation';
import ContactForm from '@/components/contact-form';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Link, Route, Switch, Redirect, Router as WouterRouter, useLocation } from 'wouter';
import { ArrowRight, ArrowUpRight, BarChart3, BatteryCharging, Building2, Check, ChevronRight, Cpu, Globe2, Leaf, LineChart, Network, PlugZap, ShieldCheck, Sun, Zap } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { serviceMethodologies } from '@/data/service-methodologies';
import { LanguageProvider, useLanguage } from '@/lib/language-context';
import { HeroOrb, WhatGeitDoes, HowWeWork, WhyGeit, SectorsHome } from '@/components/home-sections';
import { IndustriesContent } from '@/components/industries-section';
import { RouteScroll } from '@/components/route-scroll';
import { companyContact } from '@/config/company-contact';
import { ContactMethods } from '@/components/contact-methods';
import { PageMetadata as Meta } from '@/components/page-metadata';
import { AppNav } from '@/platform/app-nav';
import { HeroHeadline } from '@/components/hero-headline';
import { SaasFaqSection } from '@/components/saas-faq-section';
import { SupportWidget } from '@/components/support-widget';
import { FoundersLeadership } from '@/components/founders-leadership';
import { ServiceImage } from '@/components/service-image';

const PlatformApp = lazy(() => import('@/platform/app-routes').then((module) => ({ default: module.AppRoutes })));
function AppRoutes() {
  return <Suspense fallback={<div role="status" className="min-h-screen bg-[#f2f5f7] p-10 text-[#10243a]">Loading workspace…</div>}><PlatformApp /></Suspense>;
}
const queryClient = new QueryClient();
const services = [
 {slug:'energy-management', title:'Energy Management', kicker:'OPERATE WITH CLARITY', icon:Zap, problem:'Energy costs and operating conditions change faster than many organisations can interpret them. Without a coherent view, teams struggle to prioritise action and sustain improvement.', offer:'We help organisations establish a practical, data-led approach to understanding energy use, making decisions and embedding better operating routines.', scope:['Energy data and bill review','Use-pattern and operational analysis','Opportunity prioritisation','Performance monitoring framework'], deliverables:['Baseline and findings report','Prioritised action register','Management routines and indicators','Implementation roadmap'], beneficiaries:'Commercial buildings, industrial facilities, campuses and multi-site organisations.'},
 {slug:'energy-consulting', title:'Energy Consulting', kicker:'INDEPENDENT ADVICE', icon:LineChart, problem:'Energy choices can carry long-lived operational and financial consequences. Buyers need advice that is technically grounded and commercially independent.', offer:'GEIT brings structured analysis to energy questions, from early options appraisal to decision support for complex investments.', scope:['Requirements and constraints definition','Technical and commercial options analysis','Scenario and sensitivity assessment','Decision workshops'], deliverables:['Options appraisal','Assumptions and risk register','Business-case inputs','Clear recommendations'], beneficiaries:'Business leaders, finance teams, asset owners and public institutions.'},
 {slug:'energy-project-development', title:'Energy Project Development', kicker:'FROM IDEA TO INVESTMENT', icon:Building2, problem:'Promising energy ideas often stall between concept and investment because technical, commercial and delivery questions are not resolved together.', offer:'We support project sponsors through structured development work that makes project assumptions visible and investment decisions more informed.', scope:['Opportunity screening','Concept definition and feasibility inputs','Stakeholder and delivery considerations','Procurement and implementation planning'], deliverables:['Project concept note','Feasibility and risk considerations','Indicative implementation pathway','Decision-ready project documentation'], beneficiaries:'Institutions, businesses, developers and investors assessing energy projects.'},
 {slug:'energy-market-research', title:'Energy Market Research', kicker:'CONTEXT FOR BETTER DECISIONS', icon:Globe2, problem:'Market conditions, policy signals and customer needs are nuanced across East Africa. Generic assumptions can obscure the real opportunity.', offer:'GEIT provides focused research and analysis to help clients understand market context, test propositions and plan with evidence.', scope:['Market and value-chain mapping','Policy and regulatory context review','Demand and customer research','Competitive and scenario analysis'], deliverables:['Research brief or report','Market landscape and assumptions','Opportunity assessment','Strategic implications'], beneficiaries:'Investors, energy businesses, development organisations and public-sector decision-makers.'},
 {slug:'energy-technology-solutions', title:'Energy Technology Solutions', kicker:'TECHNOLOGY WITH A PURPOSE', icon:Cpu, problem:'New energy technologies are not valuable simply because they are new. Fit, interoperability, operating capability and economics determine whether they solve the right problem.', offer:'We help clients evaluate and shape technology solutions around actual use cases, operational needs and commercial realities.', scope:['Requirements and use-case definition','Technology landscape review','Solution architecture and fit assessment','Deployment considerations'], deliverables:['Technology options matrix','Functional requirements','Solution concept','Implementation considerations'], beneficiaries:'Organisations exploring digital, distributed or more flexible energy systems.'},
 {slug:'renewable-energy-advisory', title:'Renewable Energy Advisory', kicker:'RENEWABLES, PROPERLY ASSESSED', icon:Sun, problem:'Renewable energy decisions depend on resource, load, site constraints, grid conditions, financing and operational priorities—not on a single headline metric.', offer:'Our advisory work helps clients assess renewable options in context and build a credible path from interest to informed decision.', scope:['Load and site context review','Technology and configuration options','Commercial assumptions and sensitivities','Delivery and integration considerations'], deliverables:['Renewable options assessment','Key assumptions and risks','Indicative concept and next steps','Decision support materials'], beneficiaries:'Businesses, institutions, project sponsors and investors.'},
  {slug:'energy-efficiency-auditing', title:'Energy Efficiency & Energy Auditing', kicker:'FIND THE REAL OPPORTUNITY', icon:BarChart3, problem:'Energy waste can be hidden in systems, schedules and maintenance practices. A useful audit must connect observations to actionable priorities.', offer:'GEIT conducts structured energy-use reviews and efficiency assessments, clearly stating scope, evidence and limitations. We do not claim external accreditation or certification.', scope:['Available energy data and bill review','Site and system observations where agreed','Operational practice and load analysis','Opportunity screening'], deliverables:['Assessment findings','Efficiency opportunity register','Indicative implementation priorities','Measurement and verification considerations'], beneficiaries:'Facility managers, industrial operators, institutions and building owners.'},
 {slug:'battery-energy-storage-flexibility', title:'Battery Energy Storage & Energy Flexibility Consulting', kicker:'FLEXIBILITY, WITHOUT THE HYPE', icon:BatteryCharging, problem:'Storage value depends on when and how a system operates, tariffs, grid conditions, technical constraints and the ability to manage risk over time.', offer:'We assess storage and flexibility use cases with transparent assumptions, helping clients determine whether a deeper feasibility study is warranted.', scope:['Load profile and operating context review','Use-case and dispatch logic assessment','Technical and commercial scenario screening','Integration and risk considerations'], deliverables:['Use-case assessment','Scenario assumptions','Indicative value drivers and risks','Recommended next-step scope'], beneficiaries:'Commercial and industrial energy users, asset owners and project developers.'},
 {slug:'ev-charging-infrastructure', title:'EV Charging Infrastructure Advisory', kicker:'PLAN FOR THE LOAD AHEAD', icon:PlugZap, problem:'Charging infrastructure affects site power, user experience, fleet operations and future capacity. Poorly sequenced investments can create avoidable constraints.', offer:'GEIT supports strategic planning for charging infrastructure, connecting mobility requirements with energy-system and site considerations.', scope:['Fleet, user and site requirements','Charging demand and phasing scenarios','Electrical capacity considerations','Technology and operating model options'], deliverables:['Charging strategy','Phased infrastructure plan','Requirements and assumptions','Decision and procurement guidance'], beneficiaries:'Property owners, fleet operators, institutions and mobility stakeholders.'},
 {slug:'ai-energy-analytics-digital-solutions', title:'AI-Powered Energy Analytics & Digital Energy Solutions', kicker:'DATA INTO DECISIONS', icon:Network, problem:'Energy data is often fragmented, underused or disconnected from operating decisions. Sophisticated tools can add noise if the underlying questions are unclear.', offer:'We design practical digital-energy approaches that connect fit-for-purpose data, analytics and workflows to decisions people need to make.', scope:['Data readiness and use-case definition','Analytics and platform options','Architecture and integration considerations','Governance and adoption planning'], deliverables:['Digital energy opportunity map','Use-case and data requirements','Solution recommendations','Phased adoption roadmap'], beneficiaries:'Energy managers, facility teams, multi-site operators and energy service providers.'},
 {slug:'carbon-footprint-services', title:'Carbon Footprint Services', kicker:'MEASURE WITH TRANSPARENCY', icon:Leaf, problem:'Organisations need a clear, defensible view of emissions sources before setting priorities. Boundaries, data quality and estimation choices matter.', offer:'GEIT supports carbon-footprint measurement and planning with transparent methodology, documented boundaries and practical next steps. This is not a certification service.', scope:['Organisational boundary and activity mapping','Data collection and quality review','Emissions estimation using agreed methods','Reduction opportunity screening'], deliverables:['Footprint assessment','Boundary and assumptions register','Data limitations and improvement plan','Practical decarbonisation priorities'], beneficiaries:'Businesses and institutions building a clearer emissions baseline or transition plan.'}
];
const industries = ['Commercial & industrial','Buildings & real estate','Public institutions','Energy developers & investors','Transport & mobility','Development organisations'];
const process = [{n:'01',title:'Frame the decision',text:'We clarify the question, context, constraints and evidence needed to move forward.'},{n:'02',title:'Build the analysis',text:'We examine available data, test options and make assumptions and uncertainty visible.'},{n:'03',title:'Make it actionable',text:'We translate findings into priorities, decision materials and practical next steps.'}];

function Schema(){
  const { c, language } = useLanguage();

  useEffect(()=>{
    document.getElementById('geit-schema')?.remove();
    const publicUrl=(import.meta.env.VITE_PUBLIC_SITE_URL as string|undefined)?.replace(/\/$/,'');
    const organization:Record<string,unknown>={'@context':'https://schema.org','@type':'Organization','name':'Global Energy Innovation Technologies Ltd','alternateName':'GEIT Ltd','description':'Rwanda-based energy intelligence company supporting technically rigorous, commercially sound energy decisions.','foundingLocation':{'@type':'Place','name':'Rwanda'},'founders':[{'@type':'Person','name':'Dr. Hyacinthe M. Nshuti'},{'@type':'Person','name':'Mr. Noel Dushimiyimana'}]};
    if(publicUrl) organization.url=publicUrl;
    organization.description = c("Rwanda-based energy intelligence company supporting technically rigorous, commercially sound energy decisions.");
    organization.inLanguage = language;
    const script=document.createElement('script');
    script.id='geit-schema';
    script.type='application/ld+json';
    script.textContent=JSON.stringify(organization);
    document.head.appendChild(script);
    return () => { script.remove(); };
  },[c, language]);
  return null;
}
function ArrowLink({href,children,light=false}: {href:string;children:string;light?:boolean}) {
  const { c } = useLanguage();
return <Link href={href} data-testid={`link-${href.replaceAll('/','-')||'home'}`} className={`inline-flex items-center gap-3 text-sm font-bold transition-all hover:gap-5 ${light?'text-white':'text-[#168568]'}`}>{c(children)}<ArrowRight size={17}/></Link>}
function ButtonLink({href,children,secondary=false}: {href:string;children:string;secondary?:boolean}) {
  const { c } = useLanguage();
return <Link href={href} data-testid={`button-link-${href.replaceAll('/','-')||'home'}`} className={`inline-flex items-center justify-center gap-3 px-6 py-4 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${secondary?'border border-white/35 text-white hover:bg-white/10':'bg-[#168568] text-white hover:bg-[#116d55]'}`}>{c(children)}<ArrowUpRight size={17}/></Link>}
function Shell({children}: {children:ReactNode}){const [shellPath]=useLocation();return <div className={`grain min-h-[100dvh] geit-public${shellPath==="/"?"":" geit-corp"}`}><div className="corporate-backdrop" aria-hidden="true" data-testid="corporate-backdrop"><img src={`${import.meta.env.BASE_URL}images/homepage-background.webp`} alt="" width="1024" height="558" decoding="async"/></div><Schema/><RouteScroll/><SiteHeader/><AppNav/><main>{children}</main><SiteFooter/><FloatingConsultation/><SupportWidget/></div>}
function Eyebrow({children}: {children:string}){
  const { c } = useLanguage();
return <p className="geit-section-label mb-5 flex items-center gap-3 text-[11px] font-bold tracking-[.19em] text-[#168568]"><span className="h-[2px] w-7 bg-[#e8b64b]"/>{c(children)}</p>}
function Breadcrumb({items}: {items:{label:string;href?:string}[]}){
  const { c } = useLanguage();
return <nav aria-label={c("Breadcrumb")} className="mb-8 flex flex-wrap items-center gap-2 text-xs text-[#6b7b87]">{items.map((item,i)=><span key={item.label} className="inline-flex items-center gap-2">{i>0&&<ChevronRight size={13}/ >}{item.href?<Link href={item.href} className="hover:text-[#168568]">{c(item.label)}</Link>:<span aria-current="page" className="text-[#10243a]">{c(item.label)}</span>}</span>)}</nav>}
function ServiceCard({service,index=0}: {service:typeof services[number];index?:number}){
  const { c } = useLanguage();
return <article className="group flex min-h-[260px] flex-col overflow-hidden border border-[#dce3e8] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#168568]/45 hover:shadow-[0_18px_45px_-30px_rgba(16,36,58,.35)]" data-testid={`card-service-${service.slug}`}><div className="-mx-7 -mt-7"><ServiceImage slug={service.slug} title={service.title}/></div><span className="mt-5 self-end font-mono text-xs text-[#a1adb6]">{String(index+1).padStart(2,'0')}</span><h3 className="mt-3 text-xl font-bold leading-snug text-[#10243a]">{c(service.title)}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#647481]">{c(service.offer)}</p><Link href={`/services/${service.slug}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-[#168568]">{c("Explore service ")}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></Link></article>}
function HomePage(){
  const { c } = useLanguage();
return <><Meta title="Energy Intelligence for Better Decisions" description="GEIT Ltd is a global energy and technology company helping businesses and institutions make technically rigorous, commercially sound energy decisions." path="/"/>
<section className="relative isolate min-h-[650px] overflow-hidden text-white lg:min-h-[690px]" data-testid="home-hero">
  <HeroOrb/>
  <div className="relative mx-auto flex min-h-[650px] max-w-[1320px] flex-col justify-between gap-24 px-5 py-6 sm:py-8 lg:min-h-[690px] lg:px-10 lg:py-10">
    <div className="hero-topbar grid grid-cols-2 items-start gap-3 sm:flex sm:justify-between sm:gap-6" data-testid="hero-top-content">
      <div className="hero-heading min-w-0 page-reveal"><Eyebrow>GLOBAL ENERGY &amp; TECHNOLOGY</Eyebrow></div>
      <div className="hero-glass flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-[9px] font-semibold tracking-[.1em] sm:px-4 sm:text-xs sm:tracking-[.14em]" data-testid="hero-outlook">
        <span className="h-px w-5 shrink-0 bg-[#e8b64b] sm:w-10"/>{c("GLOBAL OUTLOOK · BUILT FOR WHAT'S NEXT")}
      </div>
    </div>
    <div className="relative min-w-0 max-w-[790px] self-center text-center page-reveal" data-testid="hero-bottom-content">
      <HeroHeadline/>
    </div>
  </div>
</section>
<section className="border-b border-[#dce3e8] bg-[#f2f5f7]" data-testid="home-introduction">
  <div className="mx-auto grid max-w-[1320px] items-center gap-6 px-5 py-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-10 lg:px-10">
    <div className="flex flex-col gap-3 sm:flex-row" data-testid="hero-actions">
      <ButtonLink href="/contact">Request a Consultation</ButtonLink>
    </div>
    <p className="rounded-lg border border-[#dce3e8] bg-white p-5 text-base leading-7 text-[#10243a] shadow-sm" data-testid="hero-summary-box">{c("Integrated consulting, project development, digital energy and carbon services—grounded in data, rigorous analysis and sound economics.")}</p>
    <div className="justify-self-end">
      <ButtonLink href="/services" secondary>Explore Our Services</ButtonLink>
    </div>
  </div>
</section>
<section className="bg-white"><div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-16 md:grid-cols-[.65fr_1.6fr] md:items-center lg:px-10 lg:py-20"><Eyebrow>THE GEIT APPROACH</Eyebrow><div><p className="max-w-3xl text-2xl font-semibold leading-snug text-[#10243a] sm:text-3xl">{c("Energy decisions should be driven by data, rigorous analysis and sound economics.")}</p><p className="mt-5 max-w-3xl text-sm leading-7 text-[#667782]">{c("We bring technical understanding and commercial thinking together—so organisations can move from fragmented information to a considered next step.")}</p></div></div></section>
<section className="bg-[#e9eff1]"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><Eyebrow>FOUR WAYS WE CREATE MOMENTUM</Eyebrow><h2 className="max-w-[560px] text-3xl font-bold text-[#10243a] sm:text-4xl">{c("Energy challenges rarely sit in one box.")}</h2></div><p className="max-w-md text-sm leading-7 text-[#60717e]">{c("Our capabilities connect operational performance to investment, digital capability and climate priorities.")}</p></div><div className="mt-10 grid gap-px bg-[#d0dce1] sm:grid-cols-2 xl:grid-cols-4">{[{n:'01',title:'Optimize',text:'Find practical opportunities to improve how energy is used and managed.',icon:Zap},{n:'02',title:'Invest',text:'Evaluate projects and technologies with clearer assumptions and commercial context.',icon:BarChart3},{n:'03',title:'Digitize',text:'Turn data into useful insight, better visibility and stronger operating decisions.',icon:Cpu},{n:'04',title:'Decarbonize',text:'Understand emissions and identify credible, staged pathways to reduce them.',icon:Leaf}].map(({n,title,text,icon:Icon})=><article key={title} className="bg-[#f2f5f7] p-7 sm:p-8"><span className="font-mono text-xs text-[#168568]">{n}</span><Icon className="mt-7 text-[#168568]" size={23}/><h3 className="mt-5 text-2xl font-bold text-[#10243a]">{c(title)}</h3><p className="mt-3 text-sm leading-6 text-[#667782]">{c(text)}</p></article>)}</div></div></section>
<section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><Eyebrow>CAPABILITIES</Eyebrow><h2 className="text-3xl font-bold text-[#10243a] sm:text-4xl">{c("Expertise for decisions in motion.")}</h2></div><ArrowLink href="/services">View all services</ArrowLink></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.slice(0,6).map((s,i)=><ServiceCard key={s.slug} service={s} index={i}/>)}</div></div></section>
<WhatGeitDoes/>
<SectorsHome/><HowWeWork/><WhyGeit/>
<section className="bg-[#e6f0ed]"><div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-20"><div><Eyebrow>DIGITAL ENERGY</Eyebrow><h2 className="max-w-xl text-3xl font-bold leading-tight text-[#10243a] sm:text-4xl">{c("A clearer view of energy, built around the decisions you need to make.")}</h2><p className="mt-5 max-w-lg text-sm leading-7 text-[#536a72]">{c("From data readiness and analytics to technology selection, we help organisations build practical digital-energy capability—not dashboards without a purpose.")}</p><div className="mt-7"><ArrowLink href="/digital-energy-solutions">Explore digital energy solutions</ArrowLink></div></div><div className="relative min-h-[290px] overflow-hidden bg-[#10243a] p-8 text-white"><div className="absolute right-[-40px] top-[-45px] h-64 w-64 rounded-full border border-white/10"/><div className="absolute right-[-5px] top-[-10px] h-48 w-48 rounded-full border border-[#168568]/70"/><p className="text-xs font-bold tracking-[.16em] text-[#e8b64b]">{c("FROM DATA TO ACTION")}</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{['Understand','Interpret','Act'].map((step,i)=><div key={step} className="relative border-t border-white/30 pt-4"><span className="font-mono text-xs text-[#e8b64b]">0{i+1}</span><h3 className="mt-2 text-lg font-bold">{c(step)}</h3><p className="mt-2 text-xs leading-5 text-white/60">{c(['Make energy information visible.','Surface the signal in context.','Put insight to work.'][i])}</p></div>)}</div></div></div></section>
<section className="bg-white"><div className="geit-readable-glass mx-auto grid max-w-[1320px] gap-9 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10 lg:py-20" id="low-carbon-transition"><div className="order-2 border-l-2 border-[#e8b64b] bg-[#f2f5f7] p-8 lg:order-1"><p className="text-xs font-bold tracking-[.16em] text-[#168568]">{c("CARBON, WITH CONTEXT")}</p><h3 className="mt-4 text-2xl font-bold text-[#10243a]">{c("Measure what matters. Be clear about what you know.")}</h3><p className="mt-4 text-sm leading-7 text-[#60717e]">{c("We help organisations establish boundaries, assemble activity data and understand where estimation and data-quality limits apply—then translate findings into practical priorities.")}</p><div className="mt-6"><ArrowLink href="/carbon-footprint-services">Explore carbon footprint services</ArrowLink></div></div><div className="order-1 lg:order-2"><Eyebrow>LOW-CARBON TRANSITION</Eyebrow><h2 className="text-3xl font-bold leading-tight text-[#10243a] sm:text-4xl">{c("Decarbonisation starts with an honest baseline.")}</h2><p className="mt-5 text-sm leading-7 text-[#647481]">{c("Our carbon footprint work is transparent about methodology and scope. We focus on making the next step clearer—not on unsupported claims or shortcuts.")}</p></div></div></section>
<section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><Eyebrow>INSIGHTS FOR PRACTITIONERS</Eyebrow><h2 className="text-3xl font-bold text-[#10243a] sm:text-4xl">{c("Useful questions, considered answers.")}</h2></div><ArrowLink href="/insights">Browse insights</ArrowLink></div><div className="mt-9 grid gap-4 md:grid-cols-3">{[{tag:'DECISION NOTE',title:'What belongs in an energy investment case?',text:'A practical view of assumptions, risk and decision gates for energy projects.'},{tag:'FIELD GUIDE',title:'Before you buy an energy analytics platform',text:'Start with the operating question, then assess data and technology fit.'},{tag:'EXPLAINER',title:'Building a useful organisational carbon baseline',text:'Boundaries, data quality and transparency are the foundations of useful measurement.'}].map((item,i)=><article key={item.title} className="flex min-h-[230px] flex-col border-t-2 border-[#168568] bg-white p-6"><span className="text-[10px] font-bold tracking-[.16em] text-[#168568]">{c(item.tag)}</span><h3 className="mt-5 text-xl font-bold leading-snug text-[#10243a]">{c(item.title)}</h3><p className="mt-3 text-sm leading-6 text-[#687985]">{c(item.text)}</p><Link href="/insights" className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#168568]">{c("Read insight ")}<ArrowRight size={15}/></Link></article>)}</div><p className="mt-5 text-xs text-[#7b8992]">{c("Perspectives are educational and do not replace project-specific technical, legal or financial advice.")}</p></div></section>
<SaasFaqSection/>
<section className="bg-[#168568] text-white"><div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-20"><div><Eyebrow>START WITH THE QUESTION</Eyebrow><h2 className="max-w-md text-3xl font-bold leading-tight sm:text-4xl">{c("What energy decision is in front of you?")}</h2><p className="mt-5 max-w-md text-sm leading-7 text-white/80">{c("Share a little context. We’ll help you identify a sensible first step and the right expertise to bring to it.")}</p><div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/85"><ShieldCheck size={19}/>{c("Independent. Practical. Data-led.")}</div></div><ContactForm/></div></section></>}
function PageHero({eyebrow,title,description}: {eyebrow:string;title:string;description:string}){
  const { c } = useLanguage();
return <section className="bg-[#10243a] text-white"><div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20"><Eyebrow>{eyebrow}</Eyebrow><h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">{c(title)}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/70">{c(description)}</p></div></section>}
function ServiceDetail({service}: {service:typeof services[number]}) {
  const { c } = useLanguage();

  const methodology = serviceMethodologies[service.slug];

  return (
    <>
      <Meta
        title={service.slug === 'carbon-footprint-services' ? 'Carbon Footprint Assessment — Scope & Deliverables' : service.title}
        description={service.offer}
        path={`/services/${service.slug}`}
      />
      <PageHero eyebrow={service.kicker} title={service.title} description={service.offer} />
      <section className="bg-[#f2f5f7]">
        <div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: service.title },
            ]}
          />
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr]">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="bg-[#168568] p-8 text-white">
                <div className="-mx-8 -mt-8"><ServiceImage slug={service.slug} title={service.title}/></div>
                <p className="mt-7 text-xs font-bold tracking-[.16em] text-white/70">{c("A PRACTICAL STARTING POINT")}</p>
                <h2 className="mt-3 text-2xl font-bold">{c("A better decision begins with the right question.")}</h2>
                <p className="mt-4 text-sm leading-6 text-white/75">{c("We’ll shape the work around your context, available evidence and decision needs.")}</p>
                <Link
                  href="/contact"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white underline underline-offset-4"
                >{c("Discuss this service ")}<ArrowRight size={16} />
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#73828d]">{c("Scope and outputs are tailored to the assignment. Any methodology used is agreed with the client and documented.")}</p>
            </aside>
            <div className="space-y-10">
              <section>
                <Eyebrow>{"THE CLIENT CHALLENGE"}</Eyebrow>
                <h2 className="text-2xl font-bold text-[#10243a]">{c("The problem we help untangle")}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5d707c]">{c(service.problem)}</p>
              </section>
              <section>
                <Eyebrow>{"GEIT'S OFFERING"}</Eyebrow>
                <h2 className="text-2xl font-bold text-[#10243a]">{c("Independent analysis, built around your decision")}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5d707c]">
                  {c(service.offer)}{c("Our role is to make the evidence, trade-offs and next steps easier to understand—not to prescribe a one-size-fits-all answer.")}</p>
              </section>
              <div className="grid gap-8 md:grid-cols-2">
                <section>
                  <h3 className="border-b border-[#d5dfe4] pb-4 text-lg font-bold text-[#10243a]">{c("Typical scope")}</h3>
                  <ul className="mt-4 space-y-3">
                    {service.scope.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-[#566b77]">
                        <Check size={16} className="mt-1 shrink-0 text-[#168568]" />
                        {c(item)}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="border-b border-[#d5dfe4] pb-4 text-lg font-bold text-[#10243a]">{c("Potential deliverables")}</h3>
                  <ul className="mt-4 space-y-3">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-[#566b77]">
                        <ArrowRight size={16} className="mt-1 shrink-0 text-[#168568]" />
                        {c(item)}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <section>
                <Eyebrow>{"METHODOLOGY"}</Eyebrow>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5d707c]">
                  {c(methodology.summary)}
                </p>
                <div className="mt-4 divide-y divide-[#d5dfe4] border-y border-[#d5dfe4]">
                  {methodology.steps.map((item, index) => (
                    <div key={item.title} className="grid gap-3 py-5 sm:grid-cols-[52px_1fr]">
                      <span className="font-mono text-xs text-[#168568]">0{index + 1}</span>
                      <div>
                        <h3 className="font-bold text-[#10243a]">{c(item.title)}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#657681]">{c(item.description)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <Eyebrow>{"TARGET CLIENTS"}</Eyebrow>
                <p className="mt-2 text-sm leading-7 text-[#5d707c]">{c(service.beneficiaries)}</p>
              </section>
              <section className="border-t border-[#d5dfe4] pt-7">
                <Eyebrow>{"NEXT STEPS"}</Eyebrow>
                <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <p className="max-w-xl text-sm leading-6 text-[#62737e]">
                    {c("Tell us about your question on {service}, the decision timeline and any information you already have. We’ll help identify a sensible starting point and clarify what would be needed to define the scope.", { service: c(service.title) })}
                  </p>
                  <ButtonLink href="/contact">{"Request a consultation"}</ButtonLink>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function ServicesPage(){
  const { c } = useLanguage();
return <><Meta title={"Energy Services"} description={"Explore GEIT Ltd's independent energy management, consulting, project development, digital, renewable and carbon services."} path="/services"/><PageHero eyebrow={"OUR SERVICES"} title={"Energy expertise, connected to the decision."} description={"From operational performance to investment and decarbonisation, our services combine technical depth with commercial perspective."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'Services'}]}/><div className="mb-9 grid gap-4 border-l-2 border-[#e8b64b] bg-white geit-glass p-6 sm:grid-cols-[1fr_auto] sm:items-center"><p className="max-w-3xl text-sm leading-7 text-[#5f707c]">{c("Every engagement is shaped to the client’s context, available information and intended use. We are transparent about assumptions and limits.")}</p><ArrowLink href="/contact">{"Talk through a brief"}</ArrowLink></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.map((s,i)=><ServiceCard key={s.slug} service={s} index={i}/>)}</div></div></section></>}
function AboutPage(){
  const { c } = useLanguage();
return <><Meta title={"About GEIT"} description={"Learn about GEIT Ltd, a Rwanda-based energy intelligence company built around independent, practical and evidence-led decisions."} path="/about"/><PageHero eyebrow={"ABOUT GEIT"} title={"Independent energy intelligence, rooted in Rwanda."} description={"Global Energy Innovation Technologies Ltd helps organisations make energy decisions with technical rigour, commercial clarity and a practical understanding of context."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-12 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'About'}]}/><div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]"><div><Eyebrow>{"WHY WE EXIST"}</Eyebrow><h2 className="text-3xl font-bold leading-tight text-[#10243a] sm:text-4xl">{c("A trusted partner for decisions that shape energy futures.")}</h2><p className="mt-6 text-sm leading-7 text-[#5f707c]">{c("Energy systems are changing, but every organisation faces its own constraints and opportunities. GEIT exists to make the decisions in front of businesses and institutions clearer—through integrated consulting, project development, digital energy and carbon services.")}</p><p className="mt-4 text-sm leading-7 text-[#5f707c]">{c("We are based in Rwanda and work with a regional and international outlook. Our perspective combines local context with the analytical discipline needed by clients, investors and partners.")}</p></div><div className="grid gap-4 sm:grid-cols-2"><article className="bg-white geit-glass p-7"><span className="text-xs font-bold tracking-[.16em] text-[#e8b64b]">{c("OUR MISSION")}</span><p className="mt-4 text-sm leading-7 text-[#10243a]">{c("To provide independent, data-driven energy consulting, project development and digital technology solutions that reduce energy costs, improve reliability, accelerate renewable-energy adoption, measure and reduce greenhouse-gas emissions, and support the energy transition.")}</p></article><article className="bg-[#10243a] p-7 text-white"><span className="text-xs font-bold tracking-[.16em] text-[#e8b64b]">{c("OUR VISION")}</span><p className="mt-4 text-sm leading-7 text-white/80">{c("To be a leading African energy innovation company, helping organizations make smarter, cleaner and more cost-effective energy decisions.")}</p></article></div></div><div className="mt-14 border-t border-[#d5dfe4] pt-10"><Eyebrow>{"OUR VALUES"}</Eyebrow><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{['Technical rigor','Independence','Measurable impact','Integrity','Safety and compliance','Innovation','African relevance','Credible carbon accounting'].map((value,i)=><article key={value}><span className="font-mono text-xs text-[#168568]">0{i+1}</span><h3 className="mt-2 text-lg font-bold text-[#10243a]">{c(value)}</h3></article>)}</div></div><FoundersLeadership/></div></section><section className="bg-[#168568] px-5 py-14 text-white"><div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-6 sm:flex-row sm:items-center lg:px-10"><div><p className="text-xs font-bold tracking-[.16em] text-white/70">{c("ENERGY INTELLIGENCE. MEASURABLE IMPACT.")}</p><h2 className="mt-3 text-2xl font-bold">{c("Let’s work through your energy question.")}</h2></div><ButtonLink href="/contact" secondary>{"Talk to GEIT"}</ButtonLink></div></section></>}
function IndustriesPage(){
  const { c } = useLanguage();
return <><Meta title="Industries & Solutions" description="GEIT Ltd supports businesses, institutions, asset owners and investors with energy solutions shaped for their sector and operating context." path="/industries"/><PageHero eyebrow="INDUSTRIES & SOLUTIONS" title="Different sectors. Distinct energy realities." description="We adapt our analysis to the way your organisation uses energy, manages assets and makes investment decisions."/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'Industries & Solutions'}]}/><IndustriesContent/><div className="mt-10 bg-[#10243a] p-8" id="shared-commitment"><Eyebrow>A SHARED COMMITMENT</Eyebrow><p className="max-w-3xl text-xl font-semibold leading-relaxed text-white">{c("Energy decisions should be driven by data, rigorous analysis and sound economics—regardless of sector or scale.")}</p></div></div></section></>}
function DigitalPage(){
  const { c } = useLanguage();
return <><Meta title={"Digital Energy Solutions"} description={"GEIT Ltd helps organisations define data, analytics and technology approaches that support useful energy decisions."} path="/digital-energy-solutions"/><PageHero eyebrow={"DIGITAL ENERGY SOLUTIONS"} title={"Turn energy data into decisions people can use."} description={"A practical approach to digital energy starts with the decision—not the dashboard. We help clients connect data, analytics and workflows to real operating needs."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'Digital energy solutions'}]}/><div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]"><div><Eyebrow>{"THE OPPORTUNITY"}</Eyebrow><h2 className="text-3xl font-bold text-[#10243a]">{c("A better signal in the noise.")}</h2><p className="mt-5 text-sm leading-7 text-[#62737e]">{c("Energy data is spread across bills, meters, operational systems and people. We help determine what information matters, what it can support and how to use it responsibly.")}</p><p className="mt-4 text-sm leading-7 text-[#62737e]">{c("Our work may include data readiness, analytical use cases, technology options and adoption planning. Specific scope depends on client systems and information access.")}</p><div className="mt-7"><ButtonLink href="/services/ai-energy-analytics-digital-solutions">{"Explore our digital energy service"}</ButtonLink></div></div><div className="space-y-3">{[{t:'Define the use case',d:'What decision or routine should improve? What evidence would be useful?'},{t:'Understand the data',d:'Assess availability, quality, ownership and integration needs.'},{t:'Choose the right fit',d:'Compare platform and analytics options against requirements—not trends.'},{t:'Support adoption',d:'Build clear workflows, responsibilities and a phased path forward.'}].map((x,i)=><article className="grid gap-4 border border-[#dce3e8] bg-white geit-glass p-5 sm:grid-cols-[52px_1fr]" key={x.t}><span className="font-mono text-sm text-[#168568]">0{i+1}</span><div><h3 className="font-bold text-[#10243a]">{c(x.t)}</h3><p className="mt-2 text-sm leading-6 text-[#667782]">{c(x.d)}</p></div></article>)}</div></div><div className="mt-14 grid gap-5 border-t border-[#d5dfe4] pt-10 md:grid-cols-3">{['Energy performance visibility','Technology and data fit','Operational decision support'].map(x=><div key={x}><Network className="text-[#168568]" size={22}/><h3 className="mt-4 font-bold text-[#10243a]">{c(x)}</h3><p className="mt-2 text-sm leading-6 text-[#667782]">{c("An evidence-led path shaped by organisational needs and technical context.")}</p></div>)}</div></div></section><ConsultationStrip/></>}
function CarbonPage(){
  const { c } = useLanguage();
const carbon=services.find(s=>s.slug==='carbon-footprint-services')!;return <><Meta title={"Carbon Footprint Services"} description={"GEIT Ltd supports transparent carbon footprint measurement and practical reduction planning for businesses and institutions."} path="/carbon-footprint-services"/><PageHero eyebrow={"CARBON FOOTPRINT SERVICES"} title={"Understand your footprint. Plan the next step."} description={"A useful carbon baseline makes boundaries, methods and data limitations visible. GEIT helps organisations measure transparently and identify practical priorities."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'Carbon footprint services'}]}/><div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]"><div className="bg-[#10243a] p-8 text-white"><Leaf size={25} className="text-[#e8b64b]"/><h2 className="mt-7 text-2xl font-bold">{c("Clarity before claims.")}</h2><p className="mt-4 text-sm leading-6 text-white/65">{c("Footprint work must be transparent about scope and data quality. We do not present an estimate as a verified result or claim certification.")}</p><Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#e8b64b]">{c("Discuss a baseline ")}<ArrowRight size={16}/></Link></div><div><Eyebrow>{"OUR APPROACH"}</Eyebrow><h2 className="text-3xl font-bold text-[#10243a]">{c("Start with boundaries, evidence and purpose.")}</h2><p className="mt-5 text-sm leading-7 text-[#62737e]">{c("We agree the intended use and organisational boundaries, review available activity data, document estimation approaches and make data limitations clear. The output is designed to help clients understand their position and decide what to improve next.")}</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{carbon.scope.map(item=><div key={item} className="flex gap-3 border border-[#dce3e8] bg-white geit-glass p-4 text-sm leading-6 text-[#526775]"><Check className="mt-1 shrink-0 text-[#168568]" size={16}/>{c(item)}</div>)}</div></div></div><div className="mt-12 border-t border-[#d5dfe4] pt-10"><Eyebrow>{"ILLUSTRATIVE METHODOLOGY"}</Eyebrow><p className="max-w-4xl text-sm leading-7 text-[#62737e]">{c("An illustrative engagement may include agreeing organisational boundaries, mapping relevant activity sources, collecting and checking data, applying an agreed emissions-factor approach, documenting assumptions and reviewing reduction opportunities. The applicable methodology, factors and reporting boundary are confirmed for each assignment. This description is educational and does not indicate a certification or verification service.")}</p></div></div></section><ConsultationStrip/></>}
function InsightsPage(){
  const { c } = useLanguage();
return <><Meta title={"Energy Insights"} description={"Practical educational notes from GEIT Ltd on energy decisions, digital energy and carbon measurement."} path="/insights"/><PageHero eyebrow={"INSIGHTS"} title={"Useful perspectives for real energy decisions."} description={"Short, practical explainers to help teams ask better questions. These educational notes do not replace assignment-specific technical, legal or financial advice."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:'Insights'}]}/><div className="grid gap-4 md:grid-cols-2">{[{tag:'DECISION NOTE',title:'What belongs in an energy investment case?',text:'A useful investment case makes its assumptions visible. Clarify the decision, map alternatives, separate known costs from estimates, test sensitivities and record risks alongside expected benefits. The result should help a decision-maker understand what evidence could change the choice.',read:'Energy consulting'},{tag:'FIELD GUIDE',title:'Before you buy an energy analytics platform',text:'Start with a recurring operational question. Then identify the data needed, who owns it, how it is collected and what response a useful insight should trigger. Compare tools only after requirements, integrations and adoption needs are understood.',read:'Digital energy'},{tag:'EXPLAINER',title:'Building a useful organisational carbon baseline',text:'A baseline is only as useful as its stated purpose, boundaries and data. Document where figures came from, which factors and estimation choices were applied, and where gaps remain. Transparency allows future measurement to improve.',read:'Carbon measurement'},{tag:'PRACTICE NOTE',title:'Why load profiles matter to flexibility decisions',text:'Storage and flexible-load propositions depend on operating patterns, constraints and the value of shifting demand. A profile helps reveal timing; it does not, on its own, demonstrate feasibility or commercial value.',read:'Energy flexibility'}].map((x,i)=><article key={x.title} className="border border-[#dce3e8] bg-white geit-glass p-7"><span className="text-[10px] font-bold tracking-[.16em] text-[#168568]">{c(x.tag)} · 0{i+1}</span><h2 className="mt-5 text-2xl font-bold leading-snug text-[#10243a]">{c(x.title)}</h2><p className="mt-4 text-sm leading-7 text-[#62737e]">{c(x.text)}</p><div className="mt-6 border-t border-[#e4e9ec] pt-4 text-xs font-semibold text-[#168568]">{c("RELATED: ")}{c(x.read)}</div></article>)}</div><p className="mt-8 text-xs leading-5 text-[#74838d]">{c("All methodologies and process examples are illustrative. Scope, data sources and conclusions depend on the specific assignment.")}</p></div></section></>}
function ContactPage(){
  const { c } = useLanguage();
return <>
  <Meta title="Contact GEIT" description="Contact GEIT Ltd to discuss energy management, consulting, project development, digital energy or carbon services." path="/contact"/>
  <PageHero eyebrow="CONTACT GEIT" title="Start with the energy question on your mind." description="The enquiry form is not connected yet, so it will not send your details. You can still use it to organize the information you may want to share later."/>
  <section className="bg-[#e7eeef]">
    <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-10 lg:grid-cols-[.7fr_1.3fr] lg:px-10">
      <div>
        <Breadcrumb items={[{label:'Home',href:'/'},{label:'Contact'}]}/>
        <Eyebrow>{"INDEPENDENT. PRACTICAL. DATA-LED."}</Eyebrow>
        <h2 className="text-3xl font-bold leading-tight text-[#10243a]">{c("What would you like to make clearer?")}</h2>
        <p className="mt-5 text-sm leading-7 text-[#60717e]">{c("Maybe you are weighing a project, comparing options or trying to understand your energy use. The form can help you frame the question, but it does not send or save what you enter.")}</p>
        <div className="mt-6 rounded border border-[#d2dddf] bg-white geit-glass p-5">
          <ContactMethods />
        </div>
        <div className="mt-8 border-t border-[#d2dddf] pt-6">
          <p className="text-xs font-bold tracking-[.14em] text-[#168568]">{c("BASED IN")}</p>
          <p className="mt-2 font-semibold text-[#10243a]">{companyContact.officeAddress}</p>
          <p className="mt-1 text-sm text-[#697b85]">{c("With a regional and international outlook.")}</p>
        </div>
        <div className="mt-7 flex gap-3 border-t border-[#d2dddf] pt-6">
          <ShieldCheck className="shrink-0 text-[#168568]"/>
          <p className="text-xs leading-5 text-[#657681]">{c("This form only checks your entries in the current page. Nothing is sent to GEIT or stored by this site. Read the ")}<Link href="/privacy-policy" className="font-semibold text-[#168568] underline">{c("privacy policy")}</Link>{c("for details.")}</p>
        </div>
      </div>
      <ContactForm/>
    </div>
  </section>
</>}
function ConsultationStrip(){
  const { c } = useLanguage();
return <section className="bg-[#168568] text-white"><div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-7 px-5 py-14 sm:flex-row sm:items-center lg:px-10"><div><p className="text-xs font-bold tracking-[.16em] text-white/70">{c("ENERGY INTELLIGENCE. MEASURABLE IMPACT.")}</p><h2 className="mt-3 text-2xl font-bold">{c("Let’s make the next decision a better one.")}</h2></div><ButtonLink href="/contact" secondary>{"Request a consultation"}</ButtonLink></div></section>}
function LegalPage({kind}: {kind:'privacy'|'terms'}){
  const { c } = useLanguage();

  const privacy=kind==='privacy';
  const title=privacy?'Privacy Policy':'Terms of Use';
  const privacySections=[
    ['Enquiry form status','The enquiry form currently performs client-side validation only. It is not connected to an email service or database. Details entered into the form are not sent to GEIT or stored by this site. Please do not enter confidential or sensitive information.'],
    ['Information received by GEIT','Because the form is not connected to a submission service, GEIT does not receive information entered into it through this website. If you contact GEIT through a separate channel, information you share will relate to that separate communication.'],
    ['Retention and future changes','This website does not retain enquiry form entries. If a submission service is configured later, this notice will be updated to explain what information is collected, how it is used, and how long it is retained.'],
    ['Language preference','The selected language is saved in this browser so it can be remembered on a later visit. This setting stores only a language code; information entered in the enquiry form is never stored in browser storage.'],
    ['Security and updates','The form does not transmit or store the information entered in it. This notice may be updated when the website’s information-handling practices change.'],
  ];
  const termsSections=[
    ['Website information','Website content is provided for general informational and educational purposes. It is not a substitute for advice based on a client’s specific technical, commercial, legal, regulatory or financial circumstances.'],
    ['No reliance without engagement','Descriptions of services, possible methods and deliverables are indicative. Actual scope, assumptions, terms and outputs are set out in an agreed engagement. No savings, investment returns, emissions outcomes, accreditation or certification are guaranteed or implied.'],
    ['Intellectual property','Unless otherwise stated, website content is presented by GEIT Ltd. You may view and share links to public pages for informational purposes, but may not reproduce or commercially use material in a way that misrepresents its source or meaning.'],
    ['External links and changes','Links to external sources are provided for convenience. GEIT Ltd does not control third-party content. These terms may be updated; continued use of the website after an update indicates use subject to the updated terms.'],
    ['Company details','Global Energy Innovation Technologies Ltd (GEIT Ltd), Rwanda. Registration/TIN: 157099400.'],
  ];
  return <><Meta title={title} description={privacy ? "Information about using the GEIT Ltd website and how enquiry information is handled." : "Information about using the GEIT Ltd website."} path={privacy?'/privacy-policy':'/terms-of-use'}/><PageHero eyebrow="COMPANY INFORMATION" title={title} description={privacy ? "Information about using the GEIT Ltd website and how enquiry information is handled." : "Information about using the GEIT Ltd website."}/><section className="bg-[#f2f5f7]"><div className="mx-auto max-w-4xl px-5 py-10 lg:px-10"><Breadcrumb items={[{label:'Home',href:'/'},{label:title}]}/><div className="space-y-8 bg-white geit-glass p-7 sm:p-10"><p className="text-sm leading-7 text-[#62737e]">{c("This page provides general information about the website of Global Energy Innovation Technologies Ltd (GEIT Ltd), a company registered in Rwanda under registration/TIN 157099400.")}</p>{(privacy?privacySections:termsSections).map(([heading,body])=><section key={heading}><h2 className="text-xl font-bold text-[#10243a]">{c(heading)}</h2><p className="mt-3 text-sm leading-7 text-[#62737e]">{c(body)}</p></section>)}<section lang="en" className="border-t border-[#d5dfe4] pt-8"><p className="text-xs font-semibold text-[#168568]">WORKSPACE NOTICE · ENGLISH · SUBJECT TO LEGAL REVIEW</p><h2 className="mt-3 text-xl font-bold text-[#10243a]">{privacy ? "Energy Intelligence account data" : "Energy Intelligence workspace use"}</h2><p className="mt-3 text-sm leading-7 text-[#62737e]">{privacy ? "The separate Energy Intelligence workspace uses Supabase to store account names, email addresses, protected password credentials, organisations, memberships and administrative audit events. Account data is used for sign-in and access control. Organisation members can see fellow members’ names and roles; membership email addresses are not listed. Session and temporary verification cookies are HttpOnly; tokens and account information are not saved in browser storage. Account and organisation records persist until removed; automated retention and self-service deletion are not yet implemented. Contact GEIT through the published contact channels for access, correction or deletion requests. Hosting location, retention periods and applicable processing terms must be confirmed before production use. These account practices do not change the disconnected enquiry form described above." : "Use only accounts and organisations you are authorised to access. Owners are responsible for granting appropriate membership roles. Account and organisation management are available; service modules marked Planned do not yet perform analysis, accept datasets or generate reports. Do not upload sensitive information or treat the workspace as a production engineering system during phased development. Calculations, reports, availability guarantees, subscription billing and automated account deletion are not currently provided. Formal processing and service terms require review before production use."}</p></section></div></div></section></>}
function Router(){const [location]=useLocation();if(location==='/energy-saas')return <Redirect to="/app"/>;if(location==='/app'||location.startsWith('/app/'))return <ErrorBoundary resetKey={location}><AppRoutes/></ErrorBoundary>;return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={HomePage}/><Route path="/about" component={AboutPage}/><Route path="/services" component={ServicesPage}/>{services.map(service=><Route key={service.slug} path={`/services/${service.slug}`}><ServiceDetail service={service}/></Route>)}<Route path="/industries" component={IndustriesPage}/><Route path="/digital-energy-solutions" component={DigitalPage}/><Route path="/carbon-footprint-services" component={CarbonPage}/><Route path="/insights" component={InsightsPage}/><Route path="/contact" component={ContactPage}/><Route path="/privacy-policy"><LegalPage kind="privacy"/></Route><Route path="/terms-of-use"><LegalPage kind="terms"/></Route><Route><NotFound/></Route></Switch></Shell></ErrorBoundary>}
function App(){return <QueryClientProvider client={queryClient}><LanguageProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><Router/></WouterRouter><Toaster/></TooltipProvider></LanguageProvider></QueryClientProvider>}
export default App;
export { Router as SiteRoutes };
