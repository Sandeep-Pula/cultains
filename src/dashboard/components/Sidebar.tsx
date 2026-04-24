import clsx from 'clsx';
import {
  Barcode,
  Contact,
  CreditCard,
  History,
  Home,
  Package,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { DashboardView } from '../types';
import { dashboardHash, getInitials, viewTitles } from '../utils';

const items: { view: DashboardView; icon: typeof Home }[] = [
  { view: 'overview', icon: Home },
  { view: 'customers', icon: Users },
  { view: 'team', icon: UsersRound },
  { view: 'inventory', icon: Package },
  { view: 'barcode-desk', icon: Barcode },
  { view: 'billing', icon: CreditCard },
  { view: 'render-history', icon: History },
  { view: 'ai-tools', icon: Sparkles },
  { view: 'crm', icon: Contact },
];

type SidebarProps = {
  activeView: DashboardView;
  companyName: string;
  workspaceLogoUrl?: string;
  businessConfig: WorkspaceBusinessConfig;
  onNavigate: (view: DashboardView) => void;
  open: boolean;
  onClose: () => void;
};

export const Sidebar = ({ activeView, companyName, workspaceLogoUrl, businessConfig, onNavigate, open, onClose }: SidebarProps) => (
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
        'fixed inset-y-0 left-0 z-50 w-72 border-r border-brand-60/30 bg-brand-30 px-5 py-6 shadow-xl transition-transform lg:translate-x-0 lg:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <a href="#dashboard" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-60 bg-brand-60 shadow-sm">
              {workspaceLogoUrl ? (
                <img src={workspaceLogoUrl} alt={companyName} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-xs font-bold uppercase text-brand-10">{getInitials(companyName)}</span>
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-brand-dark">{companyName}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-brand-dark/70">{businessConfig.label} workspace</div>
            </div>
          </a>
          <button onClick={onClose} aria-label="Close dashboard navigation" className="rounded-xl p-2 text-brand-dark lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
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
                <div className="font-medium text-brand-dark">AI tool hub</div>
                <div className="text-[13px] text-brand-dark/80">Search, favorite, and launch AI workflows matched to your business.</div>
              </div>
            </div>
            <a
              href={dashboardHash('ai-tools')}
              onClick={() => {
                onNavigate('ai-tools');
                onClose();
              }}
              className="mt-4 flex justify-center rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-[#f5f4fb] transition hover:bg-brand-dark hover:text-[#ffffff]"
            >
              Open AI tools
            </a>
          </div>

          <div className="mt-6 pb-2">
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
              <span>{viewTitles.settings}</span>
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
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-10 text-[10px] font-bold text-brand-60">
                {getInitials(companyName)}
              </span>
              <span>{viewTitles.profile}</span>
            </a>
          </div>
        </div>
      </div>
    </aside>
  </>
);
