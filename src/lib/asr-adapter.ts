// src/lib/asr-adapter.ts
import { AsrEngine } from './engine';

let handler: (text: string) => void = () => {};
export function setTranscriptHandler(fn: (text: string) => void) { handler = fn; }

let currentEngine: AsrEngine | null = null;
let webspeechRec: any = null;
let whisperWorker: Worker | null = null;
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

function buildMediaRecorder(stream: MediaStream): MediaRecorder {
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';
  return new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 });
}

export async function startASR(
  engine: Exclude<AsrEngine, 'auto'>,
  contextHint: string | undefined,
  stream: MediaStream
) {
  await stopASR();
  currentEngine = engine;
  mediaStream = stream;

  if (engine === 'webspeech') startWebSpeech(contextHint);
  else if (engine === 'xenova_whisper') await startWhisper(contextHint, stream);
}

export async function stopASR() {
  if (currentEngine === 'webspeech') {
    if (webspeechRec) {
      try {
        webspeechRec.onresult = null;
        webspeechRec.onend = null;
        webspeechRec.onerror = null;
        webspeechRec.stop();
      } catch {}
    }
    webspeechRec = null;
  }
  if (currentEngine === 'xenova_whisper') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
    }
    mediaRecorder = null;
    chunks = [];
    if (whisperWorker) { whisperWorker.terminate(); whisperWorker = null; }
  }
  currentEngine = null;
}

function startWebSpeech(_contextHint?: string) {
  const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) { handler('[ASR] Web Speech API indisponível.'); return; }
  webspeechRec = new SR();
  webspeechRec.lang = 'pt-BR';
  webspeechRec.continuous = true;
  webspeechRec.interimResults = true;

  let buffer = '';
  webspeechRec.onresult = (ev: any) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) buffer += res[0].transcript + ' ';
      else interim += res[0].transcript + ' ';
    }
    const out = (buffer + interim).trim();
    if (out) handler(out);
  };
  webspeechRec.onerror = (e: any) => console.warn('[WebSpeech:error]', e);
  webspeechRec.onend = () => { try { webspeechRec.start(); } catch {} };
  try { webspeechRec.start(); } catch (e) { console.error(e); }
}

async function startWhisper(contextHint: string | undefined, stream: MediaStream) {
  whisperWorker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });

  whisperWorker.onmessage = (ev: MessageEvent) => {
    const { type, payload } = ev.data || {};
    if (type === 'transcript') {
      handler(String(payload || '').trim());
    } else if (type === 'error') {
      console.error('[whisper.worker]', payload);
    }
  };

  // Config: 20s de chunk + 3s de stride. Contexto vem no próprio worker.
  whisperWorker.postMessage({
    type: 'init',
    payload: {
      lang: 'pt',
      task: 'transcribe',
      context: contextHint || '',
      chunkMs: 20000,
      strideMs: 3000,
    }
  });

  mediaRecorder = buildMediaRecorder(stream);
  const INTERVAL_MS = 20000;

  // Vamos usar o modo "streaming": start(INTERVAL_MS) emite dataavailable a cada 20s.
  mediaRecorder.ondataavailable = async (e) => {
    if (!e.data || e.data.size === 0) return;
    try {
      const buf = await e.data.arrayBuffer();
      whisperWorker?.postMessage({ type: 'chunk', payload: buf }, [buf]);
    } catch (err) {
      console.error('[ondataavailable] arrayBuffer error', err);
    }
  };

  mediaRecorder.onstop = () => {
    // nada especial — não paramos em Android
  };

  try {
    // IMPORTANTE no Android: passar timeslice para gerar eventos periódicos
    mediaRecorder.start(INTERVAL_MS);
  } catch (e) {
    console.error('[MediaRecorder.start]', e);
  }

  // Pausar quando a aba perder foco (Android pode suspender Worker/Audio)
  const onVis = () => {
    if (document.hidden) {
      try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch {}
    } else if (currentEngine === 'xenova_whisper') {
      try { mediaRecorder = buildMediaRecorder(stream); mediaRecorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        const buf = await e.data.arrayBuffer();
        whisperWorker?.postMessage({ type: 'chunk', payload: buf }, [buf]);
      }; mediaRecorder.start(INTERVAL_MS); } catch {}
    }
  };
  document.addEventListener('visibilitychange', onVis, { passive: true });

  // limpar no stopASR()
}
