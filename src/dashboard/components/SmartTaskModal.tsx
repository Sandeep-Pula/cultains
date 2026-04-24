import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search, Calendar, FolderKanban, Plus } from 'lucide-react';
import type { CustomerProject } from '../types';

type SmartTaskModalProps = {
  open: boolean;
  onClose: () => void;
  initialDate: Date | null;
  customers: CustomerProject[];
  customerLabel?: string;
  onSave: (
    title: string,
    dueAt: string,
    customerOption: { id?: string; isNew?: boolean; name?: string; phone?: string; address?: string }
  ) => Promise<void>;
};

export const SmartTaskModal = ({ open, onClose, initialDate, customers, customerLabel = 'Customer', onSave }: SmartTaskModalProps) => {
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setSearch('');
      setSelectedCustomer(null);
      setIsCreatingNew(false);
      setNewPhone('');
      setNewAddress('');
      setIsSaving(false);
      setError(null);
    }
  }, [open]);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    return customers.filter(c => c.customerName.toLowerCase().includes(query)).slice(0, 5);
  }, [search, customers]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !initialDate) return;

    if (!selectedCustomer && !isCreatingNew) return;
    if (isCreatingNew && !search.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const at = new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        initialDate.getDate(),
        11,
        0,
        0,
      ).toISOString();

      await onSave(
        title,
        at,
        isCreatingNew
          ? { isNew: true, name: search, phone: newPhone, address: newAddress }
          : { id: selectedCustomer!.id }
      );

      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to save this task right now.');
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-brand-dark/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-brand-30 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Schedule New Task</h2>
            <button onClick={onClose} className="rounded-full p-2 text-brand-dark/60 hover:bg-brand-60">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col p-6 space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-30/40 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-60 text-brand-10">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark/70">Selected Date</div>
                <div className="mt-0.5 text-[15px] font-medium text-brand-dark">
                  {initialDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-dark/70">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Call for initial briefing..."
                  className="w-full rounded-2xl border border-brand-30 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-10 focus:ring-1 focus:ring-brand-10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-dark/70">
                  Link to {customerLabel}
                </label>
                {!selectedCustomer && !isCreatingNew ? (
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search existing ${customerLabel.toLowerCase()}s or type to add new...`}
                      className="w-full rounded-2xl border border-brand-30 pl-10 pr-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-10 focus:ring-1 focus:ring-brand-10"
                    />
                    
                    {search.trim() && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-[60] overflow-hidden rounded-2xl border border-brand-30 bg-white shadow-lg">
                        {matches.length > 0 && (
                          <div className="border-b border-brand-30 p-2 text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
                            Found Customers
                          </div>
                        )}
                        {matches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCustomer(c)}
                            className="flex w-full items-center justify-between px-4 py-3 hover:bg-brand-60"
                          >
                            <span className="text-sm font-medium text-brand-dark">{c.customerName}</span>
                            <span className="text-xs text-brand-dark/60">{c.title}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCreatingNew(true)}
                          className="flex w-full items-center gap-2 border-t border-brand-30 px-4 py-3 text-sm font-medium text-brand-10 hover:bg-brand-60"
                        >
                          <Plus size={16} />
                          Create as new {customerLabel.toLowerCase()}
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-2xl border border-brand-10 bg-brand-10/5 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FolderKanban size={18} className="text-brand-10" />
                      <div>
                        <div className="text-sm font-semibold text-brand-dark">{selectedCustomer.customerName}</div>
                        <div className="text-xs text-brand-dark/70">{selectedCustomer.phone}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-brand-30 bg-brand-60/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-brand-dark">New {customerLabel} Profile</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setSearch('');
                        }}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        value={search}
                        disabled
                        className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm text-brand-dark opacity-70"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Phone number"
                        className="w-full rounded-xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-10"
                      />
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Address / Location"
                        className="w-full rounded-xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || !title.trim() || (!selectedCustomer && !isCreatingNew) || (isCreatingNew && !search.trim())}
                className="flex w-full min-w-0 items-center justify-center rounded-2xl bg-brand-10 px-4 py-3.5 text-[15px] font-semibold text-brand-dark transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Task to Calendar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
