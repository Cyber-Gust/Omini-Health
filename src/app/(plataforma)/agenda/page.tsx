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
  // ✅ novo: nome pré-preenchido quando não há paciente cadastrado
  const [prefillName, setPrefillName] = useState<string | undefined>(undefined);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const getAppointments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('appointments')
        // ✅ incluir patient_name
        .select(`id, appointment_time, description, patient_name, patients ( id, full_name, birth_date )`)
        .order('appointment_time', { ascending: true });
      setAppointments(data || []);
      setLoading(false);
    };
    getAppointments();
  }, [supabase]);

  // ✅ agora recebe patientName e funciona para paciente nulo (novo paciente)
  const openModalForAppointment = (payload: { patient: Patient | null; appointmentId: string; patientName?: string | null }) => {
    setPreselectedPatient(payload.patient ?? null);
    setPrefillName(payload.patient ? undefined : (payload.patientName ?? undefined));
    setAppointmentToConsume(payload.appointmentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPreselectedPatient(null);
    setAppointmentToConsume(null);
    setPrefillName(undefined); // ✅ limpar
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
          onAppointmentClick={openModalForAppointment} // AgendaCalendar deve repassar {patient, appointmentId, patientName}
        />
      )}

      <NewConsultationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        preselectedPatient={preselectedPatient ?? undefined}
        prefillName={prefillName}                      // ✅ passar para o modal
        appointmentIdToConsume={appointmentToConsume ?? undefined}
        onConsumedAppointment={(id) => setAppointments(prev => prev.filter((a: any) => a.id !== id))}
      />
    </div>
  );
}
