'use client';

import { useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Loader2, User, Building, LayoutTemplate, PencilLine } from 'lucide-react';
import ImageUploader from './ImageUploader';
import SignatureModal from '@/app/(plataforma)/configuracoes/components/SignatureModal';

type Profile = {
  [key: string]: any;
};

type HeaderContext = 'private' | 'sus' | 'upa24h';

type TemplateKey =
  | 'atestado_default'
  | 'atestado_sus_24h'
  | 'pedido_exame_default'
  | 'receita_default'
  | 'prontuario_default';

const TEMPLATE_OPTIONS: Record<
  'atestado' | 'pedidoExame' | 'receita' | 'prontuario',
  { label: string; keys: TemplateKey[] }
> = {
  atestado: { label: 'Atestado', keys: ['atestado_default', 'atestado_sus_24h'] },
  pedidoExame: { label: 'Pedido de Exame', keys: ['pedido_exame_default'] },
  receita: { label: 'Receita', keys: ['receita_default'] },
  prontuario: { label: 'Prontuário', keys: ['prontuario_default'] },
};

function labelFromKey(k: TemplateKey) {
  switch (k) {
    case 'atestado_default': return 'Atestado (padrão)';
    case 'atestado_sus_24h': return 'Atestado SUS – 24h';
    case 'pedido_exame_default': return 'Pedido de Exame (padrão)';
    case 'receita_default': return 'Receita (padrão)';
    case 'prontuario_default': return 'Prontuário SOAP';
    default: return k;
  }
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const supabase = createClientComponentClient();

  // Defaults seguros para novos campos
  const defaults = useMemo(() => ({
    header_context: profile?.header_context ?? 'private',
    default_templates: {
      atestado: profile?.default_templates?.atestado ?? 'atestado_default',
      pedidoExame: profile?.default_templates?.pedidoExame ?? 'pedido_exame_default',
      receita: profile?.default_templates?.receita ?? 'receita_default',
      prontuario: profile?.default_templates?.prontuario ?? 'prontuario_default',
    },
  }), [profile]);

  const [formData, setFormData] = useState<Profile>({ ...profile, ...defaults });
  const [loading, setLoading] = useState(false);

  // Modal de assinatura
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleTemplateChange = (
    field: 'atestado' | 'pedidoExame' | 'receita' | 'prontuario',
    value: TemplateKey
  ) => {
    setFormData((prev: Profile) => ({
      ...prev,
      default_templates: {
        ...(prev.default_templates || {}),
        [field]: value,
      },
    }));
  };

  const handleImageUpdate = (field: 'avatar_url' | 'signature_url' | 'clinic_logo_url', url: string) =>
    setFormData((prev: Profile) => ({ ...prev, [field]: url })); // preview local (uploader já salvou no DB)

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não encontrado');

      // Evita sobrescrever URLs salvas pelo uploader
      const { avatar_url, signature_url, clinic_logo_url, ...textData } = formData;

      const updates = {
        ...textData,
        id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar o perfil:', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Utils: DataURL -> Blob
  function dataURLtoBlob(dataURL: string): Blob {
    const [meta, content] = dataURL.split(',');
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/png';
    const byteString = atob(content);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }

  // Salva assinatura capturada no modal no bucket 'signatures' e atualiza profiles.signature_url
  const handleSaveSignatureDataUrl = async (dataUrl: string) => {
    try {
      setSavingSignature(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const blob = dataURLtoBlob(dataUrl);
      const fileName = `${user.id}-signature-${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase
        .storage
        .from('signatures')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('signatures').getPublicUrl(filePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter URL pública da assinatura.');

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ signature_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (dbError) throw dbError;

      setFormData((prev: Profile) => ({ ...prev, signature_url: publicUrl }));
      toast.success('Assinatura salva com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar assinatura:', { description: err.message });
    } finally {
      setSavingSignature(false);
    }
  };

  const inputStyle =
    "mt-1 block w-full rounded-md border border-border bg-transparent py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-light";

  return (
    <>
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
                url={formData.avatar_url || null}
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

            {/* Assinatura: upload OU assinar no navegador */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium mb-2">Assinatura Digitalizada (upload)</label>
                <ImageUploader
                  key={formData.signature_url}
                  bucket="signatures"
                  url={formData.signature_url || null}
                  profileField="signature_url"
                  onUploadSuccess={(url) => handleImageUpdate('signature_url', url)}
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="block text-sm font-medium mb-2">Assinar no Navegador</label>
                <button
                  type="button"
                  onClick={() => setSigModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <PencilLine className="h-4 w-4" />
                  Abrir modal de assinatura
                </button>
                {savingSignature && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando assinatura…
                  </div>
                )}
                {formData.signature_url && (
                  <div className="text-xs text-gray-500 text-center">
                    Assinatura atual registrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secção do Consultório/Clínica */}
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
              <input
                name="clinic_address_street"
                value={formData.clinic_address_street || ''}
                onChange={handleChange}
                placeholder="Rua, Avenida..."
                className={inputStyle}
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium mb-2">Logótipo do Consultório</label>
              <ImageUploader
                key={formData.clinic_logo_url}
                bucket="logos"
                url={formData.clinic_logo_url || null}
                profileField="clinic_logo_url"
                onUploadSuccess={(url) => handleImageUpdate('clinic_logo_url', url)}
                fallbackName={formData.clinic_name}
              />
            </div>
          </div>
        </div>

        {/* Cabeçalho & Templates */}
        <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <LayoutTemplate className="h-6 w-6 text-light" />
            <h2 className="text-xl font-semibold">Cabeçalho & Templates</h2>
          </div>

          {/* Contexto do Cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium">Contexto do Cabeçalho</label>
              <select
                name="header_context"
                value={(formData.header_context as HeaderContext) || 'private'}
                onChange={handleSelectChange}
                className={inputStyle}
              >
                <option value="private">Clínica Particular</option>
                <option value="sus">SUS</option>
                <option value="upa24h">UPA 24h</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Aplica este cabeçalho a <strong>todos os documentos</strong>.
              </p>
            </div>
          </div>

          {/* Templates padrão por documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(
              Object.entries(TEMPLATE_OPTIONS) as Array<
                ['atestado' | 'pedidoExame' | 'receita' | 'prontuario', { label: string; keys: TemplateKey[] }]
              >
            ).map(([key, opt]) => (
              <div key={key}>
                <label className="block text-sm font-medium">{opt.label} — Template Padrão</label>
                <select
                  value={(formData?.default_templates?.[key] as TemplateKey) ?? opt.keys[0]}
                  onChange={(e) => handleTemplateChange(key, e.target.value as TemplateKey)}
                  className={inputStyle}
                >
                  {opt.keys.map((k) => (
                    <option key={k} value={k}>
                      {labelFromKey(k)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col pb-6 items-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'A guardar...' : 'Salvar Informações'}
          </button>
        </div>
      </form>

      {/* Modal de assinatura */}
      <SignatureModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSave={handleSaveSignatureDataUrl}
      />
    </>
  );
}
