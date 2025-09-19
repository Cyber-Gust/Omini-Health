import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, patientHistory } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // ---------- PROMPT SUPER ESTRITO DE FORMATAÇÃO ----------
    // Gera exatamente o bloco abaixo, sem markdown, sem cabeçalho extra, sem nomes/CRM/data.
    const prompt = `
Você é um assistente clínico que gera a RECEITA MÉDICA em português (Brasil) COM FORMATAÇÃO FIXA.
Produza APENAS o TEXTO da receita. Não use Markdown, asteriscos, bullets, numeração automática do Word, ou códigos.
Não invente informações que não estejam nos dados.

REGRAS DE SEGURANÇA
- NÃO CRIE NADA QUE NÃO FOI FORNECIDO NOS DADOS, apenas se for uma sugenstao que resolva queixas mais simples.
- Considere alergias, medicações em uso e comorbidades em HISTÓRICO. Se houver contraindicação explícita, não prescreva; escreva “ALERTA: possível contraindicação – revisar.” no lugar do item.
- Se faltar informação para prescrever com segurança, retorne o bloco “Sem dados suficientes para prescrição segura.” (veja formato).
- Usar DCB (nome genérico). Indicar via, dose, frequência, duração e quantidade estimada.
- Linguagem técnica, impessoal. Sem abreviações ambíguas (use “via oral” em vez de “VO”, “comprimido” pode ser “cp”).

FORMATO OBRIGATÓRIO (REPLIQUE EXATAMENTE OS TÍTULOS E A ORDEM)
Receita

Uso oral:
1. {Medicamento} {concentração} ------------------------------------------------{quantidade}
Tomar {número} {forma} via oral {frequência} por {duração}

[Se houver mais itens, continue 2., 3., … no mesmo padrão. Se via não for oral, troque a seção abaixo por “Uso {via}:” e mantenha o mesmo padrão.]

Se não houver dados suficientes:
Receita

Sem dados suficientes para prescrição segura.

DADOS DISPONÍVEIS
— HISTÓRICO (alergias, uso de fármacos, comorbidades):
${patientHistory || 'Não fornecido.'}

— TRANSCRIÇÃO (ANAMNESE):
${transcript || 'Não fornecida.'}

— EXAME FÍSICO:
${physicalExam || 'Não fornecido.'}
`.trim();

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        topP: 0.9,
        maxOutputTokens: 800,
        // força o modelo a não usar markdown
        // (Gemini respeita bem com instrução no prompt, mas mantemos temperatura baixa)
      },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) throw new Error('Erro na comunicação com a IA.');
    const data = await apiResponse.json();

    let receita: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!receita || typeof receita !== 'string') {
      throw new Error('A resposta da IA estava vazia.');
    }

    // ---------- PÓS-PROCESSAMENTO DEFENSIVO (remove markdown/lixo visual) ----------
    receita = sanitizeRecipe(receita);

    // Se mesmo assim veio vazio ou com o cabeçalho errado, retorna mensagem segura
    if (!/^Receita\s*$/m.test(receita.split('\n')[0]?.trim() || '')) {
      receita = 'Receita\n\nSem dados suficientes para prescrição segura.';
    }

    return NextResponse.json({ receita: receita.trim() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Remove markdown acidental, normaliza espaços/traços e garante quebra de linhas estável.
 */
function sanitizeRecipe(text: string): string {
  let out = text;

  // tira possíveis cercas de código, asteriscos, bullets, títulos markdown
  out = out
    .replace(/```[\s\S]*?```/g, '')        // blocos de código
    .replace(/^#+\s*/gm, '')               // # títulos
    .replace(/^\s*[-*]\s+/gm, '')          // bullets
    .replace(/\*\*/g, '')                  // negrito markdown
    .replace(/__|~~/g, '');

  // normaliza aspas e espaços
  out = out
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[ \t]+\n/g, '\n')            // espaços à direita
    .replace(/\n{3,}/g, '\n\n');           // muitas linhas vazias

  // garante que o cabeçalho "Receita" fique sozinho na primeira linha
  out = out.trimStart();
  if (!out.startsWith('Receita')) {
    // se o modelo devolveu só o corpo, injeta o cabeçalho
    out = 'Receita\n\n' + out;
  }

  // reforça “Uso …:” em linha própria (se o modelo grudou)
  out = out.replace(/\n\s*Uso\s+([^\n:]+)\s*:\s*/i, '\nUso $1:\n');

  // normaliza a linha pontilhada entre item e quantidade (— longo ou hífen)
  out = out.replace(
    /^(\d+\.\s.*?)(?:\s*[-–—]{3,}\s*|\s{2,})(\d+\s*(?:caixa|caixas|frasco|frascos|ampola|ampolas|unidade|unidades))\s*$/gmi,
    (_m, a, b) => `${a} ------------------------------------------------${b}`
  );

  // se item vier sem a quantidade no fim, não forçamos — fica como veio.

  return out.trim();
}
