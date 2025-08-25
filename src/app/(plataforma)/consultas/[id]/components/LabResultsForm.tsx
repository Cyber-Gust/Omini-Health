'use client';

import { useState, useMemo } from 'react';
import { Beaker, Search, Plus, X } from 'lucide-react';
import examDatabase from '@/lib/lab_exams.json';

type ExamResult = { name: string; value: string };

interface LabResultsFormProps {
  results: ExamResult[];
  onResultsChange: (results: ExamResult[]) => void;
  isFinalized: boolean;
}

export default function LabResultsForm({ results, onResultsChange, isFinalized }: LabResultsFormProps) {
  const [examName, setExamName] = useState('');
  const [examValue, setExamValue] = useState('');
  const [openSuggestions, setOpenSuggestions] = useState(false);

  const searchResults = useMemo(() => {
    if (examName.length < 2) return [];
    return examDatabase.filter((e) => e.name.toLowerCase().includes(examName.toLowerCase()));
  }, [examName]);

  const handleAddResult = () => {
    if (!examName || !examValue) return;
    onResultsChange([...results, { name: examName, value: examValue }]);
    setExamName('');
    setExamValue('');
    setOpenSuggestions(false);
  };

  const handleRemoveResult = (index: number) => {
    onResultsChange(results.filter((_, i) => i !== index));
  };

  const pickSuggestion = (name: string) => {
    setExamName(name);
    setOpenSuggestions(false);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Escape') setOpenSuggestions(false);
  };

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Beaker className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Resultados de Exames</h2>
      </div>
      {!isFinalized && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-muted mb-1">Nome do Exame</label>
            <Search className="absolute left-3 top-10 -translate-y-1/2 h-5 w-5 text-muted" />
            <input
              value={examName}
              onChange={(e) => {
                setExamName(e.target.value);
                setOpenSuggestions(e.target.value.length >= 2);
              }}
              onFocus={() => {
                if (examName.length >= 2) setOpenSuggestions(true);
              }}
              onBlur={() => {
                // dá tempo do clique na sugestão disparar antes de fechar
                setTimeout(() => setOpenSuggestions(false), 120);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Pesquisar exame..."
              autoComplete="off"
              className="w-full rounded-md border-border bg-gray-50 py-2 pl-10 pr-4 text-sm"
            />
            {openSuggestions && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map((e) => (
                  <button
                    key={e.acronym}
                    type="button"
                    // onMouseDown evita que o blur do input aconteça antes do clique
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      pickSuggestion(e.name);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Resultado</label>
            <input
              value={examValue}
              onChange={(e) => setExamValue(e.target.value)}
              placeholder="ex: 98 mg/dL"
              className="w-full rounded-md border-border bg-gray-50 py-2 px-3 text-sm"
            />
          </div>

          <button
            onClick={handleAddResult}
            className="md:col-start-3 inline-flex items-center justify-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
          >
            <Plus size={16} /> Adicionar Resultado
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {results.map((res, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded-md text-sm">
            <div>
              <span className="font-semibold">{res.name}:</span> {res.value}
            </div>
            {!isFinalized && (
              <button onClick={() => handleRemoveResult(index)} className="p-1 text-muted hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
