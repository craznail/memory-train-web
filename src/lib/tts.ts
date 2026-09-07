/** Web Speech API TTS helper — play once, Chinese voice preferred */

let currentUtterance: SpeechSynthesisUtterance | null = null;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang === 'zh-CN' && /female|Xiaoxiao|Tingting|Yaoyao/i.test(v.name)) ||
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => v.lang.startsWith('zh'));
  return preferred ?? null;
}

export function speak(
  text: string,
  opts?: { onEnd?: () => void; onError?: () => void },
): void {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported');
    opts?.onError?.();
    // Still advance flow so UI is usable without TTS
    setTimeout(() => opts?.onEnd?.(), 600);
    return;
  }

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.95;
  u.pitch = 1;
  const voice = pickChineseVoice();
  if (voice) u.voice = voice;

  u.onend = () => {
    currentUtterance = null;
    opts?.onEnd?.();
  };
  u.onerror = () => {
    currentUtterance = null;
    opts?.onError?.();
    opts?.onEnd?.();
  };

  currentUtterance = u;

  // Some browsers load voices async
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickChineseVoice();
      if (v && currentUtterance) currentUtterance.voice = v;
      window.speechSynthesis.onvoiceschanged = null;
    };
  }

  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}
