import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | Orquestra',
    default: 'Orquestra - A IA para a sua consulta médica',
  },
  description: "Orquestra é uma plataforma inteligente que transcreve, analisa e otimiza as suas consultas médicas, devolvendo o seu tempo para o que realmente importa: o paciente.",
  keywords: ['prontuário eletrônico', 'IA para médicos', 'transcrição médica', 'software médico', 'Orquestra'],
  // NOVO: Adiciona os ícones de forma explícita para garantir a compatibilidade
  icons: {
    icon: '/favicon.ico', // O ícone principal
    apple: '/apple-icon.png', // O ícone para dispositivos Apple
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
