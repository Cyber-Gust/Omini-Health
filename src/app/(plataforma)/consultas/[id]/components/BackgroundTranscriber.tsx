'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { startASR, stopASR, setTranscriptHandler } from '@/lib/asr-adapter';
import { pickEngine, type AsrEngine } from '@/lib/engine';

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

/** Visualizador de voz responsivo (canvas ocupa largura disponível do container). */
function VoiceVisualizer({
  active,
  boost = 2.2,
  className = '',
}: {
  active: boolean;
  boost?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!active) return;
      try {
        const Ctx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new Ctx({ sampleRate: 44100 });
        audioCtxRef.current = audioCtx;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        // ganho só para o visualizador (não afeta ASR)
        const gain = audioCtx.createGain();
        gain.gain.value = 2.0; // ↑ aumente se quiser barras mais altas
        gainRef.current = gain;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        source.connect(gain);
        gain.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        dataRef.current = data;

        setReady(true);

        const draw = () => {
          const canvas = canvasRef.current;
          const a = analyserRef.current;
          const d = dataRef.current;
          if (!canvas || !a || !d) {
            rafRef.current = requestAnimationFrame(draw);
            return;
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            rafRef.current = requestAnimationFrame(draw);
            return;
          }

          // Largura/altura com base no CSS (responsivo)
          const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
          const cssW = canvas.clientWidth || 200;
          const cssH = canvas.clientHeight || 40;
          if (canvas.width !== cssW * DPR || canvas.height !== cssH * DPR) {
            canvas.width = cssW * DPR;
            canvas.height = cssH * DPR;
          }
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);

          a.getByteFrequencyData(d);

          // “respiração” global
          let sumSq = 0;
          for (let i = 0; i < d.length; i++) {
            const v = d[i] / 255;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / d.length);
          const breath = Math.min(1.6, 0.25 + rms * 1.2);

          const bars = 16;
          const gap = 3;
          const barW = (cssW - gap * (bars - 1)) / bars;
          const binsPerBar = Math.max(1, Math.floor(d.length / bars));

          // fundo sutil
          ctx.fillStyle = 'rgba(20, 184, 166, 0.08)';
          ctx.fillRect(0, 0, cssW, cssH);

          const curve = 0.6;

          for (let b = 0; b < bars; b++) {
            let acc = 0;
            for (let j = 0; j < binsPerBar; j++) {
              acc += d[b * binsPerBar + j];
            }
            const avg = acc / (binsPerBar * 255); // 0..1

            const strength = Math.pow(avg, curve);
            const hRaw = strength * cssH * breath * boost;
            const h = Math.max(2, Math.min(hRaw, cssH * 0.98));

            const x = b * (barW + gap);
            const y = cssH - h;

            const grad = ctx.createLinearGradient(x, y, x, cssH);
            grad.addColorStop(0, 'rgba(20, 184, 166, 0.95)');
            grad.addColorStop(1, 'rgba(20, 184, 166, 0.25)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barW, h);

            ctx.fillStyle = 'rgba(15, 118, 110, 0.35)';
            ctx.fillRect(x, y, barW, 2);
          }

          ctx.strokeStyle = 'rgba(15, 118, 110, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, cssH - 1.5);
          ctx.lineTo(cssW, cssH - 1.5);
          ctx.stroke();

          rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        setReady(false);
      }
    }

    if (active) setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      try {
        sourceRef.current?.disconnect();
        gainRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {}

      try {
        audioCtxRef.current?.close();
      } catch {}

      streamRef.current?.getTracks().forEach((t) => t.stop());

      sourceRef.current = null;
      gainRef.current = null;
      analyserRef.current = null;
      audioCtxRef.current = null;
      streamRef.current = null;

      setReady(false);
    };
  }, [active, boost]);

  if (!active || !ready) {
    return (
      <div
        className={`h-10 w-full max-w-[260px] sm:max-w-[320px] rounded-md bg-teal-50/40 border border-teal-100 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`h-10 w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] rounded-md border border-teal-200 shadow-inner ${className}`}
      aria-hidden
    />
  );
}

// Hook simulado para buscar as configurações do usuário/clínica
function useUserAsrFlag(): { flag: AsrEngine; isLoading: boolean } {
  return { flag: 'auto', isLoading: false };
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

export default function BackgroundTranscriber({
  isListening,
  onToggleListening,
  onTranscriptUpdate,
  contextHint,
}: BackgroundTranscriberProps) {
  const { flag: userFlag, isLoading } = useUserAsrFlag();
  const [isBlinking, setIsBlinking] = useState(false);

  // cronômetro
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // handler de transcrição
  useEffect(() => {
    setTranscriptHandler((text: string) => {
      onTranscriptUpdate({ speaker: 'Transcrição', text });
      setIsBlinking(true);
      const t = window.setTimeout(() => setIsBlinking(false), 450);
      void t;
    });
    return () => {};
  }, [onTranscriptUpdate]);

  // controla ASR + cronômetro (responsivo a start/stop)
  useEffect(() => {
    if (isListening) {
      // inicia/ressincroniza cronômetro
      const now = Date.now();
      startRef.current = now;
      setElapsedMs(0);
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        if (startRef.current) setElapsedMs(Date.now() - startRef.current);
      }, 1000);

      // inicia motor
      type EngineResolved = Exclude<AsrEngine, 'auto'>;
      const engine = pickEngine(userFlag) as EngineResolved;
      startASR(engine, contextHint);
    } else {
      stopASR();
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      // mantém elapsedMs na tela (não zera)
    }
    return () => {
      stopASR();
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isListening, userFlag, contextHint]);

  return (
    <div className="p-4 sm:p-6 rounded-lg border border-border bg-white shadow-sm">
      {/* Cabeçalho responsivo: empilha no mobile */}
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

      {/* Linha de status: no mobile empilha; no ≥sm fica lado a lado */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Esquerda: label + barras (container com largura fluida e max-w) */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-sm ${isListening ? 'text-teal-700' : 'text-gray-500'}`}>
            {isListening ? 'Detecção de voz ativa' : 'Pronto para iniciar'}
          </span>
          <div className="flex-1 min-w-0">
            <VoiceVisualizer active={isListening} boost={2.2} />
          </div>
        </div>

        {/* Direita: tempo (rótulo some no XS para caber) */}
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
