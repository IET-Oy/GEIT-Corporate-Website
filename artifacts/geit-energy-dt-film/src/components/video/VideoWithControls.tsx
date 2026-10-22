import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  data: { title: 'Scattered data', filePath: 'src/components/video/Scenes.tsx' },
  import: { title: 'Import and validate', filePath: 'src/components/video/Scenes.tsx' },
  solar: { title: 'Solar and battery', filePath: 'src/components/video/Scenes.tsx' },
  carbon: { title: 'Carbon', filePath: 'src/components/video/Scenes.tsx' },
  headline: { title: 'Headline', filePath: 'src/components/video/Scenes.tsx' },
  logo: { title: 'GEIT lockup', filePath: 'src/components/video/Scenes.tsx' },
};

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const c = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const jump = useCallback((i: number) => {
    c.jumpTo(i);
    const d = SCENE_DETAILS[c.keys[i]];
    if (d) window.parent.postMessage({ type: 'REPLIT_VIDEO_SCENE_SELECTED', payload: { sceneIndex: i, sceneCount: c.keys.length, sceneTitle: d.title, filePath: d.filePath, lineNumber: 1 } }, '*');
  }, [c]);
  const { paused } = c;
  useEffect(() => {
    if (!paused) return;
    const f = document.getAnimations().filter(a => a.playState === 'running');
    f.forEach(a => a.pause());
    return () => f.forEach(a => a.play());
  }, [paused]);
  if (!isIframed) return <VideoTemplate />;
  const btn = 'w-12 h-12 flex items-center justify-center text-white/70 hover:text-white rounded-lg shrink-0';
  return (
    <div className="relative w-full h-screen">
      <VideoTemplate key={c.mountKey} durations={c.durations} loop paused={c.paused} muted={muted} onSceneChange={c.onSceneChange} />
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-3 opacity-0 hover:opacity-100 transition-opacity">
        <button className={btn} onClick={c.togglePause} aria-label={c.paused ? 'Play' : 'Pause'}>{c.paused ? <Play /> : <Pause />}</button>
        <button className={btn} onClick={c.toggleLock} aria-label="Loop scene" aria-pressed={c.locked} style={{ background: c.locked ? 'rgba(255,255,255,.15)' : undefined }}><Repeat /></button>
        <button className={btn} onClick={() => setMuted(m => !m)} aria-label="Mute">{muted ? <VolumeX /> : <Volume2 />}</button>
        <div className="flex-1 flex gap-1.5">
          {c.keys.map((k, i) => <button key={k} onClick={() => jump(i)} aria-label={`Scene ${i + 1}`} className="flex-1 h-3 rounded-full" style={{ background: i === c.activeIndex ? '#fff' : 'rgba(255,255,255,.25)' }} />)}
        </div>
        <div className="text-white/70 font-mono text-lg">{c.activeIndex + 1}/{c.keys.length}</div>
      </div>
    </div>
  );
}
