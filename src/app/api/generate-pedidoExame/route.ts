// app/api/generate-pedido-exame/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // [NOVO]

export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, vitals, patientHistory, labResults } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave da API do Gemini não configurada.');
    }

    // O seu prompt detalhado e bem estruturado permanece o mesmo.
    const prompt = `
Você é um assistente clínico que elabora pedidos de exames em português do Brasil, com linguagem técnica e objetiva.

TAREFA: Gerar apenas o TEXTO do PEDIDO DE EXAMES (sem cabeçalhos, rodapés, nomes de médico/paciente/data). NÃO USE Markdown. Use títulos em MAIÚSCULAS.

REGRAS:
- NAO CRIE NADA QUE NAO FOI FORNECIDO NOS DADOS E NA TRANSCRICAO.
- Reformule linguagem leiga para termos médicos; tom impessoal (terceira pessoa).
- Priorize exames custo-efetivos e alinhados à hipótese clínica.
- Para cada exame solicitado, inclua a justificativa clínica em poucas palavras.
- NÃO inventar códigos (TUSS, CID) e NÃO prescrever tratamento aqui.
- Se faltarem dados para justificar exames, declarar explicitamente: "Sem dados suficientes para justificar novos exames."

FORMATO OBRIGATÓRIO:
HIPÓTESE DIAGNÓSTICA (HD):
[1–2 linhas; use termos técnicos. Se faltar, escrever "Sem dados suficientes."]

JUSTIFICATIVA CLÍNICA:
[2–4 linhas vinculando sintomas/achados aos exames. Pode citar achados objetivos.]

EXAMES SOLICITADOS:
- [Exame 1] — [justificativa breve]
- [Exame 2] — [justificativa breve]
[Se nenhum exame for indicado, escrever: "Sem exames adicionais indicados no momento."]

OBSERVAÇÕES:
[preparo/conduta logística somente se houver nos dados; caso contrário: "Sem observações."]

DADOS DA CONSULTA (fontes):
— HISTÓRICO: ${patientHistory || 'Não fornecido.'}
— SINAIS VITAIS: ${vitals || 'Não fornecidos.'}
— EXAMES PRÉVIOS: ${labResults || 'Nenhum.'}
— TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
— EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
    `.trim();

    // [ATUALIZADO] Lógica de chamada à API usando o SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Usando o modelo que você pediu
      generationConfig: { temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const pedidoExame = response.text().trim();
    
    if (!pedidoExame) {
      throw new Error('A resposta da IA estava vazia.');
    }

    return NextResponse.json({ pedidoExame });
  } catch (error: any) {
    // A sua gestão de erro original é mantida
    console.error("Erro na rota de pedido de exame:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}