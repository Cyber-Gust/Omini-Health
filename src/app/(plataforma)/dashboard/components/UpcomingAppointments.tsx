import Link from 'next/link';
import { CalendarClock, CalendarPlus } from 'lucide-react';

// Tipo para os dados do agendamento
type Appointment = {
  id: string;
  appointment_time: string;
  patients: {
    full_name: string;
  } | null;
};

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
}

export default function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
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
          // CORREÇÃO: A lista vertical foi substituída por uma grelha flexível e com quebra de linha
          <div className="flex flex-wrap gap-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex-grow sm:flex-grow-0 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 p-3 bg-gray-50 rounded-md border border-border flex items-center gap-3">
                <div className="flex flex-col items-center justify-center bg-brand-light/30 text-brand-dark rounded-md p-2 w-14 h-14 shrink-0">
                  <span className="font-bold text-lg">
                    {new Date(appt.appointment_time).getDate()}
                  </span>
                  <span className="text-xs uppercase">
                    {new Date(appt.appointment_time).toLocaleString('pt-BR', { month: 'short' })}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="font-semibold text-foreground text-sm truncate">{appt.patients?.full_name || 'Paciente'}</p>
                  <p className="text-sm text-muted">
                    {new Date(appt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
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
