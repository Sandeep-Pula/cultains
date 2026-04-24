import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Package, Plus, ShieldAlert, Warehouse } from 'lucide-react';
import type { CustomerProject, InventoryItem } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { AddInventoryItemModal } from '../components/AddInventoryItemModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, getInventoryFlags, relativeDate } from '../utils';

type InventoryPageProps = {
  inventory: InventoryItem[];
  customers: CustomerProject[];
  businessConfig: WorkspaceBusinessConfig;
  onAddItem: (payload: Pick<
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
    | 'sellingPrice'
    | 'storageLocation'
    | 'supplierName'
    | 'supplierPhone'
    | 'notes'
  >) => Promise<void>;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
};

type InventoryFilter = 'all' | 'purchase' | 'clearance' | 'assigned' | 'healthy';

const filterOptions: { key: InventoryFilter; label: string }[] = [
  { key: 'all', label: 'All stock' },
  { key: 'purchase', label: 'Needs purchase' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'healthy', label: 'Healthy' },
];

const statusStyles = {
  'in-stock': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'low-stock': 'bg-amber-50 text-amber-800 border-amber-200',
  'out-of-stock': 'bg-rose-50 text-rose-700 border-rose-200',
  clearance: 'bg-violet-50 text-violet-700 border-violet-200',
};

const procurementLabels = {
  none: 'Stable',
  to_order: 'To order',
  ordered: 'Ordered',
  received: 'Received',
};

const procurementStyles = {
  none: 'bg-white text-brand-dark border-brand-30',
  to_order: 'bg-amber-50 text-amber-800 border-amber-200',
  ordered: 'bg-sky-50 text-sky-800 border-sky-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const flagLabels = {
  needs_purchase: 'Needs purchase',
  clearance_watch: 'Clearance',
  over_reserved: 'Over reserved',
  audit_due: 'Audit due',
};

const flagStyles = {
  needs_purchase: 'bg-amber-50 text-amber-800 border-amber-200',
  clearance_watch: 'bg-violet-50 text-violet-700 border-violet-200',
  over_reserved: 'bg-rose-50 text-rose-700 border-rose-200',
  audit_due: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const InventoryPage = ({
  inventory,
  customers,
  businessConfig,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InventoryPageProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const filteredInventory = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return inventory
      .filter((item) => {
        const matchesQuery =
          !lowered ||
          item.name.toLowerCase().includes(lowered) ||
          item.sku.toLowerCase().includes(lowered) ||
          item.itemCode.toLowerCase().includes(lowered) ||
          item.barcodeValue.toLowerCase().includes(lowered) ||
          item.storageLocation.toLowerCase().includes(lowered) ||
          item.supplierName.toLowerCase().includes(lowered);

        const matchesFilter =
          filter === 'all' ||
          (filter === 'purchase' &&
            (item.status === 'out-of-stock' ||
              item.status === 'low-stock' ||
              item.procurementStatus === 'to_order' ||
              item.procurementStatus === 'ordered')) ||
          (filter === 'clearance' && item.status === 'clearance') ||
          (filter === 'assigned' && (item.assignedTeamIds.length > 0 || item.assignedProjectIds.length > 0)) ||
          (filter === 'healthy' && item.status === 'in-stock' && item.procurementStatus === 'none');

        return matchesQuery && matchesFilter;
      })
      .sort((left, right) => new Date(right.lastRestockedAt).getTime() - new Date(left.lastRestockedAt).getTime());
  }, [filter, inventory, query]);

  const totalValue = inventory.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0);
  const purchaseNeeded = inventory.filter(
    (item) =>
      item.status === 'out-of-stock' ||
      item.status === 'low-stock' ||
      item.procurementStatus === 'to_order' ||
      item.procurementStatus === 'ordered',
  );
  const clearanceItems = inventory.filter((item) => item.status === 'clearance');

  return (
    <div className="flex h-full min-h-[700px] flex-col gap-5 overflow-hidden xl:h-[calc(100vh-8rem)]">
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Inventory workspace</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-brand-dark/80">{businessConfig.inventoryIntro}</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} />
          Add inventory item
        </button>
      </div>

      <div className="shrink-0 grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark/50">
            <Boxes size={14} />
            Active SKUs
          </div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{inventory.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700/70">
            <AlertTriangle size={14} />
            Purchase queue
          </div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{purchaseNeeded.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700/70">
            <ShieldAlert size={14} />
            Clearance desk
          </div>
          <div className="mt-2 text-3xl font-semibold text-violet-700">{clearanceItems.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark/50">
            <Warehouse size={14} />
            Stock value
          </div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{formatCurrency(totalValue)}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
        {!inventory.length ? (
          <div className="flex h-full items-center justify-center bg-brand-60/35">
            <EmptyStatePanel
              icon={Package}
              title="Inventory is empty"
              description={`Create your first stock record to track current units, reorder thresholds, supplier details, and ${businessConfig.workLabel.toLowerCase()} usage in one table.`}
              actions={[
                { label: 'Create first item', onClick: () => setAddModalOpen(true), emphasis: 'primary' },
                { label: 'Open customers', onClick: () => (window.location.hash = '#dashboard/customers') },
              ]}
            />
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Inventory table</h2>
                  <p className="mt-0.5 text-xs text-brand-dark/60">
                    Click any row to open the full editable inventory form.
                  </p>
                </div>
                <div className="rounded-full bg-brand-30/60 px-3 py-1 text-xs font-semibold text-brand-dark">
                  {filteredInventory.length} visible
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by item name, SKU, code, supplier, or storage location"
                  className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm text-brand-dark outline-none lg:max-w-md"
                />
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setFilter(option.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === option.key
                          ? 'bg-brand-10 text-brand-60'
                          : 'border border-brand-30 bg-white text-brand-dark/70 hover:text-brand-dark'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Item', 'Code', 'Price', 'Category', 'Stock', 'Reserved', 'Reorder', 'Supplier', 'Flags', 'Status', 'Updated'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length ? (
                    filteredInventory.map((item) => {
                      const available = Math.max(item.currentStock - item.reservedStock, 0);
                      const linkedProject = customers.find((customer) => item.assignedProjectIds.includes(customer.id));
                      const assignedCount = item.assignedTeamIds.length + item.assignedProjectIds.length;
                      const autoFlags = getInventoryFlags(item);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setEditingItem(item)}
                          className="cursor-pointer transition hover:bg-brand-60/35"
                        >
                          <td className="border-b border-brand-30/70 px-5 py-4">
                            <div className="font-semibold text-brand-dark">{item.name}</div>
                            <div className="mt-1 text-sm text-brand-dark/60">
                              {item.storageLocation}
                              {linkedProject ? ` • Linked to ${linkedProject.customerName}` : ''}
                            </div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                            <div>{item.sku}</div>
                            <div className="mt-1 text-xs text-brand-dark/50">{item.itemCode}</div>
                            <div className="mt-1 text-[11px] text-brand-dark/40">{item.barcodeValue}</div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                            <div className="font-semibold text-brand-dark">{formatCurrency(item.sellingPrice)}</div>
                            <div className="mt-1 text-xs text-brand-dark/50">Cost {formatCurrency(item.costPerUnit)}</div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">{item.category}</td>
                          <td className="border-b border-brand-30/70 px-5 py-4">
                            <div className="font-semibold text-brand-dark">{item.currentStock} {item.unit}</div>
                            <div className="mt-1 text-xs text-brand-dark/50">{available} available</div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                            {item.reservedStock} {item.unit}
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                            {item.reorderQuantity} {item.unit}
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                            <div>{item.supplierName || 'No supplier set'}</div>
                            <div className="mt-1 text-xs text-brand-dark/50">
                              {assignedCount ? `${assignedCount} linked allocation${assignedCount > 1 ? 's' : ''}` : 'No allocations'}
                            </div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4">
                            <div className="flex max-w-44 flex-wrap gap-1.5">
                              {autoFlags.length ? (
                                autoFlags.map((flag) => (
                                  <span key={flag} className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${flagStyles[flag]}`}>
                                    {flagLabels[flag]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-brand-dark/45">No flags</span>
                              )}
                            </div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[item.status]}`}>
                                {item.status.replace('-', ' ')}
                              </span>
                              <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${procurementStyles[item.procurementStatus]}`}>
                                {procurementLabels[item.procurementStatus]}
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/60">
                            {relativeDate(item.lastRestockedAt)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-5 py-16 text-center text-sm text-brand-dark/55">
                        No inventory items match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AddInventoryItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={onAddItem}
      />

      <AddInventoryItemModal
        open={!!editingItem}
        initialValues={editingItem}
        title="Edit inventory record"
        subtitle="Update stock, supplier information, reorder rules, and storage details in one form."
        submitLabel="Save changes"
        onClose={() => setEditingItem(null)}
        onSubmit={async (payload) => {
          if (!editingItem) return;
          await onUpdateItem(editingItem.id, payload);
        }}
        onDelete={editingItem ? async () => setDeleteCandidateId(editingItem.id) : null}
      />

      <ConfirmDialog
        open={!!deleteCandidateId}
        title="Delete this inventory item?"
        description="This removes the stock record from your inventory workspace. Use this only when the item should no longer be tracked."
        confirmLabel="Delete item"
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          if (!deleteCandidateId) return;
          await onDeleteItem(deleteCandidateId);
          setDeleteCandidateId(null);
          setEditingItem(null);
        }}
      />
    </div>
  );
};
