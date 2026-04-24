import { BadgeIndianRupee, Boxes, CalendarClock } from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { CustomerProject, FinanceEntry, InventoryItem, TaskItem } from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { formatCurrency, relativeDate } from '../utils';

type OperationsPageProps = {
  businessConfig: WorkspaceBusinessConfig;
  customers: CustomerProject[];
  tasks: TaskItem[];
  inventory: InventoryItem[];
  financeEntries: FinanceEntry[];
  onOpenCustomer: (customerId: string) => void;
};

export const OperationsPage = ({
  businessConfig,
  customers,
  tasks,
  inventory,
  financeEntries,
  onOpenCustomer,
}: OperationsPageProps) => {
  const urgentTasks = tasks.filter((task) => !task.done).slice(0, 6);
  const lowStock = inventory.filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock').slice(0, 5);
  const overdueFinance = financeEntries.filter((entry) => entry.status === 'overdue').slice(0, 5);
  const waitingWork = customers.filter((customer) => customer.needsFollowUp || customer.stage === 'on_hold').slice(0, 6);

  return (
    <div className="flex h-full min-h-[700px] flex-col gap-5 overflow-hidden xl:h-[calc(100vh-8rem)]">
      <div className="px-2">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Operations board</h1>
        <p className="mt-1 max-w-3xl text-[15px] text-brand-dark/80">{businessConfig.operationsIntro}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Urgent tasks</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{urgentTasks.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700/70">Low stock</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{lowStock.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-700/70">Overdue entries</div>
          <div className="mt-2 text-3xl font-semibold text-rose-700">{overdueFinance.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Open value</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">
            {formatCurrency(financeEntries.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + entry.amount, 0))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-3">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Execution queue</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {waitingWork.length ? waitingWork.map((customer) => (
              <button key={customer.id} onClick={() => onOpenCustomer(customer.id)} className="w-full rounded-[24px] border border-brand-30 bg-white p-4 text-left shadow-sm transition hover:border-brand-10">
                <div className="font-semibold text-brand-dark">{customer.customerName}</div>
                <div className="mt-1 text-sm text-brand-dark/65">{customer.title}</div>
                <div className="mt-2 text-xs text-brand-dark/55">Last updated {relativeDate(customer.lastUpdated)}</div>
              </button>
            )) : (
              <div className="flex h-full items-center justify-center">
                <EmptyStatePanel icon={CalendarClock} title="Execution queue is clear" description="No customer records currently need urgent operational attention." />
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Task pressure</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {urgentTasks.length ? urgentTasks.map((task) => (
              <div key={task.id} className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
                <div className="font-medium text-brand-dark">{task.title}</div>
                <div className="mt-2 text-xs text-brand-dark/55">Due {relativeDate(task.dueAt)}</div>
              </div>
            )) : (
              <div className="flex h-full items-center justify-center text-sm text-brand-dark/55">No urgent tasks right now.</div>
            )}
          </div>
        </section>

        <section className="grid min-h-0 gap-4">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
            <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-brand-dark"><Boxes size={18} /> Stock attention</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              {lowStock.length ? lowStock.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
                  <div className="font-medium text-brand-dark">{item.name}</div>
                  <div className="mt-2 text-xs text-brand-dark/55">{item.currentStock} on hand • min {item.minimumStock}</div>
                </div>
              )) : (
                <div className="flex h-full items-center justify-center text-sm text-brand-dark/55">No low-stock items.</div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
            <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-brand-dark"><BadgeIndianRupee size={18} /> Finance pressure</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              {overdueFinance.length ? overdueFinance.map((entry) => (
                <div key={entry.id} className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
                  <div className="font-medium text-brand-dark">{entry.title}</div>
                  <div className="mt-2 text-xs text-brand-dark/55">{formatCurrency(entry.amount)} • due {relativeDate(entry.dueAt)}</div>
                </div>
              )) : (
                <div className="flex h-full items-center justify-center text-sm text-brand-dark/55">No overdue finance entries.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
