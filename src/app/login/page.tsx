'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importar o router
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner'; // Importar o toast para notificações

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  // CORREÇÃO: Escutar o evento de login bem-sucedido
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        toast.success('Login bem-sucedido! A redirecionar...');
        // Força o redirecionamento para o dashboard
        router.push('/dashboard');
        // Atualiza a página para garantir que o layout do servidor seja recarregado
        router.refresh();
      }
    });

    // Limpa a subscrição quando o componente é desmontado
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-blue-500 p-3 rounded-full mb-4">
                <Sparkles className="text-white h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-white">Bem-vindo(a) de volta!</h1>
            <p className="text-slate-400 mt-2">Faça login para aceder ao seu painel.</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-8 shadow-2xl backdrop-blur-lg border border-slate-700">
            <Auth
                supabaseClient={supabase}
                appearance={{ 
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#2563eb',
                                brandAccent: '#1d4ed8',
                            }
                        }
                    }
                }}
                theme="dark"
                providers={[]}
                view="sign_in"
                // O redirectTo é mais para links de e-mail, mas mantemo-lo por segurança
                redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
                showLinks={false}
            />
        </div>
        <p className="text-center text-sm text-slate-400 mt-6">
            Não tem uma conta?{' '}
            <Link href="/signup" className="font-medium text-blue-400 hover:underline">
                Registe-se
            </Link>
        </p>
      </div>
    </div>
  );
}
