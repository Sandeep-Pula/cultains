import { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import type { InventoryCategory, InventoryItem, InventoryUnit } from '../types';

type InventoryFormPayload = Pick<
  InventoryItem,
  | 'name'
  | 'sku'
  | 'itemCode'
  | 'category'
  | 'unit'
  | 'currentStock'
  | 'reservedStock'
  | 'minimumStock'
  | 'reorderQuantity'
  | 'costPerUnit'
  | 'storageLocation'
  | 'supplierName'
  | 'supplierPhone'
  | 'notes'
>;

type AddInventoryItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: InventoryFormPayload) => void | Promise<void>;
  initialValues?: InventoryItem | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onDelete?: (() => void | Promise<void>) | null;
};

const categoryOptions: InventoryCategory[] = [
  'Hardware & Tools',
  'Office & Tech',
  'Decor & Lighting',
  'Raw Material',
  'Vehicle',
];

const unitOptions: InventoryUnit[] = ['pcs', 'rolls', 'boxes', 'sets', 'sqm', 'kg', 'litres'];

const initialState = {
  name: '',
  sku: '',
  itemCode: '',
  category: 'Raw Material' as InventoryCategory,
  unit: 'pcs' as InventoryUnit,
  currentStock: '0',
  reservedStock: '0',
  minimumStock: '10',
  reorderQuantity: '20',
  costPerUnit: '0',
  storageLocation: '',
  supplierName: '',
  supplierPhone: '',
  notes: '',
};

const toFormState = (item?: InventoryItem | null) => ({
  name: item?.name ?? initialState.name,
  sku: item?.sku ?? initialState.sku,
  itemCode: item?.itemCode ?? initialState.itemCode,
  category: item?.category ?? initialState.category,
  unit: item?.unit ?? initialState.unit,
  currentStock: String(item?.currentStock ?? initialState.currentStock),
  reservedStock: String(item?.reservedStock ?? initialState.reservedStock),
  minimumStock: String(item?.minimumStock ?? initialState.minimumStock),
  reorderQuantity: String(item?.reorderQuantity ?? initialState.reorderQuantity),
  costPerUnit: String(item?.costPerUnit ?? initialState.costPerUnit),
  storageLocation: item?.storageLocation ?? initialState.storageLocation,
  supplierName: item?.supplierName ?? initialState.supplierName,
  supplierPhone: item?.supplierPhone ?? initialState.supplierPhone,
  notes: item?.notes ?? initialState.notes,
});

const helpText: Record<string, string> = {
  sku: 'SKU means Stock Keeping Unit. It is the seller or warehouse code used to identify this item quickly.',
  itemCode: 'Use your own internal nomenclature or material code here so your team can match stock to purchase records and project usage.',
  currentStock: 'How many units you physically have right now.',
  reservedStock: 'Units already blocked for active projects or staff requests.',
  minimumStock: 'When stock drops to this level, the item should enter the purchase watch list.',
  reorderQuantity: 'Suggested quantity to buy when you restock this item.',
  costPerUnit: 'Purchase cost for one unit. This helps estimate total stock value.',
};

const Hint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex">
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-30 bg-white text-brand-dark/60 transition hover:text-brand-dark">
      <Info size={12} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs leading-5 text-brand-dark shadow-lg group-hover:block">
      {text}
    </span>
  </span>
);

export const AddInventoryItemModal = ({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  title,
  subtitle,
  submitLabel,
  onDelete = null,
}: AddInventoryItemModalProps) => {
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

  const setNumberField = (
    field: 'currentStock' | 'reservedStock' | 'minimumStock' | 'reorderQuantity' | 'costPerUnit',
    value: string,
  ) => {
    if (!/^\d*$/.test(value)) return;
    setField(field, value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      currentStock: Number(form.currentStock || '0'),
      reservedStock: Number(form.reservedStock || '0'),
      minimumStock: Number(form.minimumStock || '0'),
      reorderQuantity: Number(form.reorderQuantity || '0'),
      costPerUnit: Number(form.costPerUnit || '0'),
      itemCode: form.itemCode.trim() || form.sku.trim(),
      storageLocation: form.storageLocation.trim() || 'Main warehouse',
    });
    setForm(initialState);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,980px)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-start justify-between border-b border-brand-30 px-5 py-4 sm:px-6 sticky top-0 z-10 bg-brand-60">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/65">
              {isEditMode ? 'Inventory editor' : 'Inventory intake'}
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">
              {title ?? (isEditMode ? 'Edit inventory record' : 'Create a new inventory record')}
            </h3>
            <p className="mt-1 text-sm text-brand-dark/80">
              {subtitle ?? 'Add stock, reorder thresholds, supplier details, and storage info in one place.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark shadow-sm"
          >
            <X size={16} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Item name', 'name'],
              ['SKU', 'sku'],
              ['Internal code', 'itemCode'],
              ['Storage location', 'storageLocation'],
              ['Supplier name', 'supplierName'],
              ['Supplier phone', 'supplierPhone'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">
                  {label}
                  {helpText[key] ? <Hint text={helpText[key]} /> : null}
                </span>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setField(key as keyof typeof form, event.target.value as never)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  required={['name', 'sku'].includes(key)}
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Category</span>
              <select
                value={form.category}
                onChange={(event) => setField('category', event.target.value as InventoryCategory)}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Unit</span>
              <select
                value={form.unit}
                onChange={(event) => setField('unit', event.target.value as InventoryUnit)}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                {unitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {[
              ['Current stock', 'currentStock'],
              ['Reserved stock', 'reservedStock'],
              ['Minimum stock', 'minimumStock'],
              ['Reorder quantity', 'reorderQuantity'],
              ['Cost per unit', 'costPerUnit'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">
                  {label}
                  {helpText[key] ? <Hint text={helpText[key]} /> : null}
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) =>
                    setNumberField(
                      key as 'currentStock' | 'reservedStock' | 'minimumStock' | 'reorderQuantity' | 'costPerUnit',
                      event.target.value,
                    )
                  }
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
              <span className="font-medium text-brand-dark">Operational notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                placeholder="Vendor notes, usage rules, storage cautions, or damage remarks"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-brand-30 bg-gradient-to-br from-white to-brand-30/30 p-5 h-fit">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/65">Inventory logic</div>
            <div className="mt-4 space-y-4">
              {[
                'Items automatically move into purchase alerts when stock falls to the minimum.',
                'You can assign stock to team members and link it to work records later.',
                'Aging or damaged stock can be pushed to clearance without leaving the page.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/85 px-4 py-3 text-sm text-brand-dark/85 shadow-sm">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-10 px-4 py-4 text-sm text-brand-60">
              Use this intake modal for all new stock so the dashboard can track replenishment, usage, and clearance cleanly.
            </div>
          </div>
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
                Delete item
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Saving...' : submitLabel ?? (isEditMode ? 'Save changes' : 'Create item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
