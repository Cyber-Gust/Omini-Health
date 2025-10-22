// app/api/ocr-extract/route.ts

// Usamos require dinâmico para pdf-parse para contornar o problema de importação ES Module/CommonJS.
// Se não funcionar o 'import * as pdfParse from "pdf-parse"', esta é a forma mais segura.
import { createWorker } from 'tesseract.js';
import { NextRequest, NextResponse } from 'next/server';
import { EXAM_PATTERNS } from '@/lib/lab_ocr_patterns'; // Ajuste o caminho

// Força o import usando require para compatibilidade com a biblioteca CommonJS
const pdfParse = require('pdf-parse');

// Tipo de resultado que o frontend espera
type ExamResult = { name: string; value: string };

// Função crítica que usa as RegEx
function parseExamResults(text: string): ExamResult[] {
  const extracted: ExamResult[] = [];
  const processedNames = new Set<string>();

  // Limpeza de texto inicial
  // O regex é atualizado para garantir que substitua múltiplos espaços por um único espaço
  const cleanText = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  for (const item of EXAM_PATTERNS) {
    // Evita extrair o mesmo exame duas vezes se houver RegEx sobrepostas
    if (processedNames.has(item.name)) continue;

    // A busca é feita no texto limpo
    const match = cleanText.match(item.regex);

    if (match) {
      // O valor e a unidade estão nas capturas de grupo da RegEx
      const value = match[1]; // O valor numérico
      const unit = match[2] || ''; // A unidade, se capturada

      // Garantir que um valor foi encontrado antes de adicionar
      if (value) {
        extracted.push({
          name: item.name,
          // Concatena o valor e a unidade para o campo 'value'
          value: `${value} ${unit}`.trim() 
        });
        processedNames.add(item.name);
      }
    }
  }

  return extracted;
}

export async function POST(req: NextRequest) {
  let worker;
  try {
    const formData = await req.formData();
    const file = formData.get('pdfFile') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Arquivo PDF inválido.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // TENTATIVA 1: Extrair texto nativo do PDF (rápido e preciso)
    try {
        // Usa pdfParse importado via require
        const data = await pdfParse(buffer);
        extractedText = data.text;
    } catch (e) {
        // TENTATIVA 2: Se falhar (PDF escaneado), use o Tesseract OCR
        console.warn("PDF não contém texto nativo. Iniciando OCR...");
        
        // Inicializa e executa o Tesseract
        // **ATENÇÃO:** Tesseract pode ser lento em Vercel/serviços serverless.
        worker = await createWorker('por'); 
        const ret = await worker.recognize(buffer);
        extractedText = ret.data.text;
    }
    
    // Processamento de dados (Chamada da função crítica)
    const results = parseExamResults(extractedText);

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Erro no processamento de OCR:', error);
    return NextResponse.json({ error: 'Falha no processamento do PDF ou do OCR.' }, { status: 500 });
  } finally {
    // É CRUCIAL encerrar o worker do Tesseract para liberar memória
    if (worker) {
        await worker.terminate();
    }
  }
}