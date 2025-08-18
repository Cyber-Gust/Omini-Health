'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

// Tipos para os dados que o componente recebe
type Patient = {
  id: string;
  full_name: string;
  created_at: string;
};

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelect: (patient: Patient) => void;
  patients: Patient[];
}

export default function PatientSearchModal({ isOpen, onClose, onPatientSelect, patients }: PatientSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return patients; // Mostra todos se a pesquisa for curta
    return patients.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, patients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground">Selecionar Paciente</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Pesquisar paciente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light"
          />
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          {searchResults.length > 0 ? (
            <ul className="divide-y divide-border">
              {searchResults.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onPatientSelect(p);
                      onClose();
                    }}
                    className="w-full text-left px-2 py-3 hover:bg-gray-100"
                  >
                    {p.full_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-4">Nenhum paciente encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
