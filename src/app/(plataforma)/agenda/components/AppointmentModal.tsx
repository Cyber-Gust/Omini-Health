'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { X, Search, Loader2, Calendar } from 'lucide-react';

// Tipos
type Patient = {
  id: string;
  full_name: string;
};

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated: (newAppointment: any) => void;
}

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

export default function AppointmentModal({ isOpen, onClose, onAppointmentCreated }: AppointmentModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(formatDate(now));
      setTime(formatTime(now));
      setSelectedPatient(null);
      setSearchTerm('');
      setDescription('');
    }
  }, [isOpen]);

  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.length < 2) {
        setPatients([]);
        return;
      }
      const { data } = await supabase
        .from('patients')
        .select('id, full_name')
        .ilike('full_name', `%${searchTerm}%`);
      setPatients(data || []);
    };
    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!selectedPatient && searchTerm.length < 2) || !date || !time) {
      toast.error('Por favor, selecione ou digite o nome de um paciente e defina a data e a hora.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const appointmentTime = new Date(`${date}T${time}`);

      // Monta o payload de acordo com o fluxo:
      // - Com paciente selecionado: grava patient_id
      // - Sem paciente selecionado: NÃO cria paciente; grava patient_name
      const payload: {
        user_id: string;
        appointment_time: string;
        description: string;
        patient_id: string | null;
        patient_name: string | null;
      } = {
        user_id: user.id,
        appointment_time: appointmentTime.toISOString(),
        description,
        patient_id: selectedPatient ? selectedPatient.id : null,
        patient_name: selectedPatient ? null : searchTerm.trim(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(payload)
        .select('id, appointment_time, description, patient_name, patients ( id, full_name, birth_date )')
        .single();

      if (error) throw error;

      toast.success('Agendamento criado com sucesso!');
      onAppointmentCreated(data);
      onClose();
    } catch (error: any) {
      toast.error('Não foi possível criar o agendamento.', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">Novo Agendamento</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Paciente</label>
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar ou digitar nome do novo paciente..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedPatient(null);
                  }}
                  className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light"
                  onBlur={() => setTimeout(() => setPatients([]), 150)}
                  autoComplete="off"
                />
              </div>
              {patients.length > 0 && !selectedPatient && (
                <div className="mt-2 border border-border rounded-md max-h-32 overflow-y-auto">
                  {patients.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchTerm(p.full_name);
                        setPatients([]);  
                      }}
                      className="w-full text-left p-2 hover:bg-gray-100"
                    >
                      {p.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-muted mb-1">
                Data
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border-border bg-transparent py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light"
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-muted mb-1">
                Hora
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border-border bg-transparent py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border-border bg-transparent py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
              {loading ? 'A agendar...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
