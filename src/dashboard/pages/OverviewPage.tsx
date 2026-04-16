import {
  BellRing,
  CalendarClock,
  CheckCheck,
  ImagePlus,
  MessageCircleMore,
  PlusCircle,
  Sparkles,
  Upload,
  Users,
  FolderKanban,
  ClipboardCheck,
  PhoneCall,
} from 'lucide-react';
import type { CustomerProject, DashboardData, TaskItem } from '../types';
import { formatDate, formatDateTime, formatCurrency, getSummary, relativeDate, stageLabels } from '../utils';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { InteractiveCalendar } from '../components/InteractiveCalendar';

type OverviewPageProps = {
  data: DashboardData;
  onOpenCustomer: (customerId: string) => void;
  onNavigate: (hash: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, date: string) => void;
  onAddCustomer: () => void;
  onAddProject: () => void;
  onAddTeamMember: () => void;
};

const getMostActiveCustomer = (customers: CustomerProject[]) =>
  [...customers].sort((a, b) => b.activityScore - a.activityScore)[0];

export const OverviewPage = ({
  data,
  onOpenCustomer,
  onNavigate,
  onToggleTask,
  onAddTask,
  onAddCustomer,
  onAddProject,
  onAddTeamMember,
}: OverviewPageProps) => {
  const summary = getSummary(data.customers, data.team);
  const mostActive = getMostActiveCustomer(data.customers);
  const pipeline = Object.entries(
    data.customers.reduce<Record<string, number>>((acc, customer) => {
      acc[customer.stage] = (acc[customer.stage] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const approvalWaiting = data.customers.filter((customer) => customer.stage === 'render_shared' || customer.stage === 'customer_approved');
  const staleCustomers = data.customers.filter((customer) => new Date(customer.lastContactedAt).getTime() < Date.now() - 2 * 24 * 60 * 60 * 1000);
  const unsharedRenders = data.customers.flatMap((customer) => customer.renders.filter((render) => !render.shared).map((render) => ({ customer, render })));
  const stuckProjects = data.customers.filter((customer) => new Date(customer.lastUpdated).getTime() < Date.now() - 4 * 24 * 60 * 60 * 1000);
  const recentMessages = data.customers.flatMap((customer) =>
    customer.communicationLog.map((item) => ({ ...item, customerName: customer.customerName, customerId: customer.id })),
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Add customer', action: onAddCustomer, icon: PlusCircle },
              { label: 'Create new project', action: onAddProject, icon: FolderKanban },
              { label: 'Add team member', action: onAddTeamMember, icon: Users },
              { label: 'Upload room image', action: () => onNavigate('#try-once'), icon: Upload },
              { label: 'Generate new render', action: () => onNavigate('#try-once'), icon: Sparkles },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white border border-[#eadfd2] px-4 py-3 text-sm font-medium text-[#201812] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffaf4]"
                >
                  <Icon size={16} className="text-[#6f5438]" />
                  {action.label}
                </button>
              );
            })}
          </div>
          
          <InteractiveCalendar 
            tasks={data.tasks} 
            customers={data.customers}
            onToggleTask={onToggleTask} 
            onAddTask={onAddTask} 
            onOpenCustomer={onOpenCustomer}
          />
        </div>

        <div className="rounded-[32px] border border-[#eadfd2] bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9b8570]">Analytics snapshot</div>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-[#faf4eb] p-4">
              <div className="text-sm text-[#6f604f]">Renders this week</div>
              <div className="mt-2 text-3xl font-semibold text-[#201812]">
                {data.customers.reduce((sum, customer) => sum + customer.renders.filter((render) => new Date(render.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length, 0)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#faf4eb] p-4">
              <div className="text-sm text-[#6f604f]">Most active customer</div>
              <button onClick={() => mostActive && onOpenCustomer(mostActive.id)} className="mt-2 text-left text-xl font-semibold text-[#201812] underline-offset-4 hover:underline">
                {mostActive?.customerName}
              </button>
            </div>
            <div className="rounded-2xl bg-[#faf4eb] p-4">
              <div className="text-sm text-[#6f604f]">Completed this month</div>
              <div className="mt-2 text-3xl font-semibold text-[#201812]">
                {
                  data.customers.filter((customer) => customer.stage === 'completed' && new Date(customer.lastUpdated).getMonth() === new Date().getMonth()).length
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total customers" value={summary.totalCustomers} hint="All active and archived customers" icon={Users} delay={0} />
        <StatCard label="Active projects" value={summary.activeProjects} hint="Currently in motion across the team" icon={FolderKanban} delay={0.05} />
        <StatCard label="Completed jobs" value={summary.completedJobs} hint="Closed successfully this cycle" icon={ClipboardCheck} delay={0.1} />
        <StatCard label="Pending jobs" value={summary.pendingJobs} hint="Need follow-up or render action" icon={CalendarClock} delay={0.15} />
        <StatCard label="Total renders" value={summary.totalRenders} hint="Generated and tracked across customers" icon={ImagePlus} delay={0.2} />
        <StatCard label="Team active" value={summary.activeTeamMembers} hint="Members online or busy right now" icon={Users} delay={0.25} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#201812]">Recent activity</h2>
            <button onClick={() => onNavigate('#dashboard/customers')} className="text-sm font-medium text-[#6f5438]">See all customers</button>
          </div>
          <div className="mt-5 space-y-4">
            {data.customers
              .flatMap((customer) => customer.activities.map((activity) => ({ ...activity, customer })))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)
              .map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => onOpenCustomer(activity.customer.id)}
                  className="flex w-full items-start gap-4 rounded-2xl border border-[#f0e6db] bg-[#fcf8f2] px-4 py-4 text-left transition hover:border-[#e1d1bf]"
                >
                  <div className="mt-1 h-3 w-3 rounded-full bg-[#6f5438]" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-[#201812]">{activity.title}</div>
                      <div className="text-xs text-[#9b8570]">{formatDateTime(activity.createdAt)}</div>
                    </div>
                    <p className="mt-1 text-sm text-[#6f604f]">{activity.description}</p>
                    <div className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9b8570]">
                      {activity.customer.customerName} • {activity.actorName}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#201812]">Upcoming tasks</h2>
              <span className="text-sm text-[#9b8570]">{data.tasks.filter((task) => !task.done).length} open</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.tasks.map((task: TaskItem) => (
                <label key={task.id} className="flex items-start gap-3 rounded-2xl bg-[#fcf8f2] p-4">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(task.id)}
                    className="mt-1 h-4 w-4 rounded border-[#d7c7b4] text-[#6f5438]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#201812]">{task.title}</div>
                    <div className="mt-1 text-sm text-[#6f604f]">{relativeDate(task.dueAt)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#201812]">Project pipeline</h2>
            <div className="mt-4 space-y-3">
              {pipeline.map(([stage, count]) => (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-[#6f604f]">
                    <span>{stageLabels[stage as keyof typeof stageLabels]}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#efe5d7]">
                    <div className="h-2 rounded-full bg-[#6f5438]" style={{ width: `${(count / data.customers.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BellRing size={18} className="text-[#6f5438]" />
            <h2 className="text-xl font-semibold text-[#201812]">Follow-up center</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Waiting for approval',
                items: approvalWaiting.slice(0, 3),
                empty: 'No approvals pending',
                icon: CheckCheck,
              },
              {
                title: 'Not contacted in 2+ days',
                items: staleCustomers.slice(0, 3),
                empty: 'Everyone was recently contacted',
                icon: PhoneCall,
              },
              {
                title: 'Renders generated but not shared',
                items: unsharedRenders.slice(0, 3).map((item) => item.customer),
                empty: 'All recent renders are already shared',
                icon: MessageCircleMore,
              },
              {
                title: 'Projects stuck too long',
                items: stuckProjects.slice(0, 3),
                empty: 'No stale projects right now',
                icon: CalendarClock,
              },
            ].map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="rounded-2xl bg-[#fcf8f2] p-4">
                  <div className="flex items-center gap-2 text-[#201812]">
                    <Icon size={16} />
                    <h3 className="font-medium">{group.title}</h3>
                  </div>
                  <div className="mt-3 space-y-2">
                    {group.items.length ? group.items.map((customer) => (
                      <button key={customer.id} onClick={() => onOpenCustomer(customer.id)} className="block w-full rounded-2xl bg-white px-3 py-3 text-left">
                        <div className="font-medium text-[#201812]">{customer.customerName}</div>
                        <div className="mt-1 text-sm text-[#6f604f]">{customer.title}</div>
                      </button>
                    )) : <div className="text-sm text-[#9b8570]">{group.empty}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#201812]">Today’s operating board</h2>
            <div className="mt-4 grid gap-3">
              {[
                { label: 'Today’s follow-ups', value: data.customers.filter((customer) => new Date(customer.nextFollowUpAt).toDateString() === new Date().toDateString()).length },
                { label: 'Pending approvals', value: approvalWaiting.length },
                { label: 'Upcoming site visits', value: data.customers.filter((customer) => customer.siteVisitScheduledAt).length },
                { label: 'Expected pipeline value', value: formatCurrency(data.customers.reduce((sum, customer) => sum + customer.quote.quoteValue, 0)) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#fcf8f2] px-4 py-3">
                  <span className="text-sm text-[#6f604f]">{item.label}</span>
                  <span className="font-semibold text-[#201812]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#201812]">Recent customer messages</h2>
            <div className="mt-4 space-y-3">
              {recentMessages.map((message) => (
                <button key={message.id} onClick={() => onOpenCustomer(message.customerId)} className="block w-full rounded-2xl bg-[#fcf8f2] px-4 py-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[#201812]">{message.customerName}</div>
                    <div className="text-xs text-[#9b8570]">{relativeDate(message.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-sm text-[#6f604f]">{message.summary}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#201812]">Pinned customers</h2>
          <div className="mt-4 space-y-3">
            {data.customers.filter((customer) => customer.pinned).map((customer) => (
              <button
                key={customer.id}
                onClick={() => onOpenCustomer(customer.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#f0e6db] bg-[#fcf8f2] px-4 py-4 text-left"
              >
                <div>
                  <div className="font-medium text-[#201812]">{customer.customerName}</div>
                  <div className="text-sm text-[#6f604f]">{customer.title}</div>
                </div>
                <StatusBadge stage={customer.stage} />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#201812]">Projects needing attention</h2>
          <div className="mt-4 space-y-3">
            {data.customers
              .filter((customer) => customer.needsFollowUp || customer.renderPending)
              .slice(0, 4)
              .map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onOpenCustomer(customer.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#f0e6db] bg-[#fcf8f2] px-4 py-4 text-left"
                >
                  <div>
                    <div className="font-medium text-[#201812]">{customer.customerName}</div>
                    <div className="text-sm text-[#6f604f]">
                      {customer.needsFollowUp ? 'Needs follow-up' : 'Render pending'} • Updated {formatDate(customer.lastUpdated)}
                    </div>
                  </div>
                  <StatusBadge stage={customer.stage} />
                </button>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
};
