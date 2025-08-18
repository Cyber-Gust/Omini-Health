'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import LoadingScreen from './components/LoadingScreen'; // Importar a nova tela

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url') // Busca o ID necessário para o Header
          .eq('id', user.id)
          .single();
        setProfile(userProfile);
      }
      // Um pequeno atraso para garantir que a animação seja visível
      setTimeout(() => setLoading(false), 500); 
    };
    getUserData();
  }, [supabase]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Exibe a tela de carregamento enquanto os dados são buscados
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header toggleSidebar={toggleSidebar} profile={profile} />
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} />
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 pb-20 md:pb-8 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
