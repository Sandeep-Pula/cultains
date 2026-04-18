import { AlertTriangle, Package, Plus, PackageX, History, DollarSign } from 'lucide-react';
import type { InventoryItem, TeamMember } from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { relativeDate } from '../utils';

type InventoryPageProps = {
  inventory: InventoryItem[];
  team: TeamMember[];
  onOpenItem: (itemId: string) => void;
  onAddItem: () => void;
};

export const InventoryPage = ({
  inventory,
  team,
  onOpenItem,
  onAddItem,
}: InventoryPageProps) => {
  const lowStockItems = inventory.filter((item) => item.status === 'low-stock');
  const outOfStockItems = inventory.filter((item) => item.status === 'out-of-stock');
  const agingStockItems = inventory.filter((item) => item.condition === 'aging' || item.status === 'clearance');
  const totalValue = inventory.reduce((acc, item) => acc + (item.currentStock * item.costPerUnit), 0);
  
  const unassignedItems = inventory.filter(item => item.assignedTeamIds.length === 0);
  
  return (
    <div className="flex flex-col gap-5 xl:h-[calc(100vh-8rem)]">
      
      {/* Header - Fixed */}
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Inventory Workspace</h1>
          <p className="mt-1 text-brand-dark/80 max-w-2xl text-[15px]">Manage hardware, tools, materials, and internal resources. Keep strict watch on minimum reorder triggers.</p>
        </div>
        <button
          onClick={onAddItem}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} />
          Add new item record
        </button>
      </div>

      {/* Grid Stats - Fixed */}
      <div className="shrink-0 grid gap-4 md:grid-cols-4">
         <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 flex items-center gap-2"><Package size={14}/> Active line items</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{inventory.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 flex items-center gap-2"><DollarSign size={14}/> Est. Net Value</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">₹{totalValue.toLocaleString()}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600/70 flex items-center gap-2"><PackageX size={14}/> Restock Warning</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{lowStockItems.length + outOfStockItems.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600/70 flex items-center gap-2"><History size={14}/> Cold Stock</div>
          <div className="mt-2 text-3xl font-semibold text-rose-700">{agingStockItems.length}</div>
        </div>
      </div>

      {/* Main Body - Scrollable Bounded */}
      <div className="flex-1 overflow-hidden min-h-[500px]">
        {!inventory.length ? (
          <div className="h-full w-full rounded-[32px] border border-dashed border-brand-30 bg-brand-60/50 flex items-center justify-center">
            <EmptyStatePanel
              icon={Package}
              title="Warehouse is empty"
              description="Digitize your inventory logs. You can track tools assigned to workers or base supplies meant to stay in storage."
              actions={[
                { label: 'Create your first item', onClick: onAddItem, emphasis: 'primary' },
              ]}
            />
          </div>
        ) : (
          <div className="grid h-full gap-4 xl:grid-cols-[1.5fr_1fr]">
            
            {/* Left Pane: Roster List */}
            <section className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
              <div className="shrink-0 border-b border-brand-30/50 px-6 py-5">
                <div className="flex items-center gap-2 text-brand-dark">
                  <Package size={20} />
                  <h2 className="text-xl font-semibold tracking-tight">Active Warehouse</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 hide-scrollbar space-y-4">
                {inventory.map((item) => {
                  return (
                    <div key={item.id} className="rounded-2xl border border-brand-30/70 bg-brand-60/40 p-4 transition-colors hover:bg-brand-60/80">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <button onClick={() => onOpenItem(item.id)} className="flex flex-1 items-center gap-4 text-left group">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-lg font-semibold shadow-sm transition group-hover:scale-105 ${item.status === 'out-of-stock' ? 'text-amber-500 border-amber-200 border' : 'text-brand-10 border-brand-30/50 border'}`}>
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[17px] text-brand-dark group-hover:text-brand-10 transition-colors">{item.name}</div>
                            <div className="text-sm font-medium text-brand-dark/60">{item.sku} • {item.category}</div>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-dark cursor-default shrink-0">
                          <span className={`rounded-xl px-3 py-1 drop-shadow-sm border ${item.currentStock === 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-brand-30/50 text-brand-dark'}`}>
                            {item.currentStock} Units Left
                          </span>
                          {item.assignedTeamIds.length > 0 ? (
                            <span className="rounded-xl border border-brand-30/50 bg-brand-10/5 px-3 py-1 text-brand-10 drop-shadow-sm">Tracking {item.assignedTeamIds.length} deployments</span>
                          ) : null}
                          <span className={`rounded-xl uppercase tracking-wider text-[11px] font-bold border px-3 py-1 drop-shadow-sm ${
                            item.status === 'in-stock' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            item.status === 'out-of-stock' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {item.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-brand-30/50 pt-4">
                         <div className="text-sm font-medium text-brand-dark/50">Restocked {relativeDate(item.lastRestockedAt)}</div>
                         <div className="shrink-0 flex gap-2">
                            <button
                              onClick={() => onOpenItem(item.id)}
                              className="rounded-xl border border-brand-30 bg-white px-4 py-1.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-30/40 shadow-sm"
                            >
                              Manage Record
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Pane: Watch lists */}
            <section className="flex flex-col gap-4 overflow-hidden">
              
              <div className="flex-1 flex flex-col overflow-hidden rounded-[32px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-amber-900 pb-4 shrink-0">
                  <AlertTriangle size={20} />
                  <h2 className="text-xl font-semibold tracking-tight">Procurement required</h2>
                </div>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
                  {lowStockItems.length || outOfStockItems.length ? (
                    [...outOfStockItems, ...lowStockItems].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onOpenItem(item.id)}
                        className="block w-full rounded-2xl border border-amber-200/60 bg-white/60 px-5 py-4 text-left transition hover:bg-white"
                      >
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-amber-900">{item.name}</div>
                            <span className="font-bold text-amber-700 text-lg">{item.currentStock}</span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-amber-800/70">Threshold set to {item.minimumStock} min.</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-200/80 bg-white/40 p-6 text-center text-[15px] font-medium text-amber-800/60">
                      All inventory supplies are well above their safety minimums.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-brand-dark pb-4 shrink-0">Aging stock liquidation</h2>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
                  {agingStockItems.length ? (
                    agingStockItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onOpenItem(item.id)}
                        className="flex w-full items-center justify-between rounded-2xl border border-brand-30/50 bg-brand-60/50 px-5 py-4 text-left transition hover:border-brand-30 hover:bg-brand-60"
                      >
                        <div>
                          <div className="font-semibold text-brand-dark">{item.name}</div>
                          <div className="mt-1 text-sm font-medium text-brand-dark/60">Value locked: ₹{(item.currentStock * item.costPerUnit).toLocaleString()}</div>
                        </div>
                        <span className="rounded-xl px-3 py-1 font-bold text-[13px] uppercase tracking-wider shadow-sm bg-rose-50 text-rose-700 border-rose-200 border">
                          {item.condition}
                        </span>
                      </button>
                    ))
                  ) : (
                      <div className="rounded-2xl border border-dashed border-brand-30/80 bg-brand-60/40 p-6 text-center text-[15px] font-medium text-brand-dark/50">
                        No stale stock identified in the warehouse log.
                      </div>
                  )}
                </div>
              </div>

            </section>
          </div>
        )}
      </div>
    </div>
  );
};
