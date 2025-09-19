// public/worklets/downsampler-processor.js
// AudioWorklet para converter áudio capturado (qualquer sampleRate) em mono 16 kHz

class DownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = (options?.processorOptions?.targetSampleRate) || 16000;
    this._buf = [];
    this._accumSamples = 0;
  }

  // Resample simples (nearest neighbor) para 16 kHz
  _resampleTo16k(input, inRate) {
    if (inRate === this.targetRate) return input;
    const ratio = inRate / this.targetRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    let pos = 0;
    for (let i = 0; i < outLen; i++) {
      out[i] = input[Math.floor(pos)] || 0;
      pos += ratio;
    }
    return out;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const chan = input[0]; // canal 0
    if (!chan) return true;

    const inRate = sampleRate; // sampleRate do contexto de áudio
    const mono16k = this._resampleTo16k(chan, inRate);

    // acumula blocos para enviar em ~40 ms (menos mensagens => mais eficiente)
    this._buf.push(mono16k);
    this._accumSamples += mono16k.length;

    if (this._accumSamples >= this.targetRate * 0.04) { // ~40 ms
      const total = this._accumSamples;
      const merged = new Float32Array(total);
      let off = 0;
      for (const chunk of this._buf) {
        merged.set(chunk, off);
        off += chunk.length;
      }
      this._buf = [];
      this._accumSamples = 0;

      // envia pro main thread (zero-copy transfer)
      this.port.postMessage({ type: 'chunk', samples: merged }, [merged.buffer]);
    }

    return true;
  }
}

registerProcessor('downsampler-processor', DownsamplerProcessor);
