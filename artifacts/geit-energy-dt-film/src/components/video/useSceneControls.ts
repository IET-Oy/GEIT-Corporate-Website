import { useCallback, useMemo, useState } from 'react';
const RE = /_r[12]$/;
export const stripRepeatSuffix = (k: string) => k.replace(RE, '');
export function useSceneControls(base: Record<string, number>) {
  const keys = useMemo(() => Object.keys(base), [base]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const durations = useMemo(() => {
    if (locked) { const k = keys[activeIndex]; return { [`${k}_r1`]: base[k], [`${k}_r2`]: base[k] }; }
    const r: Record<string, number> = {};
    keys.forEach((_, i) => { const k = keys[(activeIndex + i) % keys.length]; r[k] = base[k]; });
    return r;
  }, [locked, activeIndex, keys, base]);
  const onSceneChange = useCallback((raw: string) => {
    const i = keys.indexOf(stripRepeatSuffix(raw)); if (i >= 0) setActiveIndex(i);
  }, [keys]);
  const jumpTo = useCallback((i: number) => { setActiveIndex(i); setPaused(false); setMountKey(k => k + 1); }, []);
  const toggleLock = useCallback(() => { setLocked(l => !l); setPaused(false); setMountKey(k => k + 1); }, []);
  const togglePause = useCallback(() => setPaused(p => !p), []);
  return { keys, activeIndex, locked, paused, mountKey, durations, onSceneChange, jumpTo, toggleLock, togglePause };
}
