'use client';

import { useState, useEffect } from 'react'; // Importar os hooks
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
  const supabase = createClientComponentClient();
  const [redirectUrl, setRedirectUrl] = useState('');

  // CORREÇÃO: Obtém o URL de redirecionamento apenas no lado do cliente (navegador)
  useEffect(() => {
    // Este código só corre no navegador, onde 'window.location' existe
    setRedirectUrl(`${window.location.origin}/auth/callback`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-purple-500 p-3 rounded-full mb-4">
                <UserPlus className="text-white h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-white">Crie a sua conta Aura Med</h1>
            <p className="text-slate-400 mt-2">Comece hoje a otimizar as suas consultas.</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-8 shadow-2xl backdrop-blur-lg border border-slate-700">
            {/* Garante que o componente só renderiza quando o URL está pronto */}
            {redirectUrl && (
                <Auth
                    supabaseClient={supabase}
                    appearance={{ 
                        theme: ThemeSupa,
                         variables: {
                            default: {
                                colors: {
                                    brand: '#8b5cf6',
                                    brandAccent: '#7c3aed',
                                }
                            }
                        }
                    }}
                    theme="dark"
                    providers={[]}
                    view="sign_up"
                    redirectTo={redirectUrl} // Usa o URL do estado
                    showLinks={false}
                />
            )}
        </div>
        <p className="text-center text-sm text-slate-400 mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:underline">
                Faça login
            </Link>
        </p>
      </div>
    </div>
  );
}
