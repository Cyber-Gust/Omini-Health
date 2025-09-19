// src/lib/engine.ts
'use client';

export type AsrEngine = 'auto' | 'xenova_whisper';

/**
 * Hoje, sempre força o Xenova/Whisper (browser).
 * Se amanhã você quiser alternar para servidores/elevar modelo, basta estender aqui.
 */
export function pickEngine(flag: AsrEngine): Exclude<AsrEngine, 'auto'> {
  return 'xenova_whisper';
}
