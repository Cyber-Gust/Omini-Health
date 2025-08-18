'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Clock, MessageSquareText, Trash2 } from 'lucide-react';
// Tipos para os dados que o componente recebe
type Consultation = {
  id: string;
  created_at: string;
  status: string | null;
  patients: {
    full_name: string;
  } | null;
};

interface ConsultationHistoryProps {
  consultations: Consultation[];
  onDeleteClick: (consultationId: string) => void; // Nova prop
}

// Função para formatar o status
const formatStatus = (status: string | null) => {
    switch (status) {
        case 'concluída': return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Concluída</span>;
        case 'a processar': return <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">A Processar</span>;
        default: return <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">Pendente</span>;
    }
};

// Função auxiliar para formatar a data para o formato YYYY-MM-DD
const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ConsultationHistory({ consultations, onDeleteClick }: ConsultationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // CORREÇÃO: Define o estado inicial para o primeiro e último dia do mês atual
  const getInitialDateRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
        start: formatDate(firstDay),
        end: formatDate(lastDay)
    };
  };

  const [startDate, setStartDate] = useState(getInitialDateRange().start);
  const [endDate, setEndDate] = useState(getInitialDateRange().end);

  const filteredConsultations = useMemo(() => {
    return consultations.filter(c => {
      // Filtro por nome do paciente
      const patientName = c.patients?.full_name.toLowerCase() || '';
      const searchMatch = patientName.includes(searchTerm.toLowerCase());
      
      // Lógica de filtro por intervalo de datas
      const consultationDate = new Date(c.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      // Ajusta a data de início para o começo do dia
      if (start) {
        start.setHours(0, 0, 0, 0);
      }
      // Ajusta a data final para incluir o dia inteiro
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      const dateMatch = 
        (!start || consultationDate >= start) && 
        (!end || consultationDate <= end);

      return searchMatch && dateMatch;
    });
  }, [consultations, searchTerm, startDate, endDate]);

  return (
    <div className="border border-border rounded-lg shadow-sm bg-white">
      {/* Cabeçalho com Filtros */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Pesquisar por nome do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT text-muted"
            />
            <span className="text-muted">até</span>
            <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT text-muted"
            />
        </div>
      </div>

      {/* Lista de Consultas com Scroll Interno */}
      <div className="max-h-[60vh] overflow-y-auto">
        <div className="divide-y divide-border">
          {filteredConsultations.length > 0 ? (
            filteredConsultations.map((c) => (
              <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <Link href={`/consultas/${c.id}`} className="flex-grow">
                  <div>
                    <p className="font-semibold text-foreground">{c.patients?.full_name || 'Paciente não identificado'}</p>
                    <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                    {formatStatus(c.status)}
                    {/* NOVO: Botão de apagar */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Impede que o clique no botão navegue para a página
                            onDeleteClick(c.id);
                        }}
                        className="p-2 rounded-full text-muted hover:text-red-600 hover:bg-red-100 transition-colors"
                        title="Apagar consulta"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <MessageSquareText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-foreground">Nenhum resultado encontrado</h3>
              <p className="mt-1 text-sm text-muted">Tente ajustar os seus filtros de pesquisa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
