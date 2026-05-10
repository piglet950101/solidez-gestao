import 'server-only';

type TemplateParams = Record<string, string>;

interface SendOptions {
  to: string;
  template: string;
  params: TemplateParams;
  language?: string;
}

const META_API = 'https://graph.facebook.com/v21.0';

export async function sendWhatsAppTemplate({
  to,
  template,
  params,
  language = 'pt_BR',
}: SendOptions): Promise<{ messageId: string | null; raw: unknown }> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    throw new Error('Credenciais WhatsApp não configuradas');
  }

  const components = Object.values(params).length
    ? [
        {
          type: 'body',
          parameters: Object.values(params).map((text) => ({ type: 'text', text })),
        },
      ]
    : [];

  const res = await fetch(`${META_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizePhone(to),
      type: 'template',
      template: { name: template, language: { code: language }, components },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const reason = (json?.error?.message as string | undefined) ?? `HTTP ${res.status}`;
    throw new Error(`Falha ao enviar WhatsApp: ${reason}`);
  }
  const messageId = (json?.messages?.[0]?.id as string | undefined) ?? null;
  return { messageId, raw: json };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export const TEMPLATES = {
  CONTA_A_VENCER: 'solidez_conta_a_vencer',
  CONTA_VENCIDA: 'solidez_conta_vencida',
  DOC_VEICULO: 'solidez_doc_veiculo',
  FIM_EXPERIENCIA: 'solidez_fim_experiencia',
  IMPOSTO_PENDENTE: 'solidez_imposto_pendente',
  LUCRO_EM_RISCO: 'solidez_lucro_em_risco',
} as const;

export type TemplateName = (typeof TEMPLATES)[keyof typeof TEMPLATES];
