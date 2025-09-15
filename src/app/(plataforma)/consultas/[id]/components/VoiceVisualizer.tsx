// components/VoiceVisualizer.tsx
'use client';
import { useEffect, useRef } from 'react';

export default function VoiceVisualizer({
  stream,
  className = '',
}: { stream: MediaStream | null; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      if (!stream) return;

      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ac = new AC();
      audioCtxRef.current = ac;
      if (ac.state === 'suspended') { try { await ac.resume(); } catch {} }

      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 512;
      an.smoothingTimeConstant = 0.85;
      src.connect(an);
      analyserRef.current = an;
      dataRef.current = new Uint8Array(an.frequencyBinCount);

      const draw = () => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        const a = analyserRef.current;
        const d = dataRef.current;
        if (!canvas || !a || !d) { rafRef.current = requestAnimationFrame(draw); return; }
        const ctx = canvas.getContext('2d'); if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

        const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const cssW = canvas.clientWidth || 200;
        const cssH = canvas.clientHeight || 40;
        if (canvas.width !== cssW * DPR || canvas.height !== cssH * DPR) {
          canvas.width = cssW * DPR; canvas.height = cssH * DPR;
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        a.getByteFrequencyData(d as unknown as Uint8Array);
        // fundo
        ctx.fillStyle = 'rgba(20, 184, 166, 0.08)';
        ctx.fillRect(0, 0, cssW, cssH);

        const bars = 16, gap = 3;
        const barW = (cssW - gap * (bars - 1)) / bars;

        for (let b = 0; b < bars; b++) {
          let acc = 0;
          const binsPerBar = Math.max(1, Math.floor(d.length / bars));
          for (let j = 0; j < binsPerBar; j++) acc += d[b * binsPerBar + j];
          const avg = acc / (binsPerBar * 255); // 0..1
          const strength = Math.pow(avg, 0.6);
          const hRaw = strength * cssH * 2.2;
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
    }

    setup();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try { analyserRef.current?.disconnect(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      analyserRef.current = null;
      audioCtxRef.current = null;
      dataRef.current = null;
      cancelled = true;
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-10 w-full max-w-[360px] rounded-md border border-teal-200 shadow-inner ${className}`}
      aria-hidden
    />
  );
}
