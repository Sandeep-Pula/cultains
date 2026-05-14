import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Barcode,
  BookOpen,
  Bot,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Contact,
  CreditCard,
  Calculator,
  GripVertical,
  History,
  Home,
  LifeBuoy,
  Mail,
  Package,
  FileSpreadsheet,
  CircleUserRound,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { DashboardView } from '../types';
import { dashboardHash, defaultSidebarViews, getInitials, viewTitles } from '../utils';

const itemMap: Record<DashboardView, typeof Home> = {
  'super-admin': ShieldCheck,
  'sales-overview': Home,
  overview: CalendarDays,
  customers: Users,
  team: UsersRound,
  inventory: Package,
  'barcode-desk': Barcode,
  'cash-register': Calculator,
  email: Mail,
  'tally-export': FileSpreadsheet,
  billing: CreditCard,
  'account-ledger': BookOpen,
  copilot: Bot,
  'raise-issue': LifeBuoy,
  'render-history': History,
  'ai-tools': Sparkles,
  crm: Contact,
  timesheet: CalendarClock,
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
  availableViews?: DashboardView[];
  unavailableViews?: DashboardView[];
  canManageSidebar?: boolean;
  canViewProfile?: boolean;
  onNavigate: (view: DashboardView) => void;
  onRequestUpgrade?: (view: DashboardView) => void;
  onSaveViews: (views: DashboardView[]) => Promise<void>;
  open: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose: () => void;
};

const ManageSidebarModal = ({
  views,
  availableViews,
  unavailableViews,
  onClose,
  onRequestUpgrade,
  onSave,
}: {
  views: DashboardView[];
  availableViews: DashboardView[];
  unavailableViews: DashboardView[];
  onClose: () => void;
  onRequestUpgrade?: (view: DashboardView) => void;
  onSave: (views: DashboardView[]) => Promise<void>;
}) => {
  const [draftViews, setDraftViews] = useState<DashboardView[]>(views);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedView, setDraggedView] = useState<DashboardView | null>(null);
  const [dropTarget, setDropTarget] = useState<'visible' | 'hidden' | null>(null);

  useEffect(() => {
    setDraftViews(views);
  }, [views]);

  const manageableViews = availableViews.filter((view): view is DashboardView => customizableViews.includes(view));
  const hiddenViews = manageableViews.filter((view) => !draftViews.includes(view));
  const loweredQuery = query.trim().toLowerCase();

  const filteredVisible = draftViews.filter((view) => viewTitles[view].toLowerCase().includes(loweredQuery));
  const filteredHidden = hiddenViews.filter((view) => viewTitles[view].toLowerCase().includes(loweredQuery));
  const filteredUnavailable = unavailableViews.filter((view) => viewTitles[view].toLowerCase().includes(loweredQuery));

  const reorderVisibleView = (view: DashboardView, targetView: DashboardView) => {
    if (view === targetView) return;

    setDraftViews((current) => {
      if (!current.includes(view) || !current.includes(targetView)) return current;

      const next = current.filter((item) => item !== view);
      const targetIndex = next.indexOf(targetView);
      next.splice(targetIndex, 0, view);
      return next;
    });
  };

  const moveToVisible = (view: DashboardView, targetView?: DashboardView) => {
    setDraftViews((current) => {
      if (current.includes(view)) {
        if (!targetView) return current;
        const next = current.filter((item) => item !== view);
        const targetIndex = next.indexOf(targetView);
        next.splice(targetIndex >= 0 ? targetIndex : next.length, 0, view);
        return next;
      }

      if (!targetView) return [...current, view];

      const targetIndex = current.indexOf(targetView);
      const next = [...current];
      next.splice(targetIndex >= 0 ? targetIndex : next.length, 0, view);
      return next;
    });
  };

  const moveToHidden = (view: DashboardView) => {
    setDraftViews((current) => current.filter((item) => item !== view));
  };

  const handleDragStart = (event: React.DragEvent, view: DashboardView) => {
    setDraggedView(view);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', view);
  };

  const handleDragEnd = () => {
    setDraggedView(null);
    setDropTarget(null);
  };

  const readDraggedView = (event: React.DragEvent): DashboardView | null => {
    const view = (draggedView || event.dataTransfer.getData('text/plain')) as DashboardView;
    return manageableViews.includes(view) ? view : null;
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

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Visible in sidebar</div>
              <div
                className={clsx(
                  'mt-4 max-h-[52vh] min-h-52 space-y-3 overflow-y-auto rounded-[24px] border border-dashed p-3 pr-1 transition',
                  dropTarget === 'visible' ? 'border-brand-10 bg-white' : 'border-brand-30/70 bg-white/45',
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget('visible');
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const view = readDraggedView(event);
                  if (view) moveToVisible(view);
                  handleDragEnd();
                }}
              >
                {filteredVisible.length ? (
                  filteredVisible.map((view) => {
                    const Icon = itemMap[view];
                    return (
                      <div
                        key={view}
                        draggable
                        onDragStart={(event) => handleDragStart(event, view)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const dragged = readDraggedView(event);
                          if (dragged) {
                            event.dataTransfer.dropEffect = 'move';
                            setDropTarget('visible');
                            if (draftViews.includes(dragged)) reorderVisibleView(dragged, view);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const dragged = readDraggedView(event);
                          if (dragged) moveToVisible(dragged, view);
                          handleDragEnd();
                        }}
                        className={clsx(
                          'flex cursor-grab items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 transition active:cursor-grabbing',
                          draggedView === view && 'opacity-45',
                        )}
                      >
                        <GripVertical size={18} className="shrink-0 text-brand-dark/35" aria-hidden="true" />
                        <Icon size={17} className="text-brand-dark/75" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{viewTitles[view]}</span>
                        <span className="rounded-full border border-brand-30 bg-brand-60/35 px-3 py-1 text-xs font-semibold text-brand-dark/60">
                          Drag
                        </span>
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
              <p className="mt-1 text-xs leading-5 text-brand-dark/55">Included in your plan. Drag them into the sidebar when needed.</p>
              <div
                className={clsx(
                  'mt-4 max-h-[52vh] min-h-52 space-y-3 overflow-y-auto rounded-[24px] border border-dashed p-3 pr-1 transition',
                  dropTarget === 'hidden' ? 'border-brand-10 bg-white' : 'border-brand-30/70 bg-white/45',
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget('hidden');
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const view = readDraggedView(event);
                  if (view) moveToHidden(view);
                  handleDragEnd();
                }}
              >
                {filteredHidden.length ? (
                  filteredHidden.map((view) => {
                    const Icon = itemMap[view];
                    return (
                      <div
                        key={view}
                        draggable
                        onDragStart={(event) => handleDragStart(event, view)}
                        onDragEnd={handleDragEnd}
                        className={clsx(
                          'flex cursor-grab items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 transition active:cursor-grabbing',
                          draggedView === view && 'opacity-45',
                        )}
                      >
                        <GripVertical size={18} className="shrink-0 text-brand-dark/35" aria-hidden="true" />
                        <Icon size={17} className="text-brand-dark/75" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{viewTitles[view]}</span>
                        <span className="rounded-full border border-brand-30 bg-brand-60/35 px-3 py-1 text-xs font-semibold text-brand-dark/60">
                          Drag
                        </span>
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

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Other tools</div>
              <p className="mt-1 text-xs leading-5 text-brand-dark/55">Not included in your current plan. Upgrade to use these tools.</p>
              <div className="mt-4 max-h-[52vh] min-h-52 space-y-3 overflow-y-auto rounded-[24px] border border-dashed border-brand-30/70 bg-white/45 p-3 pr-1">
                {filteredUnavailable.length ? (
                  filteredUnavailable.map((view) => {
                    const Icon = itemMap[view];
                    return (
                      <div
                        key={view}
                        className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 opacity-80"
                      >
                        <Icon size={17} className="text-brand-dark/55" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{viewTitles[view]}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onRequestUpgrade?.(view);
                            onClose();
                          }}
                          className="rounded-full border border-brand-30 bg-brand-60/35 px-3 py-1 text-xs font-semibold text-brand-dark/60"
                        >
                          Upgrade
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-30 bg-white px-4 py-6 text-sm text-brand-dark/60">
                    Every dashboard tool is included in this plan.
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
  availableViews,
  unavailableViews,
  canManageSidebar = true,
  canViewProfile = true,
  onNavigate,
  onRequestUpgrade,
  onSaveViews,
  open,
  collapsed = false,
  onToggleCollapse,
  onClose,
}: SidebarProps) => {
  const [manageOpen, setManageOpen] = useState(false);

  const orderedViews = useMemo(() => {
    const nextViews = visibleViews.filter((view): view is DashboardView => customizableViews.includes(view));
    return nextViews.length ? nextViews : (['sales-overview'] as DashboardView[]);
  }, [visibleViews]);
  const planAvailableViews = useMemo(
    () => (availableViews?.length ? availableViews : orderedViews).filter((view): view is DashboardView => customizableViews.includes(view)),
    [availableViews, orderedViews],
  );
  const planUnavailableViews = useMemo(
    () => (unavailableViews ?? customizableViews.filter((view) => !planAvailableViews.includes(view))).filter((view): view is DashboardView => customizableViews.includes(view)),
    [planAvailableViews, unavailableViews],
  );

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
          'fixed inset-y-0 left-0 z-50 border-r border-brand-60/30 bg-brand-30 px-5 py-6 shadow-xl transition-all duration-300 lg:translate-x-0 lg:shadow-none',
          collapsed ? 'lg:w-24' : 'lg:w-72',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className={clsx('flex items-center', collapsed ? 'justify-center lg:justify-between' : 'justify-between')}>
            <a href="#dashboard" className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-brand-60 bg-brand-60 shadow-sm">
                {workspaceLogoUrl ? (
                  <img src={workspaceLogoUrl} alt={companyName} className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-xs font-bold uppercase text-brand-10">{getInitials(companyName)}</span>
                )}
              </span>
              <div className={clsx('min-w-0', collapsed && 'hidden lg:hidden')}>
                <div className="truncate text-lg font-semibold text-brand-dark">{companyName}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-brand-dark/70">{businessConfig.label} workspace</div>
              </div>
            </a>
            <div className="flex items-center gap-2">
              {onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="hidden rounded-xl border border-brand-30 bg-white/70 p-2 text-brand-dark lg:inline-flex"
                >
                  {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              ) : null}
              <button onClick={onClose} aria-label="Close dashboard navigation" className="rounded-xl p-2 text-brand-dark lg:hidden">
                <X size={18} />
              </button>
            </div>
          </div>

          {canManageSidebar && !collapsed ? (
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
            >
              <Search size={16} />
              Manage sidebar
            </button>
          ) : null}

          <div className={clsx('min-h-0 flex-1 overflow-y-auto', collapsed ? 'mt-8 pr-0' : 'mt-6 pr-1')}>
            {viewerName && !collapsed ? (
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
                      'flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition',
                      collapsed ? 'justify-center gap-0' : 'gap-3',
                      active ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
                    )}
                    title={collapsed ? viewTitles[view] : undefined}
                  >
                    <Icon size={18} />
                    {!collapsed ? <span>{viewTitles[view]}</span> : null}
                  </a>
                );
              })}
            </div>

            <div className="mt-6 pb-2">
              {orderedViews.includes('ai-tools') && !collapsed ? (
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
                        'flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition',
                        collapsed ? 'justify-center gap-0' : 'gap-3',
                        activeView === view ? 'bg-brand-60 text-brand-10' : 'text-brand-dark/90 hover:bg-brand-60/50',
                      )}
                      title={collapsed ? viewTitles[view] : undefined}
                    >
                      <Icon size={18} />
                      {!collapsed ? <span>{viewTitles[view]}</span> : null}
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
          availableViews={planAvailableViews}
          unavailableViews={planUnavailableViews}
          onClose={() => setManageOpen(false)}
          onRequestUpgrade={onRequestUpgrade}
          onSave={onSaveViews}
        />
      ) : null}
    </>
  );
};
