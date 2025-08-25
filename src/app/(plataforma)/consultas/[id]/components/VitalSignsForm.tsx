'use client';

import { useMemo } from 'react';
import { HeartPulse } from 'lucide-react';

export default function VitalSignsForm({ vitals, setVitals, isFinalized }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVitals({ ...vitals, [e.target.name]: e.target.value });
  };

  // Calcula o IMC (Índice de Massa Corporal) automaticamente
  const bmi = useMemo(() => {
    const heightM = parseFloat(vitals.height_cm || '0') / 100;
    const weight = parseFloat(vitals.weight_kg || '0');
    if (heightM > 0 && weight > 0) {
      return (weight / (heightM * heightM)).toFixed(1);
    }
    return 'N/A';
  }, [vitals.height_cm, vitals.weight_kg]);

  const inputStyle = "w-full rounded-md border-border bg-gray-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light text-sm";

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <HeartPulse className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Sinais Vitais e Antropometria</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
        {/* Novos campos de Peso e Altura */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Peso (kg)</label>
          <input name="weight_kg" value={vitals.weight_kg || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="70" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Altura (cm)</label>
          <input name="height_cm" value={vitals.height_cm || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="175" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">IMC</label>
          <p className="py-2 px-3 text-sm font-semibold">{bmi}</p>
        </div>
        
        {/* Campos existentes */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">PA (mmHg)</label>
          <input name="blood_pressure" value={vitals.blood_pressure || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="120/80" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">FC (bpm)</label>
          <input name="heart_rate" value={vitals.heart_rate || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="75" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">FR (rpm)</label>
          <input name="respiratory_rate" value={vitals.respiratory_rate || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="16" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Temp (°C)</label>
          <input name="temperature" value={vitals.temperature || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="36.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">SatO₂ (%)</label>
          <input name="oxygen_saturation" value={vitals.oxygen_saturation || ''} onChange={handleChange} disabled={isFinalized} className={inputStyle} placeholder="98" />
        </div>
      </div>
    </div>
  );
}
