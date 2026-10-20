import { useEffect, useId, useRef } from 'react';

const CYCLE = 26;
const FRAME_MS = 1000 / 30;

/** Bounded, hysteretic budget: never chase single-frame spikes or oscillate per frame. */
export class HeroFrameBudget {
  maxParticles = 900;
  minParticles = 450;
  particles = 900;
  private samples = 0;
  private cost = 0;
  private late = 0;
  private healthyWindows = 0;

  resize(width: number) {
    const max = width < 768 ? 900 : 1900;
    if (max !== this.maxParticles) {
      const ratio = this.particles / this.maxParticles;
      this.maxParticles = max;
      this.minParticles = width < 768 ? 450 : 700;
      this.particles = Math.max(this.minParticles, Math.round(max * ratio));
    }
    this.reset();
  }

  reset() { this.samples = this.cost = this.late = this.healthyWindows = 0; }

  observe(drawMs: number, intervalMs: number) {
    this.cost += drawMs;
    if (intervalMs > 50) this.late++;
    if (++this.samples < 30) return;
    const average = this.cost / this.samples;
    if (average > 8 || this.late >= 6) {
      this.particles = Math.max(this.minParticles, Math.floor(this.particles * 0.8));
      this.healthyWindows = 0;
    } else if (average < 4 && this.late === 0) {
      // Five healthy seconds before a small recovery; at most the responsive ceiling.
      if (++this.healthyWindows >= 5) {
        this.particles = Math.min(this.maxParticles, this.particles + 90);
        this.healthyWindows = 0;
      }
    } else this.healthyWindows = 0;
    this.samples = this.cost = this.late = 0;
  }
}

const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Weights for orb / galaxy / brain; loops seamlessly. */
export function heroPhaseWeights(time: number): [number, number, number] {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  const g = sm(4, 8, t) - sm(11.5, 15, t);
  const b = sm(11.5, 15, t) - sm(20, 24, t);
  return [Math.max(0, 1 - g - b), Math.max(0, g), Math.max(0, b)];
}
let seed = 90210;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;

export function buildHeroTargets(n: number) {
  const orb = new Float32Array(n * 3), gal = new Float32Array(n * 3), br = new Float32Array(n * 3), at = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    // orb: luminous shell + dense core
    const u = rnd() * 2 - 1, th = rnd() * 6.2832, s = Math.sqrt(1 - u * u);
    const r = rnd() < 0.72 ? 0.86 + gauss() * 0.025 : Math.pow(rnd(), 1.6) * 0.8;
    orb[k] = s * Math.cos(th) * r; orb[k + 1] = u * r; orb[k + 2] = s * Math.sin(th) * r;
    // galaxy: 2 logarithmic arms + bulge, flat disc
    const bulge = rnd() < 0.17;
    const rr = bulge ? Math.pow(rnd(), 2) * 0.28 : 0.1 + Math.pow(rnd(), 0.8) * 1.25;
    const arm = rnd() < 0.5 ? 0 : Math.PI;
    const ang = arm + Math.log(1 + rr * 5) * 2.1 + gauss() * (bulge ? 3 : 0.22 + 0.1 / (0.3 + rr));
    gal[k] = Math.cos(ang) * rr; gal[k + 1] = gauss() * (bulge ? 0.14 : 0.03); gal[k + 2] = Math.sin(ang) * rr;
    // brain (side view, front = +x)
    let x = 0, y = 0, z = 0;
    const q = rnd();
    if (q < 0.8) {
      for (let tries = 0; tries < 12; tries++) {
        const uu = rnd() * 2 - 1, tt = rnd() * 6.2832, ss = Math.sqrt(1 - uu * uu);
        let dx = ss * Math.cos(tt), dy = uu, dz = ss * Math.sin(tt);
        const f = Math.sin(dx * 8 + Math.sin(dy * 5) * 2.2) * Math.sin(dy * 9 - dz * 4) + Math.sin(dx * 13 - dy * 6) * 0.4;
        if (tries < 11 && Math.abs(f) < 0.55) continue;
        const d = 1 + f * 0.05;
        if (dy < -0.2) dy *= 0.62;
        x = dx * 1.0 * d; y = dy * 0.68 * d + 0.08; z = dz * 0.42 * d;
        if (dy < -0.3 && dx > 0.1) { y -= 0.05; x += 0.05; } // temporal lobe
        if (Math.abs(dz) < 0.05 && dy > 0.3) y -= 0.05; // fissure dip
        break;
      }
    } else if (q < 0.92) {
      const uu = rnd() * 2 - 1, tt = rnd() * 6.2832, ss = Math.sqrt(1 - uu * uu);
      const stripe = 1 + Math.sin(uu * 18) * 0.05;
      x = -0.52 + ss * Math.cos(tt) * 0.34 * stripe; y = -0.5 + uu * 0.2 * stripe; z = ss * Math.sin(tt) * 0.3;
    } else {
      const h = rnd(), tt = rnd() * 6.2832;
      x = -0.12 - h * 0.14 + Math.cos(tt) * 0.09; y = -0.42 - h * 0.55; z = Math.sin(tt) * 0.09;
    }
    br[k] = x; br[k + 1] = y; br[k + 2] = z;
    at[i * 2] = rnd(); at[i * 2 + 1] = 0.6 + rnd() * 1.2;
  }
  return { orb, gal, br, at };
}

function sprite(rgb: string) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.25, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return c;
}

/** Decorative Canvas2D hero background: orb -> spiral galaxy -> brain, looping. */
export function HeroLightField({ className = '' }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = wrap.current, canvas = cvs.current;
    const ctx = canvas?.getContext('2d');
    if (!el || !canvas || !ctx) return;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionPreference.matches;
    const budget = new HeroFrameBudget();
    seed = 90210;
    // Allocate once so resize and adaptive quality never regenerate the shapes.
    const { orb, gal, br, at } = buildHeroTargets(1900);
    const mint = sprite('120,255,205'), vio = sprite('150,110,255'), white = sprite('235,255,248');
    let W = 1, H = 1, dpr = 1;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, onT: 0, px: -9999, py: -9999 };
    // Development-only phase previews; production always follows the real cycle.
    const forced = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('phase') : null;
    const fixedT = forced === 'orb' ? 1 : forced === 'galaxy' ? 10 : forced === 'brain' ? 17 : null;

    const resize = () => {
      const width = Math.max(1, el.clientWidth), height = Math.max(1, el.clientHeight);
      const density = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      if (width === W && height === H && density === dpr) return;
      W = width; H = height; dpr = density;
      budget.resize(W);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const cx = W * (W >= 1024 ? 0.7 : 0.5), cy = H * (W >= 1024 ? 0.5 : 0.56);
      const radius = Math.min(W >= 1024 ? W * 0.3 : W * 0.44, H * 0.4) * 1.7;
      // The broad halo is static decoration: let the browser cache it instead of
      // rebuilding and rasterizing a full-buffer radial gradient on every frame.
      canvas.style.backgroundImage = `radial-gradient(circle ${radius}px at ${cx}px ${cy}px, rgba(110,90,230,.19), rgba(40,160,150,.06) 50%, rgba(16,36,58,0))`;
      // A hidden/offscreen resize updates the buffer, but must not do rendering work.
      if (inView && !document.hidden) draw(fixedT ?? (reduced ? 17 : clock));
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const [wo, wg, wb] = heroPhaseWeights(t);
      const cx = W * (W >= 1024 ? 0.7 : 0.5), cy = H * (W >= 1024 ? 0.5 : 0.56);
      const S = Math.min(W >= 1024 ? W * 0.3 : W * 0.44, H * 0.4);
      // Same response time as the old 60 Hz loop, independent of display refresh.
      ptr.x += (ptr.tx - ptr.x) * 0.1; ptr.y += (ptr.ty - ptr.y) * 0.1; ptr.on += (ptr.onT - ptr.on) * 0.1;
      const trans = 4 * (wg * (1 - wg)) + 4 * (wb * (1 - wb)) + 4 * (wo * (1 - wo));
      // per-shape rotation
      const yo = t * 0.25 + ptr.x * 0.5, xo = 0.35 + ptr.y * 0.25;
      const yg = t * 0.09 + ptr.x * 0.3, xg = 0.82 + ptr.y * 0.15;
      const yb = Math.sin(t * 0.3) * 0.28 + ptr.x * 0.35, xb = ptr.y * 0.1;
      const co = Math.cos(yo), so = Math.sin(yo), cxo = Math.cos(xo), sxo = Math.sin(xo);
      const cg = Math.cos(yg), sg = Math.sin(yg), cxg = Math.cos(xg), sxg = Math.sin(xg);
      const cb = Math.cos(yb), sb = Math.sin(yb), cxb = Math.cos(xb), sxb = Math.sin(xb);
      ctx.globalCompositeOperation = 'lighter';
      const breathe = 1 + Math.sin(t * 1.1) * 0.02;
      for (let i = 0; i < budget.particles; i++) {
        const k = i * 3, a = at[i * 2], sz = at[i * 2 + 1];
        // orb
        let x = orb[k] * breathe, y = orb[k + 1] * breathe, z = orb[k + 2] * breathe;
        let x1 = x * co + z * so, z1 = -x * so + z * co, y1 = y * cxo - z1 * sxo, z2 = y * sxo + z1 * cxo;
        const ox = x1, oy = y1, oz = z2;
        // galaxy: differential rotation
        const gr = Math.hypot(gal[k], gal[k + 2]);
        // Turn in the direction of the spiral, rather than unwinding its arms into a line.
        const ga = -t * 0.08 / (0.5 + gr); const cc = Math.cos(ga), ss = Math.sin(ga);
        x = gal[k] * cc - gal[k + 2] * ss; z = gal[k] * ss + gal[k + 2] * cc; y = gal[k + 1];
        x1 = x * cg + z * sg; z1 = -x * sg + z * cg; y1 = y * cxg - z1 * sxg; z2 = y * sxg + z1 * cxg;
        const gx = x1, gy = y1, gz = z2;
        // brain
        x = br[k] + Math.sin(t * 1.3 + a * 20) * 0.006; y = br[k + 1]; z = br[k + 2];
        x1 = x * cb + z * sb; z1 = -x * sb + z * cb; y1 = y * cxb - z1 * sxb; z2 = y * sxb + z1 * cxb;
        const bx = x1 * 1.12, by = y1 * 1.12, bz = z2 * 1.12;
        let px = ox * wo + gx * wg + bx * wb, py = oy * wo + gy * wg + by * wb, pz = oz * wo + gz * wg + bz * wb;
        // swirl during morphs
        if (trans > 0.001) {
          const sw = trans * 0.18 * (0.5 + a);
          const sa = t * 0.9 + a * 12;
          px += Math.cos(sa) * sw; py += Math.sin(sa * 1.1) * sw;
        }
        const persp = 1 / (1 - pz * 0.18);
        let sx = cx + px * S * persp, sy = cy - py * S * persp;
        // pointer lens: gentle push
        let hot = 0;
        if (ptr.on > 0.01) {
          const dx = sx - ptr.px, dy = sy - ptr.py, d2 = dx * dx + dy * dy, R = S * 0.7;
          if (d2 < R * R) { const f = 1 - Math.sqrt(d2) / R; const d = Math.sqrt(d2) + 0.001; sx += (dx / d) * f * f * 10 * ptr.on; sy += (dy / d) * f * f * 10 * ptr.on; hot = f * ptr.on; }
        }
        const depth = 0.55 + (pz + 1) * 0.25;
        let spr = a < 0.5 ? mint : vio;
        if (wg > 0.5 && gr < 0.22) spr = white;
        if (wb > 0.5 && a > 0.93) spr = white;
        const tw = 0.75 + 0.25 * Math.sin(t * 2 + a * 40);
        const size = (3.2 * sz + hot * 5 + (spr === white ? 1.8 : 0)) * persp * Math.min(1, S / 260 + 0.45);
        ctx.globalAlpha = Math.min(1, (0.7 * depth * tw + hot * 0.5) * (spr === white ? 0.45 : 1));
        ctx.drawImage(spr, sx - size, sy - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    let raf = 0, running = false, inView = true, last = 0, clock = 0, nextDraw = 0, lastDraw = 0;
    let touchTimer: number | undefined;
    const frame = (now: number) => {
      raf = 0; if (!running) return;
      clock += Math.max(0, (now - last) / 1000); last = now;
      if (now >= nextDraw - 0.5) {
        const began = performance.now();
        draw(clock);
        budget.observe(performance.now() - began, now - lastDraw);
        lastDraw = now;
        // Keep a 30 Hz deadline without catch-up bursts following a long frame.
        nextDraw += FRAME_MS * Math.max(1, Math.floor((now - nextDraw) / FRAME_MS) + 1);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || fixedT !== null || reduced || !inView || document.hidden) return;
      running = true; last = lastDraw = performance.now(); nextDraw = last + FRAME_MS;
      budget.reset(); raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const redrawStatic = () => { if (inView && !document.hidden && (reduced || fixedT !== null)) draw(fixedT ?? 17); };
    const onVis = () => { if (document.hidden) stop(); else { redrawStatic(); start(); } };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting && e.intersectionRatio >= 0.02;
      if (inView) { redrawStatic(); start(); } else stop();
    }, { threshold: 0.02 });
    const ro = new ResizeObserver(resize);
    const onMove = (e: PointerEvent) => {
      if (reduced || fixedT !== null || !inView || document.hidden) return;
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) { ptr.onT = 0; ptr.tx = ptr.ty = 0; return; }
      ptr.px = e.clientX - r.left; ptr.py = e.clientY - r.top;
      ptr.tx = (ptr.px / r.width) * 2 - 1; ptr.ty = (ptr.py / r.height) * 2 - 1; ptr.onT = 1;
      if (e.pointerType === 'touch') {
        window.clearTimeout(touchTimer);
        touchTimer = window.setTimeout(() => (ptr.onT = 0), 1200);
      }
    };
    const onOut = () => { ptr.onT = 0; ptr.tx = ptr.ty = 0; };
    const onMotion = () => {
      reduced = motionPreference.matches;
      if (reduced) { stop(); onOut(); ptr.x = ptr.y = ptr.on = 0; redrawStatic(); }
      else start();
    };
    resize();
    if (fallback.current) fallback.current.style.display = 'none';
    ro.observe(el); io.observe(el);
    window.addEventListener('resize', resize, { passive: true });
    if (fixedT === null) {
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onMove, { passive: true });
      document.addEventListener('pointerleave', onOut);
      motionPreference.addEventListener('change', onMotion);
      start();
    }
    return () => {
      stop(); io.disconnect(); ro.disconnect();
      window.clearTimeout(touchTimer);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onOut);
      motionPreference.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <div ref={wrap} aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <svg ref={fallback} viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" focusable="false" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${uid}-halo`}><stop stopColor="#9670ff" stopOpacity=".25" /><stop offset="1" stopColor="#0a1424" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${uid}-light`}><stop stopColor="#78ffcd" /><stop offset="1" stopColor="#9670ff" /></linearGradient>
        </defs>
        <ellipse cx="840" cy="350" rx="340" ry="300" fill={`url(#${uid}-halo)`} />
        <g fill="none" stroke={`url(#${uid}-light)`} opacity=".65">
          <ellipse cx="840" cy="350" rx="180" ry="180" strokeWidth="1.5" />
          <ellipse cx="840" cy="350" rx="180" ry="65" transform="rotate(-25 840 350)" />
          <ellipse cx="840" cy="350" rx="180" ry="85" transform="rotate(55 840 350)" />
          <ellipse cx="840" cy="350" rx="70" ry="180" />
        </g>
      </svg>
      <canvas ref={cvs} className="block h-full w-full" />
    </div>
  );
}

export default HeroLightField;
