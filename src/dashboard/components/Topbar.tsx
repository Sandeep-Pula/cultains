import { LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { DashboardView } from '../types';
import { viewTitles } from '../utils';
import { ProductWordmark } from '../../components/BrandWordmark';
import { AivaAvatar } from './AIBusinessAssistant';

export type TopbarSearchResult = {
  id: string;
  type: 'inventory' | 'customer' | 'team';
  title: string;
  subtitle: string;
  badge: string;
};

type TopbarProps = {
  activeView: DashboardView;
  businessConfig: WorkspaceBusinessConfig;
  search: string;
  onSearchChange: (value: string) => void;
  searchResults: TopbarSearchResult[];
  onSearchResultSelect: (result: TopbarSearchResult) => void;
  onOpenSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarCollapsed: boolean;
  onOpenAiva: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
};

export const Topbar = ({
  activeView,
  businessConfig,
  search,
  onSearchChange,
  searchResults,
  onSearchResultSelect,
  onOpenSidebar,
  onOpenAiva,
  darkMode,
  onToggleDarkMode,
  onLogout,
}: TopbarProps) => {
  const hasSearch = search.trim().length > 0;

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

        <div className="relative w-full">
          <label className="flex w-full items-center gap-3 rounded-2xl border border-brand-30 bg-brand-60/60 px-4 py-3 text-brand-dark transition focus-within:border-brand-10/40 focus-within:bg-white focus-within:shadow-sm">
            <Search size={18} className="text-brand-dark/60" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) {
                  event.preventDefault();
                  onSearchResultSelect(searchResults[0]);
                }
              }}
              placeholder={`Search ${businessConfig.customerPlural.toLowerCase()}, ${businessConfig.workPlural.toLowerCase()}, inventory...`}
              aria-label="Search dashboard"
              className="w-full bg-transparent text-sm outline-none placeholder:text-brand-dark/50"
            />
          </label>

          {hasSearch ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-40 overflow-hidden rounded-[24px] border border-brand-30 bg-white shadow-xl">
              {searchResults.length ? (
                <div className="max-h-80 overflow-y-auto p-2">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onSearchResultSelect(result)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-brand-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-brand-dark">{result.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-brand-dark/60">{result.subtitle}</span>
                      </span>
                      <span className="shrink-0 rounded-full border border-brand-30 bg-brand-60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-dark/70">
                        {result.badge}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-brand-dark/60">No matching dashboard records found.</div>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenAiva}
          className="shrink-0 flex items-center justify-center transition hover:-translate-y-0.5"
          aria-label="Open AIVA assistant"
        >
          <AivaAvatar size="sm" />
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="shrink-0 rounded-2xl border border-brand-dark/10 bg-white/55 p-2.5 text-brand-dark transition hover:bg-white"
          aria-label={darkMode ? 'Switch dashboard to light mode' : 'Switch dashboard to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <a
          href="#top"
          className="hidden shrink-0 items-center gap-2 rounded-2xl border border-brand-dark/10 bg-white/55 px-3 py-2 text-xs font-semibold text-brand-dark/80 transition hover:bg-white xl:inline-flex"
        >
          <span>
            powered by <ProductWordmark />
          </span>
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
