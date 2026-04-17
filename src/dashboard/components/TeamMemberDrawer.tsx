import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseBusiness, CalendarClock, Mail, Phone, Trash2, UserPlus2, X } from 'lucide-react';
import type { CustomerProject, TaskItem, TeamMember } from '../types';
import { formatDate, relativeDate } from '../utils';

type TeamMemberDrawerProps = {
  member: TeamMember | null;
  team: TeamMember[];
  customers: CustomerProject[];
  tasks: TaskItem[];
  open: boolean;
  onClose: () => void;
  onOpenCustomer: (customerId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAssignToProject: (customerId: string, memberId: string) => void;
  onRemoveFromProject: (customerId: string, memberId: string) => void;
};

export const TeamMemberDrawer = ({
  member,
  team,
  customers,
  tasks,
  open,
  onClose,
  onOpenCustomer,
  onRemoveMember,
  onAssignToProject,
  onRemoveFromProject,
}: TeamMemberDrawerProps) => {
  if (!member) return null;

  const assignedProjects = customers.filter(
    (customer) =>
      customer.ownerId === member.id ||
      customer.leadDesignerId === member.id ||
      customer.fieldStaffId === member.id ||
      customer.assignedTeamIds.includes(member.id),
  );
  const completedProjects = assignedProjects.filter((project) => project.stage === 'completed');
  const pendingProjects = assignedProjects.filter((project) => project.stage !== 'completed');
  const memberTasks = tasks.filter((task) => task.ownerId === member.id);
  const overdueTasks = memberTasks.filter((task) => !task.done && new Date(task.dueAt).getTime() < Date.now());

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-brand-dark/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            className="fixed right-0 top-0 z-[100] h-full w-full max-w-2xl overflow-y-auto border-l border-brand-30 bg-brand-60 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-brand-30 bg-brand-60/95 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-semibold text-brand-10 shadow-sm">
                  {member.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">{member.name}</h2>
                  <p className="mt-1 text-sm text-brand-dark/80">{member.role} • {member.activeProjects} active projects</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-2xl border border-brand-30 bg-white p-2 text-brand-10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 px-5 py-5">
              <section className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Assigned works', value: assignedProjects.length },
                  { label: 'Completed', value: completedProjects.length },
                  { label: 'Pending', value: pendingProjects.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-brand-30 bg-white p-4 shadow-sm">
                    <div className="text-sm text-brand-dark/80">{item.label}</div>
                    <div className="mt-3 text-3xl font-semibold text-brand-dark">{item.value}</div>
                  </div>
                ))}
              </section>

              <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-brand-dark">Team member profile</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-brand-60 p-4 text-sm text-brand-dark/80">
                    <div className="flex items-center gap-2"><Mail size={15} /> {member.email}</div>
                    <div className="mt-3 flex items-center gap-2"><Phone size={15} /> {member.phone}</div>
                  </div>
                  <div className="rounded-2xl bg-brand-60 p-4 text-sm text-brand-dark/80">
                    <div>Status: <span className="font-medium text-brand-dark">{member.status}</span></div>
                    <div className="mt-2">Workload: <span className="font-medium text-brand-dark">{member.workload}%</span></div>
                    <div className="mt-2">{overdueTasks.length} overdue tasks need attention.</div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-brand-dark">
                  <BriefcaseBusiness size={18} />
                  <h3 className="text-lg font-semibold">Assigned works</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {assignedProjects.length ? (
                    assignedProjects.map((project) => (
                      <div key={project.id} className="rounded-2xl bg-brand-60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button onClick={() => onOpenCustomer(project.id)} className="text-left">
                            <div className="font-medium text-brand-dark">{project.customerName}</div>
                            <div className="mt-1 text-sm text-brand-dark/80">{project.title}</div>
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {project.assignedTeamIds.includes(member.id) ? (
                              <button
                                onClick={() => onRemoveFromProject(project.id, member.id)}
                                className="rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => onAssignToProject(project.id, member.id)}
                                className="rounded-2xl bg-brand-10 px-3 py-2 text-sm text-brand-60"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-brand-dark/80">
                          Updated {relativeDate(project.lastUpdated)} • Target {formatDate(project.targetDate)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-brand-30 p-5 text-sm text-brand-dark/60">
                      No project assignments yet. Use customer or team controls to assign this member.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-brand-dark">
                  <CalendarClock size={18} />
                  <h3 className="text-lg font-semibold">Pending tasks</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {memberTasks.length ? (
                    memberTasks.map((task) => {
                      const customer = customers.find((item) => item.id === task.customerId);
                      return (
                        <div key={task.id} className="rounded-2xl bg-brand-60 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-brand-dark">{task.title}</div>
                              <div className="mt-1 text-sm text-brand-dark/80">{customer?.customerName ?? 'Unlinked customer'} • {relativeDate(task.dueAt)}</div>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs ${task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {task.done ? 'Done' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-brand-30 p-5 text-sm text-brand-dark/60">
                      No tasks are assigned to this member right now.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-dark">Quick actions</h3>
                    <p className="mt-1 text-sm text-brand-dark/80">Use these controls to keep team allocation clean.</p>
                  </div>
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    <Trash2 size={16} />
                    Remove member
                  </button>
                </div>
                <div className="mt-4 rounded-2xl bg-brand-60 p-4 text-sm text-brand-dark/80">
                  Removing a member automatically reassigns ownership to the closest matching teammate so customer work does not break.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {team
                    .filter((item) => item.id !== member.id)
                    .slice(0, 4)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const firstEligible = customers.find((customer) => !customer.assignedTeamIds.includes(item.id));
                          if (firstEligible) onAssignToProject(firstEligible.id, item.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark"
                      >
                        <UserPlus2 size={14} />
                        Quick assign {item.name}
                      </button>
                    ))}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};
