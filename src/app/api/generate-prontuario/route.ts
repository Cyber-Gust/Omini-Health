import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, patientName, physicalExam, vitals, patientHistory, labResults } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Você é um assistente médico especialista. Com base nos dados da consulta para o paciente "${patientName}", gere APENAS o conteúdo de um prontuário no formato SOAP.
      - **S (Subjetivo):** Use a transcrição da conversa (anamnese).
      - **O (Objetivo):** Incorpore os Sinais Vitais, os achados do Exame Físico e os Resultados de Exames.
      - **A (Avaliação):** Considere o Histórico do Paciente para formular as hipóteses.
      - **P (Plano):** Descreva o plano de tratamento.
      - Não inclua cabeçalhos, rodapés ou nomes de médicos. A sua única saída deve ser o texto do prontuário.
      - Para títulos, use letras maiúsculas (ex: SUBJETIVO).

      DADOS DA CONSULTA:
      ---
      HISTÓRICO DO PACIENTE: ${patientHistory || 'Não fornecido.'}
      SINAIS VITAIS DA CONSULTA ATUAL: ${vitals || 'Não fornecidos.'}
      RESULTADOS DE EXAMES APRESENTADOS: ${labResults || 'Nenhum'}
      TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
      EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
      ---

      CONTEÚDO DO PRONTUÁRIO (FORMATO SOAP):
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const prontuario = data.candidates[0]?.content?.parts[0]?.text;

    if (!prontuario) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ prontuario });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
