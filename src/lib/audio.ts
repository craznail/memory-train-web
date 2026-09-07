import { speak, stopSpeaking } from './tts';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'ended' | 'error';

let currentAudio: HTMLAudioElement | null = null;

export function stopPlayback(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  stopSpeaking();
}

/**
 * Prefer pre-recorded audioUrl; on missing/error fall back to Web Speech TTS.
 */
export function playPassage(
  opts: {
    text: string;
    audioUrl?: string;
    onStatus?: (s: PlayStatus) => void;
    onEnd?: () => void;
  },
): void {
  const { text, audioUrl, onStatus, onEnd } = opts;
  stopPlayback();

  const finish = () => {
    currentAudio = null;
    onStatus?.('ended');
    onEnd?.();
  };

  const fallbackTts = (reason?: string) => {
    if (reason) console.warn('[audio] fallback TTS:', reason);
    onStatus?.('error');
    onStatus?.('playing');
    speak(text, {
      onEnd: finish,
      onError: finish,
    });
  };

  if (!audioUrl) {
    onStatus?.('playing');
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

  audio.addEventListener('canplaythrough', onCanPlay, { once: true });
  audio.addEventListener('ended', finish, { once: true });
  audio.addEventListener(
    'error',
    () => {
      fallbackTts(`failed to load ${audioUrl}`);
    },
    { once: true },
  );

  // Kick load; if 404, error fires
  audio.load();
}
