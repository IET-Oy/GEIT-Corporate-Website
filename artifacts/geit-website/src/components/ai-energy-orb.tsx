import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { EnergyOrbFallback } from './energy-orb-fallback';

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
    <div ref={ref} aria-hidden="true" className={`pointer-events-none relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,rgba(16,36,58,0)_0%,#10243a_78%)]" />
      {failed ? (
        <EnergyOrbFallback />
      ) : mount ? (
        <Suspense fallback={<EnergyOrbFallback />}>
          <Scene onFallback={() => setFailed(true)} />
        </Suspense>
      ) : (
        <EnergyOrbFallback />
      )}
    </div>
  );
}

export default AiEnergyOrb;
