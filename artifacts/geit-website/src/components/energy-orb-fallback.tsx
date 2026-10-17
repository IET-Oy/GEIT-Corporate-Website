import { useLanguage } from "@/lib/language-context";
import { useId, useState } from "react";

const phases = ["Energy Orb", "Spiral Galaxy", "Neural Brain"] as const;

/** Static, selectable illustrations for browsers without a 3D graphics context. */
export function EnergyOrbFallback({ unavailable = false }: { unavailable?: boolean }) {
  const { c } = useLanguage();

  const [phase, setPhase] = useState(0);
  const id = useId().replace(/:/g, "");
  return (
    <div className="absolute inset-0 flex items-center justify-center pb-20 pt-9">
      {unavailable && (
        <p className="absolute inset-x-4 top-4 text-center text-[10px] tracking-wide text-white/65">{c("Static preview · 3D graphics unavailable on this device")}</p>
      )}
      <svg viewBox="0 0 400 300" className="max-h-full w-full max-w-[520px]" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>{c("{phase} — conceptual energy intelligence illustration", { phase: c(phases[phase]) })}</title>
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#42E8D5" stopOpacity=".24" />
            <stop offset="1" stopColor="#42E8D5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="150" rx="180" ry="140" fill={`url(#${id}-glow)`} />
        {phase === 0 && (
          <g>
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
        )}
        {phase === 1 && (
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
        )}
        {phase === 2 && (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M198 66C175 45 148 55 142 77C115 72 98 91 103 115C79 130 84 157 99 170C90 194 108 218 132 217C144 242 175 244 197 224M202 66C225 45 252 55 258 77C285 72 302 91 297 115C321 130 316 157 301 170C310 194 292 218 268 217C256 242 225 244 203 224M200 72V222M187 232L190 258L208 267L215 234" stroke="#8FFFD2" strokeWidth="2.5" />
            <path d="M163 74C178 83 163 95 148 94M119 103C147 100 148 118 135 130C119 144 139 157 157 146M107 167C126 153 143 165 136 182C126 200 152 215 168 199M178 112C152 119 165 140 178 146C194 156 181 177 160 173M176 211C184 201 185 188 177 182" stroke="#42E8D5" strokeWidth="2" />
            <g transform="translate(400 0) scale(-1 1)" stroke="#9B72FF" strokeWidth="2">
              <path d="M163 74C178 83 163 95 148 94M119 103C147 100 148 118 135 130C119 144 139 157 157 146M107 167C126 153 143 165 136 182C126 200 152 215 168 199M178 112C152 119 165 140 178 146C194 156 181 177 160 173M176 211C184 201 185 188 177 182" />
            </g>
            {[ [148,94], [135,130], [157,146], [136,182], [178,146], [160,173], [252,94], [265,130], [243,146], [264,182], [222,146], [240,173] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill={i%2 ? "#9B72FF" : "#8FFFD2"} stroke="none" />)}
          </g>
        )}
      </svg>
      {unavailable && (
        <div className="absolute inset-x-2 bottom-12 flex justify-center gap-1.5" role="group" aria-label={c("Illustration preview")}>
          {phases.map((name, index) => (
            <button key={name} type="button" aria-pressed={phase === index} onClick={() => setPhase(index)}
              className={`min-h-11 rounded border px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b64b] sm:text-xs ${phase === index ? "border-[#8FFFD2] bg-[#8FFFD2]/10 text-[#8FFFD2]" : "border-white/20 text-white/70 hover:border-white/60 hover:text-white"}`}>
              {c(name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
