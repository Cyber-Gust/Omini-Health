// src/lib/engine.ts
export type AsrEngine = 'webspeech' | 'whisper-webgpu' | 'whisper-wasm' | 'auto';

export function pickEngine(flag: AsrEngine): AsrEngine {
  if (flag !== 'auto') return flag;
  // novo "auto": prioriza Web Speech porque desativamos Whisper local
  return 'webspeech';
}
