'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Activity, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Escutar o evento de login bem-sucedido
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        toast.success('Login efetuado com sucesso!');
        router.push('/dashboard');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen w-full font-sans bg-background">
      {/* ==========================================
          LADO ESQUERDO: Formulário Clean
      =========================================== */}
      <div className="flex w-full flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:w-1/2 lg:px-20 xl:px-24 border-r border-border">
        <div className="mx-auto w-full max-w-sm">
          
          {/* --- LOGO OMNIHEALTH --- */}
          <div className="mb-4 justify-center flex items-center gap-3">
            {/* Container da Logo com as cores da marca */}
            <div >
              <Image
                src="/icon-512x512.png" // Sua logo na versão branca/transparente
                alt="OmniHealth Logo"
                width={48}
                height={48}
                className="text-white"
              />
            </div>
            <div>
              <span className="block text-2xl font-bold tracking-tight text-foreground">OmniHealth</span>
            </div>
          </div>

          {/* --- CABAÇALHO DO FORM --- */}
          <div className="mb-2">
            <p className="text-center text-muted">
              Gerencie seus pacientes e prontuários com o poder da IA.
            </p>
          </div>

          {/* --- COMPONENTE DE AUTH (SUPABASE) --- */}
          <div className="auth-wrapper">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#4F90A1',        // brand.dark (Para o botão ter contraste)
                      brandAccent: '#3b707f',  // Um tom mais escuro para o hover
                      inputBackground: 'white',
                      inputText: '#0f172a',    // foreground
                      inputBorder: '#e2e8f0',  // border
                      inputLabelText: '#64748b', // muted
                      inputPlaceholder: '#94a3b8',
                    },
                    radii: {
                      borderRadiusButton: '0.75rem',
                      inputBorderRadius: '0.75rem',
                    },
                    space: {
                      inputPadding: '1rem', 
                      buttonPadding: '1rem',
                    },
                  },
                },
                className: {
                  button: 'font-semibold shadow-md hover:shadow-lg transition-all duration-200',
                  input: 'focus:ring-2 focus:ring-brand-light focus:border-brand-light transition-all',
                  label: 'text-sm font-medium text-foreground mb-1.5',
                  // Isso ajuda a posicionar o ícone do olho corretamente se necessário
                  anchor: 'text-brand-dark hover:text-brand-light font-medium transition-colors',
                },
              }}
              theme="light" // IMPORTANTE: Light theme faz o ícone do olho ficar visível (dark/cinza)
              providers={[]} 
              view="sign_in"
              redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
              showLinks={false}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'E-mail',
                    password_label: 'Senha de acesso',
                    button_label: 'Entrar no sistema',
                    loading_button_label: 'Autenticando...',
                  },
                },
              }}
            />
          </div>

          {/* --- RODAPÉ DO FORM --- */}
          <p className="mt-8 text-center text-sm text-muted">
            Ainda não possui credenciais?{' '}
            <Link href="/signup" className="font-semibold text-brand-dark hover:text-brand-light hover:underline transition-colors">
              Fale com o suporte
            </Link>
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Imagem e Branding (Escondido em Mobile) */}
      <div className="hidden relative lg:flex lg:w-1/2 items-center justify-center bg-slate-900 overflow-hidden">
        {/* Imagem de Fundo */}
        <div className="absolute inset-0 z-0">
          {/* Usei uma imagem do Unsplash de tecnologia médica/laboratório */}
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop"
            alt="Medical Tech Background"
            className="h-full w-full object-cover opacity-40 mix-blend-overlay"
          />
          {/* Gradiente Overlay para garantir leitura do texto */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-light/90 to-slate-900/90 mix-blend-multiply" />
        </div>

        {/* Conteúdo sobre a imagem */}
        <div className="relative z-10 max-w-lg p-12 text-white">
          
          <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-sm">
            Revolucione o atendimento clínico com Inteligência Artificial.
          </h2>
          
          <p className="mb-8 text-lg text-blue-100/90 font-light leading-relaxed">
            Acesse prontuários, diagnósticos assistidos e gestão completa em uma única plataforma intuitiva e segura.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-brand-light" />
              <span className="text-sm font-medium text-white/90">Análise preditiva de diagnósticos</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-brand-light" />
              <span className="text-sm font-medium text-white/90">Segurança de dados ponta a ponta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}