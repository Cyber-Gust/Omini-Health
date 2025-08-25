'use client';

import { User, Cake, Siren, History, Pill } from 'lucide-react'; // Importar o ícone Pill

// Tipo para os dados do paciente
type Patient = {
  id: string;
  full_name: string;
  birth_date: string | null;
  allergies: string | null;
  medical_history: { code: string; description: string }[] | null;
  medications: string | null; // Adicionado o campo de medicação
};

// Função para calcular a idade
const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'Idade não informada';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return `${age} anos`;
};

export default function PatientDetailHeader({ patient }: { patient: Patient }) {
  const age = calculateAge(patient.birth_date);
  const mainChronicDiseases = patient.medical_history?.slice(0, 2).map(d => d.description).join(', ') || null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <User className="h-8 w-8 text-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{patient.full_name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted mt-1">
            <div className="flex items-center gap-1.5">
              <Cake size={14} />
              <span>{age}</span>
            </div>
          </div>
        </div>
      </div>
      {(patient.allergies || mainChronicDiseases || patient.medications) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {patient.allergies && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
              <Siren size={12} />
              <strong>Alergias:</strong> {patient.allergies}
            </div>
          )}
          {mainChronicDiseases && (
            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full">
              <History size={12} />
              <strong>Doenças Crónicas:</strong> {mainChronicDiseases}
            </div>
          )}
          {/* NOVO: Tag para a Medicação Contínua */}
          {patient.medications && (
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              <Pill size={12} />
              <strong>Medicação Contínua:</strong> {patient.medications}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
