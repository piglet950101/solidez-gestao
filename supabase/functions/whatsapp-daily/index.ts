// Edge Function: dispara alertas diários via WhatsApp Cloud API
// Agendado por pg_cron às 07:00 BRT (10:00 UTC)
//   select cron.schedule('whatsapp-daily', '0 10 * * *',
//     $$ select net.http_post(
//          'https://<project>.functions.supabase.co/whatsapp-daily',
//          headers => '{"Authorization":"Bearer <anon>"}'::jsonb
//        ) $$);

// deno-lint-ignore-file
// @ts-nocheck — runs in Deno (Supabase Edge Runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const META_API = 'https://graph.facebook.com/v21.0';

const TIPO_TEMPLATE: Record<string, string> = {
  conta_a_vencer: 'solidez_conta_a_vencer',
  conta_vencida: 'solidez_conta_vencida',
  doc_veiculo: 'solidez_doc_veiculo',
  fim_experiencia: 'solidez_fim_experiencia',
  imposto_pendente: 'solidez_imposto_pendente',
  lucro_em_risco: 'solidez_lucro_em_risco',
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { error: genErr } = await supabase.rpc('fn_gerar_alertas_diarios');
  if (genErr) {
    return Response.json({ error: genErr.message }, { status: 500 });
  }

  // Carrega usuários cadastrados com WhatsApp
  const { data: usuarios } = await supabase
    .from('perfis_usuario')
    .select('user_id, nome, telefone_whatsapp')
    .eq('ativo', true)
    .not('telefone_whatsapp', 'is', null);

  // Alertas não enviados nas últimas 24h
  const { data: alertas } = await supabase
    .from('alertas')
    .select('id, tipo, severidade, mensagem, empresa_id')
    .is('resolvido_em', null)
    .gte('criado_em', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('severidade', { ascending: false });

  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!phoneId || !token) {
    return Response.json({ skipped: 'whatsapp credentials missing', alertas: alertas?.length ?? 0 });
  }

  const enviados: { alerta_id: string; user_id: string; status: string }[] = [];

  for (const alerta of alertas ?? []) {
    const template = TIPO_TEMPLATE[alerta.tipo] ?? 'solidez_alerta_generico';
    for (const user of usuarios ?? []) {
      // dedup: só envia se não foi enviado pra esse user nas últimas 24h
      const { data: jaEnviado } = await supabase
        .from('whatsapp_envios')
        .select('id')
        .eq('alerta_id', alerta.id)
        .eq('destinatario_user_id', user.user_id)
        .gte('criado_em', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (jaEnviado) continue;

      const phone = normalize(user.telefone_whatsapp!);
      try {
        const r = await fetch(`${META_API}/${phoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: template,
              language: { code: 'pt_BR' },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: alerta.mensagem }],
                },
              ],
            },
          }),
        });
        const json = await r.json();
        const ok = r.ok;

        await supabase.from('whatsapp_envios').insert({
          alerta_id: alerta.id,
          destinatario_user_id: user.user_id,
          telefone_destino: phone,
          template_name: template,
          template_vars: { mensagem: alerta.mensagem },
          status: ok ? 'enviado' : 'falhou',
          message_id_meta: json?.messages?.[0]?.id ?? null,
          resposta_meta: json,
          enviado_em: ok ? new Date().toISOString() : null,
          erro: ok ? null : json?.error?.message ?? `HTTP ${r.status}`,
        });

        enviados.push({ alerta_id: alerta.id, user_id: user.user_id, status: ok ? 'enviado' : 'falhou' });
      } catch (e) {
        await supabase.from('whatsapp_envios').insert({
          alerta_id: alerta.id,
          destinatario_user_id: user.user_id,
          telefone_destino: phone,
          template_name: template,
          status: 'falhou',
          erro: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return Response.json({ alertas: alertas?.length ?? 0, envios: enviados.length });
});

function normalize(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}
