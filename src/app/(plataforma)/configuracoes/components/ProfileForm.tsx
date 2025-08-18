'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Loader2, User, Building } from 'lucide-react';
import ImageUploader from './ImageUploader';

type Profile = {
  [key: string]: any;
};

export default function ProfileForm({ profile }: { profile: Profile }) {
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState(profile);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpdate = (field: string, url: string) => {
    setFormData(prev => ({ ...prev, [field]: url }));
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não encontrado');

      const { avatar_url, signature_url, clinic_logo_url, ...textData } = formData;
      const updates = { ...textData, id: user.id, updated_at: new Date().toISOString() };
      
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      toast.success('Alterações de texto guardadas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar o perfil:', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "mt-1 block w-full rounded-md border border-border bg-transparent py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-light";

  return (
    <form onSubmit={handleUpdateProfile} className="space-y-8">
      {/* Secção de Perfil Profissional */}
      <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-light" />
          <h2 className="text-xl font-semibold">Perfil Profissional</h2>
        </div>
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium mb-2">Foto de Perfil</label>
            <ImageUploader 
              key={formData.avatar_url}
              bucket="avatars" 
              url={formData.avatar_url} 
              profileField="avatar_url"
              onUploadSuccess={(url) => handleImageUpdate('avatar_url', url)}
              fallbackName={formData.full_name}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">Nome Completo</label>
              <input name="full_name" value={formData.full_name || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">CPF ou CNPJ</label>
              <input name="cpf_cnpj" value={formData.cpf_cnpj || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">CRM</label>
              <input name="crm" value={formData.crm || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">Estado (UF)</label>
              <input name="crm_state" value={formData.crm_state || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">Especialidade(s)</label>
              <input name="specialty" value={formData.specialty || ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium mb-2">Assinatura Digitalizada</label>
            <ImageUploader 
              key={formData.signature_url}
              bucket="signatures" 
              url={formData.signature_url} 
              profileField="signature_url"
              onUploadSuccess={(url) => handleImageUpdate('signature_url', url)} 
            />
          </div>
        </div>
      </div>

      {/* Secção do Consultório */}
      <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Building className="h-6 w-6 text-light" />
          <h2 className="text-xl font-semibold">Informações do Consultório/Clínica</h2>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">Nome do Consultório</label>
              <input name="clinic_name" value={formData.clinic_name || ''} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">Telefone de Contato</label>
              <input name="clinic_phone" value={formData.clinic_phone || ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">E-mail de Contato</label>
              <input name="clinic_email" value={formData.clinic_email || ''} onChange={handleChange} type="email" className={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium">Website</label>
              <input name="clinic_website" value={formData.clinic_website || ''} onChange={handleChange} className={inputStyle} />
            </div>
          </div>
          <div>
              <label className="block text-sm font-medium">Endereço</label>
              <input name="clinic_address_street" value={formData.clinic_address_street || ''} onChange={handleChange} placeholder="Rua, Avenida..." className={inputStyle} />
          </div>
          <div className="flex flex-col items-center">
              <label className="block text-sm font-medium mb-2">Logótipo do Consultório</label>
              <ImageUploader 
                key={formData.clinic_logo_url}
                bucket="logos" 
                url={formData.clinic_logo_url} 
                profileField="clinic_logo_url"
                onUploadSuccess={(url) => handleImageUpdate('clinic_logo_url', url)} 
                fallbackName={formData.clinic_name}
              />
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-6 items-center">
        <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'A guardar...' : 'Salvar Informações'}
        </button>
      </div>
    </form>
  );
}
