import { Mail, MapPin, Phone, Pin, Plus, Star, Trash2 } from 'lucide-react';
import type { CustomerFilters, CustomerProject, DeletedCustomerRecord, TeamMember } from '../types';
import { filterCustomers, formatDate, getCustomerOwner, relativeDate, siteBadgeClass, siteStatusLabels } from '../utils';
import { FilterToolbar } from '../components/FilterToolbar';
import { StatusBadge } from '../components/StatusBadge';

type CustomersPageProps = {
  customers: CustomerProject[];
  deletedCustomers: DeletedCustomerRecord[];
  team: TeamMember[];
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
  filters,
  onFiltersChange,
  onOpenCustomer,
  onTogglePinned,
  onAddCustomer,
  onDeleteCustomer,
}: CustomersPageProps) => {
  const filteredCustomers = filterCustomers(customers, filters);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Customer workspace</h1>
          <p className="mt-1 text-brand-dark/80">Search, filter, and open any customer project from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-brand-dark/60">{filteredCustomers.length} customers shown</div>
          <button onClick={onAddCustomer} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60">
            <Plus size={16} />
            Add customer
          </button>
        </div>
      </div>

      <FilterToolbar filters={filters} team={team} onChange={onFiltersChange} />

      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-30 bg-white p-10 text-center">
          <div className="text-xl font-semibold text-brand-dark">No customers found</div>
          <p className="mt-2 text-brand-dark/80">Try a different search or clear some filters to see projects again.</p>
          <button onClick={() => onFiltersChange({ search: '', stage: 'all', ownerId: 'all', completion: 'all', sortBy: 'latest' })} className="mt-4 rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-brand-60">
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-brand-30 bg-white shadow-sm xl:block">
            <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-brand-30 bg-brand-60 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/60">
              <div>Customer</div>
              <div>Project</div>
              <div>Status</div>
              <div>Owner</div>
              <div>Last updated</div>
              <div>Renders</div>
            </div>
            {filteredCustomers.map((customer) => {
              const owner = getCustomerOwner(customer, team);
              return (
                <button
                  key={customer.id}
                  onClick={() => onOpenCustomer(customer.id)}
                  className="grid w-full grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-brand-30/60 px-6 py-5 text-left transition hover:bg-brand-60/70"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand-dark">{customer.customerName}</span>
                      {customer.priority === 'high' ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">High priority</span> : null}
                    </div>
                    <div className="mt-1 text-sm text-brand-dark/80">{customer.location}</div>
                  </div>
                  <div>
                    <div className="font-medium text-brand-dark">{customer.title}</div>
                    <div className="mt-1 text-sm text-brand-dark/80">{siteStatusLabels[customer.siteStatus]}</div>
                  </div>
                  <div className="space-y-2">
                    <StatusBadge stage={customer.stage} />
                    {(customer.needsFollowUp || customer.renderPending) ? (
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {customer.needsFollowUp ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Needs follow-up</span> : null}
                        {customer.renderPending ? <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">Render pending</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-brand-dark/85">{owner?.name ?? 'Unassigned'}</div>
                  <div className="text-sm text-brand-dark/85">{relativeDate(customer.lastUpdated)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-brand-dark">{customer.renderCount}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onTogglePinned(customer.id);
                        }}
                        className="rounded-full p-2 text-brand-dark/60 hover:bg-brand-30/50"
                      >
                        <Pin size={15} className={customer.pinned ? 'fill-[var(--color-brand-10)] text-[var(--color-brand-10)]' : ''} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteCustomer(customer.id);
                        }}
                        className="rounded-full p-2 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:hidden">
            {filteredCustomers.map((customer) => {
              const owner = getCustomerOwner(customer, team);
              return (
                <button
                  key={customer.id}
                  onClick={() => onOpenCustomer(customer.id)}
                  className="rounded-3xl border border-brand-30 bg-white p-5 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-brand-dark">{customer.customerName}</div>
                        {customer.priority === 'high' ? <Star size={14} className="text-rose-500" /> : null}
                      </div>
                      <div className="mt-1 text-sm text-brand-dark/80">{customer.title}</div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onTogglePinned(customer.id);
                      }}
                      className="rounded-full bg-brand-30/40 p-2 text-brand-10"
                    >
                      <Pin size={15} className={customer.pinned ? 'fill-[var(--color-brand-10)] text-[var(--color-brand-10)]' : ''} />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge stage={customer.stage} />
                    <span className={siteBadgeClass(customer.siteStatus)}>{siteStatusLabels[customer.siteStatus]}</span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-brand-dark/80">
                    <div className="flex items-center gap-2"><Phone size={14} /> {customer.phone}</div>
                    <div className="flex items-center gap-2"><Mail size={14} /> {customer.email}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} /> {customer.location}</div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-brand-dark/85">
                    <span>{owner?.name ?? 'Unassigned'}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatDate(customer.lastUpdated)}</span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteCustomer(customer.id);
                        }}
                        className="rounded-full bg-rose-50 p-2 text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-dark">Customer history</h2>
          <span className="text-sm text-brand-dark/60">{deletedCustomers.length} archived/deleted</span>
        </div>
        <div className="mt-4 grid gap-3">
          {deletedCustomers.map((record) => (
            <div key={record.id} className="rounded-2xl bg-brand-60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-brand-dark">{record.customerName}</div>
                  <div className="mt-1 text-sm text-brand-dark/80">{record.title} • {record.location}</div>
                </div>
                <div className="text-right text-sm text-brand-dark/80">
                  <div>{formatDate(record.deletedAt)}</div>
                  <div className="mt-1">by {record.deletedBy}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
