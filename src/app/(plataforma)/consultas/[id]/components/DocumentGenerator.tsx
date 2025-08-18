'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileDown, Loader2 } from 'lucide-react';

// Tipo para os dados do perfil do médico
type Profile = { [key: string]: any };

interface DocumentGeneratorProps {
  profile: Profile | null;
  documentContent: string;
  documentTitle: string;
  patientName: string;
  buttonText: string;
}

export default function DocumentGenerator({ profile, documentContent, documentTitle, patientName, buttonText }: DocumentGeneratorProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    toast.info("A gerar o PDF, por favor aguarde...");

    // Cria um elemento HTML temporário fora do ecrã para montar o documento
    const element = document.createElement('div');
    element.style.width = '210mm'; // Largura de uma folha A4
    element.style.padding = '20mm';
    element.style.backgroundColor = 'white';
    element.style.fontFamily = 'sans-serif';
    element.style.color = 'black';
    element.style.position = 'absolute';
    element.style.left = '-9999px'; // Esconde o elemento

    const defaultLogo = 'https://placehold.co/100x100/e2e8f0/334155?text=Logo';
    const currentDate = new Date().toLocaleDateString('pt-BR');

    // Constrói o HTML do documento com o template
    element.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
        .header img { width: 80px; height: 80px; object-fit: contain; }
        .header .doctor-info { text-align: right; font-size: 11px; line-height: 1.4; }
        .body { margin-top: 20px; }
        .body h2 { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
        .body .patient-info { margin-bottom: 20px; font-size: 12px; }
        .body .content { white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; }
        .footer .signature { margin-bottom: 5px; height: 60px; }
        .footer .signature img { height: 50px; margin: 0 auto; object-fit: contain; }
      </style>
      <div class="header">
        <img src="${profile?.clinic_logo_url || defaultLogo}" alt="Logo"/>
        <div class="doctor-info">
          <strong>${profile?.full_name || 'Nome do Médico'}</strong><br/>
          ${profile?.specialty || 'Especialidade'}<br/>
          CRM: ${profile?.crm || 'N/A'} / ${profile?.crm_state || 'UF'}
        </div>
      </div>
      <div class="body">
        <h2>${documentTitle}</h2>
        <div class="patient-info">
          <strong>Paciente:</strong> ${patientName}<br/>
          <strong>Data:</strong> ${currentDate}
        </div>
        <div class="content">${documentContent.replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="footer">
        <div class="signature">
          ${profile?.signature_url ? `<img src="${profile.signature_url}" alt="Assinatura"/>` : '<br/><br/>'}
          _________________________<br/>
          <strong>${profile?.full_name || 'Nome do Médico'}</strong>
        </div>
      </div>
    `;
    document.body.appendChild(element);

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentTitle.replace(/\s+/g, '_')}_${patientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      toast.error("Ocorreu um erro ao gerar o PDF.");
    } finally {
      document.body.removeChild(element);
      setIsDownloading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
      {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
      {isDownloading ? 'A gerar PDF...' : buttonText}
    </button>
  );
}
