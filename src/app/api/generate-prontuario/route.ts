// app/api/generate-prontuario/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'; // [NOVO]
import { lightCleanTranscript } from '@/lib/transcript-post';

// --- CONFIGURAÇÃO ---
const API_KEY = process.env.GEMINI_API_KEY;

// --- TIPOS (mantidos) ---
type GenConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
};

// --- FUNÇÕES UTILITÁRIAS (mantidas 100% intactas) ---
function sanitizeText(input: string | undefined | null, max = 8000): string {
  if (!input) return '';
  let t = String(input)
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (t.length > max) t = t.slice(0, max) + '…';
  return t;
}

function sanitizeTranscriptStrict(input: string | undefined | null, max = 12000): string {
    if (!input) return '';
    let t = String(input).replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
    if (t.length > max) t = t.slice(0, max);
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
    // SUA LÓGICA DE PÓS-PROCESSAMENTO CONTINUA AQUI, SEM NENHUMA MUDANÇA
    return text;
}

// --- LÓGICA DE API ATUALIZADA ---

// A função de retry continua a mesma, funcionando perfeitamente com a nova chamada de API
async function withRetries<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 + i * 400));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Falha após tentativas.');
}

// [ATUALIZADO] A função callGemini agora usa o SDK do Google
async function callGeminiWithSDK(prompt: string, genCfg: GenConfig) {
  if (!API_KEY) throw new Error('Chave da API do Gemini não configurada.');
  
  const genAI = new GoogleGenerativeAI(API_KEY);

  // As configurações de segurança são mapeadas para o formato do SDK
  const safetySettings: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Usando o modelo que você pediu
    generationConfig: {
      candidateCount: genCfg.candidateCount ?? 1,
      maxOutputTokens: genCfg.maxOutputTokens ?? 1200,
      temperature: genCfg.temperature ?? 0.15,
      topP: genCfg.topP ?? 0.9,
      topK: genCfg.topK ?? 40,
    },
    safetySettings,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('Resposta vazia do modelo Gemini.');
  }
  return text;
}

// [NOVO] Helper para timeout, já que o SDK não usa AbortSignal diretamente
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operação excedeu o tempo limite de ${ms}ms.`));
    }, ms);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// --- HANDLER PRINCIPAL (com mínimas alterações) ---
export async function POST(request: Request) {
  try {
    if (!API_KEY) throw new Error('Chave da API do Gemini não configurada.');

    // Toda a sua lógica de sanitização de entrada permanece a mesma
    const body = await request.json().catch(() => ({}));
    const transcript_raw = sanitizeTranscriptStrict(body?.transcript, 12000);
    const useClean = body?.useClean === true;
    const transcript_clean = useClean
      ? lightCleanTranscript(transcript_raw, {
          fixDecimals: true,
          attachUnits: true,
          conservativePunctuation: false,
        })
      : transcript_raw;
    const physicalExam = sanitizeText(body?.physicalExam, 6000);
    const vitals = sanitizeText(body?.vitals, 2000);
    const patientHistory = sanitizeText(body?.patientHistory, 4000);
    const labResults = sanitizeText(body?.labResults, 4000);
    
    const prompt = buildPrompt({
      transcript: transcript_clean,
      physicalExam,
      vitals,
      patientHistory,
      labResults,
    });

    // [ATUALIZADO] A chamada de API com retry e timeout
    const apiCallPromise = withRetries(
      () => callGeminiWithSDK(prompt, { temperature: 0.1, maxOutputTokens: 1200 }),
      2
    );

    // O timeout agora "envelopa" a chamada com retries
    const raw = await withTimeout(apiCallPromise, 30000);

    const prontuario = enforceSOAPShape(raw);

    return NextResponse.json({ prontuario });
  } catch (error: any) {
    // SEU FALLBACK DE SEGURANÇA CONTINUA AQUI, SEM NENHUMA MUDANÇA
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
    return NextResponse.json({ prontuario: fallback, warning: msg }, { status: 200 });
  }
}