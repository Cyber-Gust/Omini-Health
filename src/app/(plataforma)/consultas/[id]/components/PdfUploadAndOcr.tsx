// src/components/PdfUploadAndOcr.tsx
'use client';

import { useState } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';

type ExamResult = { name: string; value: string };

interface PdfUploadAndOcrProps {
  // O callback para o componente pai (LabResultsForm)
  onResultsFound: (results: ExamResult[]) => void;
}

export default function PdfUploadAndOcr({ onResultsFound }: PdfUploadAndOcrProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const response = await fetch('/api/ocr-extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro desconhecido na extração.');
      }

      const data = await response.json();
      
      if (data.results.length === 0) {
        setError("Nenhum resultado de exame foi reconhecido neste PDF.");
      } else {
        onResultsFound(data.results);
      }
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
      // Limpar o input file para permitir novo upload do mesmo arquivo
      event.target.value = ''; 
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-md bg-white border">
      <label 
        htmlFor="pdf-upload" 
        className={`flex items-center justify-center gap-3 p-3 rounded-md border-2 border-dashed transition-colors cursor-pointer ${
          isLoading ? 'border-gray-400 bg-gray-100' : 'border-blue-300 hover:bg-blue-50'
        }`}
      >
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={isLoading}
          className="hidden"
        />
        {isLoading ? (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-semibold">Processando OCR e Extraindo...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-blue-600">
            <Upload className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Carregar PDF de Exames
            </span>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </label>
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
}