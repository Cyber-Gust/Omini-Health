import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se não houver sessão, redireciona para a página de login.
  if (!session) {
    redirect('/login');
  }

  // Se houver sessão, redireciona para a nova página do dashboard.
  redirect('/dashboard');
}