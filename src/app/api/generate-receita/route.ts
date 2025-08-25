import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, patientName, physicalExam, vitals, patientHistory, labResults } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Você é um assistente médico especialista. Com base nos dados da consulta para o paciente "${patientName}", gere APENAS o conteúdo de uma receita médica.
      
      **AVISO DE SEGURANÇA CRÍTICO:** Antes de sugerir qualquer medicação, considere o seguinte histórico do paciente para evitar interações medicamentosas e reações alérgicas:
      ${patientHistory}

      - A receita deve ser clara e seguir o formato padrão (nome do medicamento, dosagem, frequência, duração).
      - Não inclua cabeçalhos, rodapés ou nomes de médicos.

      DADOS DA CONSULTA:
      ---
      TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
      EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
      ---

      CONTEÚDO DA RECEITA GERADA:
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const receita = data.candidates[0]?.content?.parts[0]?.text;

    if (!receita) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ receita });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
