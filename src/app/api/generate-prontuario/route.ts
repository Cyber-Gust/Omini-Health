// app/api/generate-prontuario/route.ts
import { NextResponse } from 'next/server';
import { lightCleanTranscript } from '@/lib/transcript-post'; // [ADD]


type GenConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  
};

const MODEL = process.env.GEMINI_MODEL_ID?.trim() || 'gemini-2.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;

// -------- utils
function sanitizeText(input: string | undefined | null, max = 8000): string {
  if (!input) return '';
  let t = String(input)
    .replace(/\u0000/g, '')              // null chars
    .replace(/\r/g, '\n')                // normaliza quebra
    .replace(/[^\S\n]+/g, ' ')           // espaços duplicados
    .replace(/\n{3,}/g, '\n\n')          // quebras múltiplas
    .trim();
  if (t.length > max) t = t.slice(0, max) + '…';
  return t;
}

function sanitizeTranscriptStrict(input: string | undefined | null, max = 12000): string {
  if (!input) return '';
  // só remove null-char e padroniza CRLF -> \n; NÃO mexe em espaços ou múltiplas quebras
  let t = String(input).replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
  if (t.length > max) t = t.slice(0, max); // sem “…”
  return t;
}


function buildPrompt(payload: {
  transcript: string; physicalExam: string; vitals: string;
  patientHistory: string; labResults: string;
}) {
  // Prompt “data-cage”: deixa claro que o modelo só pode usar o bloco de dados
  return `
Você é um assistente clínico que redige PRONTUÁRIO em formato SOAP em português do Brasil, com linguagem técnica, precisa e impessoal.

⚠️ REGRAS CRÍTICAS (OBRIGATÓRIO CUMPRIR):
- NÃO invente dados factuais do caso e NÃO use conhecimento externo fora dos <DADOS>. Use SOMENTE informações presentes em <DADOS>.
- Se um campo não tiver informação, escreva exatamente: "Sem dados disponíveis."
- Escreva em terceira pessoa, objetiva, sem jargões coloquiais, sem Markdown.
- Não inclua cabeçalho/rodapé, assinaturas ou identificação de paciente/profissional.
- Títulos das seções em MAIÚSCULAS: SUBJETIVO / OBJETIVO / AVALIAÇÃO / PLANO.
- Se perceber inconsistências, aponte-as na AVALIAÇÃO com a linha "Inconsistências a revisar: ...".
- Elabore com base no contexto do todo, pois algumas palavras da transcricao podem vir trocadas.

🔎 REGRA ESPECÍFICA PARA O PLANO:
- Se a transcrição não trouxer condutas explícitas do médico, **elabore um PLANO PROPOSTO** coerente com os achados dos <DADOS>, incluindo (quando aplicável):
  • exames complementares a considerar,
  • medidas terapêuticas iniciais não-especificamente medicamentosas,
  • orientações de sinais de alarme e retorno,
  • necessidade de acompanhamento/encaminhamento.
- Não prescreva fármacos específicos fora dos dados; se medicação não constar em <DADOS>, descreva medidas e encaminhamentos de forma genérica (ex.: "analgesia conforme protocolo da unidade", "hidratação oral", "encaminhamento para avaliação especializada").
- Se os dados forem insuficientes para qualquer proposta concreta, escreva uma proposta mínima: acompanhamento, reavaliação e sinais de alarme.

- No SUBJETIVO, organize a anamnese em: queixa principal, início, duração, localização, intensidade, fatores associados, agravantes/atenuantes, antecedentes relevantes, quando disponíveis.

- Na AVALIAÇÃO, apresente hipótese diagnóstica principal, diagnósticos diferenciais, estratificação de gravidade e limitações dos dados, quando aplicável.

- No PLANO, inclua prazos, critérios de retorno e prioridades assistenciais sempre que possível.

- Verifique coerência entre todas as seções. Em caso de conflito, registre em AVALIAÇÃO.

FORMATO EXATO (SEM TEXTO ANTES OU DEPOIS):
SUBJETIVO:
[texto]

OBJETIVO:
- SINAIS VITAIS: [texto]
- EXAME FÍSICO: [texto]
- EXAMES COMPLEMENTARES: [texto]

AVALIAÇÃO:
[texto]

PLANO:
[por falta de plano, caso tenha sido necessário propor, redija-o de forma técnica. Se já houver plano explícito nos dados, apenas redija-o de forma técnica.]

<DADOS>
HISTÓRICO:
${payload.patientHistory || 'Sem dados disponíveis.'}

SINAIS VITAIS:
${payload.vitals || 'Sem dados disponíveis.'}

EXAMES APRESENTADOS:
${payload.labResults || 'Sem dados disponíveis.'}

TRANSCRIÇÃO (ANAMNESE):
${payload.transcript || 'Sem dados disponíveis.'}

EXAME FÍSICO:
${payload.physicalExam || 'Sem dados disponíveis.'}
</DADOS>
`.trim();
}

function enforceSOAPShape(text: string): string {
  // Garante que todas as seções existam e na ordem correta, ainda que vazias.
  const sections = ['SUBJETIVO', 'OBJETIVO', 'AVALIAÇÃO', 'PLANO'];
  let out = text.trim();

  // Remove markdown acidental
  out = out.replace(/[*_`>#-]{1,}/g, (m) => (m.includes('#') ? '' : m));

  // Injeta seções faltantes
  for (const sec of sections) {
    const re = new RegExp(`\\b${sec}\\s*:`, 'i');
    if (!re.test(out)) {
      if (sec === 'OBJETIVO') {
        out += `\n\nOBJETIVO:\n- SINAIS VITAIS: Sem dados disponíveis.\n- EXAME FÍSICO: Sem dados disponíveis.\n- EXAMES COMPLEMENTARES: Sem dados disponíveis.`;
      } else {
        out += `\n\n${sec}:\nSem dados disponíveis.`;
      }
    }
  }

  // Normaliza manchetes e subitens do OBJETIVO
  out = out
    .replace(/^\s*subjetivo\s*:/im, 'SUBJETIVO:')
    .replace(/^\s*objetivo\s*:/im, 'OBJETIVO:')
    .replace(/^\s*avalia(ç|c)ão\s*:/im, 'AVALIAÇÃO:')
    .replace(/^\s*plano\s*:/im, 'PLANO:')
    .replace(/- *sinais vitais\s*:/i, '- SINAIS VITAIS:')
    .replace(/- *exame f(í|i)sico\s*:/i, '- EXAME FÍSICO:')
    .replace(/- *exames complementares\s*:/i, '- EXAMES COMPLEMENTARES:');

  return out.trim();
}

async function callOpenRouter(prompt: string, signal?: AbortSignal) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API Key não configurada');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'OmniHealth',
    },
    body: JSON.stringify({
      model: 'arcee-ai/trinity-large-preview:free',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente clínico especialista em prontuários médicos em português do Brasil.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.15,
      max_tokens: 3000,
    }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('🔥 OpenRouter Error:', txt);
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }

  const data = await res.json();

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Resposta vazia do OpenRouter');
  }
  return text;
}

async function callGemini(prompt: string, genCfg: GenConfig, signal?: AbortSignal) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL
  )}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: genCfg.temperature ?? 0.15,
      topP: genCfg.topP ?? 0.9,
      topK: genCfg.topK ?? 40,
      maxOutputTokens: genCfg.maxOutputTokens ?? 2500,
      candidateCount: genCfg.candidateCount ?? 1,
    },
    safetySettings: [
      // Mantemos padrões conservadores; ajuste se necessário
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const label = `🤖 Gemini-${Date.now()}`;
  console.time(label);
  console.log('📤 GEMINI PAYLOAD', {
    model: MODEL,
    promptSize: prompt.length,
  });

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${txt || 'Erro na comunicação com a IA.'}`);
  }

  const data = await res.json();
  console.timeEnd(label);

  console.log('📩 GEMINI RESPONSE', {
    candidates: data?.candidates?.length,
    hasText: !!data?.candidates?.[0]?.content?.parts?.[0]?.text,
  });
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    data?.candidates?.[0]?.content?.parts?.[0]?.rawText?.trim();

  if (!text) throw new Error('Resposta vazia do modelo.');
  return text as string;
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // backoff simples: 200ms, 600ms…
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 + i * 400));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Falha após tentativas.');
}

// -------- handler
export async function POST(request: Request) {
  try {
    // if (!API_KEY) throw new Error('Chave da API do Gemini não configurada.');
    if (!process.env.OPENROUTER_API_KEY && !API_KEY) {
      throw new Error('Nenhuma API de IA configurada');
    }
    const body = await request.json().catch(() => ({}));
    const transcript_raw = sanitizeTranscriptStrict(body?.transcript, 12000);   
    
    const useClean = body?.useClean === true; // mande true do front quando quiser
    const transcript_clean = useClean
      ? lightCleanTranscript(transcript_raw, {
          fixDecimals: true,
          attachUnits: true,
          conservativePunctuation: false, // mude p/ true se quiser pontuação leve
        })
      : transcript_raw; 
    
    // 🔍 DEBUG API — entrada
    console.log('📥 API RECEBEU', {
      rawLength: body?.transcript?.length ?? 0,
      cleanLength: transcript_clean.length,
      preview: transcript_clean.slice(0, 200),
    });  
    const physicalExam = sanitizeText(body?.physicalExam, 6000);
    const vitals = sanitizeText(body?.vitals, 2000);
    const patientHistory = sanitizeText(body?.patientHistory, 4000);
    const labResults = sanitizeText(body?.labResults, 4000);

    console.log('📥 GEN-PRONTUARIO DEBUG', {
      transcriptLength: transcript_clean.length,
      transcriptPreview: transcript_clean.slice(0, 200),
      vitalsLength: vitals.length,
      physicalExamLength: physicalExam.length,
      model: MODEL,
    });

    // Prompt “blindado”
    const prompt = buildPrompt({
      transcript: transcript_clean,
      physicalExam,
      vitals,
      patientHistory,
      labResults,
    });

    // Tempo limite opcional (10s)
    const ctrl = new AbortController();
    //const timeout = setTimeout(() => ctrl.abort(), 60000);

    const raw = await withRetries(
      () => callOpenRouter(prompt, ctrl.signal),
      2
    );

   //  const raw = await withRetries(
   //   () => callGemini(prompt, { temperature: 0.1, maxOutputTokens: 1200 }, ctrl.signal),
   //   2
   // );

    //clearTimeout(timeout);

    // Garante SOAP bem formatado
    const prontuario = enforceSOAPShape(raw);

    return NextResponse.json({ prontuario });
  } catch (error: any) {
    console.error('🔥 GEN-PRONTUARIO ERROR', error);
    // fallback minimalista para não travar o fluxo do usuário
    const fallback =
`SUBJETIVO:
Sem dados disponíveis.

OBJETIVO:
- SINAIS VITAIS: Sem dados disponíveis.
- EXAME FÍSICO: Sem dados disponíveis.
- EXAMES COMPLEMENTARES: Sem dados disponíveis.

AVALIAÇÃO:
Sem dados suficientes para hipóteses robustas.

PLANO:
Plano proposto (gerado por IA) — submeter à revisão.
- Acompanhamento clínico conforme disponibilidade do serviço.
- Orientações gerais de sinais de alarme e retorno imediato se piora.
- Reavaliação programada quando houver dados adicionais.`;

    const msg = (error?.message || 'Erro desconhecido').slice(0, 500);
    return NextResponse.json(
      { prontuario: fallback, warning: msg },
      { status: 500 }
    );
  }
}
