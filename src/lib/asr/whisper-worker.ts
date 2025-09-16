// Worker módulo (type: 'module')
// Recebe PCM 16k mono (Float32Array). Emite {partial, final}.
// Usa Transformers.js localmente (WebGPU quando disponível; fallback WASM).

import { pipeline, env, type Pipeline } from '@xenova/transformers';

// ======= CONFIG =======
const LANGUAGE = 'pt';
const TASK = 'transcribe'; // vs 'translate'
const MODEL = 'Xenova/whisper-small'; // pode trocar por tiny/base/small-medium large
const QUANTIZED = true;              // menor, mais leve
const CHUNK_SEC = 14;                // janela para parciais
const STRIDE_SEC = 4;                // overlap
const SR = 16000;
// Para hospedar modelos localmente, descomente as 2 linhas abaixo e ponha os arquivos em /public/models/whisper-small
// env.localModelPath = '/models';    // ex: /public/models
// env.allowLocalModels = true;
// ======================

env.backends.onnx.wasm.numThreads = 1; // ajuste p/ dispositivos fracos

let asr: Pipeline | null = null;
let pcm: Float32Array | null = null;
let lastFlushIdx = 0;
let busy = false;

async function ensurePipeline() {
  if (asr) return;
  // Ao inicializar, o modelo é baixado (ou lido localmente se configurado).
  asr = await pipeline('automatic-speech-recognition', MODEL, { quantized: QUANTIZED });
  (postMessage as any)({ type: 'ready' });
}

type Msg =
  | { type: 'init' }
  | { type: 'push'; pcm: Float32Array }
  | { type: 'flush' }
  | { type: 'reset' };

self.onmessage = async (e: MessageEvent<Msg>) => {
  try {
    const m = e.data;
    if (m.type === 'init') {
      await ensurePipeline();
      return;
    }
    if (!asr) await ensurePipeline();

    if (m.type === 'reset') {
      pcm = null; lastFlushIdx = 0;
      return;
    }

    if (m.type === 'push') {
      // append
      if (!pcm) pcm = m.pcm;
      else {
        const out = new Float32Array(pcm.length + m.pcm.length);
        out.set(pcm, 0); out.set(m.pcm, pcm.length);
        pcm = out;
      }
      // Parciais: roda no fim de cada push se não estiver ocupado
      if (!busy) {
        busy = true;
        // usa a janela final (CHUNK_SEC) com stride
        const L = Math.floor(CHUNK_SEC * SR);
        const S = Math.floor(STRIDE_SEC * SR);
        const start = Math.max(0, (pcm.length - L - S));
        const end = pcm.length;
        const window = pcm.subarray(start, end);

        const res: any = await (asr as any)(window, {
          // @ts-ignore
          language: LANGUAGE,
          task: TASK,
          chunk_length_s: CHUNK_SEC,
          stride_length_s: STRIDE_SEC,
          return_timestamps: false
        });
        const text = (res?.text || '').trim();
        if (text) (postMessage as any)({ type: 'partial', text });
        busy = false;
      }
      return;
    }

    if (m.type === 'flush') {
      if (!pcm || pcm.length <= lastFlushIdx + 1024) return;
      const segment = pcm.subarray(lastFlushIdx);
      lastFlushIdx = pcm.length;

      const res: any = await (asr as any)(segment, {
        // @ts-ignore
        language: LANGUAGE,
        task: TASK,
        chunk_length_s: CHUNK_SEC,
        stride_length_s: STRIDE_SEC,
        return_timestamps: false
      });
      const text = (res?.text || '').trim();
      if (text) (postMessage as any)({ type: 'final', text });
      return;
    }
  } catch (err: any) {
    (postMessage as any)({ type: 'error', message: String(err?.message || err) });
  }
};
