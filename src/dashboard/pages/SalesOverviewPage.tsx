import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Package,
  Receipt,
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
        .filter((customer) => customer.needsFollowUp || customer.nextFollowUpAt)
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
