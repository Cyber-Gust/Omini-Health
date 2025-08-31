import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, patientHistory } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
Você é um assistente clínico que gera rascunhos de prescrição em português do Brasil, com foco em segurança e clareza.

TAREFA: Produzir apenas o TEXTO da RECEITA MÉDICA (sem cabeçalhos, rodapés, nomes de médico/paciente/data). NÃO USE Markdown. Cada item em linha separada, formato simples e profissional.

REGRAS DE SEGURANÇA:
- Considere alergias, medicações em uso e antecedentes em HISTÓRICO. NÃO inventar alergias ou interações.
- NÃO crie novas medicações se não houver indicação clara nos dados. Se faltar informação, escreva: "Sem dados suficientes para prescrição segura."
- Preferir DCB (Denominação Comum Brasileira) e evitar nomes comerciais, salvo se explicitamente mencionados.
- Especificar via (oral/IM/IV/etc.), dose, frequência, duração e quantidade total estimada.
- Se identificar possível conflito explícito nos dados (ex.: "alérgico a penicilina" e sugestão de amoxicilina), troque por "ALERTA: possível contraindicação – revisar." (não prescreva o fármaco conflitante).
- Tom impessoal e técnico.

FORMATO OBRIGATÓRIO:
RECEITA
[Medicamento – forma/concentração] — via — dose — frequência — duração — quantidade total — instruções (se houver)
[Próximo item, se houver]

Se não houver dados suficientes:
RECEITA
Sem dados suficientes para prescrição segura.

DADOS DISPONÍVEIS:
— HISTÓRICO (alergias, uso de fármacos, comorbidades): ${patientHistory || 'Não fornecido.'}
— TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
— EXAME FÍSICO: ${physicalExam || 'Não fornecido.'}
    `.trim();

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();
    const receita = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!receita) throw new Error('A resposta da IA estava vazia.');

    return NextResponse.json({ receita });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
