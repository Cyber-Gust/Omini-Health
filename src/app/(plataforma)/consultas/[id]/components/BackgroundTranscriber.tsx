// components/BackgroundTranscriber.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  startASRWS as startASR,
  stopASRWS as stopASR,
  setTranscriptHandler,
  getTranscriptText,
  resetTranscriptText,
  isSpeechSupported,
} from '@/lib/ws-asr-adapter';
import { useMicStream } from '@/lib/useMicStream';
import VoiceVisualizer from './VoiceVisualizer';

export type TranscriptItem = {
  speaker: 'Médico' | 'Paciente' | 'Transcrição';
  text: string;
};

interface BackgroundTranscriberProps {
  isListening: boolean;
  onToggleListening: () => void;
  onTranscriptUpdate: (item: TranscriptItem) => void;
  contextHint?: string;
}

// HH:MM:SS
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Hook simulado p/ flag
function useUserAsrFlag(): { isLoading: boolean } {
  return { isLoading: false };
}

export default function BackgroundTranscriber({
  isListening,
  onToggleListening,
  onTranscriptUpdate,
  contextHint,
}: BackgroundTranscriberProps) {
  const { isLoading } = useUserAsrFlag();
  const [isBlinking, setIsBlinking] = useState(false);

  // cronômetro
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // microfone compartilhado
  const { stream, ready, error } = useMicStream(isListening);

  const [debugTranscript, setDebugTranscript] = useState<string>("");

  // controla ASR + cronômetro
  useEffect(() => {
    if (isListening && ready && stream) {
      resetTranscriptText();

      const now = Date.now();
      startRef.current = now;
      setElapsedMs(0);
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        if (startRef.current) setElapsedMs(Date.now() - startRef.current);
      }, 1000);

      // 🔺 inicia ASR nativo do navegador (SpeechRecognition)
      if (!isSpeechSupported()) {
        console.error('SpeechRecognition não suportado neste navegador.');
      } else {
        startASR(); // parâmetros são ignorados pelo adapter nativo
      }
    } else {
      stopASR();

      const full = getTranscriptText();
      if (full) onTranscriptUpdate({ speaker: 'Transcrição', text: full });

      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
    return () => {
      stopASR();
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // deps atualizados (removido ASR_SERVER_URL)
  }, [isListening, ready, stream, onTranscriptUpdate]);

  return (
    <div className="p-4 sm:p-6 rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Mic className={`h-6 w-6 transition-colors ${isListening ? 'text-teal-600' : 'text-gray-400'}`} />
            {isListening && isBlinking && (
              <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-teal-500 ring-2 ring-white animate-ping" />
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Transcrição</h2>
        </div>

        <button
          onClick={onToggleListening}
          disabled={isLoading}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-white font-semibold transition-colors ${
            isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-light hover:bg-brand-dark'
          }`}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {isListening ? 'Parar Transcrição' : 'Iniciar Transcrição'}
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-sm ${error ? 'text-red-600' : (isListening ? 'text-teal-700' : 'text-gray-500')}`}>
            {error ? 'Microfone indisponível' : (isListening ? 'Detecção de voz ativa' : 'Pronto para iniciar')}
          </span>
          <div className="flex-1 min-w-0">
            {/* Visualizador consome o MESMO stream */}
            <VoiceVisualizer stream={isListening ? stream : null} />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2">
          <span className="hidden xs:inline text-sm text-gray-500">Tempo de consulta</span>
          <span className="font-mono text-lg tabular-nums text-gray-900">
            {formatElapsed(elapsedMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
