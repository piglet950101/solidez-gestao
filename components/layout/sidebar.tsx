'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HardHat,
  ShoppingCart,
  FileBarChart,
  Users,
  Truck,
  Banknote,
  Bell,
  Receipt,
  Camera,
  Wallet,
  PiggyBank,
  Hammer,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'visao' },
  { href: '/obras', label: 'Obras', icon: HardHat, group: 'visao' },

  { href: '/compras', label: 'Compras', icon: ShoppingCart, group: 'financeiro' },
  { href: '/custos-fixos', label: 'Custos Fixos', icon: Wallet, group: 'financeiro' },
  { href: '/medicoes', label: 'Medições', icon: FileBarChart, group: 'financeiro' },
  { href: '/impostos', label: 'Impostos', icon: Receipt, group: 'financeiro' },

  { href: '/funcionarios', label: 'Funcionários', icon: Users, group: 'pessoas' },
  { href: '/folha', label: 'Folha', icon: Banknote, group: 'pessoas' },
  { href: '/vales', label: 'Vales', icon: PiggyBank, group: 'pessoas' },
  { href: '/empreitadas', label: 'Empreitadas', icon: Hammer, group: 'pessoas' },
  { href: '/pro-labore', label: 'Pró-labore', icon: Coins, group: 'pessoas' },

  { href: '/veiculos', label: 'Veículos', icon: Truck, group: 'frota' },

  { href: '/alertas', label: 'Alertas', icon: Bell, group: 'monitoramento' },
  { href: '/capturar', label: 'Capturar', icon: Camera, group: 'monitoramento' },
];

const GROUP_LABELS: Record<string, string> = {
  visao: 'Visão',
  financeiro: 'Financeiro',
  pessoas: 'Pessoas',
  frota: 'Frota',
  monitoramento: 'Monitoramento',
};

export function Sidebar() {
  const pathname = usePathname();
  const grouped = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-brand-100 bg-white px-3 py-5 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <div className="grid size-9 place-items-center rounded-[10px] gradient-brand text-sm font-extrabold text-white shadow-card">
          S
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold text-brand-900">Solidez Gestão</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-500">empreiteira</span>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto scrollbar-thin">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="flex flex-col gap-1">
            <div className="px-2 text-[10px] font-bold uppercase tracking-widest text-brand-400">
              {GROUP_LABELS[group]}
            </div>
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-brand-50 text-brand-900' : 'text-brand-600 hover:bg-brand-50/60 hover:text-brand-800',
                  )}
                >
                  <Icon className={cn('size-4', active ? 'text-accent-600' : 'text-brand-400')} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
