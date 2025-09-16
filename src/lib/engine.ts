export type AsrEngine = 'webspeech' | 'whisper-webgpu' | 'whisper-wasm' | 'auto';

export function pickEngine(flag: AsrEngine): AsrEngine {
  if (flag !== 'auto') return flag;

  // Se WebGPU/WASM disponível, prioriza Whisper local
  const hasGPU = !!(navigator as any).gpu;
  if (hasGPU) return 'whisper-webgpu';
  // Fallback: Whisper em WASM (Transformers escolhe backend WASM)
  if (WebAssembly && typeof WebAssembly === 'object') return 'whisper-wasm';
  // Último recurso: Web Speech (online, dependente do browser; não envia áudio ao seu servidor)
  return 'webspeech';
}
