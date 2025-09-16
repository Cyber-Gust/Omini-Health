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

      // 1) Primeiro: o mais permissivo possível
      const candidates: MediaStreamConstraints[] = [
        { audio: true }, // deixa o UA decidir (melhor compatibilidade iOS/Android)
        {
          audio: {
            channelCount: 1,
            // não force sampleRate — alguns devices rejeitam; Worklet reamostra pra 16k
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
        // fallback “hard”
        { audio: { channelCount: 1 } },
      ];

      for (const c of candidates) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(c);
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

          // iOS/Safari: garantir AudioContext ativo (mas sem teste de energia bloqueante)
          const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
          const ac = new AC({ latencyHint: 'interactive' });
          if (ac.state === 'suspended') { try { await ac.resume(); } catch {} }

          // (Opcional) Teste leve de “tem algo chegando” — tolerante
          // Se quiser remover completamente, comente todo este bloco.
          try {
            const src = ac.createMediaStreamSource(stream);
            const an = ac.createAnalyser(); an.fftSize = 512;
            src.connect(an);
            const buf = new Uint8Array(an.frequencyBinCount);
            let ticks = 0, positives = 0;

            await new Promise<void>((resolve) => {
              const id = setInterval(() => {
                an.getByteTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) {
                  const v = (buf[i] - 128) / 128;
                  sum += v * v;
                }
                const rms = Math.sqrt(sum / buf.length);
                // ↓ limiar bem menor e mais tempo, pra não “reprovar” streams bons
                if (rms > 0.002) positives++;
                if (++ticks >= 10) { clearInterval(id); resolve(); }
              }, 100);
            });

            try { src.disconnect(); } catch {}
            try { an.disconnect(); } catch {}
            try { ac.close(); } catch {}
            // Não reprovamos se "positives" == 0 — apenas aceitamos o stream.
          } catch {
            // Se o teste falhar por qualquer motivo, não bloqueie: aceite o stream
            try { ac.close(); } catch {}
          }

          stopRef.current = () => { stream.getTracks().forEach(t => t.stop()); };
          setState({ stream, error: null, ready: true });
          return;
        } catch (err: any) {
          // Tenta o próximo candidate
          // Se for o último, reporta o erro real
          if (c === candidates[candidates.length - 1]) {
            const name = err?.name || 'Erro';
            const msg = err?.message || 'Falha ao acessar microfone.';
            const hint =
              name === 'NotAllowedError'
                ? 'Permita o acesso ao microfone nas configurações do navegador.'
                : name === 'NotFoundError'
                ? 'Nenhum microfone detectado.'
                : name === 'NotReadableError'
                ? 'Outro app pode estar usando o microfone.'
                : '';
            setState({ stream: null, error: `${name}: ${msg}${hint ? ` — ${hint}` : ''}`, ready: false });
          }
        }
      }
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
