import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, patientName, physicalExam } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Você é um assistente médico especialista. Com base nos dados da consulta para o paciente "${patientName}", gere APENAS o conteúdo de um Pedido de Exame.
      - Analise a anamnese e o exame físico para sugerir os exames mais relevantes.
      - Formule uma Hipótese Diagnóstica (HD) concisa que justifique os exames.
      - Não inclua cabeçalhos, rodapés, nomes de médicos ou datas.
      - NÃO utilize axteriscos ou símbolos especiais. Use apenas texto simples. e para titulos utilize todas as letras maiusculas.

      DADOS DA CONSULTA:
      ---
      ANAMNESE: ${transcript || 'Não fornecida.'}
      EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
      ---

      CONTEÚDO DO PEDIDO DE EXAME GERADO:
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const pedidoExame = data.candidates[0]?.content?.parts[0]?.text;

    if (!pedidoExame) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ pedidoExame });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
