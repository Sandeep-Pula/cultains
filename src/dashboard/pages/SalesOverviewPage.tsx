import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, CalendarClock, CheckCircle2, Package, Receipt, UsersRound, Wallet } from 'lucide-react';
import type { DashboardData, DashboardView, SalesInvoice } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { SalesInvoiceDetailModal } from '../components/SalesInvoiceDetailModal';
import { formatCurrency, formatDate, formatDateTime, relativeDate } from '../utils';

type SalesOverviewPageProps = {
  data: DashboardData;
  businessConfig: WorkspaceBusinessConfig;
  onNavigate: (view: DashboardView) => void;
  onAddCustomer: () => void;
  onAddTeamMember: () => void;
};

type RangePreset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'this-month'
  | 'this-year'
  | 'custom-day'
  | 'custom-month'
  | 'custom-year';

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

const getRangeLabel = (preset: RangePreset, customDay: string, customMonth: string, customYear: string) => {
  if (preset === 'today') return 'Today';
  if (preset === 'yesterday') return 'Yesterday';
  if (preset === 'this-week') return 'This week';
  if (preset === 'this-month') return 'This month';
  if (preset === 'this-year') return 'This year';
  if (preset === 'custom-day') return customDay ? formatDate(customDay) : 'Selected day';
  if (preset === 'custom-month') {
    if (!customMonth) return 'Selected month';
    const [year, month] = customMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return customYear ? `Year ${customYear}` : 'Selected year';
};

const filterInvoicesByRange = (salesInvoices: SalesInvoice[], preset: RangePreset, customDay: string, customMonth: string, customYear: string) => {
  const today = new Date();
  let start = startOfDay(today);
  let end = endOfDay(today);

  if (preset === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    start = startOfDay(yesterday);
    end = endOfDay(yesterday);
  } else if (preset === 'this-week') {
    start = startOfWeek(today);
    end = endOfWeek(today);
  } else if (preset === 'this-month') {
    start = startOfMonth(today);
    end = endOfMonth(today);
  } else if (preset === 'this-year') {
    start = startOfYear(today);
    end = endOfYear(today);
  } else if (preset === 'custom-day' && customDay) {
    const selected = new Date(`${customDay}T00:00:00`);
    start = startOfDay(selected);
    end = endOfDay(selected);
  } else if (preset === 'custom-month' && customMonth) {
    const [year, month] = customMonth.split('-').map(Number);
    const selected = new Date(year, month - 1, 1);
    start = startOfMonth(selected);
    end = endOfMonth(selected);
  } else if (preset === 'custom-year' && customYear) {
    const selected = new Date(Number(customYear), 0, 1);
    start = startOfYear(selected);
    end = endOfYear(selected);
  }

  const startTime = start.getTime();
  const endTime = end.getTime();

  return salesInvoices.filter((invoice) => {
    if (invoice.status === 'draft') return false;
    const createdAt = new Date(invoice.createdAt).getTime();
    return createdAt >= startTime && createdAt <= endTime;
  });
};

const summarizeInvoices = (salesInvoices: SalesInvoice[]) => {
  const transactionCount = salesInvoices.length;
  const grossSales = salesInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const subtotal = salesInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);
  const taxCollected = salesInvoices.reduce((sum, invoice) => sum + invoice.taxAmount, 0);
  const pendingAmount = salesInvoices
    .filter((invoice) => invoice.paymentStatus === 'pending')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidAmount = salesInvoices
    .filter((invoice) => invoice.paymentStatus === 'paid')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const unitsSold = salesInvoices.reduce((sum, invoice) => sum + invoice.lineItems.reduce((lineSum, line) => lineSum + line.quantity, 0), 0);

  return {
    transactionCount,
    grossSales,
    subtotal,
    taxCollected,
    pendingAmount,
    paidAmount,
    unitsSold,
    averageBill: transactionCount ? grossSales / transactionCount : 0,
  };
};

const SnapshotCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">{label}</div>
    <div className="mt-3 text-3xl font-semibold tracking-tight text-brand-dark">{value}</div>
    <div className="mt-2 text-sm text-brand-dark/65">{helper}</div>
  </div>
);

const ActionCard = ({
  title,
  detail,
  action,
  onClick,
}: {
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex h-full flex-col justify-between rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10 hover:shadow-md"
  >
    <span>
      <span className="block text-base font-semibold text-brand-dark">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-brand-dark/65">{detail}</span>
    </span>
    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-10">
      {action}
      <ArrowRight size={15} className="transition group-hover:translate-x-1" />
    </span>
  </button>
);

const InsightRow = ({ title, helper, tone = 'neutral' }: { title: string; helper: string; tone?: 'neutral' | 'warning' | 'good' }) => (
  <div className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
    <div className="flex items-start gap-3">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          tone === 'warning' ? 'bg-amber-500' : tone === 'good' ? 'bg-emerald-500' : 'bg-brand-10'
        }`}
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-brand-dark">{title}</div>
        <div className="mt-1 text-xs leading-5 text-brand-dark/60">{helper}</div>
      </div>
    </div>
  </div>
);

export const SalesOverviewPage = ({ data, businessConfig, onNavigate, onAddCustomer, onAddTeamMember }: SalesOverviewPageProps) => {
  const { profile: businessProfile, salesInvoices } = data;
  const companyName = businessProfile.companyName;
  const [rangePreset, setRangePreset] = useState<RangePreset>('today');
  const [customDay, setCustomDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [customMonth, setCustomMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [customYear, setCustomYear] = useState(() => String(new Date().getFullYear()));
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  const filteredInvoices = useMemo(
    () =>
      filterInvoicesByRange(salesInvoices, rangePreset, customDay, customMonth, customYear)
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [customDay, customMonth, customYear, rangePreset, salesInvoices],
  );

  const selectedSummary = useMemo(() => summarizeInvoices(filteredInvoices), [filteredInvoices]);
  const todaySummary = useMemo(() => summarizeInvoices(filterInvoicesByRange(salesInvoices, 'today', customDay, customMonth, customYear)), [customDay, customMonth, customYear, salesInvoices]);
  const pendingInvoices = useMemo(
    () => salesInvoices.filter((invoice) => invoice.status !== 'draft' && invoice.paymentStatus === 'pending').sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [salesInvoices],
  );
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const lowStockItems = useMemo(
    () =>
      data.inventory
        .filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock' || item.currentStock <= item.minimumStock)
        .sort((left, right) => left.currentStock - right.currentStock)
        .slice(0, 5),
    [data.inventory],
  );
  const upcomingTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => !task.done)
        .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
        .slice(0, 5),
    [data.tasks],
  );
  const followUps = useMemo(
    () =>
      data.customers
        .filter((customer) => customer.needsFollowUp || customer.nextFollowUpAt)
        .sort((left, right) => new Date(left.nextFollowUpAt || left.lastContactedAt).getTime() - new Date(right.nextFollowUpAt || right.lastContactedAt).getTime())
        .slice(0, 5),
    [data.customers],
  );
  const activeTeam = data.team.filter((member) => member.status !== 'offline');
  const aiRecommendations = [
    lowStockItems.length
      ? `${lowStockItems.length} stock item(s) need purchase attention before billing slows down.`
      : 'Stock is steady. Keep the barcode desk updated after new purchases.',
    pendingInvoices.length
      ? `Follow up on ${formatCurrency(pendingTotal)} pending invoice value.`
      : 'No pending invoices right now. Good time to push new customer follow-ups.',
    followUps.length
      ? `${followUps.length} customer follow-up(s) can be handled today.`
      : 'Create follow-up tasks for active leads so CRM does not go quiet.',
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(18,57,96,0.08),rgba(255,255,255,0.98))] p-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                <Wallet size={14} />
                Command center
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                Today at {companyName || 'your business'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-dark/70 sm:text-base">
                Sales, invoices, stock, team work, follow-ups, and next actions in one operating view.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SnapshotCard label="Today sales" value={formatCurrency(todaySummary.grossSales)} helper={`${todaySummary.transactionCount} transaction(s)`} />
                <SnapshotCard label="Pending invoices" value={formatCurrency(pendingTotal)} helper={`${pendingInvoices.length} pending bill(s)`} />
                <SnapshotCard label="Low stock alerts" value={String(lowStockItems.length)} helper="Items at or below limit" />
                <SnapshotCard label="Open follow-ups" value={String(followUps.length)} helper={`${upcomingTasks.length} upcoming task(s)`} />
              </div>
            </div>
            <div className="rounded-[28px] border border-brand-30 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-10 p-3 text-white">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-brand-dark">AI recommendations</div>
                  <div className="text-xs text-brand-dark/60">Practical next moves from the dashboard data.</div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {aiRecommendations.map((recommendation) => (
                  <InsightRow key={recommendation} title={recommendation} helper="Review this before closing today." tone={recommendation.includes('No pending') || recommendation.includes('steady') ? 'good' : 'neutral'} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {data.customers.length ? (
            <ActionCard
              title={`${businessConfig.customerPlural} are active`}
              detail={`${data.customers.length} record(s) are being tracked across CRM and operations.`}
              action="Open CRM"
              onClick={() => onNavigate('crm')}
            />
          ) : (
            <EmptyStatePanel
              compact
              icon={UsersRound}
              title={`Add your first ${businessConfig.customerLabel.toLowerCase()}`}
              description="Start the workspace by creating one customer record with contact and follow-up details."
              actions={[{ label: `Create ${businessConfig.customerLabel.toLowerCase()}`, onClick: onAddCustomer, emphasis: 'primary' }]}
            />
          )}
          {salesInvoices.length ? (
            <ActionCard
              title="Invoices are flowing"
              detail={`${salesInvoices.length} invoice(s) created. ${pendingInvoices.length} still need payment follow-up.`}
              action="Open billing"
              onClick={() => onNavigate('billing')}
            />
          ) : (
            <EmptyStatePanel
              compact
              icon={Receipt}
              title="Create first invoice"
              description="Use billing or cash register to make the first sale visible in reports."
              actions={[{ label: 'Open billing', onClick: () => onNavigate('billing'), emphasis: 'primary' }]}
            />
          )}
          {data.inventory.length ? (
            <ActionCard
              title="Stock is being tracked"
              detail={`${data.inventory.length} item(s) in inventory. ${lowStockItems.length} need attention.`}
              action="Open inventory"
              onClick={() => onNavigate('inventory')}
            />
          ) : (
            <EmptyStatePanel
              compact
              icon={Package}
              title="Add first inventory item"
              description="Build your stock list with SKU, barcode, price, and reorder level."
              actions={[{ label: 'Open inventory', onClick: () => onNavigate('inventory'), emphasis: 'primary' }]}
            />
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold text-brand-dark">Low stock alerts</h2>
            </div>
            <div className="mt-4 space-y-3">
              {lowStockItems.length ? lowStockItems.map((item) => (
                <InsightRow key={item.id} title={item.name} helper={`${item.currentStock} ${item.unit} left • reorder ${item.reorderQuantity} ${item.unit}`} tone="warning" />
              )) : <InsightRow title="No low stock alerts" helper="Inventory is above minimum stock levels." tone="good" />}
            </div>
          </div>
          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarClock size={18} className="text-brand-10" />
              <h2 className="text-lg font-semibold text-brand-dark">Upcoming work</h2>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingTasks.length ? upcomingTasks.map((task) => (
                <InsightRow key={task.id} title={task.title} helper={`Due ${relativeDate(task.dueAt)} • ${task.priority} priority`} tone={task.priority === 'high' ? 'warning' : 'neutral'} />
              )) : <InsightRow title="No upcoming tasks" helper="Add tasks from Business Calendar when work needs tracking." tone="good" />}
            </div>
          </div>
          <div className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-brand-dark">Team activity</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.team.length ? (
                <>
                  <InsightRow title={`${activeTeam.length} active member(s)`} helper={`${data.team.length} total team member(s) in this workspace.`} tone={activeTeam.length ? 'good' : 'neutral'} />
                  {data.team.slice(0, 3).map((member) => (
                    <InsightRow key={member.id} title={member.name} helper={`${member.role} • ${member.status}`} />
                  ))}
                </>
              ) : (
                <EmptyStatePanel compact icon={UsersRound} title="Add first team member" description="Invite staff so ownership, tasks, and access can be managed clearly." actions={[{ label: 'Add team member', onClick: onAddTeamMember, emphasis: 'primary' }]} />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Invoice Overview</div>
              <h2 className="mt-2 text-2xl font-semibold text-brand-dark">{getRangeLabel(rangePreset, customDay, customMonth, customYear)} sales</h2>
              <p className="mt-1 text-sm text-brand-dark/65">Today is selected by default. Change the filter when you want another business window.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>View</span>
                <select value={rangePreset} onChange={(event) => setRangePreset(event.target.value as RangePreset)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none">
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this-week">This week</option>
                  <option value="this-month">This month</option>
                  <option value="this-year">This year</option>
                  <option value="custom-day">Selected day</option>
                  <option value="custom-month">Selected month</option>
                  <option value="custom-year">Selected year</option>
                </select>
              </label>
              {rangePreset === 'custom-day' ? (
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Select day</span>
                  <input type="date" value={customDay} onChange={(event) => setCustomDay(event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" />
                </label>
              ) : null}
              {rangePreset === 'custom-month' ? (
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Select month</span>
                  <input type="month" value={customMonth} onChange={(event) => setCustomMonth(event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" />
                </label>
              ) : null}
              {rangePreset === 'custom-year' ? (
                <label className="grid gap-2 text-sm text-brand-dark/75">
                  <span>Select year</span>
                  <input inputMode="numeric" value={customYear} onChange={(event) => /^\d{0,4}$/.test(event.target.value) && setCustomYear(event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" placeholder="2026" />
                </label>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SnapshotCard label="Transactions" value={String(selectedSummary.transactionCount)} helper={`${selectedSummary.unitsSold} item(s) sold`} />
            <SnapshotCard label="Gross sales" value={formatCurrency(selectedSummary.grossSales)} helper={`${formatCurrency(selectedSummary.averageBill)} avg bill`} />
            <SnapshotCard label="Tax collected" value={formatCurrency(selectedSummary.taxCollected)} helper={`${formatCurrency(selectedSummary.subtotal)} before tax`} />
            <SnapshotCard label="Pending amount" value={formatCurrency(selectedSummary.pendingAmount)} helper={`${formatCurrency(selectedSummary.paidAmount)} already paid`} />
            <SnapshotCard label="Range" value={getRangeLabel(rangePreset, customDay, customMonth, customYear)} helper="Current filter" />
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Invoices in selected filter</h2>
            <p className="mt-1 text-xs text-brand-dark/60">Scrollable invoice list for the active range. Click any invoice to open preview and reprint it.</p>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {filteredInvoices.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Invoice', 'Date', 'Customer', 'Method', 'Status', 'Total'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer transition hover:bg-brand-60/35">
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                        <div className="mt-1 text-xs text-brand-dark/55">Tap to preview</div>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatDateTime(invoice.createdAt)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{invoice.customerName}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark capitalize">{invoice.paymentMethod.replace('_', ' ')}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark capitalize">{invoice.paymentStatus}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyStatePanel icon={Receipt} title="No invoices in this filter" description="Change the filter to inspect another day, month, or yearly set of invoices." />
              </div>
            )}
          </div>
        </section>
      </div>

      <SalesInvoiceDetailModal
        open={!!selectedInvoice}
        invoice={selectedInvoice}
        companyName={companyName}
        businessProfile={businessProfile}
        onClose={() => setSelectedInvoice(null)}
      />
    </>
  );
};
