import { AlertTriangle, BriefcaseBusiness, Plus, ShieldCheck, Users2 } from 'lucide-react';
import type { CustomerProject, TaskItem, TeamMember } from '../types';

type TeamPageProps = {
  team: TeamMember[];
  customers: CustomerProject[];
  tasks: TaskItem[];
  onOpenCustomer: (customerId: string) => void;
  onOpenMember: (memberId: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void;
};

export const TeamPage = ({
  team,
  customers,
  tasks,
  onOpenCustomer,
  onOpenMember,
  onAddMember,
  onRemoveMember,
}: TeamPageProps) => {
  const unassignedProjects = customers.filter((customer) => customer.assignedTeamIds.length === 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Team ownership</h1>
          <p className="mt-1 text-brand-dark/80">Click any teammate to inspect assigned work, pending tasks, and fast add/remove controls.</p>
        </div>
        <button
          onClick={onAddMember}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm transition hover:-translate-y-0.5"
        >
          <Plus size={16} />
          Add new team member
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-dark">
            <Users2 size={18} />
            <h2 className="text-xl font-semibold">Team capacity</h2>
          </div>
          <div className="mt-4 space-y-4">
            {team.map((member) => (
              <button
                key={member.id}
                onClick={() => onOpenMember(member.id)}
                className="w-full rounded-2xl bg-brand-60 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-semibold text-brand-10">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="font-medium text-brand-dark">{member.name}</div>
                      <div className="text-sm text-brand-dark/80">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-brand-dark/80">
                    <div>{member.activeProjects} projects</div>
                    <div className="mt-1">{member.status}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-brand-30/40">
                  <div className="h-2 rounded-full bg-brand-10" style={{ width: `${member.workload}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-dark">
            <ShieldCheck size={18} />
            <h2 className="text-xl font-semibold">Allocation matrix</h2>
          </div>
          <div className="mt-4 space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-2xl border border-brand-30/60 bg-brand-60/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => onOpenCustomer(customer.id)} className="text-left">
                    <div className="font-medium text-brand-dark">{customer.customerName}</div>
                    <div className="text-sm text-brand-dark/80">{customer.title}</div>
                  </button>
                  <div className="text-sm text-brand-dark/80">{customer.assignedTeamIds.length} assigned</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.assignedTeamIds.map((memberId) => {
                    const member = team.find((item) => item.id === memberId);
                    if (!member) return null;
                    return (
                      <button
                        key={memberId}
                        onClick={() => onOpenMember(member.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-30/50 px-3 py-1.5 text-sm text-brand-dark transition hover:bg-brand-30"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">{member.avatar}</span>
                        {member.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {team.map((member) => {
          const ownedProjects = customers.filter((customer) => customer.ownerId === member.id);
          const overdueTasks = tasks.filter(
            (task) => task.ownerId === member.id && !task.done && new Date(task.dueAt).getTime() < Date.now(),
          );

          return (
            <div key={member.id} className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
              <button onClick={() => onOpenMember(member.id)} className="w-full text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-30/50 font-semibold text-brand-10">
                    {member.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-brand-dark">{member.name}</div>
                    <div className="text-sm text-brand-dark/80">{member.role}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-brand-dark/80">
                    <span>Workload</span>
                    <span>{member.workload}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-30/40">
                    <div className="h-2 rounded-full bg-brand-10" style={{ width: `${member.workload}%` }} />
                  </div>
                </div>
              </button>

              <div className="mt-4 flex items-center justify-between text-sm text-brand-dark/80">
                <span>{member.activeProjects} active projects</span>
                {member.workload > 80 ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] text-rose-700">Workload warning</span> : null}
              </div>

              <div className="mt-4 space-y-2">
                {ownedProjects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onOpenCustomer(project.id)}
                    className="block w-full rounded-2xl bg-brand-60 px-3 py-2 text-left text-sm text-brand-dark/85 transition hover:bg-brand-30/40"
                  >
                    {project.customerName} • {project.title}
                  </button>
                ))}
                {!ownedProjects.length ? (
                  <div className="rounded-2xl border border-dashed border-brand-30 px-3 py-3 text-sm text-brand-dark/60">No owned projects yet.</div>
                ) : null}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onOpenMember(member.id)}
                  className="flex-1 rounded-2xl border border-brand-30 px-3 py-2 text-sm text-brand-dark"
                >
                  Open details
                </button>
                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  Remove
                </button>
              </div>

              {overdueTasks.length ? (
                <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-700">
                  {overdueTasks.length} overdue tasks need action.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-dark">
            <BriefcaseBusiness size={18} />
            <h2 className="text-xl font-semibold">Ownership overview</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {team.map((member) => (
              <button key={member.id} onClick={() => onOpenMember(member.id)} className="rounded-2xl bg-brand-60 p-4 text-left transition hover:bg-brand-30/40">
                <div className="font-medium text-brand-dark">{member.name}</div>
                <div className="mt-1 text-sm text-brand-dark/80">
                  {customers.filter((customer) => customer.ownerId === member.id).length} owned
                </div>
                <div className="mt-2 text-sm text-brand-dark/80">
                  {tasks.filter((task) => task.ownerId === member.id && !task.done).length} open tasks
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-brand-30 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-dark">
            <AlertTriangle size={18} />
            <h2 className="text-xl font-semibold">Team productivity controls</h2>
          </div>
          <div className="mt-4 space-y-3">
            {unassignedProjects.length ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
                {unassignedProjects.length} projects are currently unassigned. Open any project or team member to fix ownership.
              </div>
            ) : (
              <div className="rounded-2xl bg-brand-60 p-4 text-sm text-brand-dark/80">
                All active projects currently have team allocation.
              </div>
            )}

            {team.map((member) => {
              const overdueTasks = tasks.filter(
                (task) => task.ownerId === member.id && !task.done && new Date(task.dueAt).getTime() < Date.now(),
              );
              return (
                <button
                  key={member.id}
                  onClick={() => onOpenMember(member.id)}
                  className="flex w-full items-center justify-between rounded-2xl bg-brand-60 p-4 text-left transition hover:bg-brand-30/40"
                >
                  <div>
                    <div className="font-medium text-brand-dark">{member.name}</div>
                    <div className="mt-1 text-sm text-brand-dark/80">{overdueTasks.length} overdue tasks • {member.activeProjects} active projects</div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-brand-dark/80">Manage</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
