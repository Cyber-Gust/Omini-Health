'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, Search, Loader2, PlayCircle } from 'lucide-react';
import MedicalHistoryManager from '../../consultas/[id]/components/MedicalHistoryManager';

type Patient = { id: string; full_name: string };

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatient?: Patient | null;
  prefillName?: string;

  /** NOVO: se vier de um agendamento, removemos ele após criar a consulta */
  appointmentIdToConsume?: string;
  /** NOVO: avisa o pai para remover da UI local sem refetch */
  onConsumedAppointment?: (appointmentId: string) => void;
}

export default function NewConsultationModal({
  isOpen,
  onClose,
  preselectedPatient,
  prefillName,
  appointmentIdToConsume,
  onConsumedAppointment,
}: NewConsultationModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPatientData, setNewPatientData] = useState({
    birth_date: '',
    medical_history: [] as any[],
    medications: '',
    allergies: '',
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedPatient) {
      setSelectedPatient(preselectedPatient);
      setSearchTerm(preselectedPatient.full_name);
      setPatients([]);
      setOpenSuggestions(false);
      setNewPatientData({ birth_date: '', medical_history: [], medications: '', allergies: '' });
    } else {
      setSelectedPatient(null);
      setSearchTerm(prefillName || '');
      setPatients([]);
      setOpenSuggestions(false);
      setNewPatientData({ birth_date: '', medical_history: [], medications: '', allergies: '' });
    }
  }, [isOpen, preselectedPatient, prefillName]);

  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.length < 2 || preselectedPatient || selectedPatient) {
        setPatients([]);
        return;
      }
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .ilike('full_name', `%${searchTerm}%`);
      if (!error) setPatients(data || []);
    };
    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, supabase, preselectedPatient, selectedPatient]);

  const closeDropdown = useCallback(() => {
    setOpenSuggestions(false);
    setPatients([]);
  }, []);

  const handlePickPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchTerm(p.full_name);
    closeDropdown();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Escape') closeDropdown();
  };

  const checkActiveConsultation = useCallback(
    async (patientId: string) => {
      const { data, error } = await supabase
        .from('consultas')
        .select('id, status, created_at')
        .eq('patient_id', patientId)
        .neq('status', 'concluída')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        toast.error('Não foi possível verificar consultas ativas.', { description: error.message });
        return null;
      }
      return data;
    },
    [supabase]
  );

  const consumeAppointmentIfNeeded = useCallback(
    async () => {
      if (!appointmentIdToConsume) return;
      try {
        await supabase.from('appointments').delete().eq('id', appointmentIdToConsume);
        onConsumedAppointment?.(appointmentIdToConsume);
      } catch (err: any) {
        // Não bloqueia a navegação se falhar — só informa
        toast.error('Não foi possível remover o agendamento.', { description: err.message });
      }
    },
    [appointmentIdToConsume, onConsumedAppointment, supabase]
  );

  const handleStartConsultation = async (patientId?: string) => {
    const chosenId = patientId || selectedPatient?.id || preselectedPatient?.id;
    if (!chosenId) {
      toast.warning('Por favor, selecione ou crie um paciente para iniciar.');
      return;
    }

    setLoading(true);
    try {
      const active = await checkActiveConsultation(chosenId);
      if (active) {
        toast.warning('Já existe uma consulta ativa para este paciente.', {
          description: 'Finalize-a antes de iniciar uma nova.',
        });
        setLoading(false);
        closeDropdown();
        onClose();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const { data, error } = await supabase
        .from('consultas')
        .insert({ patient_id: chosenId, user_id: user.id })
        .select('id')
        .single();

      if (error) throw error;

      // Remove o agendamento (se veio de um)
      await consumeAppointmentIfNeeded();

      router.push(`/consultas/${data.id}`);
    } catch (error: any) {
      toast.error('Não foi possível iniciar a consulta.', { description: error.message });
      setLoading(false);
    }
  };

  const handleCreateAndStart = async () => {
    if (!searchTerm || !newPatientData.birth_date) {
      toast.warning('O nome e a data de nascimento são obrigatórios para criar um novo paciente.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          full_name: searchTerm,
          birth_date: newPatientData.birth_date,
          medical_history: newPatientData.medical_history,
          medications: newPatientData.medications,
          allergies: newPatientData.allergies,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (patientError || !newPatient) throw patientError || new Error('Não foi possível criar o paciente.');

      const active = await checkActiveConsultation(newPatient.id);
      if (active) {
        toast.warning('Já existe uma consulta ativa para este paciente.', {
          description: 'Finalize-a antes de iniciar uma nova.',
        });
        setLoading(false);
        closeDropdown();
        onClose();
        return;
      }

      await handleStartConsultation(newPatient.id);
    } catch (error: any) {
      toast.error('Não foi possível criar o paciente:', { description: error.message });
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const showCreateForm =
    !preselectedPatient &&
    !selectedPatient &&
    searchTerm.trim().length > 1 &&
    patients.length === 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => { onClose(); closeDropdown(); }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-4">Iniciar Nova Consulta</h2>

        {/* Campo de Pesquisa */}
        <div className="relative">
          <label className="block text-sm font-medium text-muted mb-1">Paciente</label>
          <Search className="absolute left-3 top-10 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Pesquisar paciente existente..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }}
            disabled={!!preselectedPatient}
            onFocus={() => { if (!preselectedPatient && !selectedPatient && searchTerm.length >= 2) setOpenSuggestions(true); }}
            onBlur={() => { setTimeout(() => closeDropdown(), 120); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light disabled:bg-gray-100"
          />

          {openSuggestions && patients.length > 0 && !selectedPatient && !preselectedPatient && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handlePickPatient(p); }}
                  className="w-full text-left p-2 hover:bg-gray-100"
                >
                  {p.full_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formulário para Novo Paciente */}
        {showCreateForm && (
          <div className="mt-4 border-t border-border pt-4 space-y-4">
            <p className="text-sm font-medium">Criar novo paciente: &quot;{searchTerm}&quot;</p>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Data de Nascimento*</label>
              <input
                type="date"
                value={newPatientData.birth_date}
                onChange={(e) => setNewPatientData({ ...newPatientData, birth_date: e.target.value })}
                className="w-full input-style"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Doenças Pré-existentes (CID-10)</label>
              <MedicalHistoryManager
                history={newPatientData.medical_history}
                onHistoryChange={(h: any[]) => setNewPatientData({ ...newPatientData, medical_history: h })}
                isFinalized={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Medicação de Uso Contínuo</label>
              <textarea
                value={newPatientData.medications}
                onChange={(e) => setNewPatientData({ ...newPatientData, medications: e.target.value })}
                className="w-full input-style min-h-[60px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Alergias</label>
              <textarea
                value={newPatientData.allergies}
                onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                className="w-full input-style min-h-[60px]"
              />
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { onClose(); closeDropdown(); }} className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={showCreateForm ? handleCreateAndStart : () => handleStartConsultation()}
            disabled={loading || (!preselectedPatient && !selectedPatient && !showCreateForm)}
            className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (showCreateForm ? <UserPlus className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />)}
            {loading ? 'A processar...' : (showCreateForm ? 'Criar e Iniciar' : 'Iniciar Consulta')}
          </button>
        </div>
      </div>
    </div>
  );
}
