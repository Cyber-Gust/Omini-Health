// src/middleware.ts

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Cria uma resposta inicial para que possamos ler e escrever cookies
  const res = NextResponse.next();

  // Cria um cliente Supabase que pode operar dentro do Middleware
  const supabase = createMiddlewareClient({ req, res });

  // Pega a sessão do usuário. Isso também atualiza o cookie de sessão se ele estiver expirando.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // LÓGICA PARA USUÁRIO NÃO LOGADO
  // Se o usuário não está logado...
  if (!session) {
    // ...e está tentando acessar qualquer rota protegida (ex: /consultas, /pacientes, etc.)...
    // Adicione aqui todos os prefixos de rotas que precisam de login.
    if (pathname.startsWith('/consultas') || pathname.startsWith('/dashboard')) {
      // ...redireciona para a página de login.
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // LÓGICA PARA USUÁRIO JÁ LOGADO
  // Se o usuário está logado...
  if (session) {
    // ...e está tentando acessar a página de login ou de registro...
    if (pathname === '/login' || pathname === '/signup') {
      // ...redireciona para a página principal da plataforma (ex: /consultas).
      const homeUrl = new URL('/consultas', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Se nenhuma das condições acima for atendida, permite que a requisição continue.
  return res;
}

// O "matcher" define em QUAIS rotas o middleware deve ser executado.
// Isso evita que ele rode em requisições de arquivos estáticos (imagens, css, etc.),
// o que melhora a performance.
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto as que começam com:
     * - _next/static (arquivos estáticos)
     * - _next/image (imagens otimizadas)
     * - favicon.ico (ícone do site)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};