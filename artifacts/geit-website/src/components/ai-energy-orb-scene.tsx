import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CYCLE = 26; // seconds
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 0 = orb, 1 = galaxy, 2 = brain. Loops continuously back to 0 with no jump. */
function stateAt(time: number) {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  return smooth(3.5, 7, t) + smooth(10.5, 14, t) - smooth(16.5, 20, t) - smooth(21, 24.5, t);
}

function rand(seed: { v: number }) {
  seed.v = (seed.v * 1664525 + 1013904223) >>> 0;
  return seed.v / 4294967296;
}
function gauss(seed: { v: number }) {
  return (rand(seed) + rand(seed) + rand(seed) - 1.5) / 1.5;
}

function buildTargets(n: number) {
  const seed = { v: 20240611 };
  const orb = new Float32Array(n * 3);
  const gal = new Float32Array(n * 3);
  const brain = new Float32Array(n * 3);
  const attr = new Float32Array(n * 3); // random, size, arm-phase

  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    // Orb: dense shell plus soft volume
    const u = rand(seed) * 2 - 1, th = rand(seed) * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rr = rand(seed) < 0.7 ? 0.88 + gauss(seed) * 0.08 : Math.cbrt(rand(seed)) * 0.85;
    orb[i3] = s * Math.cos(th) * rr;
    orb[i3 + 1] = u * rr;
    orb[i3 + 2] = s * Math.sin(th) * rr;

    // Galaxy: 3 logarithmic-ish spiral arms + core
    const core = rand(seed) < 0.16;
    const r = core ? Math.pow(rand(seed), 2) * 0.25 : 0.12 + Math.pow(rand(seed), 0.75) * 1.55;
    const arm = Math.floor(rand(seed) * 3);
    const ang = arm * ((Math.PI * 2) / 3) + r * 3.1 + gauss(seed) * (core ? 3 : 0.28 / (0.4 + r * 0.5));
    gal[i3] = Math.cos(ang) * r;
    gal[i3 + 1] = gauss(seed) * (core ? 0.16 : 0.05 + 0.05 / (0.5 + r));
    gal[i3 + 2] = Math.sin(ang) * r;

    attr[i3] = rand(seed);
    attr[i3 + 1] = 0.5 + rand(seed) * 1.0;
    attr[i3 + 2] = core ? 1 : 0;
  }

  // Brain: two hemispheres with gyri folds, cerebellum, brainstem. Long axis = z.
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const k = rand(seed);
    if (k < 0.86) {
      const side = rand(seed) < 0.5 ? -1 : 1;
      const u = rand(seed) * 2 - 1, th = rand(seed) * Math.PI * 2, s = Math.sqrt(1 - u * u);
      let dx = s * Math.cos(th), dy = u, dz = s * Math.sin(th);
      // gyri: ridged folds along the surface
      const fold = Math.sin(dx * 9 + dy * 7) * Math.sin(dz * 8 - dy * 5) + Math.sin(dz * 14 + dx * 6) * 0.5;
      const depth = 1 + fold * 0.07;
      // central fissure & hemisphere shape
      const flat = dy < -0.3 ? 0.78 : 1;
      const lateral = side * dx < 0 ? 0.35 + 0.65 * Math.abs(dx) : 1;
      const shell = 0.9 + rand(seed) * 0.1;
      p.set(
        side * 0.43 + dx * 0.5 * depth * shell * (side * dx < 0 ? 0.55 : 1),
        0.1 + dy * 0.66 * depth * shell * flat,
        dz * 0.98 * depth * shell * (1 - 0.15 * dy * dy) * lateral * 0 + dz * 0.98 * depth * shell,
      );
      // temporal lobe bulge underneath, front-lower
      if (dy < -0.25) p.z += 0.08 * dz;
      p.x += side * 0.03;
    } else if (k < 0.96) {
      // cerebellum with striations
      const u = rand(seed) * 2 - 1, th = rand(seed) * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const stri = 1 + Math.sin(u * 22) * 0.04;
      p.set(s * Math.cos(th) * 0.5 * stri, -0.52 + u * 0.22 * stri, -0.72 + s * Math.sin(th) * 0.3 * stri);
    } else {
      // brainstem
      const th = rand(seed) * Math.PI * 2, h = rand(seed);
      p.set(Math.cos(th) * 0.11, -0.45 - h * 0.45, -0.28 - h * 0.12 + Math.sin(th) * 0.11);
    }
    brain[i3] = p.x * 1.45;
    brain[i3 + 1] = (p.y + 0.05) * 1.45;
    brain[i3 + 2] = p.z * 1.3;
  }
  return { orb, gal, brain, attr };
}

const COMMON = /* glsl */ `
uniform float uTime; uniform float uA; uniform float uB; uniform float uHover; uniform float uPulse; uniform vec3 uPulseDir;
attribute vec3 aOrb; attribute vec3 aGal; attribute vec3 aBrain; attribute vec3 aAttr;
vec3 morph(out float lum) {
  float gA = uA * (1.0 - uB);
  float trans = sin(3.14159 * uA * (1.0 - uB) * 1.0) + sin(3.14159 * uB) ;
  // rigid-ish spiral rotation: inner turns faster
  float rad = length(aGal.xz);
  float rot = uTime * (0.22 / (0.55 + rad * 0.8));
  float c = cos(rot), s = sin(rot);
  vec3 g = vec3(aGal.x * c - aGal.z * s, aGal.y, aGal.x * s + aGal.z * c);
  float breath = 1.0 + 0.05 * sin(uTime * 0.9 + aAttr.x * 2.0) * (1.0 - uA);
  vec3 o = aOrb * breath;
  vec3 br = aBrain * (1.0 + 0.018 * sin(uTime * 1.6 + aBrain.z * 3.0));
  vec3 p = mix(o, g, uA);
  p = mix(p, br, uB);
  // swirl noise during transitions (no jumps, returns to zero at rest)
  float amt = (sin(3.14159 * uA) * (1.0 - uB) + sin(3.14159 * uB)) * 0.0 + trans * 0.0;
  float k = (4.0 * uA * (1.0 - uA)) * (1.0 - uB) + 4.0 * uB * (1.0 - uB);
  vec3 j = vec3(sin(aAttr.x * 40.0 + uTime * 0.8), cos(aAttr.y * 30.0 + uTime * 0.7), sin(aAttr.x * 17.0 - uTime * 0.6));
  p += j * 0.10 * k;
  p += j * 0.012 * (1.0 + uHover * 2.0);
  // click pulse: radial wave
  float d = length(p);
  float wave = exp(-pow((d - uPulse * 2.6) * 3.2, 2.0)) * step(uPulse, 0.999) * (1.0 - uPulse);
  p += normalize(p + 0.0001) * wave * 0.16;
  lum = wave;
  return p;
}`;

const PT_VERT = /* glsl */ `
${COMMON}
uniform float uPx; varying vec3 vCol; varying float vA;
void main(){
  float wave; vec3 p = morph(wave);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 mint = vec3(0.56,1.0,0.82), turq = vec3(0.26,0.91,0.84), vio = vec3(0.61,0.45,1.0);
  float r = aAttr.x;
  vec3 orbC = mix(vio, mix(turq, mint, r), smoothstep(0.15, 0.7, r));
  vec3 galC = mix(mix(vio, turq, smoothstep(0.0, 1.4, length(aGal.xz))), vec3(1.0), aAttr.z * 0.65);
  vec3 brC = mix(mint, mix(turq, vio, step(0.78, r)), smoothstep(0.35, 0.8, r));
  vCol = mix(orbC, galC, uA); vCol = mix(vCol, brC, uB);
  vCol += wave * 0.6;
  float size = aAttr.y * (1.0 + uHover * 0.35 + wave * 1.5) * (1.0 + aAttr.z * (1.0 - uB) * 0.8);
  gl_PointSize = size * uPx * (2.4 / -mv.z);
  vA = 0.55 + 0.45 * aAttr.y * 0.7;
}`;
const PT_FRAG = /* glsl */ `
precision mediump float; varying vec3 vCol; varying float vA; uniform float uFade;
void main(){ float d = length(gl_PointCoord - 0.5); if(d>0.5) discard;
  float a = pow(1.0 - d*2.0, 1.8) * vA * uFade; gl_FragColor = vec4(vCol * a, a); }`;

const LN_VERT = /* glsl */ `
${COMMON}
varying float vL; varying vec3 vCol; attribute float aEnd;
void main(){ float wave; vec3 p = morph(wave);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
  float flow = 0.5 + 0.5 * sin(uTime * 2.4 - aEnd * 6.0 + aAttr.x * 20.0);
  vL = (0.05 * (1.0 - uA) * (1.0 - uB) + uB * (0.32 + uHover * 0.5) * (0.4 + flow * 0.8) + wave * 0.6) ;
  vCol = mix(vec3(0.26,0.91,0.84), vec3(0.61,0.45,1.0), step(0.6, aAttr.x));
}`;
const LN_FRAG = /* glsl */ `precision mediump float; varying float vL; varying vec3 vCol; uniform float uFade;
void main(){ gl_FragColor = vec4(vCol * vL * uFade, vL * uFade); }`;

export default function AiEnergyOrbScene({ onFallback }: { onFallback: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
    const count = coarse ? 6500 : lowEnd ? 9000 : 16000;
    const lineCount = coarse ? 90 : 240;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch {
      fallbackRef.current();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = 5.2;
    const group = new THREE.Group();
    scene.add(group);

    const { orb, gal, brain, attr } = buildTargets(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(orb.slice(), 3));
    geo.setAttribute('aOrb', new THREE.BufferAttribute(orb, 3));
    geo.setAttribute('aGal', new THREE.BufferAttribute(gal, 3));
    geo.setAttribute('aBrain', new THREE.BufferAttribute(brain, 3));
    geo.setAttribute('aAttr', new THREE.BufferAttribute(attr, 3));

    const uniforms = {
      uTime: { value: 0 }, uA: { value: 0 }, uB: { value: 0 }, uHover: { value: 0 },
      uPulse: { value: 1 }, uPulseDir: { value: new THREE.Vector3() },
      uPx: { value: dpr * 60 }, uFade: { value: reduced ? 1 : 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: PT_VERT, fragmentShader: PT_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(geo, mat));

    // Neural pathways: segments between nearby brain points
    const seed = { v: 7 };
    const lp: Record<'o' | 'g' | 'b' | 'a', number[]> = { o: [], g: [], b: [], a: [] };
    const ends: number[] = [];
    for (let l = 0; l < lineCount; l++) {
      const i = Math.floor(rand(seed) * count);
      let best = -1, bd = 1e9;
      for (let c = 0; c < 40; c++) {
        const j = Math.floor(rand(seed) * count);
        if (j === i) continue;
        const d = (brain[i * 3] - brain[j * 3]) ** 2 + (brain[i * 3 + 1] - brain[j * 3 + 1]) ** 2 + (brain[i * 3 + 2] - brain[j * 3 + 2]) ** 2;
        if (d > 0.012 && d < bd) { bd = d; best = j; }
      }
      if (best < 0) continue;
      for (const [idx, e] of [[i, 0], [best, 1]] as const) {
        lp.o.push(orb[idx * 3], orb[idx * 3 + 1], orb[idx * 3 + 2]);
        lp.g.push(gal[idx * 3], gal[idx * 3 + 1], gal[idx * 3 + 2]);
        lp.b.push(brain[idx * 3], brain[idx * 3 + 1], brain[idx * 3 + 2]);
        lp.a.push(attr[idx * 3], attr[idx * 3 + 1], attr[idx * 3 + 2]);
        ends.push(e);
      }
    }
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lp.o, 3));
    lgeo.setAttribute('aOrb', new THREE.Float32BufferAttribute(lp.o, 3));
    lgeo.setAttribute('aGal', new THREE.Float32BufferAttribute(lp.g, 3));
    lgeo.setAttribute('aBrain', new THREE.Float32BufferAttribute(lp.b, 3));
    lgeo.setAttribute('aAttr', new THREE.Float32BufferAttribute(lp.a, 3));
    lgeo.setAttribute('aEnd', new THREE.Float32BufferAttribute(ends, 1));
    const lmat = new THREE.ShaderMaterial({
      uniforms, vertexShader: LN_VERT, fragmentShader: LN_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.LineSegments(lgeo, lmat));

    const size = () => {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 6.4 : 5.2;
      camera.updateProjectionMatrix();
      uniforms.uPx.value = dpr * Math.min(h, 700) / 9;
    };
    size();

    // interaction state
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, hover: 0, hoverT: 0 };
    let pulseStart = -10;
    const rectOf = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onMove = (e: PointerEvent) => { rectOf(e); if (e.pointerType !== 'touch') ptr.hoverT = 1; };
    const onLeave = () => { ptr.tx = 0; ptr.ty = 0; ptr.hoverT = 0; };
    const onDown = (e: PointerEvent) => { rectOf(e); pulseStart = clock.elapsed; ptr.hoverT = 1; if (e.pointerType === 'touch') setTimeout(() => (ptr.hoverT = 0), 1400); };
    const clock = { elapsed: 0, last: 0 };

    let running = false, raf = 0, visible = true, inView = true;
    const frame = (now: number) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (now - clock.last) / 1000 || 0.016);
      clock.last = now;
      clock.elapsed += dt;
      const t = clock.elapsed;
      const st = Math.max(0, Math.min(2, stateAt(t + 0.0)));
      uniforms.uTime.value = t;
      uniforms.uA.value = Math.min(1, st);
      uniforms.uB.value = Math.max(0, st - 1);
      uniforms.uFade.value = Math.min(1, uniforms.uFade.value + dt * 0.6);
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      ptr.hover += (ptr.hoverT - ptr.hover) * 0.06;
      uniforms.uHover.value = ptr.hover;
      const pa = (t - pulseStart) / 1.6;
      uniforms.uPulse.value = Math.min(1, Math.max(0, pa));
      const w = uniforms.uB.value;
      group.rotation.y = ptr.x * 0.35 + w * (0.95 + Math.sin(t * 0.35) * 0.3) + Math.sin(t * 0.15) * 0.2 * (1 - w);
      group.rotation.x = ptr.y * 0.22 + uniforms.uA.value * (1 - w) * 0.55 + w * 0.08;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduced || !visible || !inView) return;
      running = true; clock.last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

    if (reduced) {
      // static, calm frame: neural brain, no loop
      uniforms.uA.value = 1; uniforms.uB.value = 1; uniforms.uTime.value = 3;
      group.rotation.y = 1.0; group.rotation.x = 0.08;
      renderer.render(scene, camera);
    }

    const onVis = () => { visible = !document.hidden; visible ? start() : stop(); };
    const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; inView ? start() : stop(); }, { threshold: 0.05 });
    io.observe(el);
    const ro = new ResizeObserver(() => { size(); if (reduced) renderer.render(scene, camera); });
    ro.observe(el);
    const onLost = (e: Event) => { e.preventDefault(); stop(); fallbackRef.current(); };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    document.addEventListener('visibilitychange', onVis);
    if (!reduced) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      el.addEventListener('pointerdown', onDown);
    }
    start();

    return () => {
      stop();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      geo.dispose(); lgeo.dispose(); mat.dispose(); lmat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <div ref={host} className="absolute inset-0" />
    </div>
  );
}
