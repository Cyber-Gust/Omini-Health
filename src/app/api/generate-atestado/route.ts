import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, patientName, physicalExam, vitals, patientHistory } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
Você é um assistente clínico que redige documentos médicos em português do Brasil, com linguagem técnica, objetiva e formal.

TAREFA: Gerar apenas o TEXTO do ATESTADO MÉDICO (sem cabeçalhos, rodapés, nomes de médico, carimbos ou dados de paciente/data — o template já inclui). NÃO USE Markdown. Use títulos/seções em MAIÚSCULAS.

REGRAS DE CONTEÚDO:
- Reformule toda linguagem leiga presente na transcrição para terminologia médica clara e impessoal (terceira pessoa).
- Decida entre "ATESTADO DE COMPARECIMENTO" ou "ATESTADO DE AFASTAMENTO".
  • Se faltar evidência clínica suficiente para afastamento, prefira "COMPARECIMENTO" e registre: "Sem indicação de afastamento por falta de elementos clínicos."
  • Se houver indicação de afastamento, informe o PERÍODO (em dias ou horas) fundamentado na queixa e achados objetivos.
- NÃO repetir nome do paciente nem a data.
- NÃO citar CID-10 a menos que tenha sido explicitamente mencionado nos dados.

FORMATO OBRIGATÓRIO DE SAÍDA (texto simples):
ATESTADO
TIPO: [COMPARECIMENTO | AFASTAMENTO]
PERÍODO: [ex.: 24 horas | 2 dias]  (se comparecimento, escreva "Não se aplica")
JUSTIFICATIVA CLÍNICA:
[1–3 frases técnicas, sem gírias]
RECOMENDAÇÕES:
[orientações concisas, se existirem; caso contrário: "Sem recomendações adicionais."]

DADOS DA CONSULTA (fontes):
— HISTÓRICO: ${patientHistory || 'Não fornecido.'}
— TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
— EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
— SINAIS VITAIS: ${vitals || 'Não fornecidos.'}
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
    const atestado = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!atestado) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ atestado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
