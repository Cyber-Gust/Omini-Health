'use client';

import Link from 'next/link';
import { CalendarClock, CalendarPlus } from 'lucide-react';

type Patient = { id: string; full_name: string; birth_date?: string | null };
type Appointment = {
  id: string;
  appointment_time: string;
  patients: Patient | null;
  /** novo: nome para agendamento sem paciente cadastrado */
  patient_name?: string | null;
};

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  onAppointmentClick: (payload: { patient: Patient | null; appointmentId: string; patientName?: string | null }) => void;
}

export default function UpcomingAppointments({ appointments, onAppointmentClick }: UpcomingAppointmentsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-light" />
          <h2 className="text-xl font-semibold">Próximos Agendamentos</h2>
        </div>
        <Link href="/agenda" className="text-sm font-medium text-light hover:text-brand-dark transition-colors">
          Ver agenda completa
        </Link>
      </div>

      <div className="flex-grow">
        {appointments.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {appointments.map((appt) => {
              const when = new Date(appt.appointment_time);
              const displayName = appt.patients?.full_name || appt.patient_name || 'Paciente';
              return (
                <button
                  key={appt.id}
                  onClick={() =>
                    onAppointmentClick({
                      patient: appt.patients,
                      appointmentId: appt.id,
                      patientName: appt.patient_name ?? null,
                    })
                  }
                  className="flex-grow sm:flex-grow-0 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 p-3 bg-gray-50 rounded-md border border-border flex items-center gap-3 text-left hover:shadow-md hover:border-light transition-all"
                >
                  <div className="flex flex-col items-center justify-center bg-brand-light/30 text-brand-dark rounded-md p-2 w-14 h-14 shrink-0">
                    <span className="font-bold text-lg">{when.getDate()}</span>
                    <span className="text-xs uppercase">
                      {when.toLocaleString('pt-BR', { month: 'short' })}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                    <p className="text-sm text-muted">
                      {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <CalendarPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">Nenhum agendamento futuro</h3>
            <p className="mt-1 text-sm text-muted">A sua agenda está livre.</p>
          </div>
        )}
      </div>
    </div>
  );
}
