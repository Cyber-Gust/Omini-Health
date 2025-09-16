// src/workers/whisper.worker.ts
// Executa em Web Worker (isolado da UI). Requer @xenova/transformers.

const MODEL_ID = 'Xenova/whisper-small'; // para ainda mais acurácia: 'Xenova/whisper-medium'

// Contexto curto do final do chunk anterior (para continuidade entre blocos)
let tailContext = '';
let cfgChunkSec = 20;   // ~20s
let cfgStrideSec = 3;   // ~3s

// @ts-ignore
self.onmessage = async (ev: MessageEvent) => {
  const { type, payload } = ev.data || {};
  try {
    if (type === 'init') {
      const { pipeline, env } = await import('@xenova/transformers');

      // Se a página NÃO estiver crossOriginIsolated (Android WebView/alguns mobiles), force 1 thread:
      if (!(self as any).crossOriginIsolated) {
        // @ts-ignore
        env.backends.onnx.wasm.numThreads = 1;
        // @ts-ignore
        env.backends.onnx.wasm.proxy = true; // evita SharedArrayBuffer
      }
      // Cache no navegador ajuda muito em mobile:
      // @ts-ignore
      env.useBrowserCache = true;

      // Opcional: cache local (hospede modelos em /public/models)
      // @ts-ignore
      // env.localModelPath = '/models';

      // @ts-ignore
      (self as any)._pipePromise = pipeline('automatic-speech-recognition', MODEL_ID);

      // @ts-ignore
      (self as any)._whisperCfg = {
        lang: payload?.lang || 'pt',
        task: payload?.task || 'transcribe',
        context: payload?.context || '',
      };

      if (payload?.chunkMs && typeof payload.chunkMs === 'number') {
        cfgChunkSec = Math.max(10, Math.min(60, Math.round(payload.chunkMs / 1000)));
      }
      if (payload?.strideMs && typeof payload.strideMs === 'number') {
        cfgStrideSec = Math.max(1, Math.min(10, Math.round(payload.strideMs / 1000)));
      }

      tailContext = '';
      // @ts-ignore
      self.postMessage({ type: 'ready' });
      return;
    }

    if (type === 'chunk') {
      // @ts-ignore
      const pipe = await (self as any)._pipePromise;
      // @ts-ignore
      const cfg = (self as any)._whisperCfg || { lang: 'pt', task: 'transcribe' };

      const out = await pipe(payload, {
        chunk_length_s: cfgChunkSec,
        stride_length_s: cfgStrideSec,
        language: cfg.lang,
        task: cfg.task,
        return_timestamps: false,
        // Continuidade: leva um pedaço do fim do texto anterior
        prompt: tailContext,
        condition_on_previous_text: true,
      } as any);

      const text = (out?.text || '').trim();

      // Atualiza tailContext com ~120 chars finais
      const clean = text.replace(/\s+/g, ' ').trim();
      tailContext = clean.slice(-120);

      // @ts-ignore
      self.postMessage({ type: 'transcript', payload: text });
    }
  } catch (err: any) {
    // @ts-ignore
    self.postMessage({ type: 'error', payload: String(err?.message || err) });
  }
};
