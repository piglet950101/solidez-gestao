'use server';
import { revalidatePath } from 'next/cache';
import { concluirEmpreitada } from '@/actions/empreitadas';

export async function concluirAction(id: string) {
  await concluirEmpreitada(id);
  revalidatePath(`/empreitadas/${id}`);
}
