'use server';
import { revalidatePath } from 'next/cache';
import { fecharFolha } from '@/actions/folha';

export async function fecharFolhaAction(formData: FormData) {
  const funcionario_id = String(formData.get('funcionario_id') ?? '');
  const obra_id = String(formData.get('obra_id') ?? '');
  const mes_referencia = String(formData.get('mes_referencia') ?? '');
  await fecharFolha(funcionario_id, obra_id, mes_referencia);
  revalidatePath('/folha');
  revalidatePath('/');
}
