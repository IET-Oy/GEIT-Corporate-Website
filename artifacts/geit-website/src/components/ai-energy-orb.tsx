import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { EnergyOrbFallback } from './energy-orb-fallback';
import { useLanguage } from "@/lib/language-context";

const Scene = lazy(() => import('./ai-energy-orb-scene'));


function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Lazy-loaded GPU particle visualization. Three.js loads only when near the viewport. */
export function AiEnergyOrb({ className = '' }: { className?: string }) {
  const { c } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasWebGL()) { setFailed(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setMount(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-[#070d1a] ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#10243a_0%,#070d1a_72%)]" />
      {failed ? (
        <EnergyOrbFallback unavailable />
      ) : mount ? (
        <Suspense fallback={<EnergyOrbFallback />}>
          <Scene onFallback={() => setFailed(true)} />
        </Suspense>
      ) : (
        <EnergyOrbFallback />
      )}
      <p className="pointer-events-none absolute bottom-3 left-4 right-4 text-[10px] tracking-[.08em] text-white/45">
        {c("Illustrative visualization, not a live AI system.")}
      </p>
    </div>
  );
}

export default AiEnergyOrb;
