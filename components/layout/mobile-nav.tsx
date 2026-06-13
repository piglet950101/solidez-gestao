'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  HardHat,
  Users,
  Menu,
  Plus,
  Camera,
  ShoppingCart,
  PiggyBank,
  FileBarChart,
  Banknote,
  Bell,
  Truck,
  Wallet,
  Hammer,
  Coins,
  Receipt,
  Building,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY: MobileNavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/obras', label: 'Obras', icon: HardHat },
];
const SECONDARY: MobileNavItem[] = [
  { href: '/funcionarios', label: 'Pessoas', icon: Users },
];

const QUICK_ACTIONS = [
  { href: '/capturar', label: 'Capturar gasto', icon: Camera, hint: '3 toques + foto · mais rápido em campo', tone: 'accent' as const },
  { href: '/compras/nova', label: 'Nova compra', icon: ShoppingCart, hint: 'Com rateio entre obras' },
  { href: '/vales/novo', label: 'Lançar vale', icon: PiggyBank, hint: 'Adiantamento ao funcionário' },
  { href: '/medicoes/nova', label: 'Nova medição', icon: FileBarChart, hint: 'Receita / nota fiscal' },
  { href: '/folha/novo', label: 'Lançar folha', icon: Banknote, hint: 'Fechamento mensal' },
];

const MENU_GROUPS: { group: string; items: MobileNavItem[] }[] = [
  {
    group: 'Visão',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/obras', label: 'Obras', icon: HardHat },
      { href: '/apuracao', label: 'Apuração', icon: FileBarChart },
    ],
  },
  {
    group: 'Financeiro',
    items: [
      { href: '/compras', label: 'Compras', icon: ShoppingCart },
      { href: '/fornecedores', label: 'Fornecedores', icon: Building },
      { href: '/custos-fixos', label: 'Custos Fixos', icon: Wallet },
      { href: '/medicoes', label: 'Medições', icon: FileBarChart },
      { href: '/impostos', label: 'Impostos', icon: Receipt },
    ],
  },
  {
    group: 'Pessoas',
    items: [
      { href: '/funcionarios', label: 'Funcionários', icon: Users },
      { href: '/folha', label: 'Folha', icon: Banknote },
      { href: '/vales', label: 'Vales', icon: PiggyBank },
      { href: '/empreitadas', label: 'Empreitadas', icon: Hammer },
      { href: '/pro-labore', label: 'Pró-labore', icon: Coins },
    ],
  },
  {
    group: 'Frota',
    items: [{ href: '/veiculos', label: 'Veículos', icon: Truck }],
  },
  {
    group: 'Monitoramento',
    items: [
      { href: '/alertas', label: 'Alertas', icon: Bell },
      { href: '/capturar', label: 'Capturar', icon: Camera },
    ],
  },
];

// Paths where the bottom nav should be hidden because the page has its own
// fixed bottom CTA or is a focused single-task flow (e.g. /capturar).
const HIDE_ON = ['/capturar'];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-brand-100 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider',
                active ? 'text-accent-600' : 'text-brand-500',
              )}
            >
              <Icon className={cn('size-5', active && 'text-accent-600')} />
              {item.label}
            </Link>
          );
        })}

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="absolute inset-x-0 -top-5 mx-auto grid size-14 place-items-center rounded-full gradient-brand text-white shadow-pop ring-4 ring-cream"
            aria-label="Lançar"
          >
            <Plus className="size-7" />
          </button>
          <div className="invisible py-2.5 text-[10px]">_</div>
        </div>

        {SECONDARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider',
                active ? 'text-accent-600' : 'text-brand-500',
              )}
            >
              <Icon className={cn('size-5', active && 'text-accent-600')} />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-500"
        >
          <Menu className="size-5" />
          Menu
        </button>
      </nav>

      {/* Quick-actions sheet */}
      <BottomSheet open={quickOpen} onOpenChange={setQuickOpen} title="Lançar rapidinho" description="Escolha o tipo de lançamento">
        <ul className="space-y-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.href}>
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpen(false);
                    router.push(a.href);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[14px] border border-brand-100 bg-cream p-3 text-left transition-colors active:bg-brand-50',
                    a.tone === 'accent' && 'border-accent-200 bg-accent-50',
                  )}
                >
                  <div className={cn('grid size-11 place-items-center rounded-[10px] text-white', a.tone === 'accent' ? 'gradient-brand' : 'bg-brand-700')}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-brand-900">{a.label}</div>
                    <div className="text-[11px] text-brand-500">{a.hint}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Full menu sheet */}
      <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title="Menu" description="Todas as áreas do sistema" maxHeight="80vh">
        <div className="space-y-5 pb-4">
          {MENU_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-brand-400">{g.group}</div>
              <ul className="grid grid-cols-2 gap-2">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push(item.href);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-[12px] border border-brand-100 bg-white px-3 py-2.5 text-left transition-colors active:bg-brand-50',
                          active && 'border-accent-300 bg-accent-50',
                        )}
                      >
                        <Icon className={cn('size-4', active ? 'text-accent-600' : 'text-brand-500')} />
                        <span className="text-sm font-semibold text-brand-900">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeight = '70vh',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-brand-950/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] border-t border-brand-100 bg-white p-5 shadow-pop"
          style={{ maxHeight }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brand-200" />
          <div className="mb-4 flex items-start justify-between">
            <div>
              <DialogPrimitive.Title className="text-base font-bold text-brand-900">{title}</DialogPrimitive.Title>
              {description ? <p className="text-xs text-brand-500">{description}</p> : null}
            </div>
            <DialogPrimitive.Close asChild>
              <button className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700">
                <X className="size-4" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="scrollbar-thin overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 100px)` }}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
