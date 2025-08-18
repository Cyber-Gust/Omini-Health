'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, User, Calendar, Hash } from 'lucide-react';
import PatientSearchModal from './PatientSearchModal'; // Importar o novo modal

// Tipos para os dados que o componente recebe
type Consultation = {
  id: string;
  created_at: string;
  status: string | null;
  patient_id: string;
};

type Patient = {
  id: string;
  full_name: string;
  created_at: string;
};

interface PatientAnalyticsProps {
  consultations: Consultation[];
  patients: Patient[];
}

export default function PatientAnalytics({ consultations, patients }: PatientAnalyticsProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar o modal

  const patientData = useMemo(() => {
    if (!selectedPatient) return null;

    const patientConsultations = consultations
      .filter(c => c.patient_id === selectedPatient.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const firstConsultation = patientConsultations[patientConsultations.length - 1];
    const lastConsultation = patientConsultations[0];

    return {
      totalConsultas: patientConsultations.length,
      primeiraConsulta: firstConsultation ? new Date(firstConsultation.created_at).toLocaleDateString('pt-BR') : 'N/A',
      ultimaConsulta: lastConsultation ? new Date(lastConsultation.created_at).toLocaleDateString('pt-BR') : 'N/A',
      consultations: patientConsultations,
    };
  }, [selectedPatient, consultations]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Análise por Paciente</h2>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
            >
                <Search className="h-4 w-4" />
                {selectedPatient ? 'Alterar Paciente' : 'Selecionar Paciente'}
            </button>
        </div>

        {selectedPatient && patientData ? (
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex justify-between items-start">
              <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedPatient.full_name}</h3>
                  <p className="text-sm text-muted">Primeira consulta em: {patientData.primeiraConsulta}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-gray-50 rounded-md flex items-center gap-3"><Hash className="h-5 w-5 text-light" /> <div><p className="text-sm text-muted">Total de Consultas</p><p className="font-bold">{patientData.totalConsultas}</p></div></div>
                <div className="p-4 bg-gray-50 rounded-md flex items-center gap-3"><Calendar className="h-5 w-5 text-light" /> <div><p className="text-sm text-muted">Última Consulta</p><p className="font-bold">{patientData.ultimaConsulta}</p></div></div>
            </div>

            <h4 className="font-semibold mt-6 mb-2">Histórico de Consultas</h4>
            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
              <ul className="divide-y divide-border">
                  {patientData.consultations.map(c => (
                      <li key={c.id} className="p-3 hover:bg-gray-50">
                          <Link href={`/consultas/${c.id}`} className="flex justify-between items-center">
                              <span className="text-sm font-medium">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.status === 'concluída' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status || 'pendente'}</span>
                          </Link>
                      </li>
                  ))}
              </ul>
            </div>
          </div>
        ) : (
            <div className="mt-6 border-t border-border pt-6 text-center">
                <User className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-muted">Selecione um paciente para ver os seus detalhes.</p>
            </div>
        )}
      </div>

      <PatientSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPatientSelect={(patient) => setSelectedPatient(patient)}
        patients={patients}
      />
    </>
  );
}
