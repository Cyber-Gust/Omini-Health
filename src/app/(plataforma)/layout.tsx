'use client';

import { useState } from 'react';
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} />
        {/* CORREÇÃO: Adicionado espaçamento inferior (pb-20) para a barra de navegação mobile */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 pb-20 md:pb-8 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
