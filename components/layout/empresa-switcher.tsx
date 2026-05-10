'use client';
import * as React from 'react';
import { Building2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function EmpresaSwitcher() {
  const router = useRouter();
  const params = useSearchParams();
  const [empresas, setEmpresas] = React.useState<{ id: string; nome: string }[]>([]);
  const current = params.get('empresa') ?? 'all';

  React.useEffect(() => {
    fetch('/api/empresas', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setEmpresas(d.empresas ?? []))
      .catch(() => setEmpresas([]));
  }, []);

  function onChange(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value === 'all') sp.delete('empresa');
    else sp.set('empresa', value);
    const qs = sp.toString();
    router.push(`?${qs}`);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-[10px] border border-brand-100 bg-white text-brand-700">
        <Building2 className="size-4" />
      </div>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-[220px]">
          <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as empresas</SelectItem>
          {empresas.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
