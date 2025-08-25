'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { startOfMonth, endOfMonth } from 'date-fns';
import PatientDetailHeader from './components/PatientDetailHeader';
import ConsultationTimeline from './components/ConsultationTimeline';
import PeriodFilters from './components/PeriodFilters';
import LabEvolutionGraph from './components/LabEvolutionGraph';
import VitalSignsGraph from './components/VitalSignsGraph';
import LastVitalsSummary from './components/LastVitalsSummary'; // Importar o novo componente
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PatientDetailPage() {
  const [patient, setPatient] = useState<any | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [lastVitals, setLastVitals] = useState<any | null>(null); // Estado para os últimos sinais vitais
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const params = useParams();
  const supabase = createClientComponentClient();
  const id = params.id as string;

  useEffect(() => {
    const getPatientData = async () => {
      setLoading(true);
      const patientPromise = supabase.from('patients').select('*').eq('id', id).single();
      const consultationsPromise = supabase.from('consultas').select('id, created_at, status, lab_results, vitals_and_anthropometry').eq('patient_id', id).order('created_at', { ascending: false });
      
      // Busca a última consulta finalizada para obter os últimos sinais vitais
      const lastVitalsPromise = supabase
        .from('consultas')
        .select('vitals_and_anthropometry')
        .eq('patient_id', id)
        .eq('status', 'concluída')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const [
        { data: patientData, error: patientError }, 
        { data: consultationsData },
        { data: lastVitalsData }
      ] = await Promise.all([patientPromise, consultationsPromise, lastVitalsPromise]);

      if (patientError || !patientData) {
        toast.error("Paciente não encontrado.");
        return;
      }

      setPatient(patientData);
      setConsultations(consultationsData || []);
      setLastVitals(lastVitalsData?.vitals_and_anthropometry || null);
      setLoading(false);
    };
    getPatientData();
  }, [id, supabase]);

  const filteredConsultations = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return consultations.filter(c => {
      const consultationDate = new Date(c.created_at);
      return consultationDate >= start && consultationDate <= end;
    });
  }, [consultations, startDate, endDate]);

  if (loading) {
    return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-light" /></div>;
  }

  if (!patient) {
    return <div>Paciente não encontrado.</div>;
  }

  return (
    
    <div className="space-y-8 mt-16">
      <Link href="/pacientes" className="flex items-center gap-2 text-muted hover:text-foreground mb-6">
          <ArrowLeft className="h-5 w-5" />
          Voltar para Pacientes
      </Link>  
      <PatientDetailHeader patient={patient} />
      {/* NOVO: Componente de resumo dos últimos sinais vitais */}
      <LastVitalsSummary lastVitals={lastVitals} />
      <PeriodFilters onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }} />
      <ConsultationTimeline consultations={filteredConsultations} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LabEvolutionGraph consultations={filteredConsultations} />
        <VitalSignsGraph consultations={filteredConsultations} />
      </div>

    </div>
  );
}
