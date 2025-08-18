'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ActivityChartProps {
  data: {
    date: string;
    consultas: number;
    novosPacientes: number;
  }[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Volume de Atividade</h2>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 0, left: -30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="consultas" name="Consultas" stroke="#14b8a6" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="novosPacientes" name="Novos Pacientes" stroke="#8b5cf6" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
