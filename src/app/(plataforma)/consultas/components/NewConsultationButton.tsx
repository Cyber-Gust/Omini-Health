'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewConsultationButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleNewConsultation = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      // Cria uma nova consulta na base de dados com o status 'pendente'
      const { data, error } = await supabase
        .from('consultas')
        .insert({ user_id: user.id, status: 'pendente' })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Nova consulta criada. A redirecionar...');
      
      // Redireciona para a página da nova consulta
      router.push(`/consultas/${data.id}`);

    } catch (error: any) {
      toast.error('Não foi possível criar a consulta:', error.message);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNewConsultation}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT focus:ring-offset-2 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      <span>Nova Consulta</span>
    </button>
  );
}
