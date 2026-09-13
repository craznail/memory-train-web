import { speak, stopSpeaking } from './tts';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'ended' | 'error';

let currentAudio: HTMLAudioElement | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;

function clearProgressTimer(): void {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

export function stopPlayback(): void {
  clearProgressTimer();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  stopSpeaking();
}

function startFakeProgress(
  durationMs: number,
  onProgress?: (ratio: number) => void,
): void {
  clearProgressTimer();
  const start = Date.now();
  progressTimer = setInterval(() => {
    const ratio = Math.min(1, (Date.now() - start) / durationMs);
    onProgress?.(ratio);
    if (ratio >= 1) clearProgressTimer();
  }, 200);
}

/**
 * Prefer pre-recorded audioUrl; on missing/error fall back to Web Speech TTS.
 */
export function playPassage(opts: {
  text: string;
  audioUrl?: string;
  estimatedDurationMs?: number;
  onStatus?: (s: PlayStatus) => void;
  onProgress?: (ratio: number) => void;
  onEnd?: () => void;
}): void {
  const { text, audioUrl, estimatedDurationMs, onStatus, onProgress, onEnd } = opts;
  stopPlayback();

  const finish = () => {
    clearProgressTimer();
    currentAudio = null;
    onProgress?.(1);
    onStatus?.('ended');
    onEnd?.();
  };

  const fallbackTts = (reason?: string) => {
    if (reason) console.warn('[audio] fallback TTS:', reason);
    onStatus?.('error');
    onStatus?.('playing');
    const dur = estimatedDurationMs ?? Math.max(12000, text.length * 260);
    startFakeProgress(dur, onProgress);
    speak(text, {
      onEnd: finish,
      onError: finish,
    });
  };

  if (!audioUrl) {
    onStatus?.('playing');
    const dur = estimatedDurationMs ?? Math.max(12000, text.length * 260);
    startFakeProgress(dur, onProgress);
    speak(text, { onEnd: finish, onError: finish });
    return;
  }

  onStatus?.('loading');
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  const onCanPlay = () => {
    onStatus?.('playing');
    audio.play().catch((err) => {
      fallbackTts(String(err));
    });
  };

  const onTime = () => {
    if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
      onProgress?.(audio.currentTime / audio.duration);
    }
  };

  audio.addEventListener('canplaythrough', onCanPlay, { once: true });
  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('ended', finish, { once: true });
  audio.addEventListener(
    'error',
    () => {
      fallbackTts(`failed to load ${audioUrl}`);
    },
    { once: true },
  );

  audio.load();
}
