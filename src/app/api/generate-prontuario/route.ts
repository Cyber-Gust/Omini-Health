import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, vitals, patientHistory, labResults } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
Você é um assistente clínico que redige PRONTUÁRIO em formato SOAP em português do Brasil, com linguagem técnica, precisa e impessoal.

TAREFA: Produzir apenas o TEXTO do prontuário (sem cabeçalhos, rodapés, nomes de médico/paciente/data). NÃO USE Markdown. Os títulos S/O/A/P devem estar em MAIÚSCULAS. NÃO copie literalmente a fala do paciente; reescreva em linguagem médica.

REGRAS DE ESTILO:
- Objetividade, termos técnicos, terceira pessoa, sem gírias.
- Não inventar dados; quando faltar, escrever "Sem dados disponíveis."
- NAO CRIE NADA QUE NAO FOI FORNECIDO NOS DADOS E NA TRANSCRICAO.
- Se houver inconsistências, sinalizar em AVALIAÇÃO: "Inconsistências a revisar: ...".
- Não prescrever aqui; condutas vão em PLANO apenas se estiverem nos dados.

FORMATO OBRIGATÓRIO:
SUBJETIVO:
[Resumo da queixa, início/evolução, sintomas associados, antecedentes relevantes. Reescrito em termos médicos.]

OBJETIVO:
- SINAIS VITAIS: [listar os fornecidos; se ausentes, "Sem dados disponíveis."]
- EXAME FÍSICO: [achados positivos/negativos relevantes.]
- EXAMES COMPLEMENTARES: [resultados apresentados; se nenhum, "Sem dados disponíveis."]

AVALIAÇÃO:
[Problemas/hipóteses diagnósticas com raciocínio conciso. Se insuficiente: "Sem dados suficientes para hipóteses robustas."]

PLANO:
[Exames a considerar, acompanhamento, orientações fornecidas. Se não houver dados, "Sem dados disponíveis."]

DADOS DA CONSULTA (fontes):
— HISTÓRICO: ${patientHistory || 'Não fornecido.'}
— SINAIS VITAIS: ${vitals || 'Não fornecidos.'}
— EXAMES APRESENTADOS: ${labResults || 'Nenhum.'}
— TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
— EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
    `.trim();

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const prontuario = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!prontuario) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ prontuario });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
