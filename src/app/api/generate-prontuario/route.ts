import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// A função de criar o prompt foi removida daqui, pois o template será aplicado no frontend.

export async function POST(request: Request) {
  try {
    // A API agora só precisa dos dados brutos da consulta.
    const { transcript, patientName, physicalExam } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave da API do Gemini não configurada.');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // NOVO PROMPT: A IA agora tem uma única tarefa: gerar o conteúdo clínico.
    const prompt = `
      Você é um assistente médico especialista. Com base na transcrição e no exame físico de uma consulta para o paciente "${patientName}", gere APENAS o conteúdo de um prontuário no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
      
      - Seja conciso e use terminologia médica.
      - Extraia as informações relevantes da anamnese e do exame físico fornecidos.
      - Não inclua cabeçalhos, rodapés, nomes de médicos ou datas. A sua única saída deve ser o texto do prontuário no formato SOAP.
      - NÃO utilize axteriscos ou símbolos especiais. Use apenas texto simples. e para titulos utilize todas as letras maiusculas.

      DADOS DA CONSULTA PARA PROCESSAR:
      ---
      TRANSCRIÇÃO (ANAMNESE): ${transcript || 'Não fornecida.'}
      ---
      EXAME FÍSICO (OBJETIVO): ${physicalExam || 'Não fornecido.'}
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

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json();
      throw new Error(errorBody.error.message || 'Erro na comunicação com a IA.');
    }

    const data = await apiResponse.json();
    const prontuario = data.candidates[0]?.content?.parts[0]?.text;

    if (!prontuario) {
        throw new Error('A resposta da IA estava vazia.');
    }

    // A API agora retorna apenas o texto bruto do prontuário.
    return NextResponse.json({ prontuario });

  } catch (error: any) {
    console.error("Erro na API generate-prontuario:", error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
