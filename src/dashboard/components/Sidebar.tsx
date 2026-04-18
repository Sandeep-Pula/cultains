import clsx from 'clsx';
import {
  Home,
  Sparkles,
  Users,
  UsersRound,
  X,
  Package,
  CreditCard,
  History,
  Contact,
  Settings
} from 'lucide-react';
import type { DashboardView } from '../types';
import { dashboardHash, viewTitles } from '../utils';

const items: { view: DashboardView; icon: typeof Home }[] = [
  { view: 'overview', icon: Home },
  { view: 'customers', icon: Users },
  { view: 'team', icon: UsersRound },
  { view: 'inventory', icon: Package },
  { view: 'billing', icon: CreditCard },
  { view: 'render-history', icon: History },
  { view: 'crm', icon: Contact },
];

type SidebarProps = {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  open: boolean;
  onClose: () => void;
};

export const Sidebar = ({ activeView, onNavigate, open, onClose }: SidebarProps) => (
  <>
    <button
      type="button"
      className={clsx(
        'fixed inset-0 z-40 bg-brand-dark/20 backdrop-blur-sm transition lg:hidden',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-label="Close navigation overlay"
      onClick={onClose}
    />
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-brand-60/30 bg-brand-30 px-5 py-6 shadow-xl transition-transform lg:translate-x-0 lg:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center justify-between">
        <a href="#dashboard" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-60 bg-brand-60 shadow-sm">
            <img src={`${import.meta.env.BASE_URL}cultains-logo-black.png`} alt="Cultains" className="h-full w-full rounded-2xl object-contain opacity-80" />
          </span>
          <div>
            <div className="text-lg font-semibold text-brand-dark">Cultains</div>
            <div className="text-xs uppercase tracking-[0.18em] text-brand-dark/70">Decorator OS</div>
          </div>
        </a>
        <button onClick={onClose} aria-label="Close dashboard navigation" className="rounded-xl p-2 text-brand-dark lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="mt-8 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.view === activeView;
          return (
            <a
              key={item.view}
              href={dashboardHash(item.view)}
              onClick={() => {
                onNavigate(item.view);
                onClose();
              }}
              className={clsx(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                active ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
              )}
            >
              <Icon size={18} />
              <span>{viewTitles[item.view]}</span>
            </a>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl bg-brand-60 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-30 p-2 text-brand-10">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="font-medium text-brand-dark">Need a quick render?</div>
            <div className="text-[13px] text-brand-dark/80">Jump to the try-on tool from here.</div>
          </div>
        </div>
        <a href="#try-once" className="mt-4 flex justify-center rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-dark hover:text-brand-60">
          Generate new render
        </a>
      </div>

      <div className="mt-auto pt-6">
        <a
          href={dashboardHash('settings')}
          onClick={() => {
            onNavigate('settings');
            onClose();
          }}
          className={clsx(
            'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
            activeView === 'settings' ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
          )}
        >
          <Settings size={18} />
          <span>{viewTitles['settings']}</span>
        </a>
        <a
          href={dashboardHash('profile')}
          onClick={() => {
            onNavigate('profile');
            onClose();
          }}
          className={clsx(
            'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
            activeView === 'profile' ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-10 text-[10px] font-bold text-brand-dark">
            JD
          </span>
          <span>{viewTitles['profile']}</span>
        </a>
      </div>
    </aside>
  </>
);
