import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import PatientListView from './components/PatientListView';

export const metadata: Metadata = {
  title: 'Pacientes',
};

export default async function PacientesPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Busca todos os pacientes do médico logado, ordenados por nome
  const { data: patients } = await supabase
    .from('patients')
    .select('id, full_name, created_at, birth_date')
    .order('full_name', { ascending: true });

  return (
    <div className="space-y-8 mt-16">
      {/* Passa os dados para o componente que irá exibir a lista e gerir a pesquisa */}
      <PatientListView patients={patients || []} />
    </div>
  );
}
