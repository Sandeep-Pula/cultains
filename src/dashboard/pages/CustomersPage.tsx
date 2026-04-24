import { MapPin, Phone, Pin, Plus, Trash2, Users, Flame, AlertCircle, Archive } from 'lucide-react';
import type { CustomerFilters, CustomerProject, DeletedCustomerRecord, TeamMember } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { filterCustomers, formatDate, getCustomerOwner, relativeDate, siteBadgeClass } from '../utils';
import { FilterToolbar } from '../components/FilterToolbar';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyStatePanel } from '../components/EmptyStatePanel';

type CustomersPageProps = {
  customers: CustomerProject[];
  deletedCustomers: DeletedCustomerRecord[];
  team: TeamMember[];
  businessConfig: WorkspaceBusinessConfig;
  filters: CustomerFilters;
  onFiltersChange: (next: Partial<CustomerFilters>) => void;
  onOpenCustomer: (customerId: string) => void;
  onTogglePinned: (customerId: string) => void;
  onAddCustomer: () => void;
  onDeleteCustomer: (customerId: string) => void;
};

export const CustomersPage = ({
  customers,
  deletedCustomers,
  team,
  businessConfig,
  filters,
  onFiltersChange,
  onOpenCustomer,
  onTogglePinned,
  onAddCustomer,
  onDeleteCustomer,
}: CustomersPageProps) => {
  const filteredCustomers = filterCustomers(customers, filters);

  return (
    <div className="flex xl:h-[calc(100vh-8rem)] min-h-[700px] flex-col gap-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[2.5fr_1fr]">
        
        {/* Left Pane - Active Roster */}
        <div className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between border-b border-brand-30 bg-brand-60/40 px-6 py-5 shrink-0">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-brand-dark">Active Roster</h1>
              <p className="mt-0.5 text-xs text-brand-dark/80">{filteredCustomers.length} {businessConfig.customerPlural.toLowerCase()} mapped in your workspace</p>
            </div>
            <button onClick={onAddCustomer} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-brand-60 transition hover:bg-brand-dark hover:text-white">
              <Plus size={16} />
              Add {businessConfig.customerLabel}
            </button>
          </div>
          
          <div className="shrink-0 border-b border-brand-30 bg-white px-4 py-3">
            <FilterToolbar filters={filters} team={team} stageLabels={businessConfig.stageLabels} onChange={onFiltersChange} />
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-4 space-y-3 hide-scrollbar">
            {customers.length === 0 ? (
              <EmptyStatePanel
                icon={Plus}
                title={`No ${businessConfig.customerPlural.toLowerCase()} yet`}
                description={`Start with your first ${businessConfig.customerLabel.toLowerCase()} record so you can track ${businessConfig.workLabel.toLowerCase()} status, notes, and follow-ups in one place.`}
                actions={[
                  { label: `Create first ${businessConfig.customerLabel.toLowerCase()}`, onClick: onAddCustomer, emphasis: 'primary' },
                  { label: 'Open AI tools', onClick: () => (window.location.hash = '#dashboard/ai-tools') },
                ]}
              />
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-30 bg-brand-60/50 p-10 text-center">
                <div className="text-lg font-semibold text-brand-dark">No {businessConfig.customerPlural.toLowerCase()} found</div>
                <p className="mt-1 text-sm text-brand-dark/80">Try a different search or clear some filters.</p>
                <button onClick={() => onFiltersChange({ search: '', stage: 'all', ownerId: 'all', completion: 'all', sortBy: 'latest' })} className="mt-4 rounded-2xl bg-white border border-brand-30 px-4 py-2 text-sm font-medium text-brand-dark">
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredCustomers.map((customer) => {
                  const owner = getCustomerOwner(customer, team);
                  return (
                    <button
                      key={customer.id}
                      onClick={() => onOpenCustomer(customer.id)}
                      className="group flex flex-col justify-between rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm transition hover:border-brand-10 hover:shadow-md text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-brand-dark text-lg">{customer.customerName}</span>
                            {customer.priority === 'high' ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] uppercase font-bold text-rose-700">High priority</span> : null}
                          </div>
                          <div className="mt-1 text-sm text-brand-dark/80">{customer.title} • {customer.location}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onTogglePinned(customer.id);
                            }}
                            aria-label={customer.pinned ? 'Unpin customer' : 'Pin customer'}
                            className={`rounded-full p-2 hover:bg-brand-30/50 ${customer.pinned ? 'text-brand-10' : 'text-brand-dark/30'}`}
                          >
                            <Pin size={16} className={customer.pinned ? 'fill-current' : ''} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteCustomer(customer.id);
                            }}
                            className="rounded-full p-2 text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <StatusBadge stage={customer.stage} />
                          <div className="flex flex-wrap gap-2 text-[11px] mt-2">
                            <span className={siteBadgeClass(customer.siteStatus)}>{businessConfig.siteStatusLabels[customer.siteStatus]}</span>
                            {customer.needsFollowUp ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 font-medium">Needs follow-up</span> : null}
                            {customer.renderPending ? <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700 font-medium">Render pending</span> : null}
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm text-brand-dark/80 border-l border-brand-30/60 pl-4">
                          <div className="flex items-center gap-2"><Phone size={13} className="opacity-60" /> {customer.phone}</div>
                          <div className="flex items-center gap-2"><MapPin size={13} className="opacity-60" /> {customer.location}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-brand-30 pt-4">
                        <div className="text-xs font-medium text-brand-dark/70">
                          Owner: <span className="text-brand-dark ml-1">{owner?.name ?? 'Unassigned'}</span>
                        </div>
                        <div className="text-xs font-medium text-brand-dark/50">
                          Updated: {relativeDate(customer.lastUpdated)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - History & Archives */}
        <div className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between border-b border-brand-30 bg-brand-60/40 px-6 py-5 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">{businessConfig.customerLabel} cleanup</h2>
              <p className="mt-0.5 text-xs text-brand-dark/60">Archived or removed records</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-brand-60/20 space-y-3 hide-scrollbar">
            {deletedCustomers.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-brand-dark/50 border-2 border-dashed border-brand-30 rounded-2xl bg-white">
                No history to show.
              </div>
            ) : (
              deletedCustomers.map((record) => (
                <div key={record.id} className="rounded-2xl bg-white border border-brand-30 px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[15px] text-brand-dark">{record.customerName}</div>
                      <div className="mt-1 text-xs text-brand-dark/70">{record.title} • {record.location}</div>
                      <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-white bg-brand-dark/90 inline-block px-2 py-0.5 rounded-full">{record.lastStage.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-right text-xs text-brand-dark/60 font-medium">
                      <div>{formatDate(record.deletedAt)}</div>
                      <div className="mt-1">by {record.deletedBy}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Pane - Analytics Overview Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 lg:gap-6 shrink-0 h-auto sm:h-36">
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <Users size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Total {businessConfig.customerPlural}</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{customers.length}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <Flame size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">High Priority</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{customers.filter((c) => c.priority === 'high').length}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <AlertCircle size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Needs Attention</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{customers.filter((c) => c.needsFollowUp || c.renderPending).length}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <Archive size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Archived {businessConfig.workPlural}</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{deletedCustomers.length}</div>
        </div>
      </div>
    </div>
  );
};
