// app/api/sua-rota/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// A sua função de sanitização permanece exatamente a mesma.
// Coloquei ela aqui para o exemplo ficar completo.
function sanitizeRecipe(text: string): string {
  let out = text;
  out = out
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/__|~~/g, '');
  out = out
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  out = out.trimStart();
  if (!out.startsWith('Receita')) {
    out = 'Receita\n\n' + out;
  }
  out = out.replace(/\n\s*Uso\s+([^\n:]+)\s*:\s*/i, '\nUso $1:\n');
  out = out.replace(
    /^(\d+\.\s.*?)(?:\s*[-–—]{3,}\s*|\s{2,})(\d+\s*(?:caixa|caixas|frasco|frascos|ampola|ampolas|unidade|unidades))\s*$/gmi,
    (_m, a, b) => `${a} ------------------------------------------------${b}`
  );
  return out.trim();
}


// --- Handler da Rota API ---
export async function POST(request: Request) {
  try {
    const { transcript, physicalExam, patientHistory } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave da API do Gemini não configurada.');
    }

    // O seu prompt detalhado e excelente permanece o mesmo.
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

    // As configurações de geração também são mantidas.
    const generationConfig = {
      temperature: 0.15,
      topP: 0.9,
      maxOutputTokens: 800,
    };

    // ---------- NOVA ABORDAGEM COM O SDK ----------
    // 1. Inicialize o cliente da API
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. Obtenha o modelo, passando a configuração diretamente
    // Recomendo usar o gemini-1.5-pro por sua maior capacidade de seguir instruções complexas.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
    });
    
    // 3. Gere o conteúdo de forma simples e direta
    const result = await model.generateContent(prompt);
    const response = result.response;
    let receita = response.text();
    // ----------------------------------------------
    
    if (!receita || typeof receita !== 'string') {
      throw new Error('A resposta da IA estava vazia.');
    }

    // O seu pós-processamento defensivo continua sendo uma ótima ideia!
    receita = sanitizeRecipe(receita);
    if (!/^Receita\s*$/m.test(receita.split('\n')[0]?.trim() || '')) {
      receita = 'Receita\n\nSem dados suficientes para prescrição segura.';
    }

    return NextResponse.json({ receita: receita.trim() });
  } catch (error: any) {
    console.error("Erro na rota da API:", error); // Log do erro no servidor
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}