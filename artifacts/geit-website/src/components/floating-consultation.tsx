import { useLanguage } from "@/lib/language-context";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function FloatingConsultation() {
  const { c } = useLanguage();

  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const nearPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 560;
      setVisible(location === "/" && window.scrollY > 520 && !nearPageEnd);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [location]);

  if (!visible) return null;

  return (
    <Link
      href="/contact"
      aria-label={c("Request a consultation with GEIT")}
      data-testid="floating-consultation-cta"
      className="fixed bottom-5 right-20 z-40 sm:right-[15rem] inline-flex min-h-12 items-center gap-2 rounded-full bg-[#168568] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,36,58,.24)] transition hover:-translate-y-0.5 hover:bg-[#116d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
    >{c("Talk to GEIT")}<ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
