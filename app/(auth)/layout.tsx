import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between gradient-brand p-12 text-white md:flex">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[10px] bg-white/10 text-base font-extrabold">S</div>
          <div>
            <div className="text-lg font-bold leading-none">Solidez Gestão</div>
            <div className="text-[11px] uppercase tracking-widest text-white/70">empreiteira</div>
          </div>
        </Link>

        <div className="space-y-4">
          <p className="max-w-md text-3xl font-bold leading-tight">
            Cada centavo tem endereço.
          </p>
          <p className="max-w-md text-base text-white/80">
            Sistema financeiro sob medida da Solidez Empreiteira. Multi-empresa, multi-obra, multi-sócio — sem
            workaround.
          </p>
        </div>

        <div className="text-xs text-white/60">v1.0 · Yasmin Salleh · 2026</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
