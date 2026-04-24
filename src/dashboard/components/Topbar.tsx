import { LogOut, Menu, Search } from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { DashboardView } from '../types';
import { viewTitles } from '../utils';

type TopbarProps = {
  activeView: DashboardView;
  businessConfig: WorkspaceBusinessConfig;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  onLogout: () => void;
};

export const Topbar = ({
  activeView,
  businessConfig,
  search,
  onSearchChange,
  onOpenSidebar,
  onLogout,
}: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-30 bg-brand-30">
      <div className="flex w-full items-center gap-3 px-4 py-4 sm:px-6">
        <button
          onClick={onOpenSidebar}
          aria-label="Open dashboard navigation"
          className="mr-4 rounded-2xl border border-brand-60 bg-brand-60 p-2 text-brand-dark lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="hidden rounded-2xl border border-brand-60/70 bg-brand-60/60 px-4 py-2 lg:block">
          <div className="truncate text-[11px] uppercase tracking-[0.16em] text-brand-dark/60">
            {viewTitles[activeView]} • {businessConfig.label}
          </div>
        </div>

        <label className="flex w-full items-center gap-3 rounded-2xl border border-brand-30 bg-brand-60/50 px-4 py-3 text-brand-dark transition focus-within:bg-brand-60 focus-within:shadow-sm">
          <Search size={18} className="text-brand-dark/60" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Search ${businessConfig.customerPlural.toLowerCase()}, ${businessConfig.workPlural.toLowerCase()}, inventory...`}
            aria-label="Search dashboard"
            className="w-full bg-transparent text-sm outline-none placeholder:text-brand-dark/50"
          />
        </label>

        <a
          href="#top"
          className="hidden shrink-0 items-center gap-2 rounded-2xl border border-brand-dark/10 bg-white/55 px-3 py-2 text-xs font-semibold text-brand-dark/80 transition hover:bg-white xl:inline-flex"
        >
          <img src={`${import.meta.env.BASE_URL}aivyapari-logo.png`} alt="aivyapari" className="h-5 w-5 rounded-lg object-contain" />
          powered by aivyapari.com
        </a>

        <div className="shrink-0">
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-brand-dark/10 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5">
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
