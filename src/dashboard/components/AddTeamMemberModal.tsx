import { useEffect, useMemo, useState } from 'react';
import type { DashboardView, TeamMember, TeamRole } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { accessControlledViews, genericTeamRoleSuggestions, getInitials, viewTitles } from '../utils';

type AddTeamMemberModalProps = {
  open: boolean;
  existingTeam: TeamMember[];
  businessConfig: WorkspaceBusinessConfig;
  onClose: () => void;
  onSubmit: (payload: Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status' | 'allowedViews' | 'loginEnabled' | 'loginEmail'> & { password?: string }) => void;
};

const initialState: {
  name: string;
  role: TeamRole;
  email: string;
  phone: string;
  status: TeamMember['status'];
  allowedViews: DashboardView[];
  loginEnabled: boolean;
  loginEmail: string;
  password: string;
} = {
  name: '',
  role: 'Sales Executive',
  email: '',
  phone: '',
  status: 'online' as const,
  allowedViews: ['sales-overview', 'billing', 'barcode-desk'],
  loginEnabled: false,
  loginEmail: '',
  password: '',
};

export const AddTeamMemberModal = ({ open, existingTeam, businessConfig, onClose, onSubmit }: AddTeamMemberModalProps) => {
  const [form, setForm] = useState(initialState);

  const defaultEmail = useMemo(() => {
    if (!form.name.trim()) return '';
    return `${form.name.trim().toLowerCase().replace(/\s+/g, '.')}@aivyapari.work`;
  }, [form.name]);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...form,
      email: form.email || defaultEmail,
      loginEmail: form.loginEmail || form.email || defaultEmail,
      password: form.password || undefined,
    });
    setForm(initialState);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-brand-dark/25 p-3 pt-4 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-30 px-6 py-4">
          <div>
            <h3 className="text-2xl font-semibold text-brand-dark">Add team member</h3>
            <p className="mt-1 text-sm text-brand-dark/80">Create a new teammate profile and make them available for assignments immediately inside this {businessConfig.label.toLowerCase()} workspace.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ui-scrollable grid gap-4 px-6 py-5 md:grid-cols-[1fr_0.8fr]">
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
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                list="team-role-suggestions"
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                placeholder="Sales Executive"
              />
              <datalist id="team-role-suggestions">
                {genericTeamRoleSuggestions.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
              <span className="text-xs text-brand-dark/55">Use a suggested business role or type your own custom role.</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Email</span>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  placeholder={defaultEmail || 'teammate@AIvyapari.work'}
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

            <div className="grid gap-3 rounded-3xl border border-brand-30 bg-brand-60/30 p-4">
              <div>
                <div className="font-medium text-brand-dark">Dashboard access</div>
                <div className="mt-1 text-xs text-brand-dark/60">Choose exactly which dashboard areas this teammate can use after login.</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {accessControlledViews.map((view) => (
                  <label key={view} className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark">
                    <input
                      type="checkbox"
                      checked={form.allowedViews.includes(view)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allowedViews: event.target.checked
                            ? [...current.allowedViews, view]
                            : current.allowedViews.filter((item) => item !== view),
                        }))
                      }
                    />
                    <span>{viewTitles[view]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-brand-30 bg-brand-60/30 p-4">
              <label className="flex items-center justify-between rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark">
                <span className="font-medium">Create login credentials</span>
                <input
                  type="checkbox"
                  checked={form.loginEnabled}
                  onChange={(event) => setForm((current) => ({ ...current, loginEnabled: event.target.checked }))}
                />
              </label>
              {form.loginEnabled ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-brand-dark/80">
                    <span className="font-medium text-brand-dark">Login email</span>
                    <input
                      value={form.loginEmail}
                      onChange={(event) => setForm((current) => ({ ...current, loginEmail: event.target.value }))}
                      className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                      placeholder={form.email || defaultEmail || 'teammate@business.com'}
                      required={form.loginEnabled}
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-brand-dark/80">
                    <span className="font-medium text-brand-dark">Temporary password</span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                      placeholder="At least 8 characters"
                      minLength={8}
                      required={form.loginEnabled}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl bg-brand-30/40 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/60">Preview</div>
            <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-semibold text-brand-10 shadow-sm">
              {getInitials(form.name || 'TM')}
            </div>
            <div className="mt-4 text-xl font-semibold text-brand-dark">{form.name || 'New teammate'}</div>
            <div className="mt-1 text-sm text-brand-dark/80">{form.role}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-brand-dark/55">
              {form.allowedViews.length ? `${form.allowedViews.length} workspace tools enabled` : 'No dashboard access selected'}
            </div>
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-brand-dark/80">
              <div>{existingTeam.length} team members currently active in the dashboard.</div>
              <div className="mt-2">Business owners can assign only the tools this teammate should see after login.</div>
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
