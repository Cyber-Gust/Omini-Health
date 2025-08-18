import type { Metadata } from 'next';
import TipsView from './components/TipsView';

export const metadata: Metadata = {
  title: 'Central de Dicas',
};

export default function DicasPage() {
  return (
    <TipsView />
  );
}
