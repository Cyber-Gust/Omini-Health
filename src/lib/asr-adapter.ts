'use client';

import { toast } from 'sonner';
import type { AsrEngine } from './engine';
import { WhisperWebGPUBackend } from './asr/whisper-backend';

type Backend = {
  start: (opts?: { contextHint?: string; stream?: MediaStream }) => void | Promise<void>;
  stop: () => void;
};

let activeBackend: Backend | null = null;
let transcriptHandler: ((text: string) => void) | null = null;

/** Filtrozinho para ignorar ruídos curtíssimos (opcional) */
function isLikelySpeech(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  return /[\p{L}]/u.test(t); // tem pelo menos uma letra
}

/** ===== WebSpeech (fallback opcional) ===== */
class WebSpeechBackend implements Backend {
  private recognition: any = null;
  private aborting = false;

  start() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('O seu navegador não suporta Web Speech.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'pt-BR';
    this.recognition.interimResults = true;

    this.aborting = false;

    this.recognition.onresult = (event: any) => {
      const last = event.results?.[event.results.length - 1];
      if (!last) return;

      const text = String(last[0]?.transcript || '').trim();
      if (!text) return;

      // Envia CRU (sem normalizar/alterar)
      if (last.isFinal) {
        if (!isLikelySpeech(text)) return;
        transcriptHandler?.(text);
      }
      // Se quiser parciais:
      // else { transcriptHandler?.(text); }
    };

    this.recognition.onerror = (event: any) => {
      if (this.aborting) return;
      const err = event?.error || 'desconhecido';
      toast.error(`Erro na transcrição: ${err}`);
    };

    this.recognition.onend = () => {
      if (!this.aborting) {
        try { this.recognition.start(); } catch {}
      }
    };

    try {
      this.recognition.start();
      toast.success('Transcrição (Web Speech) iniciada.');
    } catch {
      toast.error('Não foi possível iniciar a transcrição (Web Speech).');
    }
  }

  stop() {
    this.aborting = true;
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
  }
}

/** ===== Whisper local (WebGPU/WASM) ===== */
class WhisperLocalBackend implements Backend {
  private impl: WhisperWebGPUBackend | null = null;

  constructor() {
    this.impl = new WhisperWebGPUBackend(
      // onPartial (se quiser exibir interinos em tempo real, descomente)
      // (t) => { if (isLikelySpeech(t)) transcriptHandler?.(t); },
      undefined,
      // onFinal — envia CRU ao handler
      (t) => { if (isLikelySpeech(t)) transcriptHandler?.(t); }
    );
  }
  async start(opts?: { contextHint?: string; stream?: MediaStream }) {
    await this.impl?.start(opts);
  }
  stop() {
    this.impl?.stop();
  }
}

const backends: Record<Exclude<AsrEngine, 'auto'>, () => Backend> = {
  webspeech:    () => new WebSpeechBackend(),
  'whisper-webgpu': () => new WhisperLocalBackend(),
  'whisper-wasm'  : () => new WhisperLocalBackend(), // Transformers decide backend (WebGPU/WASM)
};

export const startASR = (
  engine: Exclude<AsrEngine, 'auto'>,
  contextHint?: string,
  stream?: MediaStream
) => {
  stopASR();
  const factory = backends[engine];
  if (factory) {
    activeBackend = factory();
    const res = activeBackend.start({ contextHint, stream });
    if (res instanceof Promise) res.catch(e => toast.error(String(e?.message || e)));
  }
};

export const stopASR = () => {
  activeBackend?.stop?.();
  activeBackend = null;
};

export const setTranscriptHandler = (handler: (text: string) => void) => {
  transcriptHandler = handler;
};
