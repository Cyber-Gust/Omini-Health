import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // Adiciona metadados específicos para a PWA
  manifest: "/manifest.json",
  
  title: {
    template: '%s | Orquestra',
    default: 'Orquestra',
  },
  description: "Orquestra é uma plataforma inteligente que transcreve, analisa e otimiza as suas consultas médicas, devolvendo o seu tempo para o que realmente importa: o paciente.",
  keywords: ['prontuário eletrônico', 'IA para médicos', 'transcrição médica', 'software médico', 'Orquestra'],
  
  // Define os ícones para todas as plataformas
  icons: {
    icon: '/favicon.ico', // Ícone para a aba do navegador
    shortcut: '/icon-192x192.png',
    apple: '/apple-icon.png', // Ícone para dispositivos Apple
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