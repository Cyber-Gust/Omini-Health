'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import diseaseDatabase from '@/lib/cid10.json';

type Disease = { code: string; description: string };

interface MedicalHistoryManagerProps {
  history: Disease[] | null; // Permite que o histórico seja nulo
  onHistoryChange: (history: Disease[]) => void;
  isFinalized: boolean;
}

export default function MedicalHistoryManager({ history, onHistoryChange, isFinalized }: MedicalHistoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // CORREÇÃO: Garante que 'currentHistory' seja sempre uma lista, mesmo que 'history' seja nulo.
  const currentHistory = Array.isArray(history) ? history : [];

  const searchResults = useMemo(() => {
    if (searchTerm.length < 3) return [];
    const selectedCodes = new Set(currentHistory.map(h => h.code));
    const lowercasedSearch = searchTerm.toLowerCase();
    
    return diseaseDatabase.filter(d => 
      !selectedCodes.has(d.code) &&
      (d.description.toLowerCase().includes(lowercasedSearch) || d.code.toLowerCase().includes(lowercasedSearch))
    ).slice(0, 10);
  }, [searchTerm, currentHistory]);

  const addDisease = (disease: Disease) => {
    onHistoryChange([...currentHistory, disease]);
    setSearchTerm('');
  };

  const removeDisease = (code: string) => {
    onHistoryChange(currentHistory.filter(d => d.code !== code));
  };

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou código CID-10..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isFinalized}
          className="w-full rounded-md border-border bg-gray-50 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light text-sm"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {searchResults.map(d => (
              <button key={d.code} onClick={() => addDisease(d)} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                <strong>{d.code}</strong> - {d.description}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 min-h-[24px]">
        {/* CORREÇÃO: Mapeia sobre a lista 'currentHistory' que é sempre segura. */}
        {currentHistory.map(d => (
          <div key={d.code} className="flex items-center gap-1 bg-brand-light/30 text-brand-dark text-xs font-medium px-2 py-1 rounded-full">
            <span>{d.code} - {d.description}</span>
            {!isFinalized && (
              <button onClick={() => removeDisease(d.code)} className="ml-1">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
