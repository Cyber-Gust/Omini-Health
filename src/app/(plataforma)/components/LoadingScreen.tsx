import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[10000] flex h-screen items-center justify-center bg-gradient-to-r from-light to-brand-dark">
      {/* A animação de rotação foi ajustada para ser mais lenta e suave */}
      <div className="animate-spin" style={{ animationDuration: '2.5s' }}>
        <Image
          src="/logo-loading.png" // O seu logótipo branco
          alt="Logótipo da Orquestra a carregar"
          width={500}
          height={500}
          className="h-16 w-auto" // Tamanho do logótipo na tela
          priority
        />
      </div>
    </div>
  );
}
