import { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import type { CustomerProject, FinanceCategory, FinanceEntry, FinanceKind, FinanceStatus } from '../types';

type FinanceFormPayload = Pick<
  FinanceEntry,
  'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'projectTitle' | 'notes'
>;

type AddFinanceEntryModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: FinanceFormPayload) => void | Promise<void>;
  customers: CustomerProject[];
  initialValues?: FinanceEntry | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onDelete?: (() => void | Promise<void>) | null;
};

const categoryOptions: FinanceCategory[] = ['client_payment', 'project_material', 'labour', 'salary', 'vendor', 'operations'];
const statusOptions: FinanceStatus[] = ['pending', 'paid', 'overdue'];
const kindOptions: FinanceKind[] = ['income', 'expense'];

const helpText: Record<string, string> = {
  amount: 'Use the full rupee amount for this entry. The billing page uses this to calculate incoming and outgoing totals.',
  customerId: 'Link this payment or expense to a customer project when it is directly tied to a job.',
  category: 'Choose a category so the finance page can group materials, salary, vendor, labour, and client payments correctly.',
};

const Hint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex">
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-30 bg-white text-brand-dark/60">
      <Info size={12} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs leading-5 text-brand-dark shadow-lg group-hover:block">
      {text}
    </span>
  </span>
);

const initialState = {
  title: '',
  kind: 'expense' as FinanceKind,
  category: 'operations' as FinanceCategory,
  amount: '0',
  status: 'pending' as FinanceStatus,
  dueAt: new Date().toISOString().slice(0, 10),
  customerId: '',
  projectTitle: '',
  notes: '',
};

const toFormState = (entry?: FinanceEntry | null) => ({
  title: entry?.title ?? initialState.title,
  kind: entry?.kind ?? initialState.kind,
  category: entry?.category ?? initialState.category,
  amount: String(entry?.amount ?? initialState.amount),
  status: entry?.status ?? initialState.status,
  dueAt: entry?.dueAt ? entry.dueAt.slice(0, 10) : initialState.dueAt,
  customerId: entry?.customerId ?? initialState.customerId,
  projectTitle: entry?.projectTitle ?? initialState.projectTitle,
  notes: entry?.notes ?? initialState.notes,
});

export const AddFinanceEntryModal = ({
  open,
  onClose,
  onSubmit,
  customers,
  initialValues = null,
  title,
  subtitle,
  submitLabel,
  onDelete = null,
}: AddFinanceEntryModalProps) => {
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = useMemo(() => !!initialValues, [initialValues]);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(initialValues));
    setSubmitting(false);
  }, [initialValues, open]);

  if (!open) return null;

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      amount: Number(form.amount || '0'),
      dueAt: new Date(form.dueAt).toISOString(),
      customerId: form.customerId || undefined,
      projectTitle: form.projectTitle || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[min(90vh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/65">
              {isEditMode ? 'Finance editor' : 'Finance intake'}
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">
              {title ?? (isEditMode ? 'Edit finance entry' : 'Create finance entry')}
            </h3>
            <p className="mt-1 text-sm text-brand-dark/80">
              {subtitle ?? 'Track client payments, materials, labour, salaries, and general company money flow here.'}
            </p>
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark shadow-sm">
            <X size={16} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Entry title</span>
                <input
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">Amount <Hint text={helpText.amount} /></span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.amount}
                  onChange={(event) => /^\d*$/.test(event.target.value) && setField('amount', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Kind</span>
                <select
                  value={form.kind}
                  onChange={(event) => setField('kind', event.target.value as FinanceKind)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {kindOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">Category <Hint text={helpText.category} /></span>
                <select
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value as FinanceCategory)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option.replace('_', ' ')}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setField('status', event.target.value as FinanceStatus)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Due date</span>
                <input
                  type="date"
                  value={form.dueAt}
                  onChange={(event) => setField('dueAt', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">Linked customer <Hint text={helpText.customerId} /></span>
                <select
                  value={form.customerId}
                  onChange={(event) => {
                    const nextCustomerId = event.target.value;
                    const customer = customers.find((item) => item.id === nextCustomerId);
                    setForm((current) => ({
                      ...current,
                      customerId: nextCustomerId,
                      projectTitle: current.projectTitle || customer?.title || '',
                    }));
                  }}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  <option value="">No linked customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName} • {customer.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Project title</span>
                <input
                  value={form.projectTitle}
                  onChange={(event) => setField('projectTitle', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
                <span className="font-medium text-brand-dark">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                  placeholder="Store invoice references, salary month, vendor notes, or payment comments"
                />
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true);
                  await onDelete();
                  setSubmitting(false);
                }}
                className="mr-auto rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700"
              >
                Delete entry
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm disabled:opacity-60">
              {submitting ? 'Saving...' : submitLabel ?? (isEditMode ? 'Save changes' : 'Create entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
