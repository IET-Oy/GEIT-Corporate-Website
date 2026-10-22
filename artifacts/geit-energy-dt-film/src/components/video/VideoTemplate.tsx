import { useEffect, useRef } from 'react';
import { VideoCanvas, type VideoAspectRatio, useVideoPlayer } from '@/lib/video';
import { VideoPausedContext } from '@/lib/video/hooks';
import { AnimatePresence } from 'framer-motion';
import { S1, S2, S3, S4, S5, S6 } from './Scenes';

export const SCENE_DURATIONS = { data: 5000, import: 5000, solar: 6000, carbon: 5000, headline: 4500, logo: 4500 };
const SCENE_COMPONENTS: Record<string, React.ComponentType> = { data: S1, import: S2, solar: S3, carbon: S4, headline: S5, logo: S6 };
const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_START_SEC: Record<string, number> = (() => {
  const o: Record<string, number> = {}; let t = 0;
  for (const [k, ms] of Object.entries(SCENE_DURATIONS)) { o[k] = t / 1000; t += ms; }
  return o;
})();

export default function VideoTemplate({
  durations = SCENE_DURATIONS, loop = true, paused = false, muted = false, onSceneChange,
}: { durations?: Record<string, number>; loop?: boolean; paused?: boolean; muted?: boolean; onSceneChange?: (k: string) => void } = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  useEffect(() => { onSceneChange?.(currentSceneKey); }, [currentSceneKey, onSceneChange]);
  const base = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENE_COMPONENTS[base];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = 0.5;
    if (paused) { a.pause(); return; }
    if (last.current !== currentSceneKey) {
      last.current = currentSceneKey;
      const t = SCENE_START_SEC[base] ?? 0;
      if (Math.abs(a.currentTime - t) > 0.18) a.currentTime = t;
    }
    a.play().catch(() => {});
  }, [currentSceneKey, base, muted, paused]);
  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#10243A' }}>
        <AnimatePresence mode="sync">{Scene && <Scene key={currentSceneKey} />}</AnimatePresence>
        <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`} preload="auto" autoPlay muted={muted} />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
