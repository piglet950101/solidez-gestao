'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { capturaRapida } from '@/actions/capturar';

interface Option {
  id: string;
  nome: string;
  cor?: string | null;
  empresa_id?: string;
}

const LAST_OBRA_KEY = 'sg.lastObra';
const LAST_CATEGORIA_KEY = 'sg.lastCategoria';

export function CaptureForm({
  obras,
  categorias,
}: {
  empresas: Option[];
  obras: Option[];
  categorias: Option[];
}) {
  const router = useRouter();
  const [valor, setValor] = React.useState<string>('');
  const [obraId, setObraId] = React.useState<string>('');
  const [categoriaId, setCategoriaId] = React.useState<string>('');
  const [foto, setFoto] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [lastObra, setLastObra] = React.useState<string | null>(null);

  React.useEffect(() => {
    const obra = localStorage.getItem(LAST_OBRA_KEY);
    const cat = localStorage.getItem(LAST_CATEGORIA_KEY);
    setLastObra(obra);
    if (obra) setObraId(obra);
    if (cat) setCategoriaId(cat);
  }, []);

  const obraOrdenada = React.useMemo(() => {
    if (!lastObra) return obras;
    const top = obras.find((o) => o.id === lastObra);
    return top ? [top, ...obras.filter((o) => o.id !== lastObra)] : obras;
  }, [obras, lastObra]);

  function pickPhoto(file: File | null) {
    setFoto(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valor || !obraId || !categoriaId) {
      toast.error('Preencha valor, obra e categoria.');
      return;
    }

    const fd = new FormData();
    fd.set('valor', valor);
    fd.set('obra_id', obraId);
    fd.set('categoria_id', categoriaId);
    if (foto) fd.set('foto', foto);

    startTransition(async () => {
      const res = await capturaRapida(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        localStorage.setItem(LAST_OBRA_KEY, obraId);
        localStorage.setItem(LAST_CATEGORIA_KEY, categoriaId);
        toast.success('Lançado · sincronizado');
        setValor('');
        setFoto(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-md flex-col gap-4 pb-32"
    >
      <div className="rounded-[16px] gradient-brand p-5 text-white shadow-pop">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/80">Etapa 1 · valor</div>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
          className="mt-1 w-full bg-transparent text-center font-mono text-5xl font-bold text-white outline-none placeholder:text-white/40"
        />
        <div className="text-center text-[11px] uppercase tracking-widest text-white/70">R$</div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Etapa 2 · obra</div>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="h-14 w-full rounded-[14px] border-2 border-brand-200 bg-white px-4 text-base font-semibold text-brand-900 outline-none focus:border-accent-500"
        >
          <option value="">Selecione a obra…</option>
          {obraOrdenada.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Etapa 3 · categoria</div>
        <div className="grid grid-cols-3 gap-2">
          {categorias.map((c) => {
            const on = categoriaId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoriaId(c.id)}
                className={cn(
                  'rounded-[12px] border-2 px-3 py-3 text-xs font-bold uppercase tracking-wide transition-all',
                  on
                    ? 'border-accent-500 bg-accent-50 text-accent-800'
                    : 'border-brand-200 bg-white text-brand-700 hover:border-brand-300',
                )}
              >
                {c.nome}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-accent-400 bg-accent-50/40 py-6 text-accent-800"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="prévia" className="h-32 rounded-[10px] object-cover" />
        ) : (
          <>
            <Camera className="size-7" />
            <span className="text-sm font-bold">Foto da nota (opcional)</span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
      />

      <div className="fixed inset-x-0 bottom-0 border-t border-brand-100 bg-white px-4 py-3 shadow-pop">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="submit"
            disabled={pending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-emerald-600 text-base font-extrabold uppercase tracking-widest text-white shadow-card disabled:opacity-50"
          >
            <Check className="size-5" />
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  );
}
