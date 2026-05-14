import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Filter,
  Package,
  Receipt,
  Search,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { DashboardData, DashboardView, SalesInvoice } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { SalesInvoiceDetailModal } from '../components/SalesInvoiceDetailModal';
import { formatCurrency, formatDateTime, relativeDate } from '../utils';

type SalesOverviewPageProps = {
  data: DashboardData;
  businessConfig: WorkspaceBusinessConfig;
  onNavigate: (view: DashboardView) => void;
  onAddCustomer: () => void;
  onAddTeamMember: () => void;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
const startOfWeek = (value: Date) => {
  const next = startOfDay(value);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
};
const endOfWeek = (value: Date) => {
  const next = startOfWeek(value);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
};
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (value: Date) => new Date(value.getFullYear(), 0, 1);
const endOfYear = (value: Date) => new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999);

type InvoiceRange = 'all' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'this-year';
type InvoicePaymentFilter = 'all' | 'paid' | 'pending';

const todayInvoices = (salesInvoices: SalesInvoice[]) => {
  const today = new Date();
  const start = startOfDay(today).getTime();
  const end = endOfDay(today).getTime();

  return salesInvoices.filter((invoice) => {
    if (invoice.status === 'draft') return false;
    const createdAt = new Date(invoice.createdAt).getTime();
    return createdAt >= start && createdAt <= end;
  });
};

const summarizeInvoices = (salesInvoices: SalesInvoice[]) => ({
  count: salesInvoices.length,
  total: salesInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
  pending: salesInvoices
    .filter((invoice) => invoice.paymentStatus === 'pending')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0),
});

const filterInvoicesByRange = (salesInvoices: SalesInvoice[], range: InvoiceRange) => {
  const finalized = salesInvoices.filter((invoice) => invoice.status !== 'draft');
  if (range === 'all') return finalized;

  const today = new Date();
  let start = startOfDay(today);
  let end = endOfDay(today);

  if (range === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    start = startOfDay(yesterday);
    end = endOfDay(yesterday);
  } else if (range === 'this-week') {
    start = startOfWeek(today);
    end = endOfWeek(today);
  } else if (range === 'this-month') {
    start = startOfMonth(today);
    end = endOfMonth(today);
  } else if (range === 'this-year') {
    start = startOfYear(today);
    end = endOfYear(today);
  }

  const startTime = start.getTime();
  const endTime = end.getTime();
  return finalized.filter((invoice) => {
    const createdAt = new Date(invoice.createdAt).getTime();
    return createdAt >= startTime && createdAt <= endTime;
  });
};

const MetricTile = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => (
  <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
    <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">{label}</div>
    <div className="mt-3 text-3xl font-semibold tracking-tight text-brand-dark">{value}</div>
    <div className="mt-2 text-sm leading-5 text-brand-dark/65">{helper}</div>
  </div>
);

const QuickAction = ({
  icon: Icon,
  label,
  helper,
  onClick,
}: {
  icon: typeof Wallet;
  label: string;
  helper: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-4 rounded-[22px] border border-brand-30 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10 hover:shadow-md"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
      <Icon size={19} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-brand-dark">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-brand-dark/60">{helper}</span>
    </span>
    <ArrowRight size={16} className="shrink-0 text-brand-dark/45 transition group-hover:translate-x-1 group-hover:text-brand-10" />
  </button>
);

const FocusItem = ({
  title,
  helper,
  actionLabel,
  onClick,
  tone = 'neutral',
}: {
  title: string;
  helper: string;
  actionLabel: string;
  onClick: () => void;
  tone?: 'neutral' | 'warning' | 'good';
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-start gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-left transition hover:border-brand-10 hover:bg-brand-60/35"
  >
    <span
      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
        tone === 'warning' ? 'bg-amber-500' : tone === 'good' ? 'bg-emerald-500' : 'bg-brand-10'
      }`}
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-brand-dark">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-brand-dark/60">{helper}</span>
    </span>
    <span className="shrink-0 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark/65">{actionLabel}</span>
  </button>
);

export const SalesOverviewPage = ({
  data,
  businessConfig,
  onNavigate,
  onAddCustomer,
  onAddTeamMember,
}: SalesOverviewPageProps) => {
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [invoiceRange, setInvoiceRange] = useState<InvoiceRange>('all');
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<InvoicePaymentFilter>('all');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const companyName = data.profile.companyName || 'your business';

  const todaySummary = useMemo(() => summarizeInvoices(todayInvoices(data.salesInvoices)), [data.salesInvoices]);
  const pendingInvoices = useMemo(
    () =>
      data.salesInvoices
        .filter((invoice) => invoice.status !== 'draft' && invoice.paymentStatus === 'pending')
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [data.salesInvoices],
  );
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const lowStockItems = useMemo(
    () =>
      data.inventory
        .filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock' || item.currentStock <= item.minimumStock)
        .sort((left, right) => left.currentStock - right.currentStock),
    [data.inventory],
  );
  const upcomingTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => !task.done)
        .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()),
    [data.tasks],
  );
  const followUps = useMemo(
    () =>
      data.customers
        .filter((customer) => customer.stage !== 'completed' && customer.needsFollowUp)
        .sort((left, right) => new Date(left.nextFollowUpAt || left.lastContactedAt).getTime() - new Date(right.nextFollowUpAt || right.lastContactedAt).getTime()),
    [data.customers],
  );
  const recentInvoices = useMemo(
    () =>
      data.salesInvoices
        .filter((invoice) => invoice.status !== 'draft')
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5),
    [data.salesInvoices],
  );
  const filteredInvoiceRecords = useMemo(() => {
    const loweredQuery = invoiceQuery.trim().toLowerCase();
    return filterInvoicesByRange(data.salesInvoices, invoiceRange)
      .filter((invoice) => invoicePaymentFilter === 'all' || invoice.paymentStatus === invoicePaymentFilter)
      .filter((invoice) => {
        if (!loweredQuery) return true;
        return (
          invoice.invoiceNumber.toLowerCase().includes(loweredQuery) ||
          invoice.customerName.toLowerCase().includes(loweredQuery) ||
          invoice.paymentMethod.replace('_', ' ').toLowerCase().includes(loweredQuery)
        );
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [data.salesInvoices, invoicePaymentFilter, invoiceQuery, invoiceRange]);
  const filteredInvoiceSummary = summarizeInvoices(filteredInvoiceRecords);
  const urgentCount = pendingInvoices.length + lowStockItems.length + followUps.length + upcomingTasks.length;

  return (
    <>
      <div className="space-y-5">
        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                <Wallet size={14} />
                Overview
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                Today at {companyName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-dark/70 sm:text-base">
                A simple daily view for sales, payments, stock, and follow-ups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Create invoice
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Today sales" value={formatCurrency(todaySummary.total)} helper={`${todaySummary.count} invoice(s) today`} />
            <MetricTile label="Pending payments" value={formatCurrency(pendingTotal)} helper={`${pendingInvoices.length} invoice(s) need collection`} />
            <MetricTile label="Stock alerts" value={String(lowStockItems.length)} helper="Items at or below minimum stock" />
            <MetricTile label="Today focus" value={String(urgentCount)} helper="Payments, stock, tasks, and follow-ups" />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-dark">Needs attention</h2>
                <p className="mt-1 text-sm text-brand-dark/60">Handle these first. If this list is empty, the day is under control.</p>
              </div>
              <AlertTriangle size={20} className="shrink-0 text-amber-600" />
            </div>
            <div className="mt-5 space-y-3">
              {pendingInvoices.slice(0, 2).map((invoice) => (
                <FocusItem
                  key={invoice.id}
                  title={`Collect ${formatCurrency(invoice.totalAmount)} from ${invoice.customerName || 'customer'}`}
                  helper={`${invoice.invoiceNumber} • created ${relativeDate(invoice.createdAt)}`}
                  actionLabel="Billing"
                  onClick={() => onNavigate('billing')}
                  tone="warning"
                />
              ))}
              {lowStockItems.slice(0, 2).map((item) => (
                <FocusItem
                  key={item.id}
                  title={`${item.name} is low in stock`}
                  helper={`${item.currentStock} ${item.unit} left • minimum ${item.minimumStock} ${item.unit}`}
                  actionLabel="Stock"
                  onClick={() => onNavigate('inventory')}
                  tone="warning"
                />
              ))}
              {followUps.slice(0, 2).map((customer) => (
                <FocusItem
                  key={customer.id}
                  title={`Follow up with ${customer.customerName}`}
                  helper={customer.nextFollowUpAt ? `Due ${relativeDate(customer.nextFollowUpAt)}` : `Last contacted ${relativeDate(customer.lastContactedAt)}`}
                  actionLabel="CRM"
                  onClick={() => onNavigate('crm')}
                />
              ))}
              {!pendingInvoices.length && !lowStockItems.length && !followUps.length ? (
                <FocusItem
                  title="No urgent action right now"
                  helper="Payments, stock, and follow-ups look calm."
                  actionLabel="Good"
                  onClick={() => onNavigate('overview')}
                  tone="good"
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-dark">Quick actions</h2>
            <p className="mt-1 text-sm text-brand-dark/60">Common owner actions, one click away.</p>
            <div className="mt-5 space-y-3">
              <QuickAction icon={Receipt} label="New invoice" helper="Open billing and create a sale." onClick={() => onNavigate('billing')} />
              <QuickAction icon={Wallet} label="Cash register" helper="Fast billing from saved items." onClick={() => onNavigate('cash-register')} />
              <QuickAction icon={UserPlus} label={`Add ${businessConfig.customerLabel.toLowerCase()}`} helper="Create a new customer or lead." onClick={onAddCustomer} />
              <QuickAction icon={Package} label="Add stock item" helper="Open inventory to update stock." onClick={() => onNavigate('inventory')} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-brand-dark">Upcoming work</h2>
                <p className="mt-1 text-sm text-brand-dark/60">Tasks and team activity for the next move.</p>
              </div>
              <CalendarClock size={20} className="text-brand-10" />
            </div>
            <div className="mt-5 space-y-3">
              {upcomingTasks.slice(0, 4).map((task) => (
                <FocusItem
                  key={task.id}
                  title={task.title}
                  helper={`Due ${relativeDate(task.dueAt)} • ${task.priority} priority`}
                  actionLabel="Calendar"
                  onClick={() => onNavigate('overview')}
                  tone={task.priority === 'high' ? 'warning' : 'neutral'}
                />
              ))}
              {!upcomingTasks.length ? (
                <EmptyStatePanel
                  compact
                  icon={CheckCircle2}
                  title="No open tasks"
                  description="Use Business Calendar when you need to schedule follow-ups or team work."
                  actions={[{ label: 'Open calendar', onClick: () => onNavigate('overview'), emphasis: 'primary' }]}
                />
              ) : null}
              {!data.team.length ? (
                <button
                  type="button"
                  onClick={onAddTeamMember}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:border-brand-10 hover:text-brand-10"
                >
                  <UserPlus size={16} />
                  Add team member
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-brand-dark">Recent invoices</h2>
                <p className="mt-1 text-sm text-brand-dark/60">Latest finalized bills. Tap any bill to preview.</p>
              </div>
              <Receipt size={20} className="text-brand-10" />
            </div>
            <div className="mt-5 space-y-3">
              {recentInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => setSelectedInvoice(invoice)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-left transition hover:border-brand-10 hover:bg-brand-60/35"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-brand-dark">{invoice.customerName || invoice.invoiceNumber}</span>
                    <span className="mt-1 block text-xs text-brand-dark/60">{invoice.invoiceNumber} • {formatDateTime(invoice.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</span>
                </button>
              ))}
              {!recentInvoices.length ? (
                <EmptyStatePanel
                  compact
                  icon={Receipt}
                  title="No invoices yet"
                  description="Create the first invoice to start seeing sales and payment status here."
                  actions={[{ label: 'Create invoice', onClick: () => onNavigate('billing'), emphasis: 'primary' }]}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="border-b border-brand-30 bg-brand-60/30 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                  <Filter size={14} />
                  Invoice records
                </div>
                <h2 className="mt-3 text-xl font-semibold text-brand-dark">Complete invoice history</h2>
                <p className="mt-1 text-sm text-brand-dark/60">Use filters when you need the full invoice record beyond recent bills.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:min-w-[42rem]">
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Period</span>
                  <select
                    value={invoiceRange}
                    onChange={(event) => setInvoiceRange(event.target.value as InvoiceRange)}
                    className="rounded-2xl border border-brand-30 bg-white px-4 py-3 outline-none transition focus:border-brand-10"
                  >
                    <option value="all">All invoices</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This week</option>
                    <option value="this-month">This month</option>
                    <option value="this-year">This year</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Payment</span>
                  <select
                    value={invoicePaymentFilter}
                    onChange={(event) => setInvoicePaymentFilter(event.target.value as InvoicePaymentFilter)}
                    className="rounded-2xl border border-brand-30 bg-white px-4 py-3 outline-none transition focus:border-brand-10"
                  >
                    <option value="all">All payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Search</span>
                  <span className="flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 transition focus-within:border-brand-10">
                    <Search size={16} className="text-brand-dark/45" />
                    <input
                      value={invoiceQuery}
                      onChange={(event) => setInvoiceQuery(event.target.value)}
                      placeholder="Invoice or customer"
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-brand-dark/40"
                    />
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricTile label="Filtered total" value={formatCurrency(filteredInvoiceSummary.total)} helper={`${filteredInvoiceSummary.count} invoice(s) found`} />
              <MetricTile label="Pending in filter" value={formatCurrency(filteredInvoiceSummary.pending)} helper="Amount still not collected" />
              <MetricTile label="Record count" value={String(filteredInvoiceRecords.length)} helper="Tap a row to preview invoice" />
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {filteredInvoiceRecords.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Invoice', 'Date', 'Customer', 'Payment', 'Status', 'Total'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoiceRecords.map((invoice) => (
                    <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer transition hover:bg-brand-60/35">
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                        <div className="mt-1 text-xs text-brand-dark/55">Tap to preview</div>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatDateTime(invoice.createdAt)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{invoice.customerName || 'Walk-in customer'}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm capitalize text-brand-dark">{invoice.paymentMethod.replace('_', ' ')}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm capitalize text-brand-dark">{invoice.paymentStatus}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyStatePanel
                  compact
                  icon={Receipt}
                  title="No invoices match this filter"
                  description="Try another period, payment status, or search term."
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <SalesInvoiceDetailModal
        open={!!selectedInvoice}
        invoice={selectedInvoice}
        companyName={companyName}
        businessProfile={data.profile}
        onClose={() => setSelectedInvoice(null)}
      />
    </>
  );
};
