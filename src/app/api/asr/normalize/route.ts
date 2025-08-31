// src/app/api/asr/normalize/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, context } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto ausente.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
Você é um assistente clínico que revisa transcrições de voz para português (Brasil) com linguagem médica técnica.
Reescreva o TEXTO a seguir de forma clara, impessoal e profissional, com ortografia e pontuação corretas.
- Não invente fatos.
- Se houver termos leigos, substitua por termos médicos equivalentes (ex.: "pressão alta" -> "hipertensão arterial").
- Preserve números, tempos e relações causais.
- Mantenha apenas o conteúdo do próprio paciente (não inclua cabeçalho/rodapé/nome do médico/paciente/data).
${context ? `\nContexto adicional: ${context}\n` : ''}

TEXTO:
---
${text}
---

SAÍDA (apenas o texto reescrito):
    `.trim();

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error('Falha ao chamar o Gemini.');
    const data = await resp.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!out) throw new Error('Resposta vazia do modelo.');
    return NextResponse.json({ text: out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
