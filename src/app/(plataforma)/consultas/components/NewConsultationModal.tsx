'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, Search, Loader2 } from 'lucide-react';

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Patient = {
  id: string;
  full_name: string;
};

export default function NewConsultationModal({ isOpen, onClose }: NewConsultationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

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

  const handleSelectPatient = async (patientId: string) => {
    setLoading(true);
    try {
      // CORREÇÃO: Obter o ID do utilizador atual para o associar à consulta.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado.");

      // CORREÇÃO: Enviar o user_id juntamente com o patient_id.
      const { data, error } = await supabase
        .from('consultas')
        .insert({ patient_id: patientId, user_id: user.id })
        .select('id')
        .single();

      if (error) throw error;
      
      router.push(`/consultas/${data.id}`);

    } catch (error: any) {
      toast.error("Não foi possível iniciar a consulta.", {
        description: error.message
      });
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (searchTerm.length < 2) {
      toast.warning("O nome do paciente deve ter pelo menos 2 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({ full_name: searchTerm, user_id: user.id })
        .select('id')
        .single();

      if (patientError || !newPatient) {
        throw patientError || new Error("Não foi possível obter os dados do novo paciente.");
      }
      
      await handleSelectPatient(newPatient.id);

    } catch (error: any) {
      toast.error("Não foi possível criar o paciente:", {
        description: error.message
      });
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-4">Iniciar Nova Consulta</h2>
        <p className="text-sm text-muted mb-4">Pesquise por um paciente existente ou crie um novo para começar.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Digite o nome do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT"
          />
        </div>
        <div className="mt-4 max-h-40 overflow-y-auto">
          {patients.map(p => (
            <button key={p.id} onClick={() => handleSelectPatient(p.id)} className="w-full text-left p-2 rounded-md hover:bg-gray-100">
              {p.full_name}
            </button>
          ))}
        </div>
        {searchTerm.length > 1 && (
          <button onClick={handleCreatePatient} disabled={loading} className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-light text-white hover:bg-brand-dark disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Criar novo paciente: "{searchTerm}"
          </button>
        )}
      </div>
    </div>
  );
}
