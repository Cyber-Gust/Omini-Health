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

async function normalizeMedical(text: string, context?: string): Promise<string> {
  // mantém sua normalização opcional no servidor — MAS a transcrição não vai p/ servidor.
  try {
    const resp = await fetch('/api/asr/normalize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    });
    if (!resp.ok) throw new Error('Falha ao normalizar');
    const json = await resp.json();
    return (json?.text || text).trim();
  } catch { return text; }
}

function isLikelySpeech(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return false;
  return /[\p{L}]/u.test(t);
}

class WebSpeechBackend implements Backend {
  private recognition: any = null;
  private aborting = false;
  private contextHint?: string;

  start(opts?: { contextHint?: string; stream?: MediaStream }) {
    this.contextHint = opts?.contextHint;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Navegador sem Web Speech.'); return; }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'pt-BR';
    this.recognition.interimResults = true;
    this.aborting = false;

    this.recognition.onresult = async (event: any) => {
      const last = event.results?.[event.results.length - 1];
      if (!last) return;
      const text = String(last[0]?.transcript || '').trim();
      if (!text) return;
      if (last.isFinal) {
        if (!isLikelySpeech(text)) return;
        const normalized = await normalizeMedical(text, this.contextHint);
        transcriptHandler?.(normalized);
      }
    };
    this.recognition.onerror = (event: any) => {
      if (this.aborting) return;
      toast.error(`Erro na transcrição: ${event?.error || 'desconhecido'}`);
    };
    this.recognition.onend = () => {
      if (!this.aborting) { try { this.recognition.start(); } catch {} }
    };
    try { this.recognition.start(); toast.success('Transcrição (Web Speech) iniciada.'); }
    catch { toast.error('Não foi possível iniciar a transcrição.'); }
  }
  stop() {
    this.aborting = true;
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
  }
}

class WhisperLocalBackend implements Backend {
  private impl: WhisperWebGPUBackend | null = null;
  constructor() {
    this.impl = new WhisperWebGPUBackend(
      (t) => { /* parciais (opcional) */ },
      async (t) => {
        if (!isLikelySpeech(t)) return;
        const normalized = await normalizeMedical(t);
        transcriptHandler?.(normalized);
      }
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
  webspeech: () => new WebSpeechBackend(),
  'whisper-webgpu': () => new WhisperLocalBackend(),
  'whisper-wasm'  : () => new WhisperLocalBackend(), // mesmo backend; Transformers.js decide o backend (WebGPU/WASM)
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
