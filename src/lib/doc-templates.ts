export type HeaderContext = 'private' | 'sus' | 'upa24h';
export type DocumentType = 'atestado' | 'pedido-exame' | 'receita' | 'prontuario';

export type TemplateKey =
  | 'atestado_default'
  | 'atestado_sus_24h'
  | 'pedido_exame_default'
  | 'receita_default'
  | 'prontuario_default';

type Profile = {
  full_name?: string;
  specialty?: string;
  crm?: string;
  crm_state?: string;

  clinic_logo_url?: string;
  clinic_name?: string;

  clinic_address_street?: string;
  clinic_address_number?: string;
  clinic_address_complement?: string;
  clinic_address_neighborhood?: string;
  clinic_address_city?: string;
  clinic_address_state?: string;
  clinic_address_zip?: string;

  clinic_phone?: string;
  clinic_email?: string;
  clinic_website?: string;

  clinic_cnpj?: string;
  clinic_cnes?: string;

  signature_url?: string;
};

export interface BrandAssets {
  susLogoUrl?: string | null;
  upaLogoUrl?: string | null;
}

export interface RenderParams {
  headerContext: HeaderContext;
  documentType: DocumentType;
  templateKey: TemplateKey;
  profile: Profile | null;
  documentTitle: string;
  patientName: string;
  documentContent: string;   // texto da IA (ignoramos se for atestado_sus_24h)
  currentDate?: string;      // dd/mm/aaaa
  signatureDataUrl?: string | null; // assinatura do modal (prioridade)
  brandAssets?: BrandAssets; // 👈 logos do sistema (SUS/UPA)
}

export const DEFAULT_TEMPLATE_BY_TYPE: Record<DocumentType, TemplateKey> = {
  'atestado': 'atestado_default',
  'pedido-exame': 'pedido_exame_default',
  'receita': 'receita_default',
  'prontuario': 'prontuario_default',
};

const PH_LOGO = 'https://placehold.co/160x160/e2e8f0/334155?text=Logo';

const baseStyles = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .page {
    width: 210mm; min-height: 297mm; padding: 18mm 16mm;
    background: #ffffff; color: #111827;
    font: 12px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }
  .clinic-row {
    display: grid; grid-template-columns: 80px 1fr 220px; gap: 12px;
    align-items: center; padding-bottom: 8mm; border-bottom: 1px solid #e5e7eb;
  }
  .logo { width: 80px; height: 80px; object-fit: contain; }
  .clinic { display: flex; flex-direction: column; gap: 2px; }
  .clinic .name { font-weight: 700; font-size: 15px; color: #111827; }
  .clinic .contact, .clinic .addr, .clinic .ids { font-size: 11px; color: #4b5563; }
  .doctor { text-align: right; font-size: 11px; color: #111827; }
  .doctor .name { font-weight: 700; font-size: 12px; }
  .title { text-align: center; font-weight: 800; font-size: 18px; margin: 10mm 0 6mm; letter-spacing: .5px; }
  .meta {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    font-size: 12px; color: #111827;
  }
  .content { margin-top: 8mm; font-size: 12px; color: #111827; }
  .content pre, .content .mono { white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .section { margin-top: 6mm; }
  .section h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1f2937; text-transform: uppercase; letter-spacing: .4px; }
  .footer { margin-top: 14mm; border-top: 1px solid #e5e7eb; padding-top: 10mm; text-align: center; font-size: 11px; color: #374151; }
  .signature { height: 60px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; }
  .signature img { max-height: 50px; object-fit: contain; }
  .sign-line { margin-top: 4px; }
`;

function headerRowHTML(profile: Profile | null, ctx: HeaderContext, brand?: BrandAssets) {
  // escolhe logo conforme contexto (SUS/UPA vindos do sistema; clínica vem do perfil)
  const logo =
    ctx === 'sus'
      ? (brand?.susLogoUrl || profile?.clinic_logo_url || PH_LOGO)
      : ctx === 'upa24h'
      ? (brand?.upaLogoUrl || profile?.clinic_logo_url || PH_LOGO)
      : (profile?.clinic_logo_url || PH_LOGO);

  const name =
    profile?.clinic_name ||
    (ctx === 'sus' ? 'Unidade de Saúde (SUS)' : ctx === 'upa24h' ? 'UPA 24h' : 'Clínica / Consultório');

  const addrParts = [
    profile?.clinic_address_street,
    profile?.clinic_address_number,
    profile?.clinic_address_complement,
    profile?.clinic_address_neighborhood,
    profile?.clinic_address_city,
    profile?.clinic_address_state,
    profile?.clinic_address_zip,
  ].filter(Boolean);
  const addr = addrParts.length ? addrParts.join(', ') : '';

  const contactBits = [
    profile?.clinic_phone ? `Tel: ${profile.clinic_phone}` : undefined,
    profile?.clinic_email ? `E-mail: ${profile.clinic_email}` : undefined,
    profile?.clinic_website ? `${profile.clinic_website}` : undefined,
  ].filter(Boolean).join(' · ');

  const idsBits = [
    profile?.clinic_cnpj ? `CNPJ: ${profile.clinic_cnpj}` : undefined,
    profile?.clinic_cnes ? `CNES: ${profile.clinic_cnes}` : undefined,
  ].filter(Boolean).join(' · ');

  const doctorName = profile?.full_name || 'Nome do Médico';
  const specialty  = profile?.specialty || 'Especialidade';
  const crm        = profile?.crm || 'CRM';
  const uf         = profile?.crm_state || 'UF';

  return `
    <div class="clinic-row">
      <img class="logo" src="${logo}" alt="Logo" crossOrigin="anonymous"/>
      <div class="clinic">
        <div class="name">${name}</div>
        ${addr ? `<div class="addr">${addr}</div>` : ''}
        ${contactBits ? `<div class="contact">${contactBits}</div>` : ''}
        ${idsBits ? `<div class="ids">${idsBits}</div>` : ''}
      </div>
      <div class="doctor">
        <div class="name">${doctorName}</div>
        <div>${specialty}</div>
        <div>CRM: ${crm} / ${uf}</div>
      </div>
    </div>
  `;
}

function footerHTML(profile: Profile | null, signatureDataUrl?: string | null) {
  const sig = signatureDataUrl || profile?.signature_url || null;
  const doctorName = profile?.full_name || 'Nome do Médico';
  const sigBlock = sig
    ? `<div class="signature"><img src="${sig}" alt="Assinatura" crossOrigin="anonymous"/></div>`
    : `<div class="signature"></div>`;
  return `
    <div class="footer">
      ${sigBlock}
      <div class="sign-line">_________________________</div>
      <div><strong>${doctorName}</strong></div>
    </div>
  `;
}

function escapeAndBreak(text: string) {
  const safe = (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safe.replace(/\n/g, '<br/>');
}

function bodyForAtestado(templateKey: TemplateKey, content: string, patientName: string) {
  if (templateKey === 'atestado_sus_24h') {
    const fixed = `
      Atesto, para os devidos fins, que o(a) paciente <strong>${patientName}</strong>
      necessita de <strong>afastamento de 24 (vinte e quatro) horas</strong> a contar desta data,
      por motivo de saúde, conforme avaliação clínica.
      <br/><br/>
      Recomenda-se repouso e retorno imediato em caso de piora do quadro.
      <br/><br/>
      Este atestado é válido para fins de comprovação junto a empregador ou instituição,
      conforme legislação vigente no âmbito do SUS.
    `;
    return `
      <div class="section">
        <h3>ATESTADO (SUS – 24 HORAS)</h3>
        <div>${fixed}</div>
      </div>
    `;
  }
  return `
    <div class="section">
      <h3>ATESTADO</h3>
      <div>${escapeAndBreak(content)}</div>
    </div>
  `;
}

function bodyGeneric(documentType: DocumentType, content: string) {
  switch (documentType) {
    case 'pedido-exame':
      return `
        <div class="section">
          <h3>PEDIDO DE EXAMES</h3>
          <div>${escapeAndBreak(content)}</div>
        </div>
      `;
    case 'receita':
      return `
        <div class="section">
          <h3>RECEITA MÉDICA</h3>
          <div class="mono">${escapeAndBreak(content)}</div>
          <div class="section" style="font-size:11px;color:#6b7280;">
            <em>Formato recomendado: nome do medicamento, via (oral/venosa/etc.), dose, frequência, duração.</em>
          </div>
        </div>
      `;
    case 'prontuario':
    default:
      return `
        <div class="section">
          <div class="mono">${escapeAndBreak(content)}</div>
        </div>
      `;
  }
}

export function renderTemplateHTML(p: RenderParams): string {
  const {
    headerContext, documentType, templateKey,
    profile, documentTitle, patientName, documentContent,
    currentDate, signatureDataUrl, brandAssets,
  } = p;

  const body =
    documentType === 'atestado'
      ? bodyForAtestado(templateKey, documentContent, patientName)
      : bodyGeneric(documentType, documentContent);

  return `
    <style>${baseStyles}</style>
    <div class="page">
      ${headerRowHTML(profile, headerContext, brandAssets)}
      <div class="title">${documentTitle}</div>
      <div class="meta">
        <div><strong>Paciente:</strong> ${patientName}</div>
        <div><strong>Data:</strong> ${currentDate ?? ''}</div>
      </div>
      <div class="content">${body}</div>
      ${footerHTML(profile, signatureDataUrl)}
    </div>
  `;
}
