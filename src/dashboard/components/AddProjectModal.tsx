import { useState } from 'react';
import type { CustomerProject, TeamMember } from '../types';

type AddProjectModalProps = {
  open: boolean;
  team: TeamMember[];
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

export const AddProjectModal = ({ open, team, onClose, onSubmit }: AddProjectModalProps) => {
  const [form, setForm] = useState(initialState);

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f1711]/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[28px] border border-[#eadfd2] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eadfd2] px-6 py-4">
          <div>
            <div className="inline-flex rounded-full bg-[#f7efe3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9b8570]">
              New project workspace
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-[#201812]">Create a highlighted project intake</h3>
            <p className="mt-1 text-sm text-[#6f604f]">Use this when a decorator wants to start a new customer job and assign ownership from day one.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-[#eadfd2] px-3 py-2 text-sm text-[#6f604f]">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Customer / firm name', 'customerName'],
              ['Project title', 'title'],
              ['Phone', 'phone'],
              ['Email', 'email'],
              ['Location', 'location'],
              ['Address', 'address'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-[#6f604f]">
                <span className="font-medium text-[#201812]">{label}</span>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5 outline-none"
                  required={['customerName', 'title', 'phone', 'location'].includes(key)}
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm text-[#6f604f]">
              <span className="font-medium text-[#201812]">Project type</span>
              <select
                value={form.projectType}
                onChange={(event) => setForm((current) => ({ ...current, projectType: event.target.value as typeof form.projectType }))}
                className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
              >
                <option value="living_room">Living room</option>
                <option value="bedroom">Bedroom</option>
                <option value="office">Office</option>
                <option value="full_home">Full home</option>
                <option value="kitchen">Kitchen</option>
                <option value="retail">Retail</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[#6f604f]">
              <span className="font-medium text-[#201812]">Site status</span>
              <select
                value={form.siteStatus}
                onChange={(event) => setForm((current) => ({ ...current, siteStatus: event.target.value as typeof form.siteStatus }))}
                className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
              >
                <option value="in_progress">In progress</option>
                <option value="ready">Ready</option>
                <option value="under_construction">Under construction</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[#6f604f]">
              <span className="font-medium text-[#201812]">Sales owner</span>
              <select
                value={form.ownerId}
                onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))}
                className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
              >
                <option value="">Select owner</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} • {member.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[#6f604f]">
              <span className="font-medium text-[#201812]">Lead designer</span>
              <select
                value={form.leadDesignerId}
                onChange={(event) => setForm((current) => ({ ...current, leadDesignerId: event.target.value }))}
                className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
              >
                <option value="">Select designer</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} • {member.role}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[#6f604f] md:col-span-2">
              <span className="font-medium text-[#201812]">Project notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-28 rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5 outline-none"
                placeholder="Budget cues, site context, preferred materials, approvals needed"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-[#eadfd2] bg-gradient-to-br from-[#fffaf4] to-[#f3e8d8] p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9b8570]">What happens next</div>
            <div className="mt-4 space-y-4">
              {[
                'Project appears in the pipeline board immediately.',
                'Customer workspace is opened so notes and assignments can continue.',
                'Follow-up reminders and render queue start from this record.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#5f5042] shadow-sm">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#201812] px-4 py-4 text-sm text-[#f8efe4]">
              Highlighted action: use this modal for all new job intake so your team always starts with ownership, customer info, and project stage in one place.
            </div>
          </div>

          <div className="flex justify-end gap-3 lg:col-span-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-[#eadfd2] px-4 py-2.5 text-sm font-medium text-[#6f604f]">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-[#6f5438] px-4 py-2.5 text-sm font-medium text-white shadow-sm">
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
