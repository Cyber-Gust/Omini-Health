'use client';

import { FileText, Receipt, FileSignature, Beaker, CheckCircle } from 'lucide-react';
import EditableDocument from './EditableDocument';
import DocumentGenerator from './DocumentGenerator';

interface DocumentSectionProps {
  documents: {
    prontuario: string;
    receita: string;
    atestado: string;
    pedidoExame: string;
  };
  setDocuments: (docs: any) => void;
  isGenerating: string | null;
  isFinalized: boolean;
  isFinalizing: boolean;
  onGenerate: (docType: 'prontuario' | 'receita' | 'atestado' | 'pedidoExame') => void;
  onFinalize: () => void;
  profile: any;
  patientName: string;
}

export default function DocumentSection({
  documents,
  setDocuments,
  isGenerating,
  isFinalized,
  isFinalizing,
  onGenerate,
  onFinalize,
  profile,
  patientName,
}: DocumentSectionProps) {
  const { prontuario, receita, atestado, pedidoExame } = documents;

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Documentos da Consulta</h2>
      
      {/* Botões de Ação */}
      <div className="space-y-3 mb-6">
        <button onClick={() => onGenerate('prontuario')} disabled={!!isGenerating || !!prontuario || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
          <FileText className="h-5 w-5" /> {isGenerating === 'prontuario' ? 'A gerar...' : 'Gerar Prontuário'}
        </button>
        <button onClick={() => onGenerate('receita')} disabled={!prontuario || !!isGenerating || !!receita || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
          <Receipt className="h-5 w-5" /> {isGenerating === 'receita' ? 'A gerar...' : 'Gerar Receita'}
        </button>
        <button onClick={() => onGenerate('atestado')} disabled={!prontuario || !!isGenerating || !!atestado || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
          <FileSignature className="h-5 w-5" /> {isGenerating === 'atestado' ? 'A gerar...' : 'Gerar Atestado'}
        </button>
        <button onClick={() => onGenerate('pedidoExame')} disabled={!prontuario || !!isGenerating || !!pedidoExame || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
          <Beaker className="h-5 w-5" /> {isGenerating === 'pedidoExame' ? 'A gerar...' : 'Gerar Pedido de Exame'}
        </button>
        
        {prontuario && !isFinalized && (
          <button onClick={onFinalize} disabled={isFinalizing} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
            <CheckCircle className="h-5 w-5" /> {isFinalizing ? 'A finalizar...' : 'Finalizar e Guardar Consulta'}
          </button>
        )}
      </div>
      
      {/* Documentos Editáveis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EditableDocument id="prontuario-content" title="Prontuário" content={prontuario} setContent={(c) => setDocuments((d: any) => ({...d, prontuario: c}))} isLoading={isGenerating === 'prontuario'} isFinalized={isFinalized} />
        <EditableDocument id="receita-content" title="Receita" content={receita} setContent={(c) => setDocuments((d: any) => ({...d, receita: c}))} isLoading={isGenerating === 'receita'} isFinalized={isFinalized} />
        <EditableDocument id="atestado-content" title="Atestado" content={atestado} setContent={(c) => setDocuments((d: any) => ({...d, atestado: c}))} isLoading={isGenerating === 'atestado'} isFinalized={isFinalized} />
        <EditableDocument id="pedido-exame-content" title="Pedido de Exame" content={pedidoExame} setContent={(c) => setDocuments((d: any) => ({...d, pedidoExame: c}))} isLoading={isGenerating === 'pedidoExame'} isFinalized={isFinalized} />
      </div>

      {/* Downloads */}
      {isFinalized && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
           {prontuario && <DocumentGenerator profile={profile} documentContent={prontuario} documentTitle="Prontuário Médico" patientName={patientName} buttonText="Baixar Prontuário" />}
           {receita && <DocumentGenerator profile={profile} documentContent={receita} documentTitle="Receita Médica" patientName={patientName} buttonText="Baixar Receita" />}
           {atestado && <DocumentGenerator profile={profile} documentContent={atestado} documentTitle="Atestado Médico" patientName={patientName} buttonText="Baixar Atestado" />}
           {pedidoExame && <DocumentGenerator profile={profile} documentContent={pedidoExame} documentTitle="Pedido de Exame" patientName={patientName} buttonText="Baixar Pedido" />}
        </div>
      )}
    </div>
  );
}
