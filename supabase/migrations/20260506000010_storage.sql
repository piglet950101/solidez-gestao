-- Buckets para fotos de notas fiscais e documentos

insert into storage.buckets (id, name, public) values ('notas', 'notas', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('docs-veiculos', 'docs-veiculos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy "Authenticated read storage" on storage.objects
  for select to authenticated using (bucket_id in ('notas','docs-veiculos','comprovantes'));

create policy "Authenticated write storage" on storage.objects
  for insert to authenticated with check (bucket_id in ('notas','docs-veiculos','comprovantes'));
