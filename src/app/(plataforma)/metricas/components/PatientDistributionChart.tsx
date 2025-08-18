'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users } from 'lucide-react';

interface PatientDistributionChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#409FC2', '#8B63C9']; // Verde principal e verde claro

export default function PatientDistributionChart({ data }: PatientDistributionChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-[400px] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Distribuição de Pacientes</h2>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              // CORREÇÃO: Adicionada uma verificação para garantir que 'percent' não é indefinido.
              label={({ name, percent }) => {
                if (percent === undefined) return name;
                return `${name} ${(percent * 100).toFixed(0)}%`;
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
