import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileForm from './components/ProfileForm';

export const metadata: Metadata = {
  title: 'Configurações',
};

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const initialProfileData = profile || {
    full_name: '', crm: '', specialty: '', crm_state: '', signature_url: null,
    cpf_cnpj: '', clinic_logo_url: null, clinic_name: '',
    clinic_address_street: '', clinic_address_number: '',
    clinic_address_complement: '', clinic_address_neighborhood: '',
    clinic_address_city: '', clinic_address_state: '', clinic_address_zip: '',
    clinic_phone: '', clinic_email: '', clinic_website: '',
    avatar_url: null,

    header_context: 'private',
    default_templates: {
      atestado: 'atestado_default',
      pedidoExame: 'pedido_exame_default',
      receita: 'receita_default',
      prontuario: 'prontuario_default',
    },
  };

  return (
    <div className="mt-16 space-y-8">
      <ProfileForm profile={initialProfileData} />
    </div>
  );
}
