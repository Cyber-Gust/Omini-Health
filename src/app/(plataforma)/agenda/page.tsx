import React from 'react'; // Adicionado para garantir a interpretação correta do JSX
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import AgendaCalendar from './components/AgendaCalendar';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agenda',
};

// Define um tipo para os nossos dados de agendamento para um código mais seguro
type AppointmentWithPatient = {
  id: string;
  appointment_time: string;
  description: string | null;
  patients: {
    id: string;
    full_name: string;
  } | null;
};

export default async function AgendaPage() {
  const supabase = createServerComponentClient({ cookies });
  
  let appointments: AppointmentWithPatient[] = [];
  let fetchError: string | null = null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  try {
    // Busca todos os agendamentos do utilizador atual
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        description,
        patients ( id, full_name )
      `)
      .eq('user_id', session.user.id)
      .order('appointment_time', { ascending: true });

    if (error) throw error;
    
    // CORREÇÃO: Implementada a sua sugestão para um tratamento de dados mais robusto
    if (data) {
      appointments = data.map((appointment: any) => ({
        ...appointment,
        patients: Array.isArray(appointment.patients)
          ? appointment.patients[0] || null
          : appointment.patients || null,
      }));
    }

  } catch (error: any) {
    console.error("Erro ao buscar agendamentos:", error);
    fetchError = "Não foi possível carregar os dados da agenda. Por favor, tente novamente mais tarde.";
  }

  return (
    <div className="mt-16 space-y-8">
      {fetchError ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-red-700">{fetchError}</p>
                </div>
            </div>
        </div>
      ) : (
        <AgendaCalendar initialAppointments={appointments} />
      )}
    </div>
  );
}
