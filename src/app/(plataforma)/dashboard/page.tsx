'use client'; // A página agora é um Componente Cliente para gerir o estado do modal

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { Plus, Stethoscope, Users, CalendarDays } from 'lucide-react';
import StatsCard from './components/StatsCard';
import RecentPatients from './components/RecentPatients';
import ConsultationsChart from './components/ConsultationsChart';
import NewConsultationModal from '../consultas/components/NewConsultationModal';
import UpcomingAppointments from './components/UpcomingAppointments';
import AppDownloadBanner from './components/AppDownloadBanner';


// O metadata é removido porque não pode ser exportado de um Componente Cliente

export default function DashboardPage() {
  // Estado para controlar o modal de nova consulta
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para guardar os dados buscados da base de dados
  const [userName, setUserName] = useState('Médico(a)');
  const [stats, setStats] = useState({ consultasHoje: 0, consultasSemana: 0, novosPacientesMes: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

  // Busca todos os dados necessários quando o componente é montado
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Funções para buscar os dados
      const getProfile = supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      
      const getDates = () => {
          const now = new Date();
          const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          return { todayStart, weekStart: weekStart.toISOString(), monthStart };
      };
      const { todayStart, weekStart, monthStart } = getDates();

      const getConsultasHoje = supabase.from('consultas').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);
      const getConsultasSemana = supabase.from('consultas').select('*', { count: 'exact', head: true }).gte('created_at', weekStart);
      const getNovosPacientes = supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);
      const getRecentPatients = supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(5);
      const getWeekConsultations = supabase.from('consultas').select('created_at').gte('created_at', weekStart);

      // Executa todas as buscas em paralelo
      const getUpcomingAppointments = supabase
        .from('appointments')
        .select(`id, appointment_time, patients ( full_name )`)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(5);
      const [
          profileRes,
          consultasHojeRes,
          consultasSemanaRes,
          novosPacientesRes,
          recentPatientsRes,
          weekConsultationsRes,
          upcomingAppointmentsRes
      ] = await Promise.all([
          getProfile,
          getConsultasHoje,
          getConsultasSemana,
          getNovosPacientes,
          getRecentPatients,
          getWeekConsultations,
          getUpcomingAppointments
      ]);

      setUserName(profileRes.data?.full_name || 'Médico(a)');
      setStats({
          consultasHoje: consultasHojeRes.count ?? 0,
          consultasSemana: consultasSemanaRes.count ?? 0,
          novosPacientesMes: novosPacientesRes.count ?? 0,
      });
      setRecentPatients(recentPatientsRes.data || []);
      setUpcomingAppointments(upcomingAppointmentsRes.data || []);

      const processChartData = (consultations: any[]) => {
          const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const data = daysOfWeek.map(day => ({ name: day, consultas: 0 }));
          const today = new Date();
          const weekStartDate = new Date(today);
          weekStartDate.setDate(today.getDate() - 6);
          weekStartDate.setHours(0, 0, 0, 0);
          consultations.forEach(c => {
              const date = new Date(c.created_at);
              if (date >= weekStartDate) {
                  const dayIndex = date.getDay();
                  data[dayIndex].consultas += 1;
              }
          });
          const orderedData = [];
          for (let i = 0; i < 7; i++) {
              const dayIndex = (today.getDay() - 6 + i + 7) % 7;
              orderedData.push(data[dayIndex]);
          }
          return orderedData;
      };
      setChartData(processChartData(weekConsultationsRes.data || []));
      
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  return (
    <div className="mt-16 space-y-8">
      {/* NOVO: Secção do Banner no topo */}
      {/* CORREÇÃO: Altura do banner aumentada */}
      <div className="relative w-full h-64 md:h-80 rounded-lg shadow-md overflow-hidden">
        <Image
          src="/banner-dashboard.png" 
          alt="Banner informativo da Orquestra"
          layout="fill"
          objectFit="cover"
          className="z-0"
          priority // Prioriza o carregamento da imagem principal
        />
        {/* Máscara para escurecer a imagem e destacar o texto */}
        <div className="absolute inset-0 bg-black/50 z-10" />
        
        {/* Conteúdo de texto centralizado sobre a imagem */}
        <div className="relative z-20 flex mt-4 flex-col items-center justify-center h-full text-white text-center p-4">
          <h1 className="text-3xl md:text-4xl font-bold drop-shadow-md">Olá, Dr(a). {userName}!</h1>
          <p className="text-lg mt-2 drop-shadow-md">
            Pronto(a) para começar?
          </p>
          {/* CORREÇÃO: Tamanho do botão aumentado */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center justify-center rounded-md px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-brand-dark transition-transform hover:scale-105"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>Nova Consulta</span>
          </button>
        </div>
      </div>

      {/* Secção de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Consultas Hoje" value={stats.consultasHoje} icon={Stethoscope} />
        <StatsCard title="Consultas na Semana" value={stats.consultasSemana} icon={CalendarDays} />
        <StatsCard title="Novos Pacientes (Mês)" value={stats.novosPacientesMes} icon={Users} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentPatients patients={recentPatients} />
        <ConsultationsChart data={chartData} />
      </div>

      <div>
        <UpcomingAppointments appointments={upcomingAppointments} />
      </div>

      <div>
        <AppDownloadBanner />
      </div>

      <NewConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
