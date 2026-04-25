import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  CalendarDays,
  Contact,
  CreditCard,
  History,
  Home,
  Package,
  CircleUserRound,
  Search,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { DashboardView } from '../types';
import { dashboardHash, defaultSidebarViews, getInitials, viewTitles } from '../utils';

const itemMap: Record<DashboardView, typeof Home> = {
  'sales-overview': Home,
  overview: CalendarDays,
  customers: Users,
  team: UsersRound,
  inventory: Package,
  'barcode-desk': Barcode,
  billing: CreditCard,
  'render-history': History,
  'ai-tools': Sparkles,
  crm: Contact,
  settings: Settings,
  profile: CircleUserRound,
};

const customizableViews = defaultSidebarViews;

type SidebarProps = {
  activeView: DashboardView;
  companyName: string;
  workspaceLogoUrl?: string;
  viewerName?: string;
  viewerLabel?: string;
  businessConfig: WorkspaceBusinessConfig;
  visibleViews: DashboardView[];
  canManageSidebar?: boolean;
  canViewProfile?: boolean;
  onNavigate: (view: DashboardView) => void;
  onSaveViews: (views: DashboardView[]) => Promise<void>;
  open: boolean;
  onClose: () => void;
};

const ManageSidebarModal = ({
  views,
  onClose,
  onSave,
}: {
  views: DashboardView[];
  onClose: () => void;
  onSave: (views: DashboardView[]) => Promise<void>;
}) => {
  const [draftViews, setDraftViews] = useState<DashboardView[]>(views);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftViews(views);
  }, [views]);

  const hiddenViews = customizableViews.filter((view) => !draftViews.includes(view));
  const loweredQuery = query.trim().toLowerCase();

  const filteredVisible = draftViews.filter((view) => viewTitles[view].toLowerCase().includes(loweredQuery));
  const filteredHidden = hiddenViews.filter((view) => viewTitles[view].toLowerCase().includes(loweredQuery));

  const moveView = (view: DashboardView, direction: -1 | 1) => {
    setDraftViews((current) => {
      const index = current.indexOf(view);
      if (index === -1) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addView = (view: DashboardView) => {
    setDraftViews((current) => (current.includes(view) ? current : [...current, view]));
  };

  const removeView = (view: DashboardView) => {
    setDraftViews((current) => current.filter((item) => item !== view));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await onSave(draftViews);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-3 pt-6 backdrop-blur-sm sm:items-center sm:pt-3">
      <div className="flex h-[min(92vh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
          <div>
            <div className="inline-flex rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              Sidebar manager
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">Choose what stays in the sidebar</h3>
            <p className="mt-1 text-sm text-brand-dark/70">
              Search workspace tools, add or remove them from the sidebar, and reorder the ones you use most.
            </p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sidebar items"
            className="w-full rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 text-sm text-brand-dark outline-none"
          />

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Visible in sidebar</div>
              <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {filteredVisible.length ? (
                  filteredVisible.map((view) => {
                    const Icon = itemMap[view];
                    const position = draftViews.indexOf(view);
                    return (
                      <div key={view} className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3">
                        <Icon size={17} className="text-brand-dark/75" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{viewTitles[view]}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveView(view, -1)}
                            disabled={position === 0}
                            className="rounded-xl border border-brand-30 bg-brand-60/30 p-2 text-brand-dark disabled:opacity-40"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveView(view, 1)}
                            disabled={position === draftViews.length - 1}
                            className="rounded-xl border border-brand-30 bg-brand-60/30 p-2 text-brand-dark disabled:opacity-40"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeView(view)}
                            className="rounded-xl border border-brand-30 bg-white px-3 py-2 text-xs font-semibold text-brand-dark"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-30 bg-white px-4 py-6 text-sm text-brand-dark/60">
                    No visible sidebar items match this search.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Hidden tools</div>
              <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {filteredHidden.length ? (
                  filteredHidden.map((view) => {
                    const Icon = itemMap[view];
                    return (
                      <div key={view} className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3">
                        <Icon size={17} className="text-brand-dark/75" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{viewTitles[view]}</span>
                        <button
                          type="button"
                          onClick={() => addView(view)}
                          className="rounded-xl border border-brand-30 bg-brand-10 px-3 py-2 text-xs font-semibold text-brand-60"
                        >
                          Add to sidebar
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-30 bg-white px-4 py-6 text-sm text-brand-dark/60">
                    No hidden tools match this search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-brand-30 bg-white px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={saving}
            className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save sidebar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = ({
  activeView,
  companyName,
  workspaceLogoUrl,
  viewerName,
  viewerLabel,
  businessConfig,
  visibleViews,
  canManageSidebar = true,
  canViewProfile = true,
  onNavigate,
  onSaveViews,
  open,
  onClose,
}: SidebarProps) => {
  const [manageOpen, setManageOpen] = useState(false);

  const orderedViews = useMemo(() => {
    const nextViews = visibleViews.filter((view): view is DashboardView => customizableViews.includes(view));
    return nextViews.length ? nextViews : canManageSidebar ? defaultSidebarViews : (['sales-overview'] as DashboardView[]);
  }, [canManageSidebar, visibleViews]);

  return (
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

          {canManageSidebar ? (
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
            >
              <Search size={16} />
              Manage sidebar
            </button>
          ) : null}

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            {viewerName ? (
              <div className="mb-4 rounded-2xl border border-brand-30 bg-white/65 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-brand-dark/50">{viewerLabel || 'User'}</div>
                <div className="mt-1 truncate text-sm font-semibold text-brand-dark">{viewerName}</div>
              </div>
            ) : null}

            <div className="space-y-1">
              {orderedViews.map((view) => {
                const Icon = itemMap[view];
                const active = view === activeView;
                return (
                  <a
                    key={view}
                    href={dashboardHash(view)}
                    onClick={() => {
                      onNavigate(view);
                      onClose();
                    }}
                    className={clsx(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                      active ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
                    )}
                  >
                    <Icon size={18} />
                    <span>{viewTitles[view]}</span>
                  </a>
                );
              })}
            </div>

            <div className="mt-6 pb-2">
              {orderedViews.includes('ai-tools') ? (
                <div className="rounded-3xl border border-brand-30 bg-transparent p-4">
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
                    className="mt-4 flex justify-center rounded-2xl border border-brand-30 bg-transparent px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-10 hover:text-brand-10"
                  >
                    Open AI tools
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {canManageSidebar || canViewProfile ? (
            <div className="mt-auto border-t border-brand-30 pt-4">
              <div className="space-y-1">
                {([...(canManageSidebar ? (['settings'] as const) : []), ...(canViewProfile ? (['profile'] as const) : [])] as DashboardView[]).map((view) => {
                  const Icon = view === 'settings' ? Settings : CircleUserRound;
                  return (
                    <a
                      key={view}
                      href={dashboardHash(view)}
                      onClick={() => {
                        onNavigate(view);
                        onClose();
                      }}
                      className={clsx(
                        'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                        activeView === view ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
                      )}
                    >
                      <Icon size={18} />
                      <span>{viewTitles[view]}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {manageOpen && canManageSidebar ? (
        <ManageSidebarModal
          views={orderedViews}
          onClose={() => setManageOpen(false)}
          onSave={onSaveViews}
        />
      ) : null}
    </>
  );
};
