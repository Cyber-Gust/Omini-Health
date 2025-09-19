// src/lib/transcript-post.ts

export type CleanOpts = {
  fixDecimals?: boolean;        // "37 vírgula 8" -> "37,8"
  attachUnits?: boolean;        // "37,8 graus" -> "37,8 °C", "135 por 85" -> "135/85 mmHg"
  conservativePunctuation?: boolean; // pontuação leve em marcadores de frase (opcional)
};

// Regex helpers
const reSpaces = /\s+/g;

// "37 vírgula 8" | "37  vírgula   8" | "37 ponto 5"
const reDecimalPt = /(\d+)\s*(vírgula|ponto)\s*(\d+)/gi;

// pressão “135 por 85” (ou “135 / 85”) — NÃO infere números se não existem
const rePressaoPor = /(\b\d{2,3})\s*(?:\/|por)\s*(\d{2,3}\b)/gi;

// temperatura “graus” depois de número: 37,8 graus / 38 graus
const reGraus = /\b(\d{2}(?:[,.]\d{1,2})?)\s*graus\b/gi;

// frequência cardíaca / respiratória / bpm / irpm
const reBpm = /\b(\d{2,3})\s*(?:bpm|batimentos( por minuto)?|(bat|min))\b/gi;
const reIrpm = /\b(\d{1,3})\s*(?:irpm|respirações( por minuto)?)\b/gi;

// SpO2 / saturação
const reSatPlain = /\b(?:saturação|sat(?:ura[cç]ão)?)\s*(\d{2,3})\s*%?/gi;
const rePct = /\b(\d{2,3})\s*%\b/g;

// Marcadores de frase para pontuação conservadora
const SENT_MARKERS = [
  'bom dia', 'boa tarde', 'boa noite', 'entendi', 'certo', 'perfeito',
  'muito bem', 'ótimo', 'agora', 'vamos', 'recomendo', 'está bem', 'tudo bem',
  'tem', 'teve', 'sente', 'sentiu', 'apresenta', 'relata', 'vou', 'solicitar',
  'oriento', 'retorne', 'procure'
];

/**
 * Limpa decimais, unidades e (opcional) pontuação leve.
 * NÃO reescreve palavras, não corrige termos, não muda ordem.
 */
export function lightCleanTranscript(input: string, opts: CleanOpts = {}): string {
  const {
    fixDecimals = true,
    attachUnits = true,
    conservativePunctuation = false,
  } = opts;

  if (!input) return '';

  let t = input;

  // 1) Decimais com "vírgula/ponto" somente quando HÁ dígitos dos dois lados
  if (fixDecimals) {
    t = t.replace(reDecimalPt, (_, a: string, __: string, b: string) => `${a},${b}`);
  }

  if (attachUnits) {
    // 2) Pressão arterial: "135 por 85" ou "135/85" -> "135/85 mmHg"
    t = t.replace(rePressaoPor, (_, s1: string, s2: string) => `${s1}/${s2} mmHg`);

    // 3) Temperatura: "37,8 graus" -> "37,8 °C"
    t = t.replace(reGraus, (_, temp: string) => `${temp.replace('.', ',')} °C`);

    // 4) FC: "88 bpm" ou "88 batimentos por minuto" -> "88 bpm"
    t = t.replace(reBpm, (_, n: string) => `${n} bpm`);

    // 5) FR: "22 irpm" / "22 respirações por minuto" -> "22 irpm"
    t = t.replace(reIrpm, (_, n: string) => `${n} irpm`);

    // 6) Saturação: "saturação 94" / "94 %" -> "94% SpO₂"
    // (a) quando escrito como "saturação 94"
    t = t.replace(reSatPlain, (_, n: string) => `${n}% SpO₂`);
    // (b) quando só tem "94 %" solto, não duplicar se já tem SpO₂
    t = t.replace(rePct, (_, n: string) => `${n}%`);
  }

  // 7) Pontuação conservadora (opcional)
  if (conservativePunctuation) {
    // Estratégia cuidadosa:
    // - Colocar ponto final antes de marcadores comuns se não houver já um sinal de fim (., !, ?)
    // - Não muda capitalização (para não “corrigir” nada)
    const tokens = t.split(/\n+/); // respeita quebras originais
    const processed: string[] = [];

    for (const block of tokens) {
      let s = block;

      // Insere ponto antes de marcador claro quando há uma sequência longa sem pontuação.
      for (const mk of SENT_MARKERS) {
        const re = new RegExp(`([^\\.\\!\\?\\n])\\s+(${escapeRegExp(mk)})\\b`, 'gi');
        s = s.replace(re, (_, prev: string, hit: string) => `${prev}. ${hit}`);
      }

      // Garante ponto final em blocos muito longos que não terminam com pontuação.
      if (s.trim().length > 60 && !/[.!?…]$/.test(s.trim())) {
        s = s.trimEnd() + '.';
      }

      processed.push(s);
    }

    t = processed.join('\n');
  }

  return t;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
