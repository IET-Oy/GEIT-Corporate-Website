import { motion } from 'framer-motion';

const NAVY = '#10243A', GREEN = '#168568', MIST = '#F2F5F7', AMBER = '#E8B64B';
const ease = [0.22, 1, 0.36, 1] as const;
const H = { fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em' } as const;

function Wrap({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ background: bg }}
      initial={{ clipPath: 'circle(0% at 50% 50%)' }} animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease }}>
      {children}
    </motion.div>
  );
}
const Line = ({ children, delay, size, color, style }: { children: React.ReactNode; delay: number; size: number; color: string; style?: React.CSSProperties }) => (
  <div style={{ overflow: 'hidden', paddingBottom: '0.1em' }}>
    <motion.div style={{ ...H, fontSize: `${size}vmin`, color, lineHeight: 1.05, ...style }}
      initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.7, delay, ease }}>{children}</motion.div>
  </div>
);
const Body = ({ children, delay, color }: { children: React.ReactNode; delay: number; color: string }) => (
  <motion.div style={{ fontFamily: 'var(--font-body)', fontSize: '3.2vmin', color, marginTop: '2vmin' }}
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.6 }}>{children}</motion.div>
);

export function S1() {
  const bars = Array.from({ length: 28 }, (_, i) => 18 + ((i * 37) % 53) + (i % 5) * 4);
  return (
    <Wrap bg={NAVY}>
      <div className="absolute flex items-end" style={{ left: '4%', right: '4%', bottom: 0, height: '55%', gap: '0.8%' }}>
        {bars.map((h, i) => (
          <motion.div key={i} style={{ flex: 1, background: i % 7 === 3 ? AMBER : GREEN, opacity: 0.55, originY: 1, height: `${h}%` }}
            initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 0.6 + (i % 4) * 0.1] }} transition={{ duration: 3.5, delay: i * 0.05, times: [0, 0.3, 1], ease }} />
        ))}
      </div>
      <div className="absolute" style={{ left: '6%', top: '12%' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '2.1vmin', letterSpacing: '0.3em', color: AMBER }}>GEIT ENERGY DT</div>
        <Line delay={0.3} size={9} color={MIST}>Energy data is everywhere.</Line>
        <Line delay={2.2} size={9} color="#6fd1b3">Rarely decision-ready.</Line>
      </div>
    </Wrap>
  );
}

export function S2() {
  const words = ['IMPORT', 'VALIDATE', 'ANALYSE'];
  return (
    <Wrap bg={MIST}>
      <div className="absolute" style={{ left: '6%', top: '10%' }}>
        {words.map((w, i) => <Line key={w} delay={0.4 + i * 1.2} size={15} color={i === 2 ? GREEN : NAVY}>{w}.</Line>)}
        <Body delay={3.2} color="#4a5d70">Meters, sites, CSV and Excel readings.</Body>
      </div>
      <div className="absolute" style={{ right: '5%', top: '14%', width: '34%' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div key={i} className="flex items-center" style={{ background: '#fff', borderRadius: 8, padding: '1.4vmin 2vmin', marginBottom: '1.4vmin', gap: '2vmin', boxShadow: '0 6px 20px rgba(16,36,58,.08)' }}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.25, duration: 0.5, ease }}>
            <div style={{ flex: 1, height: '1.2vmin', background: '#d9e1e8', borderRadius: 4 }} />
            <div style={{ width: '10%', height: '1.2vmin', background: '#d9e1e8', borderRadius: 4 }} />
            <motion.div style={{ width: '3vmin', height: '3vmin', borderRadius: '50%', background: i === 3 ? AMBER : GREEN }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2 + i * 0.2, type: 'spring', stiffness: 300 }} />
          </motion.div>
        ))}
      </div>
      <svg className="absolute" style={{ right: '5%', bottom: '8%', width: '34%', height: '26%' }} viewBox="0 0 300 100" fill="none">
        <motion.path d="M0 80 C40 70 60 30 100 45 S160 90 200 40 S270 10 300 20" stroke={GREEN} strokeWidth="4" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 3, duration: 1.8, ease: 'easeInOut' }} />
      </svg>
    </Wrap>
  );
}

export function S3() {
  return (
    <Wrap bg={NAVY}>
      <svg className="absolute inset-0" viewBox="0 0 160 90" style={{ width: '100%', height: '100%' }} fill="none">
        <path d="M8 72 A56 56 0 0 1 120 72" stroke="#2c4660" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        <motion.circle r="4.5" fill={AMBER} initial={{ cx: 8, cy: 72 }}
          animate={{ cx: [8, 30, 64, 98, 120], cy: [72, 36, 16, 36, 72] }} transition={{ duration: 4.5, delay: 0.3, ease: 'easeInOut' }} />
        <motion.rect x="6" y="73" width="116" height="1" fill={GREEN} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={{ duration: 1, delay: 0.5 }} />
      </svg>
      <div className="absolute flex" style={{ right: '7%', top: '16%', gap: '1.2vmin', alignItems: 'flex-end', height: '30vmin' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div key={i} style={{ width: '4.5vmin', background: GREEN, borderRadius: 6, originY: 1, height: '100%' }}
            initial={{ scaleY: 0.1 }} animate={{ scaleY: [0.1, 1, 0.45, 0.8] }} transition={{ delay: 1 + i * 0.15, duration: 4, times: [0, 0.35, 0.7, 1], ease }} />
        ))}
      </div>
      <div className="absolute" style={{ left: '6%', bottom: '8%' }}>
        <Line delay={0.5} size={10} color={MIST}>Solar yield.</Line>
        <Line delay={1.2} size={10} color="#6fd1b3">Battery dispatch.</Line>
        <Body delay={2.4} color="#b8c6d3">Baseline models for the scenarios you save.</Body>
      </div>
    </Wrap>
  );
}

export function S4() {
  return (
    <Wrap bg={GREEN}>
      <svg className="absolute" style={{ right: '4%', top: '50%', width: '48vmin', height: '48vmin', transform: 'translateY(-50%)' }} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,.2)" strokeWidth="6" />
        <motion.circle cx="50" cy="50" r="42" stroke={MIST} strokeWidth="6" strokeLinecap="round" transform="rotate(-90 50 50)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 0.72 }} transition={{ duration: 2.5, delay: 0.5, ease }} />
        <motion.circle cx="50" cy="50" r="28" stroke={AMBER} strokeWidth="2" strokeDasharray="2 3" initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 12, ease: 'linear' }} style={{ originX: '50px', originY: '50px' }} />
      </svg>
      <div className="absolute" style={{ left: '6%', top: '16%', width: '55%' }}>
        <Line delay={0.4} size={4.2} color={MIST} style={{ letterSpacing: '0.25em', fontFamily: 'var(--font-body)', fontWeight: 500 }}>CARBON</Line>
        <Line delay={0.7} size={9.5} color="#fff">Versioned emission factors.</Line>
        <Line delay={1.6} size={9.5} color={NAVY}>Supported carbon calculations.</Line>
        <Body delay={3} color={MIST}>Scenarios and report exports, saved.</Body>
      </div>
    </Wrap>
  );
}

export function S5() {
  return (
    <Wrap bg={NAVY}>
      <div className="absolute" style={{ left: '7%', right: '7%', top: '50%', transform: 'translateY(-50%)' }}>
        <Line delay={0.4} size={9.5} color={MIST}>Make smarter</Line>
        <Line delay={0.6} size={9.5} color={MIST}>energy decisions.</Line>
        <motion.div style={{ height: 4, background: AMBER, margin: '3vmin 0', originX: 0, width: '14vmin' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.3, duration: 0.6 }} />
        <Body delay={1.6} color="#9fe0cb">Build a more efficient, resilient and low-carbon future.</Body>
      </div>
    </Wrap>
  );
}

export function S6() {
  return (
    <Wrap bg={MIST}>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: '2vmin' }}>
        <motion.img src={`${import.meta.env.BASE_URL}images/geit-logo.jpg`} alt="GEIT Ltd" style={{ width: '58vmin', mixBlendMode: 'multiply' }}
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease }} />
        <Line delay={1} size={4.6} color={NAVY} style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Energy Intelligence. Measurable Impact.</Line>
        <Body delay={1.8} color={GREEN}><span style={{ letterSpacing: '0.3em', fontWeight: 500 }}>GEIT ENERGY DT</span></Body>
      </div>
    </Wrap>
  );
}
