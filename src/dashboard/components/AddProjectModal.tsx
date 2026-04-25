import { useEffect, useState } from 'react';
import type { CustomerProject, TeamMember } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';

type AddProjectModalProps = {
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
  siteStatus: 'in_progress' as const,
  ownerId: '',
  leadDesignerId: '',
  fieldStaffId: '',
  notes: '',
};

export const AddProjectModal = ({ open, team, businessConfig, onClose, onSubmit }: AddProjectModalProps) => {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
    }
  }, [open]);

  if (!open) return null;

  const ownerFallback = team.find((member) => member.role === 'Sales Owner')?.id ?? team[0]?.id ?? '';
  const leadFallback = team.find((member) => member.role === 'Lead Designer')?.id ?? team[0]?.id ?? '';
  const fieldFallback = team.find((member) => member.role === 'Field Staff' || member.role === 'Site Coordinator')?.id ?? team[0]?.id ?? '';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...form,
      ownerId: form.ownerId || ownerFallback,
      leadDesignerId: form.leadDesignerId || leadFallback,
      fieldStaffId: form.fieldStaffId || fieldFallback,
    });
    setForm(initialState);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-brand-dark/25 p-4 pt-6 backdrop-blur-sm sm:items-center sm:pt-4">
      <div className="w-full max-w-4xl rounded-[28px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-30 px-6 py-4">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/65">
              New {businessConfig.workLabel.toLowerCase()} workspace
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">Create a highlighted {businessConfig.workLabel.toLowerCase()} intake</h3>
            <p className="mt-1 text-sm text-brand-dark/80">Use this when a new {businessConfig.workLabel.toLowerCase()} should start with ownership, notes, and workflow visibility from day one.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [`${businessConfig.customerLabel} / company name`, 'customerName'],
              [businessConfig.titleLabel, 'title'],
              ['Phone', 'phone'],
              ['Email', 'email'],
              [businessConfig.locationLabel, 'location'],
              ['Address', 'address'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">{label}</span>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  required={['customerName', 'title', 'phone', 'location'].includes(key)}
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">{businessConfig.workLabel} type</span>
              <select
                value={form.projectType}
                onChange={(event) => setForm((current) => ({ ...current, projectType: event.target.value as typeof form.projectType }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
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
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                <option value="in_progress">{businessConfig.siteStatusLabels.in_progress}</option>
                <option value="ready">{businessConfig.siteStatusLabels.ready}</option>
                <option value="under_construction">{businessConfig.siteStatusLabels.under_construction}</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">{businessConfig.ownerLabel}</span>
              <select
                value={form.ownerId}
                onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                <option value="">Select owner</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} • {member.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">{businessConfig.specialistLabel}</span>
              <select
                value={form.leadDesignerId}
                onChange={(event) => setForm((current) => ({ ...current, leadDesignerId: event.target.value }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                <option value="">Select {businessConfig.specialistLabel.toLowerCase()}</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} • {member.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
              <span className="font-medium text-brand-dark">{businessConfig.workLabel} notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                placeholder="Context, approvals, dependencies, budget cues, or delivery notes"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-brand-30 bg-gradient-to-br from-white to-brand-30/30 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/65">What happens next</div>
            <div className="mt-4 space-y-4">
              {[
                `${businessConfig.workLabel} appears in the pipeline board immediately.`,
                `${businessConfig.customerLabel} workspace opens so notes and assignments can continue.`,
                'Follow-up reminders and workflow tracking start from this record.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/85 px-4 py-3 text-sm text-brand-dark/85 shadow-sm">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-10 px-4 py-4 text-sm text-brand-60">
              Highlighted action: use this modal for all new intake so your team always starts with ownership, customer info, and workflow stage in one place.
            </div>
          </div>

          <div className="flex justify-end gap-3 lg:col-span-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm">
              Create {businessConfig.workLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
