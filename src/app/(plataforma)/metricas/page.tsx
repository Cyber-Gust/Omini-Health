import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import MetricsView from './components/MetricsView';

export const metadata: Metadata = {
  title: 'Métricas',
};

export default async function MetricasPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Busca todos os dados relevantes para as métricas de uma só vez
  const { data: consultations, error: consultationsError } = await supabase
    .from('consultas')
    .select('id, created_at, status, patient_id');

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, full_name, created_at');

  if (consultationsError || patientsError) {
    // Aqui poderíamos renderizar um componente de erro mais robusto
    return <div>Erro ao carregar os dados para as métricas.</div>;
  }

  return (
    <div className='mt-16 space-y-8'>
      
      
      {/* Passa os dados brutos para o componente cliente que irá geri-los */}
      <MetricsView 
        initialConsultations={consultations || []} 
        initialPatients={patients || []} 
      />
    </div>
  );
}
