'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Clock, Calendar } from 'lucide-react';

// Tipos para os dados do agendamento
type Appointment = {
  id: string;
  appointment_time: string;
  description: string | null;
  patients: {
    id: string;
    full_name: string;
  } | null;
};

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: Date | null;
  appointments: Appointment[];
}

export default function DayDetailsModal({ isOpen, onClose, day, appointments }: DayDetailsModalProps) {
  if (!isOpen || !day) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground capitalize">
            {format(day, "eeee, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>
        
        <div className="max-h-80 overflow-y-auto pr-2">
          {appointments.length > 0 ? (
            <ul className="space-y-3">
              {appointments.map(appt => (
                <li key={appt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                  <Clock className="h-5 w-5 text-light shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {new Date(appt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {appt.patients?.full_name}
                    </p>
                    {appt.description && <p className="text-sm text-muted">{appt.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-muted">Nenhum agendamento para este dia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
