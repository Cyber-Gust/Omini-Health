const TH_ENERGY_ON  = 0.003;
const TH_ENERGY_OFF = 0.0015;
const TH_ZCR_ON     = 0.05;
const TH_ZCR_OFF    = 0.03;

export function createVAD(sampleRate = 16000, frameMs = 30, hangMs = 300) {
  const frameLen = Math.floor(sampleRate * frameMs / 1000);
  const hangFrames = Math.ceil(hangMs / frameMs);
  let voiced = false, hang = 0;

  function feat(frame: Float32Array) {
    let e = 0, zc = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i];
      e += s * s;
      if (i && (frame[i - 1] > 0) !== (s > 0)) zc++;
    }
    return { energy: e / frame.length, zcr: zc / frame.length };
  }

  function feed(x: Float32Array) {
    const evs: Array<{type:'start'|'stop'}> = [];
    for (let i = 0; i + frameLen <= x.length; i += frameLen) {
      const f = x.subarray(i, i + frameLen);
      const { energy, zcr } = feat(f);
      if (!voiced) {
        if (energy > TH_ENERGY_ON || zcr > TH_ZCR_ON) { voiced = true; hang = hangFrames; evs.push({type:'start'}); }
      } else {
        if (energy < TH_ENERGY_OFF && zcr < TH_ZCR_OFF) {
          if (--hang <= 0) { voiced = false; evs.push({type:'stop'}); }
        } else {
          hang = hangFrames;
        }
      }
    }
    return evs;
  }
  return { feed, isVoiced: () => voiced };
}
