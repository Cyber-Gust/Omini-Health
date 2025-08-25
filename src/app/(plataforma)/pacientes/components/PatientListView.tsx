'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, UserPlus } from 'lucide-react';

// Tipo para os dados do paciente
type Patient = {
  id: string;
  full_name: string;
  created_at: string;
  birth_date: string | null;
};

interface PatientListViewProps {
  patients: Patient[];
}

// Função para calcular a idade
const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return `${age} anos`;
};

export default function PatientListView({ patients }: PatientListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    return patients.filter(p =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, patients]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Pesquisar paciente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm rounded-md border-border bg-transparent py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto border-t border-border">
        <ul className="divide-y divide-border">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(patient => (
              <li key={patient.id}>
                <Link href={`/pacientes/${patient.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{patient.full_name}</p>
                      <p className="text-sm text-muted">
                        Idade: {calculateAge(patient.birth_date)}
                      </p>
                    </div>
                    <span className="text-xs text-muted">
                      Cadastrado em: {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </Link>
              </li>
            ))
          ) : (
            <div className="text-center py-10">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">Nenhum paciente encontrado</h3>
              <p className="mt-1 text-sm text-muted">Tente um termo de pesquisa diferente ou adicione um novo paciente através de uma consulta.</p>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
