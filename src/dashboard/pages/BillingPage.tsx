import { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, BadgeIndianRupee, CreditCard, Plus, Wallet } from 'lucide-react';
import type { CustomerProject, FinanceEntry, InventoryItem } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { AddFinanceEntryModal } from '../components/AddFinanceEntryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { financeStatusLabel, formatCurrency, formatDate } from '../utils';

type BillingPageProps = {
  customers: CustomerProject[];
  inventory: InventoryItem[];
  financeEntries: FinanceEntry[];
  businessConfig: WorkspaceBusinessConfig;
  onAddEntry: (payload: Pick<FinanceEntry, 'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'projectTitle' | 'notes'>) => Promise<void>;
  onUpdateEntry: (entryId: string, patch: Partial<FinanceEntry>) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
};

const entryStyles = {
  income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusStyles = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const BillingPage = ({
  customers,
  inventory,
  financeEntries,
  businessConfig,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: BillingPageProps) => {
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const invoiceProjects = useMemo(
    () =>
      customers.map((customer) => {
        const materialValue = inventory
          .filter((item) => item.assignedProjectIds.includes(customer.id))
          .reduce((sum, item) => sum + item.reservedStock * item.costPerUnit, 0);
        const labourValue = financeEntries
          .filter((entry) => entry.customerId === customer.id && entry.category === 'labour')
          .reduce((sum, entry) => sum + entry.amount, 0);
        const received = financeEntries
          .filter((entry) => entry.customerId === customer.id && entry.kind === 'income' && entry.status === 'paid')
          .reduce((sum, entry) => sum + entry.amount, 0);

        return {
          customerId: customer.id,
          customerName: customer.customerName,
          projectTitle: customer.title,
          quoteValue: customer.quote.quoteValue,
          materialValue,
          labourValue,
          invoiceValue: customer.quote.quoteValue + materialValue + labourValue,
          received,
          due: customer.quote.quoteValue + materialValue + labourValue - received,
          paymentStage: customer.quote.paymentStage,
        };
      }),
    [customers, financeEntries, inventory],
  );

  const totalIncoming = financeEntries.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const totalOutgoing = financeEntries.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const salaryRun = financeEntries.filter((entry) => entry.category === 'salary').reduce((sum, entry) => sum + entry.amount, 0);
  const cashPosition = totalIncoming - totalOutgoing;

  return (
    <div className="flex h-full min-h-[700px] flex-col gap-5 overflow-hidden xl:h-[calc(100vh-8rem)]">
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Billing workspace</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-brand-dark/80">{businessConfig.billingIntro}</p>
        </div>
        <button
          onClick={() => setEntryModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} />
          Add finance entry
        </button>
      </div>

      <div className="shrink-0 grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700/70">
            <ArrowDownCircle size={14} />
            Incoming
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">{formatCurrency(totalIncoming)}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700/70">
            <ArrowUpCircle size={14} />
            Outgoing
          </div>
          <div className="mt-2 text-3xl font-semibold text-rose-700">{formatCurrency(totalOutgoing)}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark/50">
            <BadgeIndianRupee size={14} />
            Salary run
          </div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{formatCurrency(salaryRun)}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark/50">
            <Wallet size={14} />
            Cash position
          </div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{formatCurrency(cashPosition)}</div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.15fr_0.95fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">{businessConfig.workLabel} invoices</h2>
            <p className="mt-0.5 text-xs text-brand-dark/60">Cost and revenue visibility per {businessConfig.workLabel.toLowerCase()} so invoicing stays clear.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {invoiceProjects.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Customer', 'Quote', 'Materials', 'Labour', 'Invoice total', 'Received', 'Due'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceProjects.map((project) => (
                    <tr key={project.customerId} className="transition hover:bg-brand-60/35">
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <div className="font-semibold text-brand-dark">{project.customerName}</div>
                        <div className="mt-1 text-sm text-brand-dark/60">{project.projectTitle}</div>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatCurrency(project.quoteValue)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatCurrency(project.materialValue)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatCurrency(project.labourValue)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">{formatCurrency(project.invoiceValue)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-emerald-700">{formatCurrency(project.received)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-rose-700">{formatCurrency(project.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyStatePanel
                  icon={CreditCard}
                  title="No billing records yet"
                  description={`Once you start linking payments, labour, vendor costs, and ${businessConfig.workLabel.toLowerCase()} materials, this table becomes your invoice-ready view.`}
                  actions={[{ label: 'Add finance entry', onClick: () => setEntryModalOpen(true), emphasis: 'primary' }]}
                />
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Company ledger</h2>
            <p className="mt-0.5 text-xs text-brand-dark/60">Track all incoming and outgoing money including vendor payouts, salaries, and operations.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {financeEntries.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Entry', 'Type', 'Category', 'Amount', 'Status', 'Due date'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {financeEntries.map((entry) => (
                    <tr key={entry.id} onClick={() => setEditingEntry(entry)} className="cursor-pointer transition hover:bg-brand-60/35">
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <div className="font-semibold text-brand-dark">{entry.title}</div>
                        <div className="mt-1 text-sm text-brand-dark/60">
                          {entry.projectTitle || 'General company entry'}
                          {entry.customerId ? ` • Linked project` : ''}
                        </div>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${entryStyles[entry.kind]}`}>
                          {entry.kind}
                        </span>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm capitalize text-brand-dark">
                        {entry.category.replace('_', ' ')}
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[entry.status]}`}>
                          {financeStatusLabel[entry.status]}
                        </span>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/65">
                        {formatDate(entry.dueAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyStatePanel
                  icon={Wallet}
                  title="No ledger entries yet"
                  description="Add material purchases, salary, vendor payments, and client receipts so this becomes the financial landing page for the company."
                  actions={[{ label: 'Create first finance entry', onClick: () => setEntryModalOpen(true), emphasis: 'primary' }]}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <AddFinanceEntryModal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSubmit={onAddEntry}
        customers={customers}
      />

      <AddFinanceEntryModal
        open={!!editingEntry}
        initialValues={editingEntry}
        title="Edit finance entry"
        subtitle="Update payment status, amount, category, customer linkage, or notes."
        submitLabel="Save changes"
        onClose={() => setEditingEntry(null)}
        onSubmit={async (payload) => {
          if (!editingEntry) return;
          await onUpdateEntry(editingEntry.id, payload);
        }}
        onDelete={editingEntry ? async () => setDeleteCandidateId(editingEntry.id) : null}
        customers={customers}
      />

      <ConfirmDialog
        open={!!deleteCandidateId}
        title="Delete this finance entry?"
        description="This removes the record from the billing workspace. Use this only when the money movement should no longer be tracked."
        confirmLabel="Delete entry"
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          if (!deleteCandidateId) return;
          await onDeleteEntry(deleteCandidateId);
          setDeleteCandidateId(null);
          setEditingEntry(null);
        }}
      />
    </div>
  );
};
