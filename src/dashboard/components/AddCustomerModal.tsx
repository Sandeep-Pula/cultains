import { useState } from 'react';
import type { CustomerProject, TeamMember } from '../types';

type AddCustomerModalProps = {
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
  siteStatus: 'ready' as const,
  ownerId: '',
  leadDesignerId: '',
  fieldStaffId: '',
  notes: '',
};

export const AddCustomerModal = ({ open, team, onClose, onSubmit }: AddCustomerModalProps) => {
  const [form, setForm] = useState(initialState);

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f1711]/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-[#eadfd2] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eadfd2] px-6 py-4">
          <div>
            <h3 className="text-2xl font-semibold text-[#201812]">Add new customer</h3>
            <p className="mt-1 text-sm text-[#6f604f]">Create a new customer and assign the project owner immediately.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-[#eadfd2] px-3 py-2 text-sm text-[#6f604f]">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-6 md:grid-cols-2">
          {[
            ['Customer name', 'customerName'],
            ['Phone', 'phone'],
            ['Email', 'email'],
            ['Project title', 'title'],
            ['Location', 'location'],
            ['Address', 'address'],
          ].map(([label, key]) => (
            <label key={key} className="grid gap-2 text-sm text-[#6f604f]">
              <span className="font-medium text-[#201812]">{label}</span>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5 outline-none"
                required={['customerName', 'phone', 'title', 'location'].includes(key)}
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
              <option value="ready">Ready</option>
              <option value="in_progress">In progress</option>
              <option value="under_construction">Under construction</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[#6f604f]">
            <span className="font-medium text-[#201812]">Owner</span>
            <select
              value={form.ownerId}
              onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))}
              className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
            >
              <option value="">Select owner</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
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
              <option value="">Select lead designer</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[#6f604f]">
            <span className="font-medium text-[#201812]">Field staff</span>
            <select
              value={form.fieldStaffId}
              onChange={(event) => setForm((current) => ({ ...current, fieldStaffId: event.target.value }))}
              className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5"
            >
              <option value="">Select field staff</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[#6f604f] md:col-span-2">
            <span className="font-medium text-[#201812]">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-24 rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2.5 outline-none"
              placeholder="Project context, preferences, or sales notes"
            />
          </label>

          <div className="flex justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-[#eadfd2] px-4 py-2.5 text-sm font-medium text-[#6f604f]">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-[#6f5438] px-4 py-2.5 text-sm font-medium text-white">
              Create customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
