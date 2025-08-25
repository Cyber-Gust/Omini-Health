'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ConsultationsChartProps {
  data: {
    name: string;
    consultas: number;
  }[];
}

export default function ConsultationsChart({ data }: ConsultationsChartProps) {
  return (
    // CORREÇÃO: Adicionada uma altura mínima para garantir a visibilidade em ecrãs pequenos (mobile)
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-[400px] flex flex-col outline-none">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Consultas na Última Semana</h2>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, left: -40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'rgba(96, 190, 220, 0.1)' }}
              // CORREÇÃO: Estilo do tooltip atualizado para ter bordas claras e arredondadas
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              }}
              // NOVO: Remove a borda preta (outline) que aparece ao clicar
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey="consultas" fill="#20B8C9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
