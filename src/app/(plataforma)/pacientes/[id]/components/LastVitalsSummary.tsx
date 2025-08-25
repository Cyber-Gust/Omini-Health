'use client';

import { HeartPulse } from 'lucide-react';

// Mapeamento para traduzir as chaves da base de dados para nomes amigáveis
const vitalsLabels: { [key: string]: string } = {
  weight_kg: 'Peso (kg)',
  height_cm: 'Altura (cm)',
  blood_pressure: 'PA (mmHg)',
  heart_rate: 'FC (bpm)',
  respiratory_rate: 'FR (rpm)',
  temperature: 'Temp (°C)',
  oxygen_saturation: 'SatO₂ (%)',
};

export default function LastVitalsSummary({ lastVitals }: { lastVitals: any | null }) {
  // Se não houver dados da última consulta, o componente não é renderizado
  if (!lastVitals || Object.keys(lastVitals).length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-4">
        <HeartPulse className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Resumo da Última Consulta</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(lastVitals).map(([key, value]) => (
          <div key={key} className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-muted">{vitalsLabels[key] || key}</p>
            <p className="font-semibold text-foreground">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
