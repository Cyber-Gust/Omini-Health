'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, Menu, Lightbulb, X, Settings } from 'lucide-react';

// Define o tipo para os dados do perfil que o Header recebe
type Profile = {
  id: string; // Adicionado o ID para a lógica do pop-up
  full_name: string | null;
  avatar_url: string | null;
} | null;

interface HeaderProps {
  toggleSidebar: () => void;
  profile: Profile;
}

export default function Header({ toggleSidebar, profile }: HeaderProps) {
  const [showTipsPopup, setShowTipsPopup] = useState(false);

  // Lógica do pop-up atualizada para usar o ID do utilizador
  useEffect(() => {
    if (!profile?.id) return;

    const dismissed = localStorage.getItem(`orquestra_tips_dismissed_${profile.id}`);
    if (!dismissed) {
      setShowTipsPopup(true);
    }
  }, [profile]);

  const handleClosePopup = () => {
    setShowTipsPopup(false);
  };

  const handlePermanentlyDismiss = () => {
    if (profile?.id) {
      localStorage.setItem(`orquestra_tips_dismissed_${profile.id}`, 'true');
    }
    setShowTipsPopup(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] flex h-16 items-center justify-between bg-light text-white shadow-md px-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 hidden md:block rounded-full p-2 transition-colors hover:bg-brand-dark/50"
          aria-label="Abrir/Fechar menu"
          type="button"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <Image
            src="/logo-orquestra_B.png"
            alt="Logótipo da Orquestra"
            width={1766}
            height={579}
            className="h-12 w-auto"
            priority
          />    
        </div>
      </div>

      <div className="flex items-center gap-x-2 sm:gap-x-4">
        {/* Ícone e Pop-up da Central de Dicas */}
        <div className="relative">
          <Link
            href="/configuracoes"
            aria-label="Abrir configurações"
            className="ml-2 inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-brand-dark/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link
            href="/dicas"
            onClick={handleClosePopup}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-brand-dark/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Central de Dicas"
          >
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </Link>

          {showTipsPopup && (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-lg bg-white p-4 text-gray-800 shadow-xl z-[10000]"
              role="dialog"
              aria-label="Central de Dicas"
            >
              <button
                onClick={handleClosePopup}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-gray-200"
                aria-label="Fechar pop-up"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                <h3 className="font-bold">Central de Dicas</h3>
              </div>
              <p className="mb-3 text-sm text-gray-600">
                Novo! Clique aqui para ver sugestões para aprimorar as suas consultas.
              </p>

              <button
                onClick={handlePermanentlyDismiss}
                className="mt-2 w-full rounded-md bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Não mostrar novamente
              </button>
            </div>
          )}
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-full p-2 transition-colors hover:bg-brand-dark/50"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
