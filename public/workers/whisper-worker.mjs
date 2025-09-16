// public/workers/whisper-worker.mjs
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js';

// ======= CONFIG =======
const LANGUAGE = 'pt';
const TASK = 'transcribe';
const MODEL = 'Xenova/whisper-small'; // mude para tiny/base se quiser
const QUANTIZED = true;
const CHUNK_SEC = 14;
const STRIDE_SEC = 4;
const SR = 16000;

// (opcional) modelos locais
// env.localModelPath = '/models';
// env.allowLocalModels = true;

// (opcional) afinar threads
env.backends.onnx.wasm.numThreads = 1;

let asr = null;
let pcm = null;
let lastFlushIdx = 0;
let busy = false;

async function ensurePipeline() {
  if (asr) return;
  asr = await pipeline('automatic-speech-recognition', MODEL, { quantized: QUANTIZED });
  postMessage({ type: 'ready' });
}

self.onmessage = async (e) => {
  try {
    const m = e.data;
    if (m.type === 'init') { await ensurePipeline(); return; }
    if (!asr) await ensurePipeline();

    if (m.type === 'reset') { pcm = null; lastFlushIdx = 0; return; }

    if (m.type === 'push') {
      if (!pcm) pcm = m.pcm;
      else {
        const out = new Float32Array(pcm.length + m.pcm.length);
        out.set(pcm, 0); out.set(m.pcm, pcm.length);
        pcm = out;
      }
      if (!busy) {
        busy = true;
        const L = Math.floor(CHUNK_SEC * SR);
        const S = Math.floor(STRIDE_SEC * SR);
        const start = Math.max(0, (pcm.length - L - S));
        const end = pcm.length;
        const window = pcm.subarray(start, end);

        const res = await asr(window, {
          language: LANGUAGE,
          task: TASK,
          chunk_length_s: CHUNK_SEC,
          stride_length_s: STRIDE_SEC,
          return_timestamps: false,
        });
        const text = (res?.text || '').trim();
        if (text) postMessage({ type: 'partial', text });
        busy = false;
      }
      return;
    }

    if (m.type === 'flush') {
      if (!pcm || pcm.length <= lastFlushIdx + 1024) return;
      const segment = pcm.subarray(lastFlushIdx);
      lastFlushIdx = pcm.length;

      const res = await asr(segment, {
        language: LANGUAGE,
        task: TASK,
        chunk_length_s: CHUNK_SEC,
        stride_length_s: STRIDE_SEC,
        return_timestamps: false,
      });
      const text = (res?.text || '').trim();
      if (text) postMessage({ type: 'final', text });
      return;
    }
  } catch (err) {
    postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
