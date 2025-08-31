'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileDown, Loader2, PencilLine } from 'lucide-react';

import {
  renderTemplateHTML,
  DEFAULT_TEMPLATE_BY_TYPE,
  type HeaderContext,
  type DocumentType,
  type TemplateKey,
  type BrandAssets,
} from '@/lib/doc-templates';

type Profile = { [key: string]: any };

interface DocumentGeneratorProps {
  profile: Profile | null;
  documentContent: string;
  documentTitle: string;
  patientName: string;
  buttonText: string;
  documentType: DocumentType;    // 'atestado' | 'pedido-exame' | 'receita' | 'prontuario'
  headerContext: HeaderContext;  // 'private' | 'sus' | 'upa24h'
  templateKey?: TemplateKey;
  enableInlineSignature?: boolean;
}

function slugify(str: string) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

export default function DocumentGenerator({
  profile,
  documentContent,
  documentTitle,
  patientName,
  buttonText,
  documentType,
  headerContext,
  templateKey,
  enableInlineSignature = false,
}: DocumentGeneratorProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [brandAssets, setBrandAssets] = useState<BrandAssets | null>(null);

  // Busca SUS/UPA logos do sistema 1x
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/branding', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        setBrandAssets({
          susLogoUrl: data?.susLogoUrl || null,
          upaLogoUrl: data?.upaLogoUrl || null,
        });
      } catch {
        setBrandAssets(null); // segue com fallbacks (logo da clínica / placeholder)
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    toast.info('A gerar o PDF, por favor aguarde...');

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';
    container.style.position = 'absolute';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.zIndex = '-1';

    const currentDate = new Date().toLocaleDateString('pt-BR');
    const key: TemplateKey = templateKey ?? DEFAULT_TEMPLATE_BY_TYPE[documentType];

    const html = renderTemplateHTML({
      headerContext,
      documentType,
      templateKey: key,
      profile: profile ?? {},
      documentTitle,
      patientName,
      documentContent,
      currentDate,
      signatureDataUrl,        // prioridade: modal > signature_url > vazio
      brandAssets: brandAssets || undefined, // 👈 logos do sistema
    });

    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const SCALE = 3.125; // ~300 DPI
      const pageEl = container.querySelector('.page') as HTMLElement | null;
      const target = pageEl || container;

      const canvas = await html2canvas(target, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const safeTitle = slugify(documentTitle);
      const safePatient = slugify(patientName);
      pdf.save(`${safeTitle}_${safePatient}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao gerar o PDF.');
    } finally {
      document.body.removeChild(container);
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
          {isDownloading ? 'A gerar PDF...' : buttonText}
        </button>
      </div>
    </div>
  );
}
