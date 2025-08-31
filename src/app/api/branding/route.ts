import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Tabela sugerida: system_assets(key text primary key, url text not null)
    // Linhas esperadas: ('SUS_LOGO', 'https://...'), ('UPA_LOGO', 'https://...')
    const { data, error } = await supabase
      .from('system_assets')
      .select('key,url')
      .in('key', ['SUS_LOGO', 'UPA_LOGO']);

    if (error) throw error;

    const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.url]));
    const susLogoUrl = map['SUS_LOGO'] || process.env.NEXT_PUBLIC_SUS_LOGO_URL || null;
    const upaLogoUrl = map['UPA_LOGO'] || process.env.NEXT_PUBLIC_UPA_LOGO_URL || null;

    return NextResponse.json({ susLogoUrl, upaLogoUrl });
  } catch (e: any) {
    // fallback para env, caso a consulta ao DB falhe
    return NextResponse.json({
      susLogoUrl: process.env.NEXT_PUBLIC_SUS_LOGO_URL || null,
      upaLogoUrl: process.env.NEXT_PUBLIC_UPA_LOGO_URL || null,
      warning: 'Fallback aplicado (DB indisponível ou sem registros).',
    }, { status: 200 });
  }
}
