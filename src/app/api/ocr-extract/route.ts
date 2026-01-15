// app/api/ocr-extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { EXAM_PATTERNS } from "@/lib/lab_ocr_patterns";

// Força execução em Node (necessário pro pdf-parse)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExamResult = { name: string; value: string };

function parseExamResults(text: string): ExamResult[] {
  const extracted: ExamResult[] = [];
  const processed = new Set<string>();
  const clean = text.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

  for (const item of EXAM_PATTERNS) {
    if (processed.has(item.name)) continue;
    const match = clean.match(item.regex);
    if (match) {
      const value = match[1];
      const unit = match[2] || "";
      extracted.push({ name: item.name, value: `${value} ${unit}`.trim() });
      processed.add(item.name);
    }
  }

  return extracted;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdfFile") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Arquivo PDF inválido." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("📄 Extraindo texto do PDF...");

    // ✅ Importação dinâmica com require() compatível com CommonJS
    const pdfParse: (input: Buffer) => Promise<{ text: string }> =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("pdf-parse");

    const data = await pdfParse(buffer);
    const extractedText = data.text || "";

    if (!extractedText.trim()) {
      return NextResponse.json({
        error: "Nenhum texto encontrado no PDF (provavelmente é escaneado).",
      });
    }

    const results = parseExamResults(extractedText);
    return NextResponse.json({ results, text: extractedText });
  } catch (error: any) {
    console.error("❌ Erro na extração de texto:", error);
    return NextResponse.json(
      {
        error: "Falha ao extrair texto do PDF.",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
