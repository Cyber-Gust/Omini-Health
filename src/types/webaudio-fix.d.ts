// src/types/webaudio-fix.d.ts
declare global {
  interface AnalyserNode {
    // Afrouxa a tipagem para aceitar os Uint8Array “novos” (ArrayBufferLike)
    getByteFrequencyData(array: Uint8Array<ArrayBufferLike>): void;
    getByteTimeDomainData(array: Uint8Array<ArrayBufferLike>): void;
  }
}
export {};
