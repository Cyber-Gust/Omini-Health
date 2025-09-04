'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, Search, Loader2, PlayCircle, Check, X } from 'lucide-react';
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

type Mode = 'SEARCHING' | 'PATIENT_SELECTED' | 'CREATING_PATIENT';

export default function NewConsultationModal({
  isOpen,
  onClose,
  preselectedPatient,
  prefillName,
  appointmentIdToConsume,
  onConsumedAppointment,
}: NewConsultationModalProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  // ---------- UI State ----------
  const [mode, setMode] = useState<Mode>('SEARCHING');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [highlight, setHighlight] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // form de novo paciente
  const [newPatientData, setNewPatientData] = useState({
    birth_date: '',
    medical_history: [] as any[],
    medications: '',
    allergies: '',
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchSeqRef = useRef(0);

  // ---------- Open/Reset ----------
  useEffect(() => {
    if (!isOpen) return;
    // reset
    setPatients([]);
    setHighlight(-1);
    setSubmitting(false);
    setSearching(false);

    if (preselectedPatient) {
      setSelectedPatient(preselectedPatient);
      setSearchTerm(preselectedPatient.full_name);
      setMode('PATIENT_SELECTED');
    } else if (prefillName && prefillName.trim().length > 0) {
      setSelectedPatient(null);
      setSearchTerm(prefillName);
      setNewPatientData({ birth_date: '', medical_history: [], medications: '', allergies: '' });
      setMode('CREATING_PATIENT'); // vindo da agenda sem paciente cadastrado
    } else {
      setSelectedPatient(null);
      setSearchTerm('');
      setNewPatientData({ birth_date: '', medical_history: [], medications: '', allergies: '' });
      setMode('SEARCHING');
    }
  }, [isOpen, preselectedPatient, prefillName]);

  // ---------- Buscar pacientes (fallback ilike) + guarda de ordem ----------
  const fetchPatients = useCallback(
    async (term: string): Promise<Patient[]> => {
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

  useEffect(() => {
    if (mode !== 'SEARCHING') return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      setPatients([]);
      setHighlight(-1);
      return;
    }

    const seq = ++searchSeqRef.current;
    let cancelled = false;

    const run = async () => {
      setSearching(true);
      try {
        const results = await fetchPatients(term);
        if (cancelled || seq !== searchSeqRef.current) return;
        setPatients(results);
        setHighlight(results.length ? 0 : -1);
      } catch (e: any) {
        toast.error('Falha ao pesquisar pacientes.', { description: e?.message });
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    const id = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [mode, searchTerm, fetchPatients]);

  // ---------- Helpers de backend ----------
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
    const { error } = await supabase.from('appointments').delete().eq('id', appointmentIdToConsume);
    if (!error) onConsumedAppointment?.(appointmentIdToConsume);
    else toast.error('Não foi possível remover o agendamento.', { description: error.message });
  }, [appointmentIdToConsume, onConsumedAppointment, supabase]);

  // idempotência: mesmo usuário, nome (ilike) + data nascimento
  const findExistingPatient = useCallback(
    async (userId: string, fullName: string, birthDate: string) => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('user_id', userId)
        .ilike('full_name', fullName.trim())
        .eq('birth_date', birthDate)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as Patient) || null;
    },
    [supabase]
  );

  // ---------- Fluxo único (mutex) ----------
  const startFlow = useCallback(
    async () => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilizador não autenticado.');

        let patientId: string | null = null;

        if (mode === 'PATIENT_SELECTED' && selectedPatient) {
          patientId = selectedPatient.id;
        } else if (mode === 'CREATING_PATIENT') {
          // validar
          if (!searchTerm.trim() || !newPatientData.birth_date) {
            toast.warning('Nome e data de nascimento são obrigatórios.');
            setSubmitting(false);
            return;
          }
          // tenta reaproveitar
          const existing = await findExistingPatient(user.id, searchTerm, newPatientData.birth_date);
          if (existing) {
            patientId = existing.id;
          } else {
            // cria
            const { data: newPatient, error: patientError } = await supabase
              .from('patients')
              .insert({
                full_name: searchTerm.trim(),
                birth_date: newPatientData.birth_date,
                medical_history: newPatientData.medical_history,
                medications: newPatientData.medications,
                allergies: newPatientData.allergies,
                user_id: user.id,
              })
              .select('id, full_name')
              .single();
            if (patientError || !newPatient) throw patientError || new Error('Não foi possível criar o paciente.');
            patientId = newPatient.id;
          }
        } else {
          // SEARCHING sem paciente escolhido => nada a fazer
          toast.info('Selecione um paciente ou crie um novo.');
          setSubmitting(false);
          return;
        }

        // checa consulta ativa
        const active = await checkActiveConsultation(patientId!);
        if (active) {
          toast.warning('Já existe uma consulta ativa para este paciente.', {
            description: 'Finalize-a antes de iniciar uma nova.',
          });
          onClose();
          return;
        }

        // cria consulta
        const { data: created, error: cErr } = await supabase
          .from('consultas')
          .insert({ patient_id: patientId!, user_id: user.id })
          .select('id')
          .single();
        if (cErr || !created) throw cErr || new Error('Não foi possível iniciar a consulta.');

        // consome agendamento após sucesso
        await consumeAppointmentIfNeeded();

        router.push(`/consultas/${created.id}`);
      } catch (e: any) {
        toast.error('Não foi possível concluir a operação.', { description: e?.message || String(e) });
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      supabase,
      mode,
      selectedPatient,
      searchTerm,
      newPatientData,
      checkActiveConsultation,
      consumeAppointmentIfNeeded,
      findExistingPatient,
      router,
      onClose,
    ]
  );

  // ---------- Handlers UI ----------
  const handlePickPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchTerm(p.full_name);
    setMode('PATIENT_SELECTED');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (submitting) {
      e.preventDefault();
      return;
    }
    if (mode !== 'SEARCHING' || patients.length === 0) {
      if (e.key === 'Enter') e.preventDefault(); // evita submit involuntário
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, patients.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      handlePickPatient(patients[highlight]);
    }
  };

  // ---------- Render ----------
  if (!isOpen) return null;

  const renderSearchList = () => {
    const termOk = searchTerm.trim().length >= 2;

    return (
      <div className="mt-1">
        {searching && (
          <div className="flex items-center gap-2 p-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> A pesquisar...
          </div>
        )}

        {!searching && termOk && patients.length > 0 && (
          <div className="border rounded-md shadow-sm max-h-60 overflow-y-auto">
            {patients.map((p, idx) => (
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

        {!searching && termOk && patients.length === 0 && (
          <div className="border rounded-md p-3">
            <p className="text-sm text-muted mb-2">Nenhum paciente encontrado.</p>
            <button
              type="button"
              onClick={() => setMode('CREATING_PATIENT')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-border hover:bg-gray-50"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar “{searchTerm.trim()}”
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCreateForm = () => (
    <div className="mt-4 border-t border-border pt-4 space-y-4">
      <p className="text-sm font-medium">Criar novo paciente: &quot;{searchTerm}&quot;</p>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Data de Nascimento*</label>
        <input
          type="date"
          value={newPatientData.birth_date}
          onChange={(e) => setNewPatientData({ ...newPatientData, birth_date: e.target.value })}
          disabled={submitting}
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
          disabled={submitting}
          className="w-full input-style min-h-[60px]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Alergias</label>
        <textarea
          value={newPatientData.allergies}
          onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
          disabled={submitting}
          className="w-full input-style min-h-[60px]"
        />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (submitting) return;
        onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-4">Iniciar Nova Consulta</h2>

        {/* Campo Paciente */}
        <div className="relative">
          <label className="block text-sm font-medium text-muted mb-1">Paciente</label>
          <Search className="absolute left-3 top-10 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Pesquisar paciente..."
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              // se estava com paciente selecionado e o usuário mexe no nome, volta a pesquisar
              if (mode === 'PATIENT_SELECTED') {
                setSelectedPatient(null);
                setMode('SEARCHING');
              }
              // se estava criando, deixar usuário editar o nome livremente
              if (mode === 'CREATING_PATIENT') {
                // nada especial; o nome é o próprio searchTerm
              }
              // se estava pesquisando, continua pesquisando normalmente
            }}
            onKeyDown={handleKeyDown}
            disabled={submitting || !!preselectedPatient}
            autoComplete="off"
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-light disabled:bg-gray-100"
          />
          {mode === 'PATIENT_SELECTED' && !preselectedPatient && (
            <button
              type="button"
              onClick={() => { setSelectedPatient(null); setMode('SEARCHING'); }}
              className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100"
              aria-label="Limpar seleção"
              title="Limpar seleção"
            >
              <X className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>

        {/* Conteúdo por modo */}
        {mode === 'SEARCHING' && renderSearchList()}
        {mode === 'CREATING_PATIENT' && renderCreateForm()}

        {/* Ações */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => { if (!submitting) onClose(); }}
            className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:bg-gray-100 disabled:opacity-50"
            disabled={submitting}
          >
            Cancelar
          </button>

          {/* Botão principal depende do modo */}
          {mode === 'PATIENT_SELECTED' && (
            <button
              onClick={startFlow}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {submitting ? 'Processando...' : 'Iniciar Consulta'}
            </button>
          )}

          {mode === 'CREATING_PATIENT' && (
            <button
              onClick={startFlow}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {submitting ? 'Processando...' : 'Criar e Iniciar'}
            </button>
          )}

          {/* No SEARCHING não mostramos ação principal até usuário selecionar ou decidir criar */}
        </div>
      </div>
    </div>
  );
}
