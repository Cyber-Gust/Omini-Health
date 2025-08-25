'use client';

import { User, History, Siren, HeartPulse, Edit } from 'lucide-react';

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Mapeamento para formatar os nomes das colunas
const vitalsLabels: { [key: string]: string } = {
  weight_kg: 'Peso (kg)', height_cm: 'Altura (cm)', blood_pressure: 'PA (mmHg)',
  heart_rate: 'FC (bpm)', respiratory_rate: 'FR (rpm)', temperature: 'Temp (°C)',
  oxygen_saturation: 'SatO₂ (%)',
};

export default function PatientSummary({ patient, lastVitals, onEditClick }: any) {
  const age = calculateAge(patient?.birth_date);

  const DataField = ({ label, value, icon: Icon, onEdit }: any) => (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2 text-muted text-sm font-semibold"><Icon size={14} /> {label}</div>
        {onEdit && <button onClick={onEdit} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Edit size={12} /> Editar</button>}
      </div>
      <div className="text-sm bg-gray-50 p-2 rounded-md min-h-[38px] whitespace-pre-wrap font-sans">
        {value || 'N/A'}
      </div>
    </div>
  );

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-light" />
        <div>
          <h2 className="text-xl font-semibold">{patient?.full_name || 'Paciente'}</h2>
          {age && <p className="text-sm text-muted">{age} anos</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataField label="Doenças Pré-existentes" value={patient?.medical_history?.map((d: any) => `${d.code} - ${d.description}`).join('\n') || 'Nenhuma'} icon={History} onEdit={() => onEditClick('medical_history')} />
        <DataField label="Alergias" value={patient?.allergies || 'Nenhuma'} icon={Siren} onEdit={() => onEditClick('allergies')} />
        <DataField label="Medicação Contínua" value={patient?.medications || 'Nenhuma'} icon={History} onEdit={() => onEditClick('medications')} />
      </div>
      <div>
        <div className="flex items-center gap-2 text-muted text-sm font-semibold mb-2"><HeartPulse size={14} /> Sinais Vitais (Última Consulta)</div>
        <div className="text-xs text-muted bg-gray-50 p-2 rounded-md">
          {lastVitals ? Object.entries(lastVitals).map(([key, value]) => `${vitalsLabels[key] || key}: ${value}`).join(' | ') : 'Sem registo anterior.'}
        </div>
      </div>
    </div>
  );
}
