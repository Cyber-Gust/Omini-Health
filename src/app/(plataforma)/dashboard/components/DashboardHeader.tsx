'use client';

import { useState } from 'react';
import { Plus, Stethoscope, Users, CalendarDays } from 'lucide-react';
import StatsCard from './StatsCard';
import NewConsultationModal from '../../consultas/components/NewConsultationModal';

interface DashboardHeaderProps {
  userName: string;
  stats: {
    consultasHoje: number;
    consultasSemana: number;
    novosPacientesMes: number;
  };
}

export default function DashboardHeader({ userName, stats }: DashboardHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, Dr(a). {userName}!</h1>
            <p className="text-muted mt-1">
              Bem-vindo(a) de volta. Aqui está um resumo da sua atividade.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 md:mt-0 inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Nova Consulta</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Consultas Hoje" value={stats.consultasHoje} icon={Stethoscope} />
          <StatsCard title="Consultas na Semana" value={stats.consultasSemana} icon={CalendarDays} />
          <StatsCard title="Novos Pacientes (Mês)" value={stats.novosPacientesMes} icon={Users} />
        </div>
      </div>
      <NewConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
