import { useLanguage } from "@/lib/language-context";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { PageMetadata } from "@/components/page-metadata";

export default function NotFound() {
  const { c } = useLanguage();
  return (
    <section className="grid min-h-[60vh] place-items-center bg-[#f2f5f7] px-5 py-20">
      <PageMetadata
        title="Page not found"
        description="The requested GEIT page could not be found. Explore our services or return to the homepage."
        noIndex
      />
      <div className="max-w-lg text-center">
        <p className="font-mono text-sm tracking-[.2em] text-[#168568]">{c("404 / NOT FOUND")}</p>
        <h1 className="mt-5 text-4xl font-bold text-[#10243a]">{c("This page isn’t on the map.")}</h1>
        <p className="mt-4 text-sm leading-7 text-[#687985]">
          {c("The address may have changed. Head back to the GEIT homepage or contact us about your energy question.")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-3 bg-[#168568] px-6 py-4 text-sm font-bold text-white">
            <ArrowLeft size={16} />{c("Back to homepage")}
          </Link>
          <Link href="/contact" className="inline-flex items-center border border-[#10243a] px-6 py-4 text-sm font-bold text-[#10243a] hover:bg-white">
            {c("Contact GEIT")}
          </Link>
        </div>
      </div>
    </section>
  );
}
