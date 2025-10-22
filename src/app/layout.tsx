import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: {
    template: '%s | Omni Health',
    default: 'Omni Health',
  },
  description: "Omni é uma plataforma inteligente que transcreve, analisa e otimiza as suas consultas médicas, devolvendo o seu tempo para o que realmente importa: o paciente.",
  keywords: ['prontuário eletrônico', 'IA para médicos', 'transcrição médica', 'software médico', 'Omni'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon-192x192.png',
    apple: '/apple-icon.png',
  },
};

// ✅ Corrige zoom inicial no iOS e usa toda a área com notch
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
