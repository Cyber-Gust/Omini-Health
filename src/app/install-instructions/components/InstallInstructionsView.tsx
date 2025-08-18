'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Apple, Smartphone, Monitor } from 'lucide-react';

// Base de dados com as instruções para cada plataforma
const instructions = {
  iphone: {
    icon: Apple,
    steps: [
      { text: "Abra o Safari e navegue até a página de login da Orquestra.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+1" },
      { text: "Toque no ícone de Partilha na barra inferior.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+2" },
      { text: "Deslize para cima e selecione 'Adicionar ao Ecrã Principal'.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+3" },
      { text: "Confirme o nome e toque em 'Adicionar'. O ícone da Orquestra aparecerá no seu ecrã.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+4" },
    ]
  },
  android: {
    icon: Smartphone,
    steps: [
      { text: "Abra o Chrome e navegue até a página de login da Orquestra.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+1" },
      { text: "Toque no menu de três pontos no canto superior direito.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+2" },
      { text: "Selecione a opção 'Instalar aplicação' ou 'Adicionar ao ecrã principal'.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+3" },
      { text: "Siga as instruções para confirmar. O ícone da Orquestra aparecerá no seu ecrã.", image: "https://placehold.co/600x400/e2e8f0/334155?text=Passo+4" },
    ]
  },
  desktop: {
    icon: Monitor,
    steps: [
      { text: "Abra o Chrome ou Edge e navegue até a página de login da Orquestra.", image: "https://placehold.co/800x450/e2e8f0/334155?text=Passo+1" },
      { text: "Procure por um ícone de 'instalação' (geralmente um monitor com uma seta para baixo) no lado direito da barra de endereço.", image: "https://placehold.co/800x450/e2e8f0/334155?text=Passo+2" },
      { text: "Clique no ícone e confirme a instalação.", image: "https://placehold.co/800x450/e2e8f0/334155?text=Passo+3" },
      { text: "A Orquestra será instalada como uma aplicação, com um atalho na sua área de trabalho ou menu Iniciar.", image: "https://placehold.co/800x450/e2e8f0/334155?text=Passo+4" },
    ]
  }
};

type Platform = 'iphone' | 'android' | 'desktop';

export default function InstallInstructionsView() {
  const [platform, setPlatform] = useState<Platform>('iphone');
  const { icon: Icon, steps } = instructions[platform];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-border">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Instalar a Orquestra</h1>
        <p className="mt-2 text-muted max-w-2xl mx-auto">
          Siga o passo a passo abaixo para adicionar a Orquestra ao ecrã principal do seu dispositivo e ter acesso rápido sempre que precisar.
        </p>
      </div>

      {/* Seletor de Plataforma */}
      <div className="my-8 flex justify-center border-b border-border">
        {Object.keys(instructions).map((p) => {
          const plat = p as Platform;
          const { icon: PlatIcon } = instructions[plat];
          return (
            <button
              key={plat}
              onClick={() => setPlatform(plat)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors capitalize -mb-px ${
                platform === plat
                  ? 'border-b-2 border-light text-brand-dark'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <PlatIcon className="h-5 w-5" />
              {plat}
            </button>
          )
        })}
      </div>

      {/* Passo a Passo */}
      <div className="space-y-10">
        {steps.map((step, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className={index % 2 === 1 ? 'md:order-last' : ''}>
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                <Image
                  src={step.image}
                  alt={`Passo ${index + 1} da instalação`}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            </div>
            <div>
              <span className="inline-block bg-brand-light/30 text-brand-dark font-semibold px-3 py-1 rounded-full text-sm mb-2">
                Passo {index + 1}
              </span>
              <p className="text-lg text-foreground">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
