import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, vitals, patientHistory, labResults } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
    const pedidoExame = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!pedidoExame) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ pedidoExame });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
