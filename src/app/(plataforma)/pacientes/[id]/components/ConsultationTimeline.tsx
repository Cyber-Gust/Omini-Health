'use client';

import Link from 'next/link';
import { Stethoscope, CheckCircle, Hourglass } from 'lucide-react';

// Tipo para os dados da consulta
type Consultation = {
  id: string;
  created_at: string;
  status: string | null;
};

export default function ConsultationTimeline({ consultations }: { consultations: Consultation[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
      <h2 className="text-xl font-semibold mb-4">Histórico de Consultas</h2>
      <div className="relative pl-4 border-l-2 border-border">
        {consultations.length > 0 ? (
          consultations.map((consultation, index) => (
            <div key={consultation.id} className="mb-6">
              <div className="absolute -left-[11px] top-1 h-5 w-5 bg-white rounded-full border-2 border-border flex items-center justify-center">
                {consultation.status === 'concluída' ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Hourglass className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <div className="ml-4">
                <p className="font-semibold text-foreground">
                  {new Date(consultation.created_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-muted mb-2">
                  Status: {consultation.status || 'Pendente'}
                </p>
                <Link href={`/consultas/${consultation.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-light hover:text-brand-dark transition-colors">
                  <Stethoscope size={14} />
                  Ver Detalhes da Consulta
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted ml-4">Nenhuma consulta encontrada para este paciente.</p>
        )}
      </div>
    </div>
  );
}
