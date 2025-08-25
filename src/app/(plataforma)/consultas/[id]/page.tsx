'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileText, FileSignature, Receipt, CheckCircle, Beaker } from 'lucide-react';
import BackgroundTranscriber, { type TranscriptItem } from './components/BackgroundTranscriber';
import PhysicalExamForm from './components/PhysicalExamForm';
import PatientSummary from './components/PatientSummary';
import VitalSignsForm from './components/VitalSignsForm';
import DocumentSection from './components/DocumentSection';
import LabResultsForm from './components/LabResultsForm';
import EditPatientDataModal from './components/EditPatientDataModal';

// Tipos
type ExamFindings = Record<string, string[]>;
type DocumentsState = { prontuario: string; receita: string; atestado: string; pedidoExame: string; };
type EditingField = 'medical_history' | 'allergies' | 'medications' | null;

export default function ConsultationDetailPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [patient, setPatient] = useState<any | null>(null);
  const [vitals, setVitals] = useState<any>({});
  const [lastVitals, setLastVitals] = useState<any | null>(null);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [physicalExamData, setPhysicalExamData] = useState<ExamFindings>({});
  
  const [documents, setDocuments] = useState<DocumentsState>({ prontuario: '', receita: '', atestado: '', pedidoExame: '' });
  const [isGenerating, setIsGenerating] = useState<keyof DocumentsState | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);

  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const id = params.id as string;

  useEffect(() => {
    const getInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: consultationData, error: consultationError } = await supabase.from('consultas').select(`*, patient_id`).eq('id', id).single();
      if (consultationError || !consultationData) {
        toast.error('Consulta não encontrada.');
        router.push('/consultas');
        return;
      }

      const { data: patientData } = await supabase.from('patients').select('*').eq('id', consultationData.patient_id).single();
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      const { data: lastConsultation } = await supabase
        .from('consultas')
        .select('vitals_and_anthropometry')
        .eq('patient_id', consultationData.patient_id)
        .eq('status', 'concluída')
        .neq('id', id) // Exclui a consulta atual
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setProfile(profileData);
      setPatient({ ...patientData, consultation_id: id });
      setVitals(consultationData.vitals_and_anthropometry || {});
      setLastVitals(lastConsultation?.vitals_and_anthropometry || null);
      setLabResults(consultationData.lab_results || []);
      
      setDocuments({
        prontuario: consultationData.prontuario_gerado || '',
        receita: consultationData.receita_gerada || '',
        atestado: consultationData.atestado_gerado || '',
        pedidoExame: consultationData.pedido_exame_gerado || '',
      });

      if (consultationData.status === 'concluída') setIsFinalized(true);
      setLoading(false);
    };
    if (id) getInitialData();
  }, [id, router, supabase]);

  const handleDataSave = ({ patient: updatedPatient, vitals: updatedVitals }: any) => {
    setPatient(updatedPatient);
    setVitals(updatedVitals);
  };

  const handleTranscriptUpdate = useCallback((newItem: TranscriptItem) => { setTranscript((prev) => [...prev, newItem]); }, []);
  const handleExamDataChange = useCallback((data: ExamFindings) => { setPhysicalExamData(data); }, []);

  // ATUALIZADO: Esta função agora reúne todos os dados contextuais do paciente
  const getBaseGenerationData = () => {
    const fullTranscriptText = transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n');
    const examText = Object.entries(physicalExamData).map(([cat, find]) => `${cat}:\n- ${find.join('\n- ')}`).join('\n\n');
    const vitalsText = Object.entries(vitals).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`).join(' | ');
    
    // Novos dados contextuais
    const patientHistoryText = `
      Doenças Pré-existentes: ${patient?.medical_history?.map((d: any) => `${d.code} - ${d.description}`).join(', ') || 'Nenhuma'}
      Alergias: ${patient?.allergies || 'Nenhuma'}
      Medicação de Uso Contínuo: ${patient?.medications || 'Nenhuma'}
    `.trim();
    
    const labResultsText = labResults.map(res => `${res.name}: ${res.value}`).join('\n');

    return { fullTranscriptText, examText, vitalsText, patientHistoryText, labResultsText };
  };

  const handleGenerateDocument = async (docType: keyof DocumentsState) => {
    if (transcript.length === 0 && Object.keys(physicalExamData).length === 0) {
      toast.error('A transcrição e o exame físico estão vazios.');
      return;
    }
    setIsGenerating(docType);
    const { fullTranscriptText, examText, vitalsText, patientHistoryText, labResultsText } = getBaseGenerationData();

    try {
      const response = await fetch(`/api/generate-${docType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: id,
          transcript: fullTranscriptText,
          patientName: patient?.full_name || 'Paciente',
          physicalExam: examText,
          vitals: vitalsText,
          patientHistory: patientHistoryText, // Envia o histórico
          labResults: labResultsText,       // Envia os resultados de exames
        }),
      });
      if (!response.ok) throw new Error(`Falha ao gerar ${docType}.`);

      const data = await response.json();
      const documentContent = data[docType];

      setDocuments(prev => ({ ...prev, [docType]: documentContent }));
      toast.success(`${docType.charAt(0).toUpperCase() + docType.slice(1)} gerado com sucesso!`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleFinalizeConsultation = async () => {
    if (!documents.prontuario) { toast.error('Gere o prontuário antes de finalizar.'); return; }
    setIsFinalizing(true);
    try {
      const { error } = await supabase.from('consultas').update({
        prontuario_gerado: documents.prontuario,
        receita_gerada: documents.receita,
        atestado_gerado: documents.atestado,
        pedido_exame_gerado: documents.pedidoExame,
        vitals_and_anthropometry: vitals,
        lab_results: labResults,
        status: 'concluída',
      }).eq('id', id);
      if (error) throw error;
      setIsFinalized(true);
      toast.success('Consulta finalizada e guardada com sucesso!');
      router.refresh();
    } catch (error: any) {
      toast.error(`Erro ao finalizar a consulta: ${error.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-light" /></div>;
  }

  return (
    <>
      <div className="mt-16">
        <Link href="/consultas" className="flex items-center gap-2 text-muted hover:text-foreground mb-6">
          <ArrowLeft className="h-5 w-5" />
          Voltar para Consultas
        </Link>

        <div className="space-y-8">
          {patient && (
            <PatientSummary
              patient={patient}
              lastVitals={lastVitals}
              onEditClick={(field: EditingField) => setEditingField(field)}
            />
          )}

          {!isFinalized && (
            <>
              <VitalSignsForm vitals={vitals} setVitals={setVitals} isFinalized={isFinalized} />
              <LabResultsForm results={labResults} onResultsChange={setLabResults} isFinalized={isFinalized} />
              <BackgroundTranscriber
                isListening={isListening}
                onToggleListening={() => setIsListening((v) => !v)}
                onTranscriptUpdate={handleTranscriptUpdate}
              />
              <PhysicalExamForm onExamDataChange={handleExamDataChange} />
            </>
          )}

          <DocumentSection
            documents={documents}
            setDocuments={setDocuments}
            isGenerating={isGenerating}
            isFinalized={isFinalized}
            isFinalizing={isFinalizing}
            onGenerate={handleGenerateDocument}
            onFinalize={handleFinalizeConsultation}
            profile={profile}
            patientName={patient?.full_name ?? ''}
          />
        </div>
      </div>

      <EditPatientDataModal
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        patient={patient}
        fieldToEdit={editingField}
        onSaveSuccess={(updatedPatient: any) => setPatient(updatedPatient)}
      />
    </>
  );
}
