'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Clock, MessageSquareText, Trash2 } from 'lucide-react';

// Tipos para os dados que o componente recebe
type Consultation = {
  id: string;
  created_at: string; // ISO do Supabase
  status: string | null;
  patients: {
    full_name: string;
  } | null;
};

interface ConsultationHistoryProps {
  consultations: Consultation[];
  onDeleteClick: (consultationId: string) => void;
}

// Normaliza status (acentos/caixa) para garantir o chip certo
const normalizeStatus = (status: string | null): 'concluída' | 'a processar' | 'pendente' => {
  const s = (status || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (s === 'concluida' || s === 'concluída') return 'concluída';
  if (s === 'a processar' || s === 'processando' || s === 'processar') return 'a processar';
  return 'pendente';
};

// Chip de status
const formatStatus = (status: string | null) => {
  const s = normalizeStatus(status);
  switch (s) {
    case 'concluída':
      return (
        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
          Concluída
        </span>
      );
    case 'a processar':
      return (
        <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
          A Processar
        </span>
      );
    default:
      return (
        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
          Pendente
        </span>
      );
  }
};

// Converte uma Date para YYYY-MM-DD **local** (evita bugs de fuso)
const toLocalYMD = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10); // YYYY-MM-DD
};

export default function ConsultationHistory({ consultations, onDeleteClick }: ConsultationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Agora começa SEM filtro de datas (mostra tudo). Preencher datas ativa o filtro.
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD | ''
  const [endDate, setEndDate] = useState<string>('');     // YYYY-MM-DD | ''

  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      // Busca por nome (case-insensitive)
      const patientName = (c.patients?.full_name || '').toLowerCase();
      const searchMatch = patientName.includes(searchTerm.toLowerCase());

      // Filtro de data seguro (compara YYYY-MM-DD lexicograficamente)
      const cYMD = toLocalYMD(new Date(c.created_at));
      const dateMatch =
        (!startDate || cYMD >= startDate) &&
        (!endDate || cYMD <= endDate);

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
                    <p className="font-semibold text-foreground">
                      {c.patients?.full_name || 'Paciente não identificado'}
                    </p>
                    <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  {formatStatus(c.status)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // não navegar ao clicar
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
