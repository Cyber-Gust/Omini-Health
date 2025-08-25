'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, BarChart3, Settings, Calendar, Users } from 'lucide-react';

// Itens para a barra lateral do desktop
const desktopNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/consultas', label: 'Consultas', icon: Stethoscope },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/metricas', label: 'Métricas', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Itens para a barra inferior do mobile
const mobileNavItems = {
  left: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
  ],
  center: { href: '/consultas', label: 'Consultas', icon: Stethoscope },
  right: [
    { href: '/pacientes', label: 'Pacientes', icon: Users },
    { href: '/metricas', label: 'Métricas', icon: BarChart3 },
  ],
};

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {/* Barra Lateral para Desktop (oculta no mobile) */}
      <aside className={`fixed top-16 left-0 z-10 hidden h-full flex-col border-r bg-background border-border md:flex transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
        <nav className="flex flex-col flex-grow p-4">
          <ul className="flex flex-1 flex-col gap-y-2">
            {desktopNavItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-brand-light/30 text-brand-dark'
                      : 'text-muted hover:bg-gray-100'
                  } ${!isOpen && 'justify-center'}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Barra de Navegação Inferior para Mobile (oculta no desktop) */}
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-border md:hidden">
        <div className="grid h-full grid-cols-5 max-w-lg mx-auto">
          {/* Itens da Esquerda */}
          {mobileNavItems.left.map(item => (
            <Link key={item.href} href={item.href} className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50">
              <item.icon className={`w-6 h-6 mb-1 ${pathname === item.href ? 'text-light' : 'text-muted'}`} />
              <span className="sr-only">{item.label}</span>
            </Link>
          ))}

          {/* Botão Central em Destaque */}
          <div className="flex items-center justify-center">
            <Link href={mobileNavItems.center.href} className="-mt-8 flex items-center justify-center h-16 w-16 rounded-full bg-light text-white shadow-lg hover:bg-brand-dark transition-transform hover:scale-110">
              <mobileNavItems.center.icon className="w-8 h-8" />
              <span className="sr-only">{mobileNavItems.center.label}</span>
            </Link>
          </div>

          {/* Itens da Direita */}
          {mobileNavItems.right.map(item => (
            <Link key={item.href} href={item.href} className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50">
              <item.icon className={`w-6 h-6 mb-1 ${pathname === item.href ? 'text-light' : 'text-muted'}`} />
              <span className="sr-only">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
