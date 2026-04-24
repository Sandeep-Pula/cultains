import { useEffect, useState } from 'react';
import type { CustomerProject, TeamMember } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';

type AddCustomerModalProps = {
  open: boolean;
  team: TeamMember[];
  businessConfig: WorkspaceBusinessConfig;
  onClose: () => void;
  onSubmit: (payload: Pick<
    CustomerProject,
    | 'customerName'
    | 'phone'
    | 'email'
    | 'address'
    | 'location'
    | 'title'
    | 'projectType'
    | 'siteStatus'
    | 'ownerId'
    | 'leadDesignerId'
    | 'fieldStaffId'
    | 'notes'
  >) => void;
};

const initialState = {
  customerName: '',
  phone: '',
  email: '',
  address: '',
  location: '',
  title: '',
  projectType: 'living_room' as const,
  siteStatus: 'ready' as const,
  ownerId: '',
  leadDesignerId: '',
  fieldStaffId: '',
  notes: '',
};

export const AddCustomerModal = ({ open, team, businessConfig, onClose, onSubmit }: AddCustomerModalProps) => {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
    }
  }, [open]);

  if (!open) return null;

  const ownerFallback = team[0]?.id ?? '';
  const fieldFallback = team.find((member) => member.role === 'Field Staff')?.id ?? team[0]?.id ?? '';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...form,
      ownerId: form.ownerId || ownerFallback,
      leadDesignerId: form.leadDesignerId || ownerFallback,
      fieldStaffId: form.fieldStaffId || fieldFallback,
    });
    setForm(initialState);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-30 px-6 py-4">
          <div>
            <h3 className="text-2xl font-semibold text-brand-dark">Add new customer</h3>
            <p className="mt-1 text-sm text-brand-dark/80">Create a new {businessConfig.customerLabel.toLowerCase()} record and assign the {businessConfig.ownerLabel.toLowerCase()} immediately.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-6 md:grid-cols-2">
          {[
            [`${businessConfig.customerLabel} name`, 'customerName'],
            ['Phone', 'phone'],
            ['Email', 'email'],
            [businessConfig.titleLabel, 'title'],
            [businessConfig.locationLabel, 'location'],
            ['Address', 'address'],
          ].map(([label, key]) => (
            <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">{label}</span>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 outline-none text-brand-dark"
                required={['customerName', 'phone', 'title', 'location'].includes(key)}
              />
            </label>
          ))}

          <label className="grid gap-2 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">{businessConfig.workLabel} type</span>
            <select
              value={form.projectType}
              onChange={(event) => setForm((current) => ({ ...current, projectType: event.target.value as typeof form.projectType }))}
              className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 text-brand-dark"
            >
              <option value="living_room">{businessConfig.projectTypeLabels.living_room}</option>
              <option value="bedroom">{businessConfig.projectTypeLabels.bedroom}</option>
              <option value="office">{businessConfig.projectTypeLabels.office}</option>
              <option value="full_home">{businessConfig.projectTypeLabels.full_home}</option>
              <option value="kitchen">{businessConfig.projectTypeLabels.kitchen}</option>
              <option value="retail">{businessConfig.projectTypeLabels.retail}</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">{businessConfig.statusLabel}</span>
            <select
              value={form.siteStatus}
              onChange={(event) => setForm((current) => ({ ...current, siteStatus: event.target.value as typeof form.siteStatus }))}
              className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 text-brand-dark"
            >
              <option value="ready">{businessConfig.siteStatusLabels.ready}</option>
              <option value="in_progress">{businessConfig.siteStatusLabels.in_progress}</option>
              <option value="under_construction">{businessConfig.siteStatusLabels.under_construction}</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">{businessConfig.ownerLabel}</span>
            <select
              value={form.ownerId}
              onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))}
              className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 text-brand-dark"
            >
              <option value="">Select owner</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">{businessConfig.specialistLabel}</span>
            <select
              value={form.leadDesignerId}
              onChange={(event) => setForm((current) => ({ ...current, leadDesignerId: event.target.value }))}
              className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 text-brand-dark"
            >
              <option value="">Select {businessConfig.specialistLabel.toLowerCase()}</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">{businessConfig.fieldLeadLabel}</span>
            <select
              value={form.fieldStaffId}
              onChange={(event) => setForm((current) => ({ ...current, fieldStaffId: event.target.value }))}
              className="rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 text-brand-dark"
            >
              <option value="">Select {businessConfig.fieldLeadLabel.toLowerCase()}</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
            <span className="font-medium text-brand-dark">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-24 rounded-2xl border border-brand-30 bg-brand-30/40 px-3 py-2.5 outline-none text-brand-dark"
              placeholder={`Context, preferences, or ${businessConfig.touchpointLabel.toLowerCase()} notes`}
            />
          </label>

          <div className="flex justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60">
              Create {businessConfig.customerLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
