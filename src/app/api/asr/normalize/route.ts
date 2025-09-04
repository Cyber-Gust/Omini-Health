// src/app/api/asr/normalize/route.ts
import { NextResponse } from 'next/server';

type Mode = 'off' | 'light' | 'llm';

function lightCleanup(text: string) {
  // colapsa espaços, remove espaço antes de pontuação, capitaliza e garante pontuação final
  let t = (text || '').replace(/\s+/g, ' ').replace(/\s([?!.,;:])/g, '$1').trim();
  if (!t) return '';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

function tokenizeBase(s: string) {
  // remove acentos e minúsculas para comparar tokens
  const base = (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const tokens = base.match(/[a-z0-9]+/gi) ?? [];
  return new Set(tokens);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto ausente.' }, { status: 400 });
    }

    const mode = ((process.env.ASR_NORMALIZE_MODE as Mode) || 'off');

    // 1) Modo padrão: verbatim (sem IA)
    if (mode === 'off') {
      return NextResponse.json({ text }); // retorna exatamente o que veio do ASR
    }

    // 2) Modo leve: limpeza determinística (sem IA)
    if (mode === 'light') {
      return NextResponse.json({ text: lightCleanup(text) });
    }

    // 3) Modo LLM com guard-rail (usa Gemini, mas nunca deixa "entrar" coisa nova)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // sem chave, volta ao seguro
      return NextResponse.json({ text });
    }

    const prompt = `Reescreva o TEXTO APENAS corrigindo pontuação e ortografia.
- NÃO adicione termos médicos novos.
- NÃO resuma, NÃO parafraseie, NÃO traduza.
- Preserve TODAS as palavras originais (apenas ajustes de maiúscula/minúscula e sinais).
- Se não for possível reescrever sem alterar o conteúdo, devolva o texto exatamente como veio.

TEXTO:
---
${text}
---
RESPOSTA APENAS COM O TEXTO CORRIGIDO:`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, topP: 0, topK: 1 },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      // falhou o provider? volta para o original (seguro)
      return NextResponse.json({ text }, { status: 200 });
    }

    const data = await resp.json();
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    if (!out) return NextResponse.json({ text }, { status: 200 });

    // Guard anti-alucinação: rejeita se surgirem palavras "novas" (>=4 chars)
    const orig = tokenizeBase(text);
    const norm = tokenizeBase(out);
    let added = 0;
    for (const tok of norm) {
      if (!orig.has(tok) && tok.length >= 4) {
        added++;
        break;
      }
    }
    if (added > 0) {
      // se IA inventou algo, devolve o texto original
      return NextResponse.json({ text }, { status: 200 });
    }

    return NextResponse.json({ text: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 });
  }
}
