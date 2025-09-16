// src/lib/engine.ts
export type AsrEngine = 'auto' | 'webspeech' | 'xenova_whisper';

/** Pick do engine. Em "auto" prioriza Whisper (Xenova) para robustez a ruído. */
export function pickEngine(flag: AsrEngine): AsrEngine {
  if (flag !== 'auto') return flag;
  const hasWasm = typeof WebAssembly !== 'undefined';
  const hasWorker = typeof Worker !== 'undefined';
  const hasWebSpeech = typeof window !== 'undefined' &&
    (((window as any).webkitSpeechRecognition) || ((window as any).SpeechRecognition));
  if (hasWasm && hasWorker) return 'xenova_whisper';
  if (hasWebSpeech) return 'webspeech';
  return 'webspeech';
}
