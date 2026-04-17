import { useMemo, useState } from 'react';
import type { TeamMember, TeamRole } from '../types';
import { getInitials } from '../utils';

type AddTeamMemberModalProps = {
  open: boolean;
  existingTeam: TeamMember[];
  onClose: () => void;
  onSubmit: (payload: Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status'>) => void;
};

const roles: TeamRole[] = ['Lead Designer', 'Visualizer', 'Site Coordinator', 'Sales Owner', 'Field Staff'];

const initialState: {
  name: string;
  role: TeamRole;
  email: string;
  phone: string;
  status: TeamMember['status'];
} = {
  name: '',
  role: 'Lead Designer' as TeamRole,
  email: '',
  phone: '',
  status: 'online' as const,
};

export const AddTeamMemberModal = ({ open, existingTeam, onClose, onSubmit }: AddTeamMemberModalProps) => {
  const [form, setForm] = useState(initialState);

  const defaultEmail = useMemo(() => {
    if (!form.name.trim()) return '';
    return `${form.name.trim().toLowerCase().replace(/\s+/g, '.')}@cultains.com`;
  }, [form.name]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...form,
      email: form.email || defaultEmail,
    });
    setForm(initialState);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-30 px-6 py-4">
          <div>
            <h3 className="text-2xl font-semibold text-brand-dark">Add team member</h3>
            <p className="mt-1 text-sm text-brand-dark/80">Create a new teammate profile and make them available for assignments immediately.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-6 md:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Full name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                placeholder="Ananya Sharma"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Role</span>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as TeamRole }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Email</span>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  placeholder={defaultEmail || 'designer@cultains.com'}
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  placeholder="+91 98765 11006"
                  required
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Availability</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TeamMember['status'] }))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </label>
          </div>

          <div className="rounded-3xl bg-brand-30/40 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/60">Preview</div>
            <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-semibold text-brand-10 shadow-sm">
              {getInitials(form.name || 'TM')}
            </div>
            <div className="mt-4 text-xl font-semibold text-brand-dark">{form.name || 'New teammate'}</div>
            <div className="mt-1 text-sm text-brand-dark/80">{form.role}</div>
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-brand-dark/80">
              <div>{existingTeam.length} team members currently active in the dashboard.</div>
              <div className="mt-2">New members can be assigned from team cards, customer drawers, and project ownership controls.</div>
            </div>
          </div>

          <div className="flex justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60">
              Add team member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
