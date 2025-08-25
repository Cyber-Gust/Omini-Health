'use client';

import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Beaker } from 'lucide-react';
import { format } from 'date-fns';

// Tipos
type ExamResult = { name: string; value: string };
type Consultation = {
  id: string;
  created_at: string;
  lab_results: ExamResult[] | null;
};

interface LabEvolutionGraphProps {
  consultations: Consultation[];
}

export default function LabEvolutionGraph({ consultations }: LabEvolutionGraphProps) {
  const [selectedExam, setSelectedExam] = useState<string>('');

  // 1. Obtém uma lista única de todos os exames que este paciente já teve.
  const availableExams = useMemo(() => {
    const examNames = new Set<string>();
    consultations.forEach(c => {
      c.lab_results?.forEach(res => {
        // Adiciona apenas se o resultado puder ser convertido num número
        if (!isNaN(parseFloat(res.value.replace(',', '.')))) {
          examNames.add(res.name);
        }
      });
    });
    return Array.from(examNames).sort();
  }, [consultations]);

  // 2. Prepara os dados para o gráfico com base no exame selecionado.
  const chartData = useMemo(() => {
    if (!selectedExam) return [];

    return consultations
      .map(c => {
        const result = c.lab_results?.find(res => res.name === selectedExam);
        if (!result) return null;

        const numericValue = parseFloat(result.value.replace(',', '.'));
        if (isNaN(numericValue)) return null;

        return {
          date: format(new Date(c.created_at), 'dd/MM/yy'),
          value: numericValue,
        };
      })
      .filter((item): item is { date: string; value: number } => item !== null)
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  }, [consultations, selectedExam]);
  
  // Seleciona o primeiro exame da lista por defeito
  useEffect(() => {
    if (availableExams.length > 0 && !selectedExam) {
      setSelectedExam(availableExams[0]);
    }
  }, [availableExams, selectedExam]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Beaker className="h-6 w-6 text-light" />
          <h2 className="text-xl font-semibold">Evolução de Exames</h2>
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="w-full sm:w-auto rounded-md border-border bg-transparent py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light text-sm"
          disabled={availableExams.length === 0}
        >
          <option value="">{availableExams.length > 0 ? "Selecione um exame" : "Nenhum exame com dados numéricos"}</option>
          {availableExams.map(exam => (
            <option key={exam} value={exam}>{exam}</option>
          ))}
        </select>
      </div>
      <div className="flex-grow">
        {selectedExam && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value) => [value, selectedExam]}
              />
              <Line type="monotone" dataKey="value" name={selectedExam} stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-muted">
            <p>{selectedExam ? `Não há dados para "${selectedExam}" no período selecionado.` : 'Selecione um exame para visualizar a evolução.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
