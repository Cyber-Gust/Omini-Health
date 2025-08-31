// src/lib/asr-adapter.ts
import { toast } from 'sonner';
import type { AsrEngine } from './engine';

type Backend = { start: () => void; stop: () => void };
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
  // Tem pelo menos uma letra/acentuação
  return /[\p{L}]/u.test(t);
}

class WebSpeechBackend implements Backend {
  private recognition: any = null;
  private aborting = false;
  private contextHint: string | undefined;

  constructor(contextHint?: string) {
    this.contextHint = contextHint;
  }

  start() {
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

    // Interims -> usamos para “piscar” UI se quiser; finais -> normalizamos
    this.recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last) return;

      const text = String(last[0]?.transcript || '').trim();
      if (!text) return;

      if (last.isFinal) {
        if (!isLikelySpeech(text)) return;
        const normalized = await normalizeMedical(text, this.contextHint);
        transcriptHandler?.(normalized);
      } else {
        // Se quiser feedback de digitação ao vivo, poderíamos enviar interinos aqui
        // transcriptHandler?.(text);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.aborting) return;
      toast.error(`Erro na transcrição: ${event?.error || 'desconhecido'}`);
    };

    this.recognition.onend = () => {
      // Em alguns ambientes o WebSpeech “cansa”; reinicia se não foi stop()
      if (!this.aborting) {
        try { this.recognition.start(); } catch {}
      }
    };

    this.recognition.start();
    toast.success('Transcrição (Web Speech) iniciada.');
  }

  stop() {
    this.aborting = true;
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
  }
}

const backends: Record<Exclude<AsrEngine, 'auto'>, (contextHint?: string) => Backend> = {
  webspeech: (c) => new WebSpeechBackend(c),
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

export const startASR = (engine: Exclude<AsrEngine, 'auto'>, contextHint?: string) => {
  stopASR();
  const factory = backends[engine];
  if (factory) {
    activeBackend = factory(contextHint);
    activeBackend.start();
  }
};

export const stopASR = () => {
  activeBackend?.stop?.();
  activeBackend = null;
};

export const setTranscriptHandler = (handler: (text: string) => void) => {
  transcriptHandler = handler;
};
