import { toast } from 'sonner';
import { createVAD } from '@/lib/audio/vad';

type Opts = { contextHint?: string; stream?: MediaStream };

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

  constructor(onPartial?: (t: string) => void, onFinal?: (t: string) => void) {
    this.onPartial = onPartial || null;
    this.onFinal = onFinal || null;
  }

  async start(opts?: Opts) {
    if (this.started) return;
    if (!opts?.stream) { toast.error('Áudio não disponível'); return; }

    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ac = new AC({ latencyHint: 'interactive' });
    if (this.ac.state === 'suspended') { try { await this.ac.resume(); } catch {} }

    // Worklet
    await this.ac.audioWorklet.addModule('/worklets/resample-worklet.js');
    this.src = this.ac.createMediaStreamSource(opts.stream);
    this.worklet = new AudioWorkletNode(this.ac, 'resample-processor', { numberOfInputs: 1, numberOfOutputs: 0 });
    this.src.connect(this.worklet);

    // Worker
    this.worker = new Worker('/src/lib/asr/whisper-worker.js', { type: 'module' });
    this.worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { toast.success('Whisper local pronto.'); return; }
      if (m.type === 'partial') this.onPartial?.(m.text);
      if (m.type === 'final') this.onFinal?.(m.text);
      if (m.type === 'error') toast.error('ASR: ' + m.message);
    };
    this.worker.postMessage({ type: 'init' });

    // Encaminha PCM 16k + VAD
    this.worklet.port.onmessage = (ev) => {
      const f32: Float32Array = ev.data;
      const evs = this.vad.feed(f32);
      const nowLen = Date.now();
      if (evs.some(e => e.type === 'start')) this.lastVoice = nowLen;

      // envia “push” contínuo
      this.worker?.postMessage({ type: 'push', pcm: f32 }, [f32.buffer]);

      // se passou um tempo em silêncio, força “flush”
      // (ou a cada ~1.5s sem voz)
      if (nowLen - this.lastVoice > 1500 && this.lastVoice !== 0) {
        this.worker?.postMessage({ type: 'flush' });
        this.lastVoice = 0;
      }
    };

    this.started = true;
    toast.success('Transcrição local iniciada.');
  }

  stop() {
    this.started = false;
    try { this.worklet?.disconnect(); } catch {}
    try { this.src?.disconnect(); } catch {}
    try { this.ac?.close(); } catch {}
    try { this.worker?.postMessage({ type: 'flush' }); } catch {}
    try { this.worker?.terminate(); } catch {}
    this.worklet = null; this.src = null; this.ac = null; this.worker = null;
  }
}
