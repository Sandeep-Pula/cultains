import { useMemo, useState } from 'react';
import { AlertTriangle, CircleDollarSign, Plus, Users2, X } from 'lucide-react';
import type { CustomerProject, FinanceEntry, InvoicePaymentMethod, TaskItem, TeamMember, WorkspaceProfile } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { SalaryPaycheckDetailModal } from '../components/SalaryPaycheckDetailModal';
import { formatCurrency, formatDateTime } from '../utils';

type TeamPageProps = {
  team: TeamMember[];
  customers: CustomerProject[];
  tasks: TaskItem[];
  financeEntries: FinanceEntry[];
  profile: WorkspaceProfile;
  businessConfig: WorkspaceBusinessConfig;
  onOpenCustomer: (customerId: string) => void;
  onOpenMember: (memberId: string) => void;
  onAddMember: () => void;
  onCreatePaycheck: (payload: {
    employeeMemberId: string;
    employeeName: string;
    amount: number;
    dueAt: string;
    notes: string;
    payPeriodLabel: string;
    paymentMethod: InvoicePaymentMethod;
    status: FinanceEntry['status'];
    issuedBy: string;
  }) => Promise<void>;
};

export const TeamPage = ({
  team,
  customers,
  tasks,
  financeEntries,
  profile,
  businessConfig,
  onOpenCustomer,
  onOpenMember,
  onAddMember,
  onCreatePaycheck,
}: TeamPageProps) => {
  const [paycheckOpen, setPaycheckOpen] = useState(false);
  const [paycheckSubmitting, setPaycheckSubmitting] = useState(false);
  const [selectedPaycheck, setSelectedPaycheck] = useState<FinanceEntry | null>(null);
  const [paycheckForm, setPaycheckForm] = useState({
    employeeMemberId: '',
    amount: '',
    dueAt: new Date().toISOString().slice(0, 10),
    notes: '',
    payPeriodLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    paymentMethod: 'bank_transfer' as InvoicePaymentMethod,
    status: 'paid' as FinanceEntry['status'],
  });
  const unassignedProjects = customers.filter((customer) => customer.assignedTeamIds.length === 0);
  const overdueTasks = tasks.filter((task) => !task.done && new Date(task.dueAt).getTime() < Date.now());
  const overloadedMembers = team.filter((member) => member.workload >= 80);
  const paycheckEntries = useMemo(
    () =>
      financeEntries
        .filter((entry) => entry.category === 'salary')
        .slice()
        .sort((left, right) => new Date(right.dueAt).getTime() - new Date(left.dueAt).getTime()),
    [financeEntries],
  );

  const handleCreatePaycheck = async (event: React.FormEvent) => {
    event.preventDefault();
    const employee = team.find((member) => member.id === paycheckForm.employeeMemberId);
    if (!employee) return;

    setPaycheckSubmitting(true);
    try {
      await onCreatePaycheck({
        employeeMemberId: employee.id,
        employeeName: employee.name,
        amount: Number(paycheckForm.amount || '0'),
        dueAt: new Date(paycheckForm.dueAt).toISOString(),
        notes: paycheckForm.notes.trim(),
        payPeriodLabel: paycheckForm.payPeriodLabel.trim(),
        paymentMethod: paycheckForm.paymentMethod,
        status: paycheckForm.status,
        issuedBy: profile.userName,
      });
      setPaycheckOpen(false);
      setPaycheckForm({
        employeeMemberId: '',
        amount: '',
        dueAt: new Date().toISOString().slice(0, 10),
        notes: '',
        payPeriodLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        paymentMethod: 'bank_transfer',
        status: 'paid',
      });
    } finally {
      setPaycheckSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 xl:h-[calc(100vh-8rem)]">
      
      {/* Header - Fixed */}
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Team management</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-brand-dark/80">{businessConfig.teamIntro}</p>
        </div>
        <button
          onClick={onAddMember}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} />
          Add team member
        </button>
      </div>

      {/* Grid Stats - Fixed */}
      <div className="shrink-0 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Active crew</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{team.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">{businessConfig.workPlural} needing assignment</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{unassignedProjects.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600/70">Overdue tasks</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{overdueTasks.length}</div>
        </div>
      </div>

      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <CircleDollarSign size={14} />
              Payroll
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-brand-dark">Salary and paycheck history</h2>
            <p className="mt-2 text-sm text-brand-dark/65">Generate salary paychecks for team members, preview them, and keep the same records visible in each teammate profile.</p>
          </div>
          <button
            type="button"
            onClick={() => setPaycheckOpen(true)}
            className="rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark"
          >
            Generate paycheck
          </button>
        </div>

        <div className="mt-6 ui-scrollable max-h-[320px] space-y-3 pr-1">
          {paycheckEntries.length ? (
            paycheckEntries.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-brand-dark">{entry.paycheckNumber || entry.title}</div>
                    <div className="mt-1 text-sm text-brand-dark/70">
                      {entry.employeeName || 'Team member'} • {entry.payPeriodLabel || 'Pay period not set'} • {formatDateTime(entry.dueAt)}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-brand-dark/45">
                      {(entry.paymentMethod ? entry.paymentMethod.replace('_', ' ') : 'bank transfer')} • {entry.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark">{formatCurrency(entry.amount)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPaycheck(entry)}
                      className="rounded-2xl border border-brand-30 bg-white px-4 py-2 text-sm font-medium text-brand-dark"
                    >
                      Preview paycheck
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/25 p-8 text-center text-brand-dark/55">
              No salary paychecks have been created yet.
            </div>
          )}
        </div>
      </section>

      {/* Main Body - Scrollable Bounded */}
      <div className="flex-1 overflow-hidden min-h-[500px]">
        {!team.length ? (
          <div className="h-full w-full rounded-[32px] border border-dashed border-brand-30 bg-brand-60/50 flex items-center justify-center">
            <EmptyStatePanel
              icon={Users2}
              title="No team members yet"
              description={`Add your first teammate when you want to securely delegate ownership and execution across ${businessConfig.workPlural.toLowerCase()}.`}
              actions={[
                { label: 'Create new team member profile', onClick: onAddMember, emphasis: 'primary' },
              ]}
            />
          </div>
        ) : (
          <div className="grid h-full gap-4 xl:grid-cols-[1.5fr_1fr]">
            
            {/* Left Pane: Roster List */}
            <section className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
              <div className="shrink-0 border-b border-brand-30/50 px-6 py-5">
                <div className="flex items-center gap-2 text-brand-dark">
                  <Users2 size={20} />
                  <h2 className="text-xl font-semibold tracking-tight">Active Roster</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 hide-scrollbar space-y-4">
                {team.map((member) => {
                  const memberOverdueTasks = tasks.filter(
                    (task) => task.ownerId === member.id && !task.done && new Date(task.dueAt).getTime() < Date.now(),
                  );

                  return (
                    <div key={member.id} className="rounded-2xl border border-brand-30/70 bg-brand-60/40 p-4 transition-colors hover:bg-brand-60/80">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <button onClick={() => onOpenMember(member.id)} className="flex flex-1 items-center gap-4 text-left group">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-semibold text-brand-10 shadow-sm transition group-hover:scale-105">
                            {member.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-[17px] text-brand-dark group-hover:text-brand-10 transition-colors">{member.name}</div>
                            <div className="text-sm font-medium text-brand-dark/60">{member.role}</div>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-dark cursor-default shrink-0">
                          <span className="rounded-full border border-brand-30/50 bg-white px-3 py-1 text-brand-dark/70 drop-shadow-sm">{member.activeProjects} active assignments</span>
                          <span className="rounded-full border border-brand-30/50 bg-white px-3 py-1 drop-shadow-sm">{member.workload}% load</span>
                          {memberOverdueTasks.length ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 drop-shadow-sm">{memberOverdueTasks.length} overdue flag</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-4">
                         <div className="flex-1 h-1.5 rounded-full bg-brand-30/50">
                           <div className="h-1.5 rounded-full bg-brand-10 transition-all duration-1000" style={{ width: `${member.workload}%` }} />
                         </div>
                         <div className="shrink-0 flex gap-2">
                            <button
                              onClick={() => onOpenMember(member.id)}
                              className="rounded-xl border border-brand-30 bg-white px-4 py-1.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-30/40"
                            >
                              Manage Profile
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
              
              <div className="flex-1 flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-10 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-white pb-4 shrink-0">
                  <AlertTriangle size={20} />
                  <h2 className="text-xl font-semibold tracking-tight">Needs attention</h2>
                </div>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
                  {unassignedProjects.length ? (
                    unassignedProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => onOpenCustomer(project.id)}
                        className="block w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left transition hover:bg-white/20"
                      >
                        <div className="font-semibold text-white">{project.customerName}</div>
                        <div className="mt-1 text-sm font-medium text-white/80">{project.title} urgently needs assignment</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm font-medium text-white/70">
                      All active projects are fully allocated to the team!
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-brand-dark pb-4 shrink-0">Workload watch</h2>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
                  {(overloadedMembers.length ? overloadedMembers : team.slice(0, 3)).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => onOpenMember(member.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-brand-30/50 bg-brand-60/50 px-5 py-4 text-left transition hover:border-brand-30 hover:bg-brand-60"
                    >
                      <div>
                        <div className="font-semibold text-brand-dark">{member.name}</div>
                        <div className="mt-1 text-sm font-medium text-brand-dark/60">{member.activeProjects} active projects</div>
                      </div>
                      <span className={`rounded-xl border border-transparent px-3 py-1 font-bold text-[15px] shadow-sm ${member.workload >= 80 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-brand-10 border-brand-30/50'}`}>
                        {member.workload}% High
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </section>
          </div>
        )}
      </div>

      {paycheckOpen ? (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-4 pt-6 backdrop-blur-sm sm:items-center sm:pt-4">
          <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-brand-30 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-brand-dark">Generate paycheck</h3>
                <p className="mt-1 text-sm text-brand-dark/70">Create a salary paycheck that can be printed by the business owner and viewed by the team member.</p>
              </div>
              <button type="button" onClick={() => setPaycheckOpen(false)} className="rounded-2xl border border-brand-30 bg-brand-60/30 p-2 text-brand-dark">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePaycheck} className="ui-scrollable grid gap-4 px-6 py-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Team member</span>
                <select
                  value={paycheckForm.employeeMemberId}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, employeeMemberId: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  required
                >
                  <option value="">Select a team member</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>{member.name} • {member.role}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Amount</span>
                <input
                  inputMode="numeric"
                  value={paycheckForm.amount}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, '') }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="25000"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Pay date</span>
                <input
                  type="date"
                  value={paycheckForm.dueAt}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, dueAt: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Pay period</span>
                <input
                  value={paycheckForm.payPeriodLabel}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, payPeriodLabel: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="April 2026"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Payment method</span>
                <select
                  value={paycheckForm.paymentMethod}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, paymentMethod: event.target.value as InvoicePaymentMethod }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit_card">Credit card</option>
                  <option value="debit_card">Debit card</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Status</span>
                <select
                  value={paycheckForm.status}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, status: event.target.value as FinanceEntry['status'] }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
                <span>Notes</span>
                <textarea
                  value={paycheckForm.notes}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="Optional note for the paycheck"
                />
              </label>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" onClick={() => setPaycheckOpen(false)} className="rounded-2xl border border-brand-30 px-4 py-2.5 text-sm font-medium text-brand-dark">
                  Cancel
                </button>
                <button type="submit" disabled={paycheckSubmitting} className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 disabled:opacity-60">
                  {paycheckSubmitting ? 'Creating...' : 'Create paycheck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <SalaryPaycheckDetailModal
        paycheck={selectedPaycheck}
        open={!!selectedPaycheck}
        companyName={profile.companyName}
        businessProfile={profile}
        onClose={() => setSelectedPaycheck(null)}
      />
    </div>
  );
};
