import { clsx } from 'clsx';
import type {
  CustomerFilters,
  CustomerProject,
  DashboardView,
  ProjectStage,
  RenderApprovalStatus,
  SiteStatus,
  TaskItem,
  TeamMember,
} from './types';

export const stageOrder: ProjectStage[] = [
  'inquiry',
  'consultation',
  'design_in_progress',
  'render_shared',
  'customer_approved',
  'execution_started',
  'completed',
];

export const viewTitles: Record<DashboardView, string> = {
  overview: 'Overview',
  customers: 'Customers',
  team: 'Team',
};

export const stageLabels: Record<ProjectStage, string> = {
  inquiry: 'Inquiry received',
  consultation: 'Consultation done',
  design_in_progress: 'Design in progress',
  render_shared: 'Render shared',
  customer_approved: 'Customer approved',
  execution_started: 'Execution started',
  completed: 'Completed',
  on_hold: 'On hold',
};

export const siteStatusLabels: Record<SiteStatus, string> = {
  under_construction: 'Under construction',
  ready: 'Ready',
  in_progress: 'In progress',
};

export const parseDashboardView = (hash: string): DashboardView => {
  const value = hash.replace(/^#dashboard\/?/, '').replace('/', '');
  if (!value) return 'overview';
  if (['customers', 'team'].includes(value)) {
    return value as DashboardView;
  }
  return 'overview';
};

export const dashboardHash = (view: DashboardView) => (view === 'overview' ? '#dashboard' : `#dashboard/${view}`);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export const relativeDate = (value: string) => {
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};

export const stageBadgeClass = (stage: ProjectStage) =>
  clsx(
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
    stage === 'completed' && 'bg-emerald-100 text-emerald-700',
    stage === 'customer_approved' && 'bg-teal-100 text-teal-700',
    stage === 'render_shared' && 'bg-sky-100 text-sky-700',
    stage === 'design_in_progress' && 'bg-amber-100 text-amber-700',
    stage === 'consultation' && 'bg-orange-100 text-orange-700',
    stage === 'inquiry' && 'bg-stone-200 text-stone-700',
    stage === 'execution_started' && 'bg-violet-100 text-violet-700',
    stage === 'on_hold' && 'bg-rose-100 text-rose-700',
  );

export const siteBadgeClass = (status: SiteStatus) =>
  clsx(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
    status === 'ready' && 'bg-emerald-50 text-emerald-700',
    status === 'in_progress' && 'bg-amber-50 text-amber-700',
    status === 'under_construction' && 'bg-orange-50 text-orange-700',
  );

export const renderApprovalBadgeClass = (status: RenderApprovalStatus) =>
  clsx(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
    status === 'approved' && 'bg-emerald-100 text-emerald-700',
    status === 'pending_review' && 'bg-amber-100 text-amber-700',
    status === 'draft' && 'bg-stone-200 text-stone-700',
    status === 'rejected' && 'bg-rose-100 text-rose-700',
  );

export const getCustomerOwner = (customer: CustomerProject, team: TeamMember[]) =>
  team.find((member) => member.id === customer.ownerId);

export const filterCustomers = (customers: CustomerProject[], filters: CustomerFilters) => {
  const query = filters.search.trim().toLowerCase();

  return customers
    .filter((customer) => {
      const matchesSearch =
        !query ||
        customer.customerName.toLowerCase().includes(query) ||
        customer.title.toLowerCase().includes(query) ||
        customer.location.toLowerCase().includes(query);

      const matchesStage = filters.stage === 'all' || customer.stage === filters.stage;
      const matchesOwner = filters.ownerId === 'all' || customer.ownerId === filters.ownerId;
      const matchesCompletion =
        filters.completion === 'all' ||
        (filters.completion === 'completed' && customer.stage === 'completed') ||
        (filters.completion === 'active' && customer.stage !== 'completed' && customer.stage !== 'on_hold') ||
        (filters.completion === 'pending' && (customer.renderPending || customer.needsFollowUp));

      return matchesSearch && matchesStage && matchesOwner && matchesCompletion;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'activity') return b.activityScore - a.activityScore;
      if (filters.sortBy === 'pending') return Number(b.renderPending || b.needsFollowUp) - Number(a.renderPending || a.needsFollowUp);
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
};

export const getSummary = (customers: CustomerProject[], team: TeamMember[]) => {
  const activeProjects = customers.filter((customer) => customer.stage !== 'completed' && customer.stage !== 'on_hold').length;
  const completedJobs = customers.filter((customer) => customer.stage === 'completed').length;
  const pendingJobs = customers.filter((customer) => customer.renderPending || customer.needsFollowUp).length;
  const totalRenders = customers.reduce((sum, customer) => sum + customer.renders.length, 0);
  const activeTeamMembers = team.filter((member) => member.status !== 'offline').length;

  return {
    totalCustomers: customers.length,
    activeProjects,
    completedJobs,
    pendingJobs,
    totalRenders,
    activeTeamMembers,
  };
};

export const getInitials = (value: string) =>
  value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const recalculateTeamMetrics = (
  team: TeamMember[],
  customers: CustomerProject[],
  tasks: TaskItem[],
) =>
  team.map((member) => {
    const activeProjects = customers.filter((customer) => {
      if (customer.stage === 'completed') return false;
      return (
        customer.ownerId === member.id ||
        customer.leadDesignerId === member.id ||
        customer.fieldStaffId === member.id ||
        customer.assignedTeamIds.includes(member.id)
      );
    }).length;

    const openTasks = tasks.filter((task) => task.ownerId === member.id && !task.done).length;
    const workload = Math.min(100, Math.max(12, activeProjects * 16 + openTasks * 8));
    const status: TeamMember['status'] =
      workload > 82 ? 'busy' : openTasks === 0 && activeProjects === 0 ? 'offline' : 'online';

    return {
      ...member,
      activeProjects,
      workload,
      status,
    };
  });
