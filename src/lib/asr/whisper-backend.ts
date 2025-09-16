import { toast } from 'sonner';
import { createVAD } from '@/lib/audio/vad';

type Opts = { contextHint?: string; stream?: MediaStream };

async function loadWorklet(ac: AudioContext, url: string) {
  // Tenta carregar direto do caminho público; se falhar (404/MIME), faz fallback via Blob
  try {
    await ac.audioWorklet.addModule(url);
  } catch {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`);
    if (!res.ok) throw new Error(`Worklet fetch fail: ${res.status}`);
    const code = await res.text();
    const blob = new Blob([code], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      await ac.audioWorklet.addModule(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

export class WhisperWebGPUBackend {
  private ac: AudioContext | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private worker: Worker | null = null;
  private started = false;
  private lastVoice = 0;
  private vad = createVAD(16000, 30, 300);
  private onPartial: ((t: string) => void) | null = null;
  private onFinal: ((t: string) => void) | null = null;
  private basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, ''); // ex.: '' ou '/app'

  constructor(onPartial?: (t: string) => void, onFinal?: (t: string) => void) {
    this.onPartial = onPartial || null;
    this.onFinal = onFinal || null;
  }

  async start(opts?: Opts) {
    if (this.started) return;
    if (!opts?.stream) { toast.error('Áudio não disponível'); return; }

    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.ac = new AC({ latencyHint: 'interactive' });
      if (this.ac.state === 'suspended') { try { await this.ac.resume(); } catch {} }

      // Worklet (carregado de /public) — com fallback por Blob
      const workletURL = `${this.basePath}/worklets/resample-worklet.js`;
      await loadWorklet(this.ac, workletURL);

      this.src = this.ac.createMediaStreamSource(opts.stream);
      this.worklet = new AudioWorkletNode(this.ac, 'resample-processor', { numberOfInputs: 1, numberOfOutputs: 0 });
      this.src.connect(this.worklet);

      // depois (aponta pro .js dentro de src → o bundler empacota e vira blob:)
      this.worker = new Worker('/workers/whisper-worker.js', { name: 'whisper-worker' });

      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'ready') { toast.success('Whisper local pronto.'); return; }
        if (m.type === 'partial') this.onPartial?.(m.text);
        if (m.type === 'final') this.onFinal?.(m.text);
        if (m.type === 'error') toast.error('ASR: ' + m.message);
      };
      this.worker.onerror = (ev: any) => {
        console.error('Worker error:', ev?.message || ev);
        toast.error('ASR: erro no worker.');
      };
      this.worker.postMessage({ type: 'init' });

      // Encaminha PCM 16k + VAD
      this.worklet.port.onmessage = (ev) => {
        const f32: Float32Array = ev.data;
        const evs = this.vad.feed(f32);
        const now = Date.now();
        if (evs.some(e => e.type === 'start')) this.lastVoice = now;

        // envia “push” contínuo
        this.worker?.postMessage({ type: 'push', pcm: f32 }, [f32.buffer]);

        // silêncio por ~1.5s → flush
        if (this.lastVoice !== 0 && now - this.lastVoice > 1500) {
          this.worker?.postMessage({ type: 'flush' });
          this.lastVoice = 0;
        }
      };

      this.started = true;
      toast.success('Transcrição local iniciada.');
    } catch (err: any) {
      // se falhar em qualquer etapa, limpa tudo para poder tentar de novo
      console.error('Whisper backend start error:', err);
      toast.error(`Falha ao iniciar transcrição local: ${err?.message || err}`);
      this.stop();
    }
  }

  stop() {
    this.started = false;
    try { this.worklet?.disconnect(); } catch {}
    try { this.src?.disconnect(); } catch {}
    try { this.ac?.close(); } catch {}
    try { this.worker?.postMessage({ type: 'flush' }); } catch {}
    try { this.worker?.terminate(); } catch {}
    this.worklet = null;
    this.src = null;
    this.ac = null;
    this.worker = null;
    this.lastVoice = 0;
  }
}
