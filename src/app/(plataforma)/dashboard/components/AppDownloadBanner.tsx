import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownToLine } from 'lucide-react';

export default function AppDownloadBanner() {
  return (
    <div className="relative w-full h-56 md:h-64 rounded-lg shadow-md overflow-hidden">
      {/* Imagem para Desktop (oculta no mobile) */}
      <div className="hidden md:block">
        <Image
          src="/banner-desktop.png"
          alt="Banner para baixar o aplicativo da Orquestra no desktop"
          layout="fill"
          objectFit="cover"
          className="z-0"
        />
      </div>
      {/* Imagem para Mobile (oculta no desktop) */}
      <div className="block md:hidden">
        <Image
          src="/banner-mobile.png"
          alt="Banner para baixar o aplicativo da Orquestra no mobile"
          layout="fill"
          objectFit="cover"
          className="z-0"
        />
      </div>   
      
      {/* Botão posicionado no lado direito */}
      <div className="absolute inset-0 flex items-center justify-end p-6 md:p-12">
        <div className="flex flex-col md:mr-32 items-end justify-center text-center max-w-xs">
          <h3 className="text-2xl hidden md:block font-bold text-white drop-shadow-md">
            Tenha nossa plataforma<br />na palma da mão!
          </h3>
          <Link
            href="/install-instructions" // Esta será a página externa com as instruções
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-24 mr- md:mt-4 md:mr-9 inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-base font-semibold text-brand-dark shadow-lg hover:bg-gray-100 transition-transform hover:scale-105"
          >
            <ArrowDownToLine className="mr-2 h-5 w-5" />
            <span>Baixe o nosso App</span>
          </Link>
        </div>
      </div>
    </div>
  );
}