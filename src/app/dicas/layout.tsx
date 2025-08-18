import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Botão para voltar à plataforma principal */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Plataforma
            </Link>
          </div>
        </div>
      </header>
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2">
          {children}
        </div>
      </main>
    </div>
  );
}
