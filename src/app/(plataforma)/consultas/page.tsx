'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, Hourglass, History, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ConsultationHistory from './components/ConsultationHistory';
import NewConsultationModal from './components/NewConsultationModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';

export default function ConsultasPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();

   const getConsultations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('consultas').select(`id, created_at, status, patients ( full_name )`).order('created_at', { ascending: false });
    setConsultations(data || []);
    setLoading(false);
  }, [supabase]);
  
  useEffect(() => {
    const getConsultations = async () => {
      setLoading(true);
      const { data } = await supabase.from('consultas').select(`id, created_at, status, patients ( full_name )`).order('created_at', { ascending: false });
      setConsultations(data || []);
      setLoading(false);
    };
    getConsultations();
  }, [supabase]);

  // Filtra as consultas em duas listas: ativas e concluídas
  const { activeConsultations, completedConsultations } = useMemo(() => {
    const active = consultations.filter(c => c.status !== 'concluída');
    const completed = consultations.filter(c => c.status === 'concluída');
    return { activeConsultations: active, completedConsultations: completed };
  }, [consultations]);

  const handleConfirmDelete = async () => {
    if (!consultationToDelete) return;
    setIsDeleting(true);
    try {
        const { error } = await supabase.from('consultas').delete().eq('id', consultationToDelete);
        if (error) throw error;
        
        toast.success("Consulta apagada com sucesso!");
        // CORREÇÃO: Re-busca os dados da base de dados para garantir a sincronização
        await getConsultations();
    } catch (error: any) {
        toast.error("Não foi possível apagar a consulta.", { description: error.message });
    } finally {
        setIsDeleting(false);
        setConsultationToDelete(null); // Fecha o modal
    }
  };

  return (
    <div className="mt-16 space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-lightnd-dark"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Nova Consulta</span>
        </button>
      </div>

      {loading ? (
        <p>A carregar consultas...</p>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Hourglass className="h-5 w-5 text-muted" />
              <h2 className="text-xl font-semibold">Consultas Ativas</h2>
            </div>
            {activeConsultations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeConsultations.map(c => (
                  <div key={c.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-start">
                    <Link href={`/consultas/${c.id}`} className="flex-grow">
                      <p className="font-semibold text-yellow-800 truncate">{c.patients?.full_name || 'Paciente a definir'}</p>
                      <p className="text-sm text-yellow-600 mt-1">Iniciada em: {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                    </Link>
                    <button onClick={() => setConsultationToDelete(c.id)} className="p-2 -mr-2 -mt-2 rounded-full text-yellow-700 hover:text-red-600 hover:bg-red-100 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Não há consultas pendentes.</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted" />
              <h2 className="text-xl font-semibold">Histórico de Consultas</h2>
            </div>
            <ConsultationHistory 
                consultations={completedConsultations} 
                onDeleteClick={(id) => setConsultationToDelete(id)} 
            />
          </div>
        </>
      )}

      <NewConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <DeleteConfirmationModal 
        isOpen={!!consultationToDelete} 
        onClose={() => setConsultationToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
}
