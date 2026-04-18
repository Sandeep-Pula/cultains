import { Menu, Search, LogOut } from 'lucide-react';
import type { DashboardView } from '../types';

type TopbarProps = {
  activeView: DashboardView;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  onLogout: () => void;
};

export const Topbar = ({
  search,
  onSearchChange,
  onOpenSidebar,
  onLogout,
}: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-30 bg-brand-30">
      <div className="flex w-full items-center px-4 py-4 sm:px-6">
        <button
          onClick={onOpenSidebar}
          aria-label="Open dashboard navigation"
          className="mr-4 rounded-2xl border border-brand-60 bg-brand-60 p-2 text-brand-dark lg:hidden"
        >
          <Menu size={18} />
        </button>

        <label className="flex w-full items-center gap-3 rounded-2xl border border-brand-30 bg-brand-60/50 px-4 py-3 text-brand-dark focus-within:bg-brand-60 focus-within:shadow-sm transition">
          <Search size={18} className="text-brand-dark/60" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search dashboard..."
            aria-label="Search dashboard"
            className="w-full bg-transparent text-sm outline-none placeholder:text-brand-dark/50"
          />
        </label>

        <div className="ml-4 shrink-0">
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-brand-dark/10 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/5 transition">
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
