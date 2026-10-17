import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
function NotFoundMetadata(){
  useEffect(()=>{
    document.title='Page not found | GEIT Ltd';
    const description=document.querySelector('meta[name="description"]');
    description?.setAttribute('content','The requested GEIT page could not be found. Explore our services or return to the homepage.');
    document.querySelector('link[rel="canonical"]')?.remove();
    const robots=document.querySelector('meta[name="robots"]');
    const previous=robots?.getAttribute('content');
    robots?.setAttribute('content','noindex, follow');
    return ()=>{robots?.setAttribute('content',previous||'index, follow');};
  },[]);
  return null;
}
export default function NotFound(){return <section className="grid min-h-[60vh] place-items-center bg-[#f2f5f7] px-5 py-20"><NotFoundMetadata/><div className="max-w-lg text-center"><p className="font-mono text-sm tracking-[.2em] text-[#168568]">404 / NOT FOUND</p><h1 className="mt-5 text-4xl font-bold text-[#10243a]">This page isn’t on the map.</h1><p className="mt-4 text-sm leading-7 text-[#687985]">The address may have changed. Head back to the GEIT homepage or contact us about your energy question.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="inline-flex items-center gap-3 bg-[#168568] px-6 py-4 text-sm font-bold text-white"><ArrowLeft size={16}/>Back to homepage</Link><Link href="/contact" className="inline-flex items-center border border-[#10243a] px-6 py-4 text-sm font-bold text-[#10243a] hover:bg-white">Contact GEIT</Link></div></div></section>}
