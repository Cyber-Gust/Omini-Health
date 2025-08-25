'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { HeartPulse } from 'lucide-react';
import { format } from 'date-fns';

// Tipos
type Vitals = { [key: string]: string };
type Consultation = {
  id: string;
  created_at: string;
  vitals_and_anthropometry: Vitals | null;
};

interface VitalSignsGraphProps {
  consultations: Consultation[];
}

export default function VitalSignsGraph({ consultations }: VitalSignsGraphProps) {
  // O processamento de dados agora extrai os sinais vitais que você pediu
  const chartData = consultations
    .map(c => {
      if (!c.vitals_and_anthropometry) return null;
      
      const vitals = c.vitals_and_anthropometry;
      
      return {
        date: format(new Date(c.created_at), 'dd/MM/yy'),
        peso: parseFloat(vitals.weight_kg?.replace(',', '.')) || null,
        frequenciaCardiaca: parseInt(vitals.heart_rate) || null,
        frequenciaRespiratoria: parseInt(vitals.respiratory_rate) || null,
        saturacao: parseInt(vitals.oxygen_saturation) || null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <HeartPulse className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Evolução de Sinais Vitais</h2>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            {/* Eixo Y esquerdo para Peso */}
            <YAxis yAxisId="left" stroke="#8b5cf6" tick={{ fontSize: 12 }} />
            {/* Eixo Y direito para os outros sinais vitais */}
            <YAxis yAxisId="right" orientation="right" stroke="#14b8a6" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {/* Linhas do gráfico atualizadas */}
            <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8b5cf6" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="frequenciaCardiaca" name="FC (bpm)" stroke="#ef4444" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="frequenciaRespiratoria" name="FR (rpm)" stroke="#3b82f6" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="saturacao" name="SatO₂ (%)" stroke="#f97316" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
