import { useEffect, useId, useRef } from "react";
import "./energy-orb-fallback.css";

/** Decorative SVG sequence for browsers without a 3D graphics context. */
export function EnergyOrbFallback() {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let inView = true;
    const update = () => element.style.setProperty("--orb-play-state", inView && !document.hidden ? "running" : "paused");
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <svg ref={ref} viewBox="0 0 400 300" className="energy-background-fallback h-full w-full" focusable="false" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#42E8D5" stopOpacity=".24" />
            <stop offset="1" stopColor="#42E8D5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="150" rx="180" ry="140" fill={`url(#${id}-glow)`} />
          <g className="energy-background-orb">
            <circle cx="200" cy="150" r="100" fill="none" stroke="#8FFFD2" strokeOpacity=".4" />
            <ellipse cx="200" cy="150" rx="100" ry="32" fill="none" stroke="#42E8D5" strokeOpacity=".5" transform="rotate(-25 200 150)" />
            <ellipse cx="200" cy="150" rx="35" ry="100" fill="none" stroke="#9B72FF" strokeOpacity=".5" transform="rotate(-25 200 150)" />
            {Array.from({ length: 280 }, (_, i) => {
              const y = 1 - (i / 279) * 2;
              const radius = Math.sqrt(1 - y * y);
              const theta = i * 2.399963;
              const z = Math.sin(theta) * radius;
              return <circle key={i} cx={200 + Math.cos(theta) * radius * 100} cy={150 + y * 100} r={z > 0 ? 1.6 : 1} fill={i % 4 === 0 ? "#9B72FF" : "#8FFFD2"} opacity={.3 + (z + 1) * .3} />;
            })}
          </g>
          <g className="energy-background-galaxy">
          <g transform="rotate(-18 200 150)">
            {Array.from({ length: 480 }, (_, i) => {
              const arm = i % 4;
              const distance = (i / 480) * 145;
              const theta = distance * .035 + arm * Math.PI / 2;
              const spread = Math.sin(i * 17.13) * (3 + distance * .06);
              return <circle key={i} cx={200 + Math.cos(theta) * distance + spread} cy={150 + Math.sin(theta) * distance * .58 + spread} r={i % 5 === 0 ? 1.6 : 1} fill={arm % 2 ? "#9B72FF" : "#8FFFD2"} opacity=".8" />;
            })}
            <circle cx="200" cy="150" r="12" fill="#8FFFD2" opacity=".7" />
            <circle cx="200" cy="150" r="5" fill="white" />
          </g>
          </g>
          <g className="energy-background-brain" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M198 66C175 45 148 55 142 77C115 72 98 91 103 115C79 130 84 157 99 170C90 194 108 218 132 217C144 242 175 244 197 224M202 66C225 45 252 55 258 77C285 72 302 91 297 115C321 130 316 157 301 170C310 194 292 218 268 217C256 242 225 244 203 224M200 72V222M187 232L190 258L208 267L215 234" stroke="#8FFFD2" strokeWidth="2.5" />
            <path d="M163 74C178 83 163 95 148 94M119 103C147 100 148 118 135 130C119 144 139 157 157 146M107 167C126 153 143 165 136 182C126 200 152 215 168 199M178 112C152 119 165 140 178 146C194 156 181 177 160 173M176 211C184 201 185 188 177 182" stroke="#42E8D5" strokeWidth="2" />
            <g transform="translate(400 0) scale(-1 1)" stroke="#9B72FF" strokeWidth="2">
              <path d="M163 74C178 83 163 95 148 94M119 103C147 100 148 118 135 130C119 144 139 157 157 146M107 167C126 153 143 165 136 182C126 200 152 215 168 199M178 112C152 119 165 140 178 146C194 156 181 177 160 173M176 211C184 201 185 188 177 182" />
            </g>
            {[ [148,94], [135,130], [157,146], [136,182], [178,146], [160,173], [252,94], [265,130], [243,146], [264,182], [222,146], [240,173] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill={i%2 ? "#9B72FF" : "#8FFFD2"} stroke="none" />)}
          </g>
      </svg>
    </div>
  );
}
