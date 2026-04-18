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
  inventory: 'Inventory',
  billing: 'Billing',
  'render-history': 'Render History',
  crm: 'CRM',
  settings: 'Settings',
  profile: 'Profile',
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

export const stageProgressMap: Record<ProjectStage, number> = {
  inquiry: 8,
  consultation: 18,
  design_in_progress: 46,
  render_shared: 64,
  customer_approved: 78,
  execution_started: 88,
  completed: 100,
  on_hold: 30,
};

export const getStageProgress = (stage: ProjectStage) => stageProgressMap[stage];

export const siteStatusLabels: Record<SiteStatus, string> = {
  under_construction: 'Under construction',
  ready: 'Ready',
  in_progress: 'In progress',
};

export const parseDashboardView = (hash: string): DashboardView => {
  const value = hash.replace(/^#dashboard\/?/, '').replace('/', '');
  if (!value) return 'overview';
  if (['customers', 'team', 'inventory', 'billing', 'render-history', 'crm', 'settings', 'profile'].includes(value)) {
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
    stage === 'completed' && 'bg-[rgba(15,14,71,0.12)] text-[var(--color-brand-10)]',
    stage === 'customer_approved' && 'bg-[rgba(80,80,129,0.14)] text-[var(--color-brand-30-strong)]',
    stage === 'render_shared' && 'bg-[rgba(134,134,172,0.2)] text-[var(--color-brand-dark)]',
    stage === 'design_in_progress' && 'bg-[rgba(80,80,129,0.12)] text-[var(--color-brand-30-strong)]',
    stage === 'consultation' && 'bg-[rgba(80,80,129,0.1)] text-[var(--color-brand-dark)]',
    stage === 'inquiry' && 'bg-[rgba(39,39,87,0.08)] text-[var(--color-brand-dark)]',
    stage === 'execution_started' && 'bg-[rgba(15,14,71,0.1)] text-[var(--color-brand-10)]',
    stage === 'on_hold' && 'bg-[rgba(39,39,87,0.12)] text-[var(--color-brand-dark)]',
  );

export const siteBadgeClass = (status: SiteStatus) =>
  clsx(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
    status === 'ready' && 'bg-[rgba(134,134,172,0.16)] text-[var(--color-brand-dark)]',
    status === 'in_progress' && 'bg-[rgba(80,80,129,0.12)] text-[var(--color-brand-30-strong)]',
    status === 'under_construction' && 'bg-[rgba(39,39,87,0.1)] text-[var(--color-brand-dark)]',
  );

export const renderApprovalBadgeClass = (status: RenderApprovalStatus) =>
  clsx(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
    status === 'approved' && 'bg-[rgba(15,14,71,0.12)] text-[var(--color-brand-10)]',
    status === 'pending_review' && 'bg-[rgba(80,80,129,0.14)] text-[var(--color-brand-30-strong)]',
    status === 'draft' && 'bg-[rgba(39,39,87,0.08)] text-[var(--color-brand-dark)]',
    status === 'rejected' && 'bg-[rgba(39,39,87,0.12)] text-[var(--color-brand-dark)]',
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
