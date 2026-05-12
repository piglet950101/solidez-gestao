'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField } from '@/components/ui/form-field';
import { criarFornecedor, atualizarFornecedor } from '@/actions/fornecedores';
import type { Fornecedor } from '@/types/database';

export function FornecedorForm({ fornecedor }: { fornecedor?: Fornecedor }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const isEdit = Boolean(fornecedor?.id);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit ? await atualizarFornecedor(fornecedor!.id, fd) : await criarFornecedor(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success(isEdit ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
        router.push('/fornecedores');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Nome / Razão social" name="nome" required defaultValue={fornecedor?.nome ?? ''} className="md:col-span-2" />
        <TextField label="Documento (CPF ou CNPJ)" name="documento" defaultValue={fornecedor?.documento ?? ''} placeholder="00.000.000/0001-00" />
        <TextField label="Contato (telefone)" name="contato" defaultValue={fornecedor?.contato ?? ''} placeholder="(48) 99999-9999" />
        <TextField label="Email" name="email" type="email" defaultValue={fornecedor?.email ?? ''} className="md:col-span-2" />
      </div>
      <TextareaField label="Observações" name="observacoes" rows={3} defaultValue={fornecedor?.observacoes ?? ''} hint="Ex: forma de pagamento, prazo médio, prestador recorrente em qual obra, etc." />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </Button>
      </div>
    </form>
  );
}
