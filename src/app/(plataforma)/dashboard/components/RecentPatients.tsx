import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';

// Tipo para os dados do paciente que o componente recebe
type Patient = {
  id: string;
  full_name: string;
  created_at: string;
};

interface RecentPatientsProps {
  patients: Patient[];
}

export default function RecentPatients({ patients }: RecentPatientsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-light" />
        <h2 className="text-xl font-semibold">Pacientes Recentes</h2>
      </div>
      <div className="flex-grow overflow-y-auto">
        {patients.length > 0 ? (
          <ul className="divide-y divide-border">
            {patients.map((patient) => (
              <li key={patient.id} className="py-3">
                <p className="font-medium text-foreground">{patient.full_name}</p>
                <p className="text-sm text-muted">Adicionado em: {new Date(patient.created_at).toLocaleDateString('pt-BR')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">Nenhum paciente encontrado</h3>
            <p className="mt-1 text-sm text-muted">Crie uma nova consulta para adicionar um paciente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
