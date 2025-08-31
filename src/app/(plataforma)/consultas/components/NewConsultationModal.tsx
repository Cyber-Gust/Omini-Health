'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, Search, Loader2, PlayCircle, Check } from 'lucide-react';
import MedicalHistoryManager from '../../consultas/[id]/components/MedicalHistoryManager';

type Patient = { id: string; full_name: string };

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatient?: Patient | null;
  prefillName?: string;
  appointmentIdToConsume?: string;
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
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1); // navegação por setas
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  // reset ao abrir/fechar
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
    setHighlight(-1);
  }, [isOpen, preselectedPatient, prefillName]);

  // -------- BUSCA DE PACIENTES (com fallback) --------
  const fetchPatients = useCallback(
    async (term: string) => {
      // 1º tenta a função RPC (melhor: acento-insensível + ranking)
      try {
        const { data, error } = await supabase.rpc('search_patients', { q: term, limit_count: 8 });
        if (!error && Array.isArray(data)) return data as Patient[];
      } catch {
        /* ignora e cai no fallback */
      }
      // 2º fallback: ilike simples
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .ilike('full_name', `%${term}%`)
        .limit(8);
      if (error) throw error;
      return (data || []) as Patient[];
    },
    [supabase]
  );

  // dispara a busca conforme digita (com debounce)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // não busca quando já há selecionado/preselecionado
      if (searchTerm.trim().length < 2 || preselectedPatient || selectedPatient) {
        setPatients([]);
        setOpenSuggestions(false);
        setHighlight(-1);
        return;
      }
      setSearching(true);
      try {
        const term = searchTerm.trim();
        const results = await fetchPatients(term);
        if (cancelled) return;
        setPatients(results);
        // abre automaticamente a dropdown se há resultados e o input está focado
        setOpenSuggestions(isFocused && results.length > 0);
        setHighlight(results.length ? 0 : -1);
      } catch (e: any) {
        if (!cancelled) toast.error('Falha ao pesquisar pacientes.', { description: e.message });
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    const id = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [searchTerm, fetchPatients, preselectedPatient, selectedPatient, isFocused]);

  const closeDropdown = useCallback(() => {
    setOpenSuggestions(false);
    setPatients([]);
    setHighlight(-1);
  }, []);

  const handlePickPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchTerm(p.full_name);
    closeDropdown();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!openSuggestions || patients.length === 0) {
      if (e.key === 'Escape') closeDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, patients.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      handlePickPatient(patients[highlight]);
      return;
    }
    if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  // -------- checagem de consulta ativa / agendamento --------
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

  const consumeAppointmentIfNeeded = useCallback(async () => {
    if (!appointmentIdToConsume) return;
    try {
      await supabase.from('appointments').delete().eq('id', appointmentIdToConsume);
      onConsumedAppointment?.(appointmentIdToConsume);
    } catch (err: any) {
      toast.error('Não foi possível remover o agendamento.', { description: err.message });
    }
  }, [appointmentIdToConsume, onConsumedAppointment, supabase]);

  const handleStartConsultation = async (patientId?: string) => {
    const chosenId = patientId || selectedPatient?.id || preselectedPatient?.id;
    if (!chosenId) {
      toast.warning('Por favor, selecione ou crie um paciente para iniciar.');
      return;
    }

    try {
      const active = await checkActiveConsultation(chosenId);
      if (active) {
        toast.warning('Já existe uma consulta ativa para este paciente.', {
          description: 'Finalize-a antes de iniciar uma nova.',
        });
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

      await consumeAppointmentIfNeeded();
      router.push(`/consultas/${data.id}`);
    } catch (error: any) {
      toast.error('Não foi possível iniciar a consulta.', { description: error.message });
    }
  };

  const handleCreateAndStart = async () => {
    if (!searchTerm || !newPatientData.birth_date) {
      toast.warning('O nome e a data de nascimento são obrigatórios para criar um novo paciente.');
      return;
    }
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
        .select('id, full_name')
        .single();

      if (patientError || !newPatient) throw patientError || new Error('Não foi possível criar o paciente.');

      const active = await checkActiveConsultation(newPatient.id);
      if (active) {
        toast.warning('Já existe uma consulta ativa para este paciente.', {
          description: 'Finalize-a antes de iniciar uma nova.',
        });
        closeDropdown();
        onClose();
        return;
      }

      await handleStartConsultation(newPatient.id);
    } catch (error: any) {
      toast.error('Não foi possível criar o paciente:', { description: error.message });
    }
  };

  if (!isOpen) return null;

  const showCreateForm =
    !preselectedPatient &&
    !selectedPatient &&
    searchTerm.trim().length > 1 &&
    patients.length === 0 &&
    !searching;

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
            ref={inputRef}
            type="text"
            placeholder="Pesquisar paciente existente..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); setOpenSuggestions(true); }}
            disabled={!!preselectedPatient}
            onFocus={() => { setIsFocused(true); if (!preselectedPatient && !selectedPatient && searchTerm.length >= 2 && patients.length > 0) setOpenSuggestions(true); }}
            onBlur={() => { setIsFocused(false); setTimeout(() => closeDropdown(), 120); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light disabled:bg-gray-100"
          />

          {/* Dropdown de sugestões */}
          {openSuggestions && !selectedPatient && !preselectedPatient && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searching && (
                <div className="flex items-center gap-2 p-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> A pesquisar...
                </div>
              )}
              {!searching && patients.length === 0 && (
                <div className="p-2 text-sm text-muted">Nenhum paciente encontrado</div>
              )}
              {!searching && patients.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handlePickPatient(p); }}
                  className={`w-full text-left p-2 flex items-center justify-between ${
                    idx === highlight ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{p.full_name}</span>
                  {idx === highlight && <Check className="h-4 w-4 text-light" />}
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
            disabled={searching || (!preselectedPatient && !selectedPatient && !showCreateForm)}
            className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
          >
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (showCreateForm ? <UserPlus className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />)}
            {searching ? 'A pesquisar...' : (showCreateForm ? 'Criar e Iniciar' : 'Iniciar Consulta')}
          </button>
        </div>
      </div>
    </div>
  );
}
