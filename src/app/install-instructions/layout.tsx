import Link from 'next/link';
import Image from 'next/image';
import { BotMessageSquare } from 'lucide-react';

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-orquestra.png" // Substitua pelo nome do seu ficheiro
                alt="Logótipo da Orquestra"
                width={1766}  // Coloque a largura real da sua imagem
                height={579} // Coloque a altura real da sua imagem
                className="h-14 w-auto" // Ajusta a altura e a largura automaticamente
                priority // Ajuda a carregar o logótipo mais rápido
              />
            </Link>
          </div>
        </div>
      </header>
      <main className="py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
