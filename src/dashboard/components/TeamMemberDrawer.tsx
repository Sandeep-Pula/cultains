import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseBusiness, CalendarClock, Mail, Phone, Trash2, X } from 'lucide-react';
import type { CustomerProject, FinanceEntry, SalesInvoice, TeamMember, TeamRole, TaskItem, WorkspaceProfile } from '../types';
import { SalaryPaycheckDetailModal } from './SalaryPaycheckDetailModal';
import { accessControlledViews, formatCurrency, formatDateTime, genericTeamRoleSuggestions, relativeDate, viewTitles } from '../utils';

type TeamMemberDrawerProps = {
  member: TeamMember | null;
  customers: CustomerProject[];
  tasks: TaskItem[];
  salesInvoices: SalesInvoice[];
  financeEntries: FinanceEntry[];
  businessCompanyName: string;
  businessProfile: WorkspaceProfile;
  open: boolean;
  onClose: () => void;
  onOpenCustomer: (customerId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAssignToProject: (customerId: string, memberId: string) => void;
  onRemoveFromProject: (customerId: string, memberId: string) => void;
  onUpdateMember?: (memberId: string, payload: Partial<TeamMember>) => void;
  onProvisionLogin?: (memberId: string, payload: { loginEmail: string; password: string }) => Promise<void>;
  onSendPasswordReset?: (email: string) => Promise<void>;
};

const InlineInput = ({ 
  value, 
  onSave, 
  placeholder, 
  className, 
}: { 
  value: string; 
  onSave: (val: string) => void; 
  placeholder?: string; 
  className?: string;
}) => {
  const [localVal, setLocalVal] = useState(value);
  
  useEffect(() => {
    setLocalVal(value);
  }, [value]);
  
  const handleBlur = () => {
    if (localVal.trim() !== value) {
      onSave(localVal.trim());
    }
  };

  return (
    <input 
      type="text"
      value={localVal} 
      onChange={e => setLocalVal(e.target.value)} 
      onBlur={handleBlur} 
      placeholder={placeholder} 
      autoComplete="off"
      className={`bg-transparent outline-none border border-transparent hover:border-brand-30 focus:border-brand-10 focus:ring-1 focus:ring-brand-10 transition-colors rounded-lg px-2 py-1 -ml-2 w-full ${className} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} 
    />
  );
};

export const TeamMemberDrawer = ({
  member,
  customers,
  tasks,
  salesInvoices,
  financeEntries,
  businessCompanyName,
  businessProfile,
  open,
  onClose,
  onOpenCustomer,
  onRemoveMember,
  onAssignToProject,
  onRemoveFromProject,
  onUpdateMember,
  onProvisionLogin,
  onSendPasswordReset,
}: TeamMemberDrawerProps) => {
  const [loginEmailDraft, setLoginEmailDraft] = useState(member?.loginEmail || member?.email || '');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [selectedPaycheck, setSelectedPaycheck] = useState<FinanceEntry | null>(null);

  useEffect(() => {
    setLoginEmailDraft(member?.loginEmail || member?.email || '');
    setPasswordDraft('');
  }, [member?.email, member?.id, member?.loginEmail]);

  useEffect(() => {
    if (!open) {
      setSelectedPaycheck(null);
    }
  }, [open]);

  if (!member) return null;

  const assignedProjects = customers.filter(
    (customer) =>
      customer.ownerId === member.id ||
      customer.leadDesignerId === member.id ||
      customer.fieldStaffId === member.id ||
      customer.assignedTeamIds.includes(member.id),
  );
  
  const completedProjects = assignedProjects.filter((project) => project.stage === 'completed');
  const memberTasks = tasks.filter((task) => task.ownerId === member.id);
  const overdueTasks = memberTasks.filter((task) => !task.done && new Date(task.dueAt).getTime() < Date.now());
  const memberName = member.name.trim().toLowerCase();
  const memberInvoices = salesInvoices.filter((invoice) => invoice.status !== 'draft' && invoice.billedBy.trim().toLowerCase() === memberName);
  const invoiceRevenue = memberInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const salaryPaychecks = financeEntries.filter((entry) => {
    if (entry.category !== 'salary') return false;
    if (entry.employeeMemberId === member.id) return true;
    const haystack = `${entry.title} ${entry.notes} ${entry.projectTitle || ''}`.toLowerCase();
    return haystack.includes(memberName);
  });
  const salaryPaidTotal = salaryPaychecks
    .filter((entry) => entry.status === 'paid')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const handleFieldSave = <K extends keyof TeamMember>(field: K, value: TeamMember[K]) => {
    if (onUpdateMember) {
      onUpdateMember(member.id, { [field]: value });
    }
  };

  const handleProvisionLogin = async () => {
    if (!onProvisionLogin) return;
    setCredentialBusy(true);
    try {
      await onProvisionLogin(member.id, {
        loginEmail: loginEmailDraft.trim(),
        password: passwordDraft,
      });
      setPasswordDraft('');
    } finally {
      setCredentialBusy(false);
    }
  };

  const handleSendReset = async () => {
    const email = (member.loginEmail || loginEmailDraft || member.email).trim();
    if (!email || !onSendPasswordReset) return;
    setCredentialBusy(true);
    try {
      await onSendPasswordReset(email);
    } finally {
      setCredentialBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 pt-4 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 flex h-full max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-brand-60 shadow-2xl"
          >
            {/* Header Sticky Container */}
            <div className="shrink-0 border-b border-brand-30 bg-white/95 px-6 py-5 backdrop-blur z-20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-10/10 text-2xl font-bold text-brand-10 shadow-sm">
                    {member.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <InlineInput 
                        value={member.name} 
                        onSave={(val) => handleFieldSave('name', val)}
                        className="text-2xl font-semibold tracking-tight text-brand-dark max-w-[250px]"
                        placeholder="Team Member Name"
                      />
                      <select
                        value={member.status}
                        onChange={(e) => handleFieldSave('status', e.target.value as TeamMember['status'])}
                        className={`cursor-pointer appearance-none outline-none border hover:border-brand-30 bg-transparent rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${member.status === 'online' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-brand-dark/60 bg-brand-30/50 border-brand-30'}`}
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="busy">Busy</option>
                      </select>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                       <input
                        value={member.role}
                        onChange={(e) => handleFieldSave('role', e.target.value as TeamRole)}
                        list={`member-role-suggestions-${member.id}`}
                        className="outline-none border border-transparent hover:border-brand-30 bg-transparent focus:bg-white rounded-lg px-2 py-1 -ml-2 text-[15px] font-medium text-brand-dark/80 transition-colors"
                      />
                      <datalist id={`member-role-suggestions-${member.id}`}>
                        {genericTeamRoleSuggestions.map((role) => (
                          <option key={role} value={role} />
                        ))}
                      </datalist>
                      <span className="text-sm font-medium text-brand-dark/50">• {member.activeProjects} active projects</span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="shrink-0 rounded-2xl border border-brand-30 bg-brand-60 p-2.5 text-brand-dark/60 hover:text-brand-dark transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="ui-scrollable flex-1 px-6 py-6 space-y-6">
              
              <section className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Assigned works', value: assignedProjects.length },
                  { label: 'Invoices generated', value: memberInvoices.length },
                  { label: 'Paid salary entries', value: salaryPaychecks.filter((entry) => entry.status === 'paid').length },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">{item.label}</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-brand-dark">{item.value}</div>
                  </div>
                ))}
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Completed maps</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-brand-dark">{completedProjects.length}</div>
                </div>
                <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Invoice revenue handled</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-brand-dark">{formatCurrency(invoiceRevenue)}</div>
                </div>
                <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Salary paid</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-brand-dark">{formatCurrency(salaryPaidTotal)}</div>
                </div>
              </section>

              <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-brand-dark">Direct Contact Profile</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[20px] bg-brand-60/50 p-5 space-y-5 border border-brand-30/50">
                    <div>
                       <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-1 flex items-center gap-2"><Mail size={14}/> Office Email</div>
                       <InlineInput 
                          value={member.email} 
                          onSave={(val) => handleFieldSave('email', val)}
                          className="font-semibold text-brand-dark text-[15px]"
                          placeholder="e.g. member@company.com"
                       />
                    </div>
                    <div>
                       <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-1 flex items-center gap-2"><Phone size={14}/> Direct Phone</div>
                       <InlineInput 
                          value={member.phone} 
                          onSave={(val) => handleFieldSave('phone', val)}
                          className="font-semibold text-brand-dark text-[15px]"
                          placeholder="Add direct phone number"
                       />
                    </div>
                  </div>
                  
                  <div className="rounded-[20px] bg-brand-60/50 p-5 space-y-5 border border-brand-30/50">
                     <div>
                       <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-2">Live Workload Capacity</div>
                       <div className="flex items-center gap-4">
                           <div className="flex-1 h-3 rounded-full bg-brand-30/50 overflow-hidden">
                             <div className={`h-full rounded-full transition-all duration-1000 ${member.workload >= 80 ? 'bg-amber-500' : 'bg-brand-10'}`} style={{ width: `${member.workload}%` }} />
                           </div>
                           <div className="font-semibold text-[15px]">{member.workload}%</div>
                       </div>
                     </div>
                     <div>
                       <div className="text-xs font-bold uppercase tracking-wider text-amber-600/70 mb-1">Overdue Attention</div>
                       <div className="font-semibold text-[15px] text-amber-700">{overdueTasks.length} tasks critically overdue.</div>
                     </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-brand-dark">Access Control</h3>
                <p className="mt-1 text-sm text-brand-dark/60">Choose which dashboard areas this teammate can access after login.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {accessControlledViews.map((view) => (
                    <label key={view} className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 text-sm text-brand-dark">
                      <input
                        type="checkbox"
                        checked={member.allowedViews.includes(view)}
                        onChange={(event) =>
                          handleFieldSave(
                            'allowedViews',
                            event.target.checked
                              ? [...member.allowedViews, view]
                              : member.allowedViews.filter((item) => item !== view),
                          )
                        }
                      />
                      <span>{viewTitles[view]}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 text-sm text-brand-dark/70">
                  {member.loginEnabled
                    ? `Login enabled for ${member.loginEmail || member.email || member.name}.`
                    : 'No separate login credentials are enabled for this teammate yet.'}
                </div>
                <div className="mt-4 rounded-2xl border border-brand-30 bg-white p-4">
                  <div className="text-sm font-semibold text-brand-dark">Business login access</div>
                  <p className="mt-1 text-sm text-brand-dark/60">
                    {member.loginEnabled
                      ? 'This teammate already has a separate staff login for the business dashboard.'
                      : 'Create separate login credentials for this existing teammate so they can access only the tools you allowed above.'}
                  </p>
                  {!member.loginEnabled ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                      <input
                        type="email"
                        value={loginEmailDraft}
                        onChange={(event) => setLoginEmailDraft(event.target.value)}
                        placeholder="staff@business.com"
                        className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm text-brand-dark outline-none"
                      />
                      <input
                        type="password"
                        value={passwordDraft}
                        onChange={(event) => setPasswordDraft(event.target.value)}
                        placeholder="Temporary password"
                        minLength={8}
                        className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm text-brand-dark outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleProvisionLogin()}
                        disabled={credentialBusy || !loginEmailDraft.trim() || passwordDraft.length < 8}
                        className="rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-brand-60 disabled:opacity-50"
                      >
                        {credentialBusy ? 'Saving...' : 'Create login'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm text-brand-dark">
                        Login email: <span className="font-semibold">{member.loginEmail || member.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSendReset()}
                        disabled={credentialBusy || !(member.loginEmail || member.email)}
                        className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark disabled:opacity-50"
                      >
                        {credentialBusy ? 'Sending...' : 'Send reset link'}
                      </button>
                    </div>
                  )}
                  {!member.loginEnabled ? (
                    <p className="mt-3 text-xs text-brand-dark/55">
                      Add a staff login email and a temporary password with at least 8 characters, then click `Create login`.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-brand-dark/55">
                    Team members use the same login page as the business owner. Forgot password works normally for these staff accounts too.
                  </p>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 text-brand-dark shrink-0">
                    <BriefcaseBusiness size={18} />
                    <h3 className="text-lg font-semibold">Assigned works</h3>
                  </div>
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar min-h-[250px]">
                    {assignedProjects.length ? (
                      assignedProjects.map((project) => (
                        <div key={project.id} className="rounded-2xl border border-brand-30/50 bg-brand-60/50 p-4 transition-colors hover:bg-brand-60">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <button onClick={() => { onClose(); onOpenCustomer(project.id); }} className="text-left group flex-1">
                              <div className="font-semibold text-[15px] text-brand-dark group-hover:text-brand-10">{project.customerName}</div>
                              <div className="mt-0.5 text-sm font-medium text-brand-dark/60">{project.title}</div>
                            </button>
                            <div className="shrink-0">
                              {project.assignedTeamIds.includes(member.id) ? (
                                <button
                                  onClick={() => onRemoveFromProject(project.id, member.id)}
                                  className="rounded-[10px] border border-brand-30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                >
                                  Unassign Map
                                </button>
                              ) : (
                                <button
                                  onClick={() => onAssignToProject(project.id, member.id)}
                                  className="rounded-[10px] bg-brand-10 px-3 py-1.5 text-xs font-semibold text-brand-60"
                                >
                                  Assign Member
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-brand-30 bg-brand-60/50 p-5 text-center text-[15px] font-medium text-brand-dark/50">
                        No active assignments yet. Use records or quick actions to assign this member.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 text-brand-dark shrink-0">
                    <CalendarClock size={18} />
                    <h3 className="text-lg font-semibold">Pending tasks log</h3>
                  </div>
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar min-h-[250px]">
                    {memberTasks.length ? (
                      memberTasks.map((task) => {
                        const customer = customers.find((item) => item.id === task.customerId);
                        return (
                          <div key={task.id} className="rounded-2xl border border-brand-30/50 bg-brand-60/50 p-4 transition-colors hover:bg-brand-60">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-[15px] text-brand-dark">{task.title}</div>
                                <div className="mt-0.5 text-sm font-medium text-brand-dark/60">{customer?.customerName ?? 'Unlinked'} • Due {relativeDate(task.dueAt)}</div>
                              </div>
                              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-10/10 text-brand-10'}`}>
                                {task.done ? 'Done' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-brand-30 bg-brand-60/50 p-5 text-center text-[15px] font-medium text-brand-dark/50">
                        Task backlog is empty for this member.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between gap-3 shrink-0">
                    <h3 className="text-lg font-semibold text-brand-dark">Invoice performance</h3>
                    <span className="rounded-full border border-brand-30 bg-brand-60/40 px-3 py-1 text-xs font-semibold text-brand-dark">
                      {memberInvoices.length} invoices
                    </span>
                  </div>
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar min-h-[250px]">
                    {memberInvoices.length ? (
                      memberInvoices.slice(0, 10).map((invoice) => (
                        <div key={invoice.id} className="rounded-2xl border border-brand-30/50 bg-brand-60/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[15px] text-brand-dark">{invoice.invoiceNumber}</div>
                              <div className="mt-1 text-sm text-brand-dark/65">{invoice.customerName} • {formatDateTime(invoice.createdAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</div>
                              <div className="mt-1 text-xs uppercase tracking-wider text-brand-dark/50">{invoice.paymentMethod.replace('_', ' ')}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-brand-30 bg-brand-60/50 p-5 text-center text-[15px] font-medium text-brand-dark/50">
                        No invoices have been generated by this team member yet.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between gap-3 shrink-0">
                    <h3 className="text-lg font-semibold text-brand-dark">Salary and paychecks</h3>
                    <span className="rounded-full border border-brand-30 bg-brand-60/40 px-3 py-1 text-xs font-semibold text-brand-dark">
                      {salaryPaychecks.length} entries
                    </span>
                  </div>
                  <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar min-h-[250px]">
                    {salaryPaychecks.length ? (
                      salaryPaychecks.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-brand-30/50 bg-brand-60/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[15px] text-brand-dark">{entry.title}</div>
                              <div className="mt-1 text-sm text-brand-dark/65">{formatDateTime(entry.dueAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-brand-dark">{formatCurrency(entry.amount)}</div>
                              <div className="mt-1 text-xs uppercase tracking-wider text-brand-dark/50">{entry.status}</div>
                              <button
                                type="button"
                                onClick={() => setSelectedPaycheck(entry)}
                                className="mt-3 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs font-medium text-brand-dark"
                              >
                                Preview paycheck
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-brand-30 bg-brand-60/50 p-5 text-center text-[15px] font-medium text-brand-dark/50">
                        No salary or paycheck entries are linked to this team member yet.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-[28px] border border-rose-100 bg-rose-50/50 p-6 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-rose-900">Danger Zone</h3>
                    <p className="mt-1 text-sm font-medium text-rose-800/70">Removing a member forces automatic ownership reassignment to prevent orphaned projects.</p>
                  </div>
                  <button
                    onClick={() => { onClose(); onRemoveMember(member.id); }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md"
                  >
                    <Trash2 size={18} />
                    Permanently Remove Member
                  </button>
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      ) : null}
      <SalaryPaycheckDetailModal
        paycheck={selectedPaycheck}
        open={!!selectedPaycheck}
        companyName={businessCompanyName}
        businessProfile={businessProfile}
        onClose={() => setSelectedPaycheck(null)}
      />
    </AnimatePresence>
  );
};
