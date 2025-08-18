import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, patientName, physicalExam } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Você é um assistente médico especialista. Com base nos dados da consulta para o paciente "${patientName}", gere APENAS o texto de um atestado médico.
      - O texto deve ser formal e conciso.
      - Se a consulta sugerir a necessidade de afastamento, inclua o número de dias. Caso contrário, crie um texto para um atestado de comparecimento.
      - Não inclua cabeçalhos, rodapés, nomes de médicos ou datas. A sua única saída deve ser o texto do atestado.
      - NÃO utilize axteriscos ou símbolos especiais. Use apenas texto simples. e para titulos utilize todas as letras maiusculas.

      DADOS DA CONSULTA:
      ---
      ANAMNESE: ${transcript || 'Não fornecida.'}
      EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
      ---

      CONTEÚDO DO ATESTADO GERADO:
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const atestado = data.candidates[0]?.content?.parts[0]?.text;

    if (!atestado) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ atestado });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
