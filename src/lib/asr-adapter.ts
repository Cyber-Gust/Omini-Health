// src/lib/asr-adapter.tsx
'use client';

import { toast } from 'sonner';
import type { AsrEngine } from './engine';

type Backend = {
  start: (opts?: { contextHint?: string; stream?: MediaStream }) => void;
  stop: () => void;
};

let activeBackend: Backend | null = null;
let transcriptHandler: ((text: string) => void) | null = null;

/** Chama o normalizador médico no servidor */
async function normalizeMedical(text: string, context?: string): Promise<string> {
  try {
    const resp = await fetch('/api/asr/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    });
    if (!resp.ok) throw new Error('Falha ao normalizar');
    const json = await resp.json();
    return (json?.text || text).trim();
  } catch {
    // Se der erro, devolve bruto mesmo (não quebra a transcrição)
    return text;
  }
}

/** Pequeno “de-ruído”: ignora fragmentos curtíssimos sem letras */
function isLikelySpeech(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return false;
  return /[\p{L}]/u.test(t); // tem pelo menos uma letra (com acentuação)
}

/**
 * BACKEND: Web Speech API (webkitSpeechRecognition)
 * OBS: NÃO aceita MediaStream externo. O parâmetro `stream` é ignorado aqui.
 */
class WebSpeechBackend implements Backend {
  private recognition: any = null;
  private aborting = false;
  private contextHint?: string;

  constructor() {}

  start(opts?: { contextHint?: string; stream?: MediaStream }) {
    this.contextHint = opts?.contextHint;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('O seu navegador não suporta a transcrição. Tente o Google Chrome.');
      return;
    }

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
      } else {
        // Se quiser interinos, descomente:
        // transcriptHandler?.(text);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.aborting) return;
      const err = event?.error || 'desconhecido';
      // Alguns erros comuns: 'no-speech', 'audio-capture', 'not-allowed'
      toast.error(`Erro na transcrição: ${err}`);
    };

    this.recognition.onend = () => {
      // Em alguns ambientes o WebSpeech para; reiniciamos se não foi stop()
      if (!this.aborting) {
        try { this.recognition.start(); } catch {}
      }
    };

    try {
      this.recognition.start();
      toast.success('Transcrição (Web Speech) iniciada.');
    } catch (e) {
      toast.error('Não foi possível iniciar a transcrição.');
    }
  }

  stop() {
    this.aborting = true;
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
  }
}

/**
 * Espaço para backends que ACEITAM MediaStream (futuro):
 * - Ex.: Whisper no servidor via WebSocket, Opus/PCM
 * - Ex.: AudioWorklet + encoder Opus e envio em tempo real
 */
class StreamBackendExample implements Backend {
  private ac: AudioContext | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private proc: ScriptProcessorNode | null = null;
  // private ws: WebSocket | null = null;

  start(opts?: { contextHint?: string; stream?: MediaStream }) {
    // Só funciona se vier o stream de fora
    if (!opts?.stream) {
      toast.error('Backend de stream requer MediaStream externo.');
      return;
    }

    // Aqui você implementaria seu pipeline real (PCM/Opus + WS)
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ac = new AC({ sampleRate: 48000 });

    const resumeCtx = async () => {
      if (this.ac?.state === 'suspended') {
        try { await this.ac.resume(); } catch {}
      }
    };
    resumeCtx();

    this.src = this.ac.createMediaStreamSource(opts.stream);
    this.proc = this.ac.createScriptProcessor(4096, 1, 1);

    this.src.connect(this.proc);
    this.proc.connect(this.ac.destination); // ou um GainNode silencioso

    this.proc.onaudioprocess = (e) => {
      const ch0 = e.inputBuffer.getChannelData(0);
      // TODO: encode e enviar ao servidor
      // Quando chegar parcial/final do servidor:
      // transcriptHandler?.('texto parcial/final...');
    };

    toast.success('Transcrição (Stream backend) iniciada.');
  }

  stop() {
    try { this.proc?.disconnect(); } catch {}
    try { this.src?.disconnect(); } catch {}
    try { this.ac?.close(); } catch {}
    this.proc = null;
    this.src = null;
    this.ac = null;
  }
}

const backends: Record<Exclude<AsrEngine, 'auto'>, () => Backend> = {
  webspeech: () => new WebSpeechBackend(),
  // HABILITE quando tiver backend real que aceite stream:
  // 'whisper-websocket': () => new StreamBackendExample(),
  'whisper-webgpu': () => ({
    start() {
      toast.error('Motor Whisper local desativado nesta instalação.');
    },
    stop() {},
  }),
  'whisper-wasm': () => ({
    start() {
      toast.error('Motor Whisper WASM desativado nesta instalação.');
    },
    stop() {},
  }),
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
    activeBackend.start({ contextHint, stream });
  }
};

export const stopASR = () => {
  activeBackend?.stop?.();
  activeBackend = null;
};

export const setTranscriptHandler = (handler: (text: string) => void) => {
  transcriptHandler = handler;
};
