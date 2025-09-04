'use client';

import { Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Appointment = {
  id: string;
  appointment_time: string;
  description: string | null;
  patients: { id: string; full_name: string } | null;
  /** novo */
  patient_name?: string | null;
};

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  selectedDate: Date | null;
  onAppointmentClick: (payload: {
    patient: Appointment['patients'];
    appointmentId: string;
    patientName?: string | null;
  }) => void;
}

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointments,
  selectedDate,
  onAppointmentClick,
}: AppointmentDetailsModalProps) {
  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground">
            Agendamentos para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          {appointments.length > 0 ? (
            <ul className="space-y-3">
              {appointments.map((appt) => {
                const when = new Date(appt.appointment_time);
                const displayName = appt.patients?.full_name || appt.patient_name || 'Paciente';
                return (
                  <li key={appt.id}>
                    <button
                      onClick={() =>
                        onAppointmentClick({
                          patient: appt.patients,
                          appointmentId: appt.id,
                          patientName: appt.patient_name ?? null,
                        })
                      }
                      className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-md text-left hover:bg-gray-100"
                    >
                      <Clock className="h-5 w-5 text-light shrink-0 mt-1" />
                      <div>
                        <p className="font-medium text-foreground">
                          {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {displayName}
                        </p>
                        {appt.description && <p className="text-sm text-muted">{appt.description}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-4">Nenhum agendamento para este dia.</p>
          )}
        </div>
      </div>
    </div>
  );
}
