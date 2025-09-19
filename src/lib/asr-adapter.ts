// src/lib/asr-adapter.ts
'use client';

export type AsrEngine = 'auto' | 'xenova_whisper';

type Handler = (text: string) => void;
let handler: Handler = () => {};
export function setTranscriptHandler(fn: Handler) {
  handler = fn || (() => {});
}

/** =========================
 *  Estado & Config
 *  ========================= */
let audioCtx: AudioContext | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let processor: ScriptProcessorNode | null = null; // usado apenas no fallback
let workletNode: AudioWorkletNode | null = null;

let running = false;
let transcriber: any | null = null;

// Ring buffer para janela deslizante
const SR = 16_000;
let ring: Float32Array | null = null;
let ringIdx = 0;
let ringLen = 0;

// janela e passo (latência x estabilidade)
const WINDOW_S = 3;              // 3 s de janela
const STEP_MS = 2500;            // tick a cada 2.5 s (overlap ~0.5 s)
const RING_SAMPLES = SR * WINDOW_S;

let intervalId: number | null = null;

// Anti-concorrência + VAD simples
let busy = false;
let silenceTicks = 0;
const RMS_SILENCE = 0.004;       // ajuste conforme microfone/ambiente
const VOICE_WARMUP_TICKS = 2;    // precisa 2 ticks de “voz” antes de transcrever

// Acúmulo de transcrição
let _accText = '';
let _lastEmitted = '';
export function getTranscriptText(): string {
  return _accText.trim();
}
export function resetTranscriptText() {
  _accText = '';
  _lastEmitted = '';
}

/** =========================
 *  Helpers
 *  ========================= */

// downsample rápido (nearest)
function resampleToMono16k(input: Float32Array, inSampleRate: number): Float32Array {
  if (inSampleRate === SR) return input;
  const ratio = inSampleRate / SR;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  let pos = 0;
  for (let i = 0; i < outLen; i++) {
    out[i] = input[Math.floor(pos)] || 0;
    pos += ratio;
  }
  return out;
}

// Singleton do pipeline (sobrevive a HMR)
async function getTranscriber() {
  if (typeof window === 'undefined') return null;
  const g = globalThis as any;
  if (g.__whisper_transcriber) return g.__whisper_transcriber;
  if (g.__whisper_transcriber_promise) return g.__whisper_transcriber_promise;

  const { pipeline, env } = await import('@xenova/transformers');
  // manter simples (WASM single-thread, sem proxy/worker) — evita COOP/COEP
  env.allowLocalModels = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  // Se quiser hospedar local:
  // env.localModelPath = '/models';
  // env.backends.onnx.wasm.wasmPaths = '/wasm';

  const p = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  g.__whisper_transcriber_promise = p;
  const t = await p;
  g.__whisper_transcriber = t;
  return t;
}

// acumular texto evitando duplicatas de parciais
function accumulateTextPiece(currentRaw: string) {
  const current = (currentRaw || '').trim();
  if (!current) return;

  if (current === _lastEmitted) return;

  let delta = current;
  if (_lastEmitted && current.startsWith(_lastEmitted)) {
    delta = current.slice(_lastEmitted.length).trimStart();
  }
  _lastEmitted = current;

  const endsSentence = /[.!?:…]\s*$/.test(delta);
  _accText += delta + (endsSentence ? '\n' : ' ');
  handler(current); // mantém callback para quem quiser depurar/logar
}

/** =========================
 *  API pública
 *  ========================= */

export async function startASR(
  engine: Exclude<AsrEngine, 'auto'>,
  contextHint: string | undefined,
  stream: MediaStream
) {
  if (running) return;
  if (typeof window === 'undefined') return;
  running = true;

  // zera acumulador no início de cada sessão
  resetTranscriptText();

  transcriber = await getTranscriber();
  if (!transcriber) {
    console.error('ASR: transcriber não disponível.');
    running = false;
    return;
  }

  // Áudio graph
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  source = audioCtx.createMediaStreamSource(stream);

  // prepara ring
  ring = new Float32Array(RING_SAMPLES);
  ringLen = RING_SAMPLES;
  ringIdx = 0;

  // tenta usar Worklet; se falhar, cai para ScriptProcessor
  try {
    await audioCtx.audioWorklet.addModule('/worklets/downsampler-processor.js'); // opcional; se não existir, entra no catch
    workletNode = new AudioWorkletNode(audioCtx, 'downsampler-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: { targetSampleRate: 16000 },
    });
    source.connect(workletNode);
    workletNode.port.onmessage = (e) => {
      if (!running || !ring) return;
      const { type, samples } = e.data || {};
      if (type !== 'chunk' || !samples) return;
      const chunk: Float32Array = samples;
      for (let i = 0; i < chunk.length; i++) {
        ring[ringIdx++] = chunk[i];
        if (ringIdx >= ringLen) ringIdx = 0;
      }
    };
    // manter “vivo” em alguns browsers
    workletNode.connect(audioCtx.destination);
    processor = null;
  } catch {
    // Fallback: ScriptProcessorNode (deprecated, mas simples)
    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      if (!running || !ring) return;
      const inBuf = e.inputBuffer.getChannelData(0);
      const resampled = resampleToMono16k(inBuf, audioCtx!.sampleRate);
      for (let i = 0; i < resampled.length; i++) {
        ring[ringIdx++] = resampled[i];
        if (ringIdx >= ringLen) ringIdx = 0;
      }
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
    workletNode = null;
  }

  // loop de transcrição
  const tick = async () => {
    if (!running || !ring || !transcriber) return;

    // snapshot linear do ring
    const snapshot = new Float32Array(ringLen);
    const tail = ringLen - ringIdx;
    snapshot.set(ring.subarray(ringIdx), 0);
    snapshot.set(ring.subarray(0, ringIdx), tail);

    // VAD simples por RMS
    let sum = 0;
    for (let i = 0; i < snapshot.length; i++) sum += snapshot[i] * snapshot[i];
    const rms = Math.sqrt(sum / snapshot.length);

    if (rms < RMS_SILENCE) {
      silenceTicks++;
      return;
    }
    if (silenceTicks < VOICE_WARMUP_TICKS) {
      silenceTicks++;
      return;
    }
    silenceTicks = 0;

    if (busy) return;
    busy = true;

    try {
      // dá espaço pra UI respirar
      await new Promise<void>((resolve) => {
        (window as any).requestIdleCallback
          ? (window as any).requestIdleCallback(() => resolve())
          : requestAnimationFrame(() => resolve());
      });

      const result: any = await transcriber(snapshot, {
        language: 'pt',
        task: 'transcribe',
        // opções extras poderiam ir aqui (chunk_length_s, return_timestamps, prompt etc.)
      });
      if (result?.text) {
        accumulateTextPiece(String(result.text));
      }
    } catch (err) {
      console.error('ASR error:', err);
    } finally {
      busy = false;
    }
  };

  intervalId = window.setInterval(tick, STEP_MS);

  // pausa ticks quando a aba estiver oculta (economiza CPU)
  const visHandler = () => {
    if (document.hidden) {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    } else if (!intervalId) {
      intervalId = window.setInterval(tick, STEP_MS);
    }
  };
  document.addEventListener('visibilitychange', visHandler);
  // guard p/ remover no stop
  (startASR as any).__visHandler = visHandler;
}

export function stopASR() {
  if (!running) return;
  running = false;

  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }

  const visHandler = (startASR as any).__visHandler as (() => void) | undefined;
  if (visHandler) {
    document.removeEventListener('visibilitychange', visHandler);
    (startASR as any).__visHandler = undefined;
  }

  if (workletNode) {
    try { workletNode.disconnect(); } catch {}
    workletNode.port.onmessage = null as any;
    workletNode = null;
  }

  if (processor) {
    try { processor.disconnect(); } catch {}
    processor.onaudioprocess = null;
    processor = null;
  }

  if (source) {
    try { source.disconnect(); } catch {}
    source = null;
  }

  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }

  ring = null;
  ringIdx = 0;
  ringLen = 0;
  busy = false;
  silenceTicks = 0;
}
