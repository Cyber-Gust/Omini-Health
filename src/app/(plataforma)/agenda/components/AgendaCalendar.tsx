'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, PlayCircle } from 'lucide-react';
import AppointmentModal from './AppointmentModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';

type Patient = { id: string; full_name: string; birth_date?: string | null };
type Appointment = {
  id: string;
  appointment_time: string;
  description: string | null;
  patients: Patient | null;
};

interface AgendaCalendarProps {
  initialAppointments: Appointment[];
  onAppointmentClick: (payload: { patient: Patient | null; appointmentId: string }) => void;
}

export default function AgendaCalendar({ initialAppointments, onAppointmentClick }: AgendaCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState(initialAppointments);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 🔄 importante: sincroniza quando o pai muda a lista
  useEffect(() => { setAppointments(initialAppointments); }, [initialAppointments]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startingDayIndex = getDay(firstDayOfMonth);
  const emptyDays = Array.from({ length: startingDayIndex });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleAppointmentCreated = (newAppointment: Appointment) => {
    setAppointments(prev => [...prev, newAppointment].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()));
  };

  const handleDayClick = (day: Date, dayAppointments: Appointment[]) => {
    if (dayAppointments.length > 0) {
      setSelectedDate(day);
      setSelectedDayAppointments(dayAppointments);
      setIsDetailsModalOpen(true);
    }
  };

  const todayAppointments = useMemo(() => {
    return appointments
      .filter(appt => isToday(new Date(appt.appointment_time)))
      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  }, [appointments]);

  return (
    <>
      <div className="bg-white pb-6 px-2 sm:px-4 rounded-lg shadow-sm border border-border">
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
            <button onClick={() => setIsCreateModalOpen(true)} className="ml-2 sm:ml-4 inline-flex items-center gap-2 rounded-md bg-light px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px border-t border-l border-border bg-border">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
            <div key={index} className="text-center text-xs sm:text-sm font-medium py-2 bg-gray-50">{day}</div>
          ))}

          {emptyDays.map((_, index) => <div key={`empty-${index}`} className="bg-gray-50" />)}

          {daysInMonth.map(day => {
            const dayAppointments = appointments.filter(appt => isSameDay(new Date(appt.appointment_time), day));
            const hasAppointments = dayAppointments.length > 0;

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day, dayAppointments)}
                className={`relative bg-white p-1 sm:p-2 transition-colors aspect-square flex flex-col items-center justify-start ${hasAppointments ? 'cursor-pointer hover:bg-gray-100' : ''}`}
              >
                <span className={`text-sm ${isToday(day) ? 'font-bold text-white bg-light rounded-full h-6 w-6 flex items-center justify-center' : ''}`}>
                  {format(day, 'd')}
                </span>
                {hasAppointments && (
                  <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-light" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm border border-border p-4 sm:p-6">
        <h3 className="font-semibold">Agendamentos para Hoje</h3>
        <div className="mt-4 max-h-48 overflow-y-auto pr-2">
          {todayAppointments.length > 0 ? (
            <ul className="space-y-3">
              {todayAppointments.map(appt => (
                <li key={appt.id}>
                  <button
                    onClick={() => onAppointmentClick({ patient: appt.patients, appointmentId: appt.id })}
                    className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-md text-left hover:ring-2 hover:ring-light transition-all"
                  >
                    <Clock className="h-5 w-5 text-light shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-foreground">
                        {new Date(appt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {appt.patients?.full_name}
                      </p>
                      {appt.description && <p className="text-sm text-muted">{appt.description}</p>}
                    </div>
                    <PlayCircle className="h-5 w-5 text-muted ml-auto shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum agendamento para hoje.</p>
          )}
        </div>
      </div>

      <AppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAppointmentCreated={handleAppointmentCreated}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointments={selectedDayAppointments}
        selectedDate={selectedDate}
        onAppointmentClick={onAppointmentClick}
      />
    </>
  );
}
