'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, User, Save, Loader2, FileText, FileSignature, Receipt, CheckCircle, Beaker } from 'lucide-react';
import BackgroundTranscriber, { type TranscriptItem } from './components/BackgroundTranscriber';
import PhysicalExamForm from './components/PhysicalExamForm';
import DocumentGenerator from './components/DocumentGenerator';
import EditableDocument from './components/EditableDocument';
import PDFDownloader from './components/PDFDownloader';

type ExamFindings = Record<string, string[]>;

export default function ConsultationDetailPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [physicalExamData, setPhysicalExamData] = useState<ExamFindings>({});
  
  const [generatedProntuario, setGeneratedProntuario] = useState('');
  const [generatedReceita, setGeneratedReceita] = useState('');
  const [generatedAtestado, setGeneratedAtestado] = useState('');
  const [generatedPedidoExame, setGeneratedPedidoExame] = useState('');

  const [isGeneratingProntuario, setIsGeneratingProntuario] = useState(false);
  const [isGeneratingReceita, setIsGeneratingReceita] = useState(false);
  const [isGeneratingAtestado, setIsGeneratingAtestado] = useState(false);
  const [isGeneratingPedidoExame, setIsGeneratingPedidoExame] = useState(false);

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const id = params.id as string;

  useEffect(() => {
    const getInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [consultationRes, profileRes] = await Promise.all([
        supabase.from('consultas').select(`*, patients ( full_name )`).eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      const { data: consultationData, error: consultationError } = consultationRes;
      if (consultationError || !consultationData) {
        toast.error('Consulta não encontrada.');
        router.push('/consultas');
        return;
      }
      
      setProfile(profileRes.data);
      setPatientId(consultationData.patient_id);
      const patientData = Array.isArray(consultationData.patients) ? consultationData.patients[0] : consultationData.patients;
      setPatientName(patientData?.full_name || '');
      
      setGeneratedProntuario(consultationData.prontuario_gerado || '');
      setGeneratedReceita(consultationData.receita_gerada || '');
      setGeneratedAtestado(consultationData.atestado_gerado || '');
      setGeneratedPedidoExame(consultationData.pedido_exame_gerado || '');

      if (consultationData.status === 'concluída') {
        setIsFinalized(true);
      }
      setLoading(false);
    };
    if (id) getInitialData();
  }, [id, router, supabase]);

  const handleUpdatePatientName = async () => {
    if (!patientName.trim()) {
        toast.warning('O nome do paciente não pode estar em branco.');
        return;
    }
    if (!patientId) {
        toast.error('ID do paciente não encontrado. Não é possível guardar.');
        return;
    }
    setIsSaving(true);
    const { error } = await supabase
        .from('patients')
        .update({ full_name: patientName })
        .eq('id', patientId);
    
    if (error) {
        toast.error('Não foi possível guardar o nome do paciente.');
    } else {
        toast.success('Nome do paciente guardado com sucesso!');
    }
    setIsSaving(false);
  };

  const handleTranscriptUpdate = useCallback((newItem: TranscriptItem) => { 
    setTranscript((prev) => [...prev, newItem]); 
  }, []);

  const handleExamDataChange = useCallback((data: ExamFindings) => { 
    setPhysicalExamData(data); 
  }, []);

  const getBaseGenerationData = () => {
    const fullTranscriptText = transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n');
    const examText = Object.entries(physicalExamData).map(([cat, find]) => `${cat}:\n- ${find.join('\n- ')}`).join('\n\n');
    return { fullTranscriptText, examText };
  }

  const handleGenerateProntuario = async () => {
    if (transcript.length === 0 && Object.keys(physicalExamData).length === 0) {
        toast.error("A transcrição e o exame físico estão vazios.");
        return;
    }
    setIsGeneratingProntuario(true);
    const { fullTranscriptText, examText } = getBaseGenerationData();

    try {
      const response = await fetch('/api/generate-prontuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: id, transcript: fullTranscriptText, patientName: patientName || 'Paciente', physicalExam: examText })
      });
      if (!response.ok) throw new Error("Falha ao gerar prontuário.");
      const { prontuario } = await response.json();
      setGeneratedProntuario(prontuario);
      toast.success("Prontuário gerado! Verifique e finalize a consulta.");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingProntuario(false);
    }
  };

  const handleGenerateReceita = async () => {
    setIsGeneratingReceita(true);
    const { fullTranscriptText, examText } = getBaseGenerationData();
    try {
        const response = await fetch('/api/generate-receita', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultationId: id, transcript: fullTranscriptText, patientName: patientName || 'Paciente', physicalExam: examText })
        });
        if (!response.ok) throw new Error("Falha ao gerar receita.");
        const { receita } = await response.json();
        setGeneratedReceita(receita);
        toast.success("Receita gerada com sucesso!");
    } catch (error: any) {
        toast.error(`Erro ao gerar receita: ${error.message}`);
    } finally {
        setIsGeneratingReceita(false);
    }
  };

  const handleGenerateAtestado = async () => {
    setIsGeneratingAtestado(true);
    const { fullTranscriptText, examText } = getBaseGenerationData();
    try {
        const response = await fetch('/api/generate-atestado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultationId: id, transcript: fullTranscriptText, patientName: patientName || 'Paciente', physicalExam: examText })
        });
        if (!response.ok) throw new Error("Falha ao gerar atestado.");
        const { atestado } = await response.json();
        setGeneratedAtestado(atestado);
        toast.success("Atestado gerado com sucesso!");
    } catch (error: any) {
        toast.error(`Erro ao gerar atestado: ${error.message}`);
    } finally {
        setIsGeneratingAtestado(false);
    }
  };

  const handleGeneratePedidoExame = async () => {
    setIsGeneratingPedidoExame(true);
    const { fullTranscriptText, examText } = getBaseGenerationData();
    try {
        const response = await fetch('/api/generate-pedido-exame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultationId: id, transcript: fullTranscriptText, patientName, physicalExam: examText })
        });
        if (!response.ok) throw new Error("Falha ao gerar pedido de exame.");
        const { pedidoExame } = await response.json();
        setGeneratedPedidoExame(pedidoExame);
        toast.success("Pedido de exame gerado com sucesso!");
    } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
    } finally {
        setIsGeneratingPedidoExame(false);
    }
  };

  const handleFinalizeConsultation = async () => {
    if (!generatedProntuario) {
      toast.error("Gere o prontuário antes de finalizar.");
      return;
    }
    setIsFinalizing(true);
    try {
      const { error } = await supabase.from('consultas').update({
        prontuario_gerado: generatedProntuario,
        receita_gerada: generatedReceita,
        atestado_gerado: generatedAtestado,
        pedido_exame_gerado: generatedPedidoExame,
        status: 'concluída'
      }).eq('id', id);
      if (error) throw error;
      setIsFinalized(true);
      toast.success("Consulta finalizada e guardada com sucesso!");
      router.refresh();
    } catch (error: any) {
      toast.error(`Erro ao finalizar a consulta: ${error.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) { return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-light" /></div>; }

  return (
    <div>
      <Link href="/consultas" className="flex items-center gap-2 text-muted hover:text-foreground mb-6">
        <ArrowLeft className="h-5 w-5" />
        Voltar para Consultas
      </Link>

      <div className="space-y-8">
        <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-6 w-6 text-light" />
            <h2 className="text-xl font-semibold">Informações do Paciente</h2>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <label htmlFor="patientName" className="block text-sm font-medium text-muted mb-1">Nome do Paciente</label>
              <input id="patientName" type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Insira o nome do paciente" className="w-full rounded-md border-border bg-transparent py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light" />
            </div>
            <button onClick={handleUpdatePatientName} disabled={isSaving || isFinalized} className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2 hidden sm:block">{isSaving ? 'A guardar...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
        
        {!isFinalized && (
          <>
            <BackgroundTranscriber isListening={isListening} onToggleListening={() => setIsListening(!isListening)} onTranscriptUpdate={handleTranscriptUpdate} />
            <PhysicalExamForm onExamDataChange={handleExamDataChange} />
          </>
        )}

        <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Documentos da Consulta</h2>
            <div className="space-y-3 mb-6">
                <button onClick={handleGenerateProntuario} disabled={isGeneratingProntuario || !!generatedProntuario || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                    <FileText className="h-5 w-5" /> {isGeneratingProntuario ? 'A gerar...' : 'Gerar Prontuário'}
                </button>
                <button onClick={handleGenerateReceita} disabled={!generatedProntuario || isGeneratingReceita || !!generatedReceita || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                    <Receipt className="h-5 w-5" /> {isGeneratingReceita ? 'A gerar...' : 'Gerar Receita'}
                </button>
                <button onClick={handleGenerateAtestado} disabled={!generatedProntuario || isGeneratingAtestado || !!generatedAtestado || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                    <FileSignature className="h-5 w-5" /> {isGeneratingAtestado ? 'A gerar...' : 'Gerar Atestado'}
                </button>
                <button onClick={handleGeneratePedidoExame} disabled={!generatedProntuario || isGeneratingPedidoExame || !!generatedPedidoExame || isFinalized} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                    <Beaker className="h-5 w-5" /> {isGeneratingPedidoExame ? 'A gerar...' : 'Gerar Pedido de Exame'}
                </button>
                
                {generatedProntuario && !isFinalized && (
                  <button onClick={handleFinalizeConsultation} disabled={isFinalizing} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                    <CheckCircle className="h-5 w-5" /> {isFinalizing ? 'A finalizar...' : 'Finalizar e Guardar Consulta'}
                  </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EditableDocument id="prontuario-content" title="Prontuário" content={generatedProntuario} setContent={setGeneratedProntuario} isLoading={isGeneratingProntuario} isFinalized={isFinalized} />
                <EditableDocument id="receita-content" title="Receita" content={generatedReceita} setContent={setGeneratedReceita} isLoading={isGeneratingReceita} isFinalized={isFinalized} />
                <EditableDocument id="atestado-content" title="Atestado" content={generatedAtestado} setContent={setGeneratedAtestado} isLoading={isGeneratingAtestado} isFinalized={isFinalized} />
                <EditableDocument id="pedido-exame-content" title="Pedido de Exame" content={generatedPedidoExame} setContent={setGeneratedPedidoExame} isLoading={isGeneratingPedidoExame} isFinalized={isFinalized} />
            </div>

            {isFinalized && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                 {generatedProntuario && <DocumentGenerator profile={profile} documentContent={generatedProntuario} documentTitle="Prontuário Médico" patientName={patientName} buttonText="Baixar Prontuário" />}
                 {generatedReceita && <DocumentGenerator profile={profile} documentContent={generatedReceita} documentTitle="Receita Médica" patientName={patientName} buttonText="Baixar Receita" />}
                 {generatedAtestado && <DocumentGenerator profile={profile} documentContent={generatedAtestado} documentTitle="Atestado Médico" patientName={patientName} buttonText="Baixar Atestado" />}
                 {generatedPedidoExame && <DocumentGenerator profile={profile} documentContent={generatedPedidoExame} documentTitle="Pedido de Exame" patientName={patientName} buttonText="Baixar Pedido" />}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
