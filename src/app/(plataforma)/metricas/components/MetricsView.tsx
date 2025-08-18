'use client';

import { useState, useMemo } from 'react';
import { subDays, startOfMonth, endOfMonth, format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { BarChart, TrendingUp, Users, CheckCircle } from 'lucide-react';
import StatsCard from '../../dashboard/components/StatsCard';
import ActivityChart from './ActivityChart'; // Importar o novo gráfico
import PatientDistributionChart from './PatientDistributionChart'; // Importar o novo gráfico
import PatientAnalytics from './PatientAnalytics';

// Tipos para os dados que recebemos
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

interface MetricsViewProps {
  initialConsultations: Consultation[];
  initialPatients: Patient[];
}

export default function MetricsView({ initialConsultations, initialPatients }: MetricsViewProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));

  const filteredData = useMemo(() => {
    const start = startDate.setHours(0, 0, 0, 0);
    const end = endDate.setHours(23, 59, 59, 999);

    const consultations = initialConsultations.filter(c => {
      const createdAt = new Date(c.created_at).getTime();
      return createdAt >= start && createdAt <= end;
    });

    const patients = initialPatients.filter(p => {
        const createdAt = new Date(p.created_at).getTime();
        return createdAt >= start && createdAt <= end;
    });

    return { consultations, patients };
  }, [initialConsultations, initialPatients, startDate, endDate]);

  const { kpis, activityChartData, patientDistributionData } = useMemo(() => {
    const { consultations, patients } = filteredData;
    
    // Calcula KPIs
    const totalConsultas = consultations.length;
    const numDays = differenceInDays(endDate, startDate) + 1;
    const mediaDiaria = totalConsultas > 0 ? (totalConsultas / numDays).toFixed(1) : 0;
    const pacientesAtendidos = new Set(consultations.map(c => c.patient_id)).size;
    const consultasFinalizadas = consultations.filter(c => c.status === 'concluída').length;
    const percFinalizadas = totalConsultas > 0 ? ((consultasFinalizadas / totalConsultas) * 100).toFixed(0) : 0;

    // Prepara dados para o gráfico de atividade
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const activityData = dateInterval.map(day => {
        const formattedDate = format(day, 'dd/MM');
        const dailyConsultations = consultations.filter(c => format(new Date(c.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length;
        const dailyNewPatients = patients.filter(p => format(new Date(p.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length;
        return { date: formattedDate, consultas: dailyConsultations, novosPacientes: dailyNewPatients };
    });

    // Prepara dados para o gráfico de pizza
    const newPatientIds = new Set(patients.map(p => p.id));
    let newPatientConsultations = 0;
    consultations.forEach(c => {
        if (newPatientIds.has(c.patient_id)) {
            newPatientConsultations++;
        }
    });
    const recurringPatientConsultations = totalConsultas - newPatientConsultations;
    const distributionData = [
        { name: 'Recorrentes', value: recurringPatientConsultations },
        { name: 'Novos', value: newPatientConsultations },
    ];

    return {
      kpis: {
        totalConsultas,
        mediaDiaria,
        pacientesAtendidos,
        percFinalizadas: `${percFinalizadas}%`,
      },
      activityChartData: activityData,
      patientDistributionData: distributionData,
    };
  }, [filteredData, startDate, endDate]);

  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6">
      {/* Secção de Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-border flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <input type="date" value={format(startDate, 'yyyy-MM-dd')} onChange={(e) => setStartDate(new Date(e.target.value))} className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-light text-muted" />
            <span className="text-muted">até</span>
            <input type="date" value={format(endDate, 'yyyy-MM-dd')} onChange={(e) => setEndDate(new Date(e.target.value))} className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-light text-muted" />
        </div>
        <div className="flex gap-2">
            <button onClick={() => setDateRange(subDays(today, 6), today)} className="px-3 py-1 text-sm rounded-md hover:bg-gray-100 border border-border">Últimos 7 dias</button>
            <button onClick={() => setDateRange(startOfMonth(today), endOfMonth(today))} className="px-3 py-1 text-sm rounded-md hover:bg-gray-100 border border-border">Este Mês</button>
        </div>
      </div>

      {/* Secção de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Consultas" value={kpis.totalConsultas} icon={BarChart} />
        <StatsCard title="Média Diária" value={kpis.mediaDiaria} icon={TrendingUp} />
        <StatsCard title="Pacientes Atendidos" value={kpis.pacientesAtendidos} icon={Users} />
        <StatsCard title="Consultas Finalizadas" value={kpis.percFinalizadas} icon={CheckCircle} />
      </div>

      {/* NOVO: Secção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart data={activityChartData} />
        <PatientDistributionChart data={patientDistributionData} />
      </div>
      <div className="mt-6">
        <PatientAnalytics consultations={initialConsultations} patients={initialPatients} />
      </div>
    </div>
  );
}
