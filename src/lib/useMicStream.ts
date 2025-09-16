// src/lib/useMicStream.ts
'use client';
import { useEffect, useRef, useState } from 'react';

export function useMicStream(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memoRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let stopped = false;

    async function ensureStream() {
      if (!enabled) { setReady(false); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48_000,
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        memoRef.current = s; setStream(s); setReady(true); setError(null);
      } catch (e: any) {
        setError(e?.message || 'Falha ao acessar microfone'); setReady(false);
      }
    }

    if (enabled && !memoRef.current) ensureStream();

    return () => {
      stopped = true;
      if (memoRef.current) { memoRef.current.getTracks().forEach(t => t.stop()); memoRef.current = null; }
      setStream(null); setReady(false);
    };
  }, [enabled]);

  return { stream, ready, error } as const;
}
