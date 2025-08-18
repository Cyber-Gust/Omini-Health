import type { Metadata } from 'next';
import InstallInstructionsView from './components/InstallInstructionsView';

export const metadata: Metadata = {
  title: 'Instruções de Instalação',
  description: 'Aprenda a adicionar a Orquestra ao ecrã principal do seu dispositivo para um acesso rápido e fácil.',
};

export default function InstallInstructionsPage() {
  return <InstallInstructionsView />;
}
