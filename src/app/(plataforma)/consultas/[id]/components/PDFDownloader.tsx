'use client';

import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useState } from 'react';
import { toast } from 'sonner';

interface PDFDownloaderProps {
  contentId: string;
  fileName: string;
  buttonText: string; // NOVA PROPRIEDADE
}

export default function PDFDownloader({ contentId, fileName, buttonText }: PDFDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    const input = document.getElementById(contentId);
    if (!input) {
      toast.error("Não foi possível encontrar o conteúdo para gerar o PDF.");
      return;
    }

    setIsDownloading(true);
    toast.info("A gerar o PDF, por favor aguarde...");

    html2canvas(input, { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      let imgWidth = pdfWidth - 20;
      let imgHeight = imgWidth / ratio;

      if (imgHeight > pdfHeight - 20) {
          imgHeight = pdfHeight - 20;
          imgWidth = imgHeight * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = 10;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`${fileName}.pdf`);
      setIsDownloading(false);
    }).catch(err => {
        toast.error("Ocorreu um erro ao gerar o PDF.");
        console.error(err);
        setIsDownloading(false);
    });
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
      {/* O texto agora é dinâmico */}
      {isDownloading ? 'A gerar PDF...' : buttonText}
    </button>
  );
}
