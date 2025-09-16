/* global sampleRate */
class ResampleProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.target = 16000;
    this.r = sampleRate / this.target;
    this.buf = [];
    this.peak = 1e-4;
    this.alpha = 0.995;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    let t = 0;
    while (t < ch.length) {
      const i = Math.floor(t);
      const frac = t - i;
      const s0 = ch[i] || 0;
      const s1 = ch[i + 1] || s0;
      const s = s0 + (s1 - s0) * frac;
      this.peak = Math.max(this.peak * this.alpha, Math.abs(s));
      this.buf.push(s);
      t += this.r;
    }
    if (this.buf.length >= 1600) {
      const norm = Math.max(0.2, Math.min(0.95 / this.peak, 5.0));
      const out = new Float32Array(this.buf.length);
      for (let i = 0; i < out.length; i++) out[i] = this.buf[i] * norm;
      this.port.postMessage(out, [out.buffer]);
      this.buf.length = 0;
      this.peak = 1e-4;
    }
    return true;
  }
}
registerProcessor('resample-processor', ResampleProcessor);
