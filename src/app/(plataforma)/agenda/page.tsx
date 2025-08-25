'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AgendaCalendar from './components/AgendaCalendar';
import NewConsultationModal from '../consultas/components/NewConsultationModal';
import { Loader2 } from 'lucide-react';

type Patient = { id: string; full_name: string; birth_date?: string | null };

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedPatient, setPreselectedPatient] = useState<Patient | null>(null);
  const [appointmentToConsume, setAppointmentToConsume] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const getAppointments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('appointments')
        .select(`id, appointment_time, description, patients ( id, full_name, birth_date )`)
        .order('appointment_time', { ascending: true });
      setAppointments(data || []);
      setLoading(false);
    };
    getAppointments();
  }, [supabase]);

  const openModalForAppointment = (payload: { patient: Patient | null; appointmentId: string }) => {
    if (!payload.patient) return;
    setPreselectedPatient(payload.patient);
    setAppointmentToConsume(payload.appointmentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPreselectedPatient(null);
    setAppointmentToConsume(null);
  };

  return (
    <div className="space-y-8 mt-16">
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-light" />
        </div>
      ) : (
        <AgendaCalendar
          initialAppointments={appointments}
          onAppointmentClick={openModalForAppointment}
        />
      )}

      <NewConsultationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        preselectedPatient={preselectedPatient ?? undefined}
        appointmentIdToConsume={appointmentToConsume ?? undefined}
        onConsumedAppointment={(id) => setAppointments(prev => prev.filter((a: any) => a.id !== id))}
      />
    </div>
  );
}
