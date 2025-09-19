// src/lib/ws-asr-adapter.ts
'use client';

/**
 * Shims de tipos para Web Speech API (Chrome/Edge/Safari), já que lib.dom não
 * define SpeechRecognitionEvent. Mantém tudo leve e compatível.
 */
type SpeechRecognitionAlternative = { transcript: string; confidence: number };
type SpeechRecognitionResult = { isFinal: boolean; length: number; 0?: SpeechRecognitionAlternative; item: (i: number) => SpeechRecognitionAlternative };
type SpeechRecognitionResultList = { length: number; item: (i: number) => SpeechRecognitionResult; [index: number]: SpeechRecognitionResult };
type SpeechRecognitionEventLike = Event & { results: SpeechRecognitionResultList; resultIndex: number };

// Interface mínima do reconhecimento (webkitSpeechRecognition / SpeechRecognition)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;

  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEventLike) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: any) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;

  start(): void;
  stop(): void;
  abort(): void;
}

// Construtores possíveis expostos pelo browser
type SpeechRecognitionCtor = new () => ISpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  if (!w) return null;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionCtor || null;
}

// ===== API compatível com a antiga =====
export type Handler = (text: string) => void;

let handler: Handler = () => {};
export function setTranscriptHandler(fn: Handler) { handler = fn || (() => {}); }

let _accText = '';
let _running = false;
let _recognition: ISpeechRecognition | null = null;
let _chunkTimer: number | null = null;
let _restartPauseTimer: number | null = null;
let _stoppingSoft = false;

// Deduplicação simples de finais recentes p/ evitar repetições em reinícios
const _recentFinals: string[] = [];
const RECENT_FINALS_MAX = 10;

// Configuráveis:
const CHUNK_MS = 30_000;          // corte ~30s
const RESTART_PAUSE_MS = 300;     // pausa curta entre cortes (200–1000ms)
const LANG = 'pt-BR';

// Exponha se quiser checar suporte no componente
export const isSpeechSupported = () => !!getSpeechRecognitionCtor();

export function getTranscriptText(): string { return _accText; }
export function resetTranscriptText() { _accText = ''; _recentFinals.length = 0; }

// Internos util
function _appendFinal(text: string) {
  const t = (text || '').trim();
  if (!t) return;
  const last = _recentFinals[_recentFinals.length - 1];
  if (last && last === t) return; // evita duplicar o mesmo final

  _recentFinals.push(t);
  if (_recentFinals.length > RECENT_FINALS_MAX) _recentFinals.shift();

  _accText = _accText ? (_accText + '\n' + t) : t;

  // entrega o acumulado "cru" sem normalização
  try { handler(_accText); } catch {}
}

function _clearChunkTimer() {
  if (_chunkTimer) { window.clearTimeout(_chunkTimer); _chunkTimer = null; }
}
function _clearRestartPauseTimer() {
  if (_restartPauseTimer) { window.clearTimeout(_restartPauseTimer); _restartPauseTimer = null; }
}

function _scheduleChunkCut() {
  _clearChunkTimer();
  // Força um "flush" de finais a cada ~30s
  _chunkTimer = window.setTimeout(() => {
    if (!_recognition) return;
    _stoppingSoft = true;         // marca que o stop foi intencional
    try { _recognition.stop(); } catch {}
  }, CHUNK_MS - 200);             // pequeno headroom p/ o onend chegar antes de 30s exatos
}

function _createRecognition(): ISpeechRecognition {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) throw new Error('SpeechRecognition não é suportado neste navegador.');

  const rec = new Ctor();
  rec.lang = LANG;
  rec.continuous = true;          // mantém a sessão ativa enquanto possível
  rec.interimResults = true;      // mostra parciais (não salvamos parciais)

  rec.onresult = (ev: SpeechRecognitionEventLike) => {
    // iteramos somente pelos finais e acrescentamos crú
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results.item(i);
      if (r?.isFinal) {
        const alt = (r[0] ?? r.item(0));
        if (alt?.transcript != null) _appendFinal(String(alt.transcript));
      }
    }
  };

  rec.onerror = (ev: any) => {
    const err = String(ev?.error || '');
    // Casos esperados durante o ciclo:
    if (err === 'aborted') return;     // stop() intencional
    // Em "no-speech" e "network" tentamos reiniciar; outros mostramos no console
    if (err === 'no-speech' || err === 'network' || err === 'audio-capture' || err === 'not-allowed' || err === 'service-not-allowed') {
      // backoff leve será aplicado via onend
    } else {
      console.warn('[ASR:nativo] erro:', err, ev?.message || '');
    }
  };

  rec.onend = () => {
    // Sempre que termina, se ainda estamos "rodando", reinicia após pequena pausa
    if (!_running) return;

    _clearChunkTimer();
    _clearRestartPauseTimer();

    _restartPauseTimer = window.setTimeout(() => {
      try {
        _recognition?.start();
        _scheduleChunkCut();
      } catch (e) {
        // Em alguns casos o motor ainda não está pronto; tenta novamente
        _restartPauseTimer = window.setTimeout(() => {
          try { _recognition?.start(); _scheduleChunkCut(); } catch {}
        }, 500);
      }
    }, _stoppingSoft ? RESTART_PAUSE_MS : 500);

    _stoppingSoft = false;
  };

  return rec;
}

// ===== API =====
export async function startASRWS(_serverUrl?: string, _stream?: MediaStream) {
  if (_running) return;
  _running = true;
  resetTranscriptText();

  if (!isSpeechSupported()) {
    _running = false;
    throw new Error('Este navegador não suporta SpeechRecognition.');
  }

  _recognition = _createRecognition();

  try {
    _recognition.start();
    _scheduleChunkCut();
  } catch (e) {
    _running = false;
    _recognition = null;
    _clearChunkTimer();
    throw e;
  }
}

export async function stopASRWS() {
  if (!_running) return;
  _running = false;

  _clearChunkTimer();
  _clearRestartPauseTimer();

  try { _recognition?.stop(); } catch {}
  _recognition = null;
}
