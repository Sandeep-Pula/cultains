import { AlertTriangle, Plus, Users2 } from 'lucide-react';
import type { CustomerProject, TaskItem, TeamMember } from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';

type TeamPageProps = {
  team: TeamMember[];
  customers: CustomerProject[];
  tasks: TaskItem[];
  onOpenCustomer: (customerId: string) => void;
  onOpenMember: (memberId: string) => void;
  onAddMember: () => void;
};

export const TeamPage = ({
  team,
  customers,
  tasks,
  onOpenCustomer,
  onOpenMember,
  onAddMember,
}: TeamPageProps) => {
  const unassignedProjects = customers.filter((customer) => customer.assignedTeamIds.length === 0);
  const overdueTasks = tasks.filter((task) => !task.done && new Date(task.dueAt).getTime() < Date.now());
  const overloadedMembers = team.filter((member) => member.workload >= 80);

  return (
    <div className="flex flex-col gap-5 xl:h-[calc(100vh-8rem)]">
      
      {/* Header - Fixed */}
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Team Management</h1>
          <p className="mt-1 text-brand-dark/80 max-w-2xl text-[15px]">Keep ownership clear, balance current workloads, and dive into member-specific task handling natively inside this workspace.</p>
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
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Projects needing assignment</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{unassignedProjects.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600/70">Overdue tasks</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{overdueTasks.length}</div>
        </div>
      </div>

      {/* Main Body - Scrollable Bounded */}
      <div className="flex-1 overflow-hidden min-h-[500px]">
        {!team.length ? (
          <div className="h-full w-full rounded-[32px] border border-dashed border-brand-30 bg-brand-60/50 flex items-center justify-center">
            <EmptyStatePanel
              icon={Users2}
              title="No team members yet"
              description="Add your first teammate when you want to securely delegate ownership, design, or field work. We'll track their specific load."
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
                          <span className="rounded-full border border-brand-30/50 bg-white px-3 py-1 text-brand-dark/70 drop-shadow-sm">{member.activeProjects} active maps</span>
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
    </div>
  );
};
