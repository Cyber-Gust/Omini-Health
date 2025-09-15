// lib/useMicStream.ts
'use client';
import { useEffect, useRef, useState } from 'react';

type MicState = { stream: MediaStream | null; error: string | null; ready: boolean };

export function useMicStream(active: boolean): MicState {
  const [state, setState] = useState<MicState>({ stream: null, error: null, ready: false });
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!active) return;

      const sup = navigator.mediaDevices.getSupportedConstraints?.() ?? {};
      const base: MediaTrackConstraints = {
        channelCount: 1,
        sampleRate: 48000, // preferido no Android
        ...(sup.echoCancellation ? { echoCancellation: true } : {}),
        ...(sup.noiseSuppression ? { noiseSuppression: true } : {}),
        ...(sup.autoGainControl ? { autoGainControl: true } : {}),
      };

      const candidates: MediaStreamConstraints[] = [
        { audio: base },
        { audio: { channelCount: 1, sampleRate: 48000 } }, // sem AEC/NS/AGC
        { audio: true }, // fallback final
      ];

      for (const c of candidates) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(c);
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

          // Teste rápido para evitar “stream mudo”
          const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
          const ac = new AC();
          if (ac.state === 'suspended') { try { await ac.resume(); } catch {} }
          const src = ac.createMediaStreamSource(stream);
          const an = ac.createAnalyser(); an.fftSize = 512;
          src.connect(an);

          // Tipagem compatível após o .d.ts
          const buf: Uint8Array<ArrayBufferLike> = new Uint8Array(an.frequencyBinCount);

          const ok = await new Promise<boolean>(resolve => {
            let ticks = 0, positives = 0;
            const id = setInterval(() => {
              an.getByteTimeDomainData(buf);
              let sum = 0;
              for (let i = 0; i < buf.length; i++) {
                const v = (buf[i] - 128) / 128;
                sum += v * v;
              }
              const rms = Math.sqrt(sum / buf.length);
              if (rms > 0.01) positives++;
              if (++ticks >= 5) {
                clearInterval(id);
                resolve(positives >= 1);
              }
            }, 100);
          });

          src.disconnect(); an.disconnect(); ac.close();

          if (!ok) { stream.getTracks().forEach(t => t.stop()); continue; }

          stopRef.current = () => { stream.getTracks().forEach(t => t.stop()); };
          setState({ stream, error: null, ready: true });
          return;
        } catch {
          // tenta próximo candidate
        }
      }

      setState({ stream: null, error: 'Falha ao acessar microfone (Android).', ready: false });
    }

    if (active) start();

    return () => {
      cancelled = true;
      stopRef.current();
      stopRef.current = () => {};
      setState(s => ({ ...s, stream: null, ready: false }));
    };
  }, [active]);

  return state;
}
