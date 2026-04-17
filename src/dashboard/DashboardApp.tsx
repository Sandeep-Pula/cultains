import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { LogOut, Plus } from 'lucide-react';
import { auth } from '../lib/firebase';
import { dashboardService } from './services/dashboardService';
import { parseDashboardView, dashboardHash, getInitials, recalculateTeamMetrics } from './utils';
import type { CustomerFilters, CustomerProject, DashboardData, ProjectStage, TeamMember, ToastItem } from './types';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewPage } from './pages/OverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { TeamPage } from './pages/TeamPage';
import { CustomerDrawer } from './components/CustomerDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastStack } from './components/ToastStack';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AddProjectModal } from './components/AddProjectModal';
import { AddTeamMemberModal } from './components/AddTeamMemberModal';
import { TeamMemberDrawer } from './components/TeamMemberDrawer';

const defaultFilters: CustomerFilters = {
  search: '',
  stage: 'all',
  ownerId: 'all',
  completion: 'all',
  sortBy: 'latest',
};

export const DashboardApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hash, setHash] = useState(window.location.hash || '#dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>(defaultFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [archiveCandidateId, setArchiveCandidateId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [deleteTeamCandidateId, setDeleteTeamCandidateId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) window.location.hash = '#login';
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    setLoading(true);
    dashboardService.fetchDashboardData().then((response) => {
      if (!mounted) return;
      setData(response);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!toasts.length) return;
    const timeout = window.setTimeout(() => setToasts((current) => current.slice(1)), 2600);
    return () => window.clearTimeout(timeout);
  }, [toasts]);

  const activeView = parseDashboardView(hash);

  const selectedCustomer = data?.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedTeamMember = data?.team.find((member) => member.id === selectedTeamMemberId) ?? null;
  const recentlyViewed = data
    ? data.recentlyViewedIds.map((id) => data.customers.find((customer) => customer.id === id)).filter(Boolean) as CustomerProject[]
    : [];

  const pushToast = (title: string, description?: string) => {
    setToasts((current) => [...current, { id: crypto.randomUUID(), title, description }]);
  };

  const updateCustomers = (updater: (customersList: CustomerProject[]) => CustomerProject[]) => {
    setData((current) => {
      if (!current) return current;
      const nextCustomers = updater(current.customers);
      return {
        ...current,
        customers: nextCustomers,
        team: recalculateTeamMetrics(current.team, nextCustomers, current.tasks),
      };
    });
  };

  const updateData = (
    updater: (current: DashboardData) => DashboardData,
  ) => {
    setData((current) => {
      if (!current) return current;
      const next = updater(current);
      return {
        ...next,
        team: recalculateTeamMetrics(next.team, next.customers, next.tasks),
      };
    });
  };

  const handleNavigate = (nextHash: string) => {
    window.location.hash = nextHash;
  };

  const handleOpenCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setData((current) => {
      if (!current) return current;
      const nextRecent = [customerId, ...current.recentlyViewedIds.filter((id) => id !== customerId)].slice(0, 4);
      return { ...current, recentlyViewedIds: nextRecent };
    });
  };

  const handleOpenTeamMember = (teamMemberId: string) => {
    setSelectedTeamMemberId(teamMemberId);
  };

  const handleStageChange = (customerId: string, stage: ProjectStage) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId ? { ...customer, stage, lastUpdated: new Date().toISOString() } : customer,
      ),
    );
    pushToast('Project stage updated', 'Customer workflow stage has been updated.');
  };

  const handleOwnerChange = (customerId: string, ownerId: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId ? { ...customer, ownerId, lastUpdated: new Date().toISOString() } : customer,
      ),
    );
    pushToast('Project owner changed');
  };

  const handleTogglePinned = (customerId: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId ? { ...customer, pinned: !customer.pinned } : customer,
      ),
    );
  };

  const handleToggleFollowUp = (customerId: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId ? { ...customer, needsFollowUp: !customer.needsFollowUp } : customer,
      ),
    );
    pushToast('Follow-up updated');
  };

  const handleAddNote = (customerId: string, note: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              internalNotes: [
                {
                  id: crypto.randomUUID(),
                  authorId: user?.uid ?? 'local-user',
                  authorName: data?.userName ?? 'You',
                  createdAt: new Date().toISOString(),
                  content: note,
                },
                ...customer.internalNotes,
              ],
            }
          : customer,
      ),
    );
    pushToast('Internal note added');
  };

  const handleToggleTask = (taskId: string) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
  };

  const handleAddTask = (title: string, dueAt: string) => {
    updateData((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: `task-${crypto.randomUUID()}`,
          title,
          dueAt,
          customerId: '', // generic task for user
          ownerId: user?.uid ?? 'local-user',
          priority: 'medium',
          done: false,
        },
      ],
    }));
    pushToast('Task added');
  };

  const handleReassignTeam = (customerId: string, teamIds: string[]) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId ? { ...customer, assignedTeamIds: teamIds, lastUpdated: new Date().toISOString() } : customer,
      ),
    );
    pushToast('Team assignment updated');
  };

  const handleArchive = () => {
    if (!archiveCandidateId) return;
    updateData((current) => {
      const customer = current.customers.find((item) => item.id === archiveCandidateId);
      if (!customer) return current;
      return {
        ...current,
        customers: current.customers.filter((item) => item.id !== archiveCandidateId),
        deletedCustomers: [
          {
            id: customer.id,
            customerName: customer.customerName,
            title: customer.title,
            location: customer.location,
            deletedAt: new Date().toISOString(),
            deletedBy: data?.userName ?? 'You',
            lastStage: customer.stage,
          },
          ...current.deletedCustomers,
        ],
      };
    });
    setSelectedCustomerId(null);
    setArchiveCandidateId(null);
    pushToast('Project archived', 'The customer workspace has been removed from the active list.');
  };

  const handleDeleteCustomer = () => {
    if (!deleteCandidateId) return;
    updateData((current) => {
      const customer = current.customers.find((item) => item.id === deleteCandidateId);
      if (!customer) return current;
      return {
        ...current,
        customers: current.customers.filter((item) => item.id !== deleteCandidateId),
        deletedCustomers: [
          {
            id: customer.id,
            customerName: customer.customerName,
            title: customer.title,
            location: customer.location,
            deletedAt: new Date().toISOString(),
            deletedBy: data?.userName ?? 'You',
            lastStage: customer.stage,
          },
          ...current.deletedCustomers,
        ],
      };
    });
    setSelectedCustomerId(null);
    setDeleteCandidateId(null);
    pushToast('Customer deleted', 'The customer and project were moved to history.');
  };

  const handleAddCustomer = (
    payload: Pick<
      CustomerProject,
      | 'customerName'
      | 'phone'
      | 'email'
      | 'address'
      | 'location'
      | 'title'
      | 'projectType'
      | 'siteStatus'
      | 'ownerId'
      | 'leadDesignerId'
      | 'fieldStaffId'
      | 'notes'
    >,
  ) => {
    const now = new Date().toISOString();
    const newCustomer: CustomerProject = {
      id: `cust-${crypto.randomUUID()}`,
      customerName: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      location: payload.location,
      notes: payload.notes,
      title: payload.title,
      projectType: payload.projectType,
      siteStatus: payload.siteStatus,
      stage: 'inquiry',
      progress: 8,
      startDate: now,
      targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: now,
      renderCount: 0,
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastContactedAt: now,
      dealProbability: 25,
      ownerId: payload.ownerId,
      leadDesignerId: payload.leadDesignerId,
      fieldStaffId: payload.fieldStaffId,
      assignedTeamIds: [payload.ownerId, payload.leadDesignerId, payload.fieldStaffId].filter(Boolean),
      priority: 'medium',
      pinned: false,
      needsFollowUp: true,
      renderPending: true,
      siteVisitScheduledAt: undefined,
      activityScore: 14,
      wallpaperCode: undefined,
      curtainCode: undefined,
      communicationLog: [
        {
          id: crypto.randomUUID(),
          type: 'comment',
          createdAt: now,
          actorName: data?.userName ?? 'You',
          summary: 'Customer created from dashboard',
          outcome: 'Ready for consultation and first room upload.',
        },
      ],
      quote: {
        estimatedValue: 0,
        quoteValue: 0,
        quoteStatus: 'draft',
        paymentStage: 'not_started',
        advanceReceived: 0,
      },
      renders: [],
      renderQueue: [],
      activities: [
        {
          id: crypto.randomUUID(),
          type: 'customer',
          title: 'Customer added',
          description: `${payload.customerName} was added to the CRM workspace.`,
          createdAt: now,
          actorName: data?.userName ?? 'You',
        },
      ],
      internalNotes: [],
    };

    updateData((current) => ({ ...current, customers: [newCustomer, ...current.customers] }));
    setAddCustomerOpen(false);
    setSelectedCustomerId(newCustomer.id);
    window.location.hash = '#dashboard/customers';
    pushToast('Customer created', `${payload.customerName} has been added to the dashboard.`);
  };

  const handleAddProject = (
    payload: Pick<
      CustomerProject,
      | 'customerName'
      | 'phone'
      | 'email'
      | 'address'
      | 'location'
      | 'title'
      | 'projectType'
      | 'siteStatus'
      | 'ownerId'
      | 'leadDesignerId'
      | 'fieldStaffId'
      | 'notes'
    >,
  ) => {
    handleAddCustomer(payload);
    setAddProjectOpen(false);
    pushToast('Project intake created', `${payload.title} is now visible in the pipeline board.`);
  };

  const handleAddTeamMember = (
    payload: Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status'>,
  ) => {
    const newMember: TeamMember = {
      id: `team-${crypto.randomUUID()}`,
      avatar: getInitials(payload.name),
      activeProjects: 0,
      workload: 12,
      ...payload,
    };

    updateData((current) => ({
      ...current,
      team: [newMember, ...current.team],
    }));

    setAddTeamMemberOpen(false);
    setSelectedTeamMemberId(newMember.id);
    pushToast('Team member added', `${payload.name} can now be assigned across customers and projects.`);
  };

  const handleAssignMemberToProject = (customerId: string, memberId: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) =>
        customer.id === customerId && !customer.assignedTeamIds.includes(memberId)
          ? {
              ...customer,
              assignedTeamIds: [...customer.assignedTeamIds, memberId],
              lastUpdated: new Date().toISOString(),
            }
          : customer,
      ),
    );
    pushToast('Team member assigned', 'Project assignment was updated.');
  };

  const handleRemoveMemberFromProject = (customerId: string, memberId: string) => {
    updateCustomers((customersList) =>
      customersList.map((customer) => {
        if (customer.id !== customerId) return customer;
        return {
          ...customer,
          assignedTeamIds: customer.assignedTeamIds.filter((id) => id !== memberId),
          lastUpdated: new Date().toISOString(),
        };
      }),
    );
    pushToast('Team member removed', 'Project assignment was updated.');
  };

  const handleDeleteTeamMember = () => {
    if (!deleteTeamCandidateId) return;

    updateData((current) => {
      const memberToRemove = current.team.find((member) => member.id === deleteTeamCandidateId);
      if (!memberToRemove) return current;

      const remainingTeam = current.team.filter((member) => member.id !== deleteTeamCandidateId);
      const fallbackForRole = (role: TeamMember['role']) =>
        remainingTeam.find((member) => member.role === role)?.id ?? remainingTeam[0]?.id ?? '';

      const nextCustomers = current.customers.map((customer) => {
        const nextAssignedTeamIds = customer.assignedTeamIds.filter((id) => id !== deleteTeamCandidateId);
        const ownerId = customer.ownerId === deleteTeamCandidateId ? fallbackForRole('Sales Owner') || fallbackForRole(memberToRemove.role) : customer.ownerId;
        const leadDesignerId =
          customer.leadDesignerId === deleteTeamCandidateId ? fallbackForRole('Lead Designer') || ownerId : customer.leadDesignerId;
        const fieldStaffId =
          customer.fieldStaffId === deleteTeamCandidateId
            ? fallbackForRole('Field Staff') || fallbackForRole('Site Coordinator') || ownerId
            : customer.fieldStaffId;

        return {
          ...customer,
          ownerId,
          leadDesignerId,
          fieldStaffId,
          assignedTeamIds: Array.from(
            new Set([ownerId, leadDesignerId, fieldStaffId, ...nextAssignedTeamIds].filter(Boolean)),
          ),
          lastUpdated: new Date().toISOString(),
        };
      });

      const nextTasks = current.tasks.map((task) =>
        task.ownerId === deleteTeamCandidateId
          ? { ...task, ownerId: fallbackForRole('Sales Owner') || remainingTeam[0]?.id || task.ownerId }
          : task,
      );

      return {
        ...current,
        team: remainingTeam,
        customers: nextCustomers,
        tasks: nextTasks,
      };
    });

    setSelectedTeamMemberId(null);
    setDeleteTeamCandidateId(null);
    pushToast('Team member removed', 'Assignments were safely reallocated to the remaining team.');
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.hash = '#login';
  };

  if (authLoading || loading || !data || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-brand-60 text-brand-dark">
      <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(dashboardHash(view))} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <Topbar
          activeView={activeView}
          userName={data.userName}
          companyName={data.companyName}
          search={filters.search}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          onOpenSidebar={() => setSidebarOpen(true)}
          recentlyViewed={recentlyViewed}
          team={data.team}
          onOpenCustomer={handleOpenCustomer}
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => setAddCustomerOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2.5 text-sm font-medium text-brand-dark shadow-sm hover:bg-brand-30"
            >
              <Plus size={16} />
              Add customer
            </button>
            <button
              onClick={() => setAddProjectOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm hover:bg-brand-dark"
            >
              <Plus size={16} />
              Add project
            </button>
            <a href="#try-once" className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2.5 text-sm font-medium text-brand-dark shadow-sm hover:bg-brand-30">
              <Plus size={16} />
              Generate render
            </a>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl bg-brand-dark px-4 py-2.5 text-sm font-medium text-brand-60 opacity-90 hover:opacity-100">
              <LogOut size={16} />
              Log out
            </button>
          </div>

          {activeView === 'overview' ? (
            <OverviewPage
              data={data}
              onOpenCustomer={handleOpenCustomer}
              onNavigate={handleNavigate}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onAddProject={() => setAddProjectOpen(true)}
              onAddTeamMember={() => setAddTeamMemberOpen(true)}
            />
          ) : null}

          {activeView === 'customers' ? (
            <CustomersPage
              customers={data.customers}
              deletedCustomers={data.deletedCustomers}
              team={data.team}
              filters={filters}
              onFiltersChange={(next) => setFilters((current) => ({ ...current, ...next }))}
              onOpenCustomer={handleOpenCustomer}
              onTogglePinned={handleTogglePinned}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onDeleteCustomer={setDeleteCandidateId}
            />
          ) : null}

          {activeView === 'team' ? (
            <TeamPage
              team={data.team}
              customers={data.customers}
              tasks={data.tasks}
              onOpenCustomer={handleOpenCustomer}
              onOpenMember={handleOpenTeamMember}
              onAddMember={() => setAddTeamMemberOpen(true)}
              onRemoveMember={setDeleteTeamCandidateId}
            />
          ) : null}
        </main>
      </div>

      <CustomerDrawer
        customer={selectedCustomer}
        team={data.team}
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomerId(null)}
        onStageChange={handleStageChange}
        onOwnerChange={handleOwnerChange}
        onTogglePinned={handleTogglePinned}
        onToggleFollowUp={handleToggleFollowUp}
        onAddNote={handleAddNote}
        onRequestArchive={setArchiveCandidateId}
        onRequestDelete={setDeleteCandidateId}
        onReassignTeam={handleReassignTeam}
      />

      <ConfirmDialog
        open={Boolean(archiveCandidateId)}
        title="Archive this project?"
        description="This removes the customer workspace from the active list. You can replace this action with a real backend archive API later."
        confirmLabel="Archive"
        onCancel={() => setArchiveCandidateId(null)}
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={Boolean(deleteCandidateId)}
        title="Delete this customer?"
        description="This simulates a destructive delete and moves the item into customer history so you can still track what happened."
        confirmLabel="Delete"
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={handleDeleteCustomer}
      />

      <AddCustomerModal open={addCustomerOpen} team={data.team} onClose={() => setAddCustomerOpen(false)} onSubmit={handleAddCustomer} />
      <AddProjectModal open={addProjectOpen} team={data.team} onClose={() => setAddProjectOpen(false)} onSubmit={handleAddProject} />
      <AddTeamMemberModal open={addTeamMemberOpen} existingTeam={data.team} onClose={() => setAddTeamMemberOpen(false)} onSubmit={handleAddTeamMember} />

      <TeamMemberDrawer
        member={selectedTeamMember}
        team={data.team}
        customers={data.customers}
        tasks={data.tasks}
        open={Boolean(selectedTeamMember)}
        onClose={() => setSelectedTeamMemberId(null)}
        onOpenCustomer={handleOpenCustomer}
        onRemoveMember={setDeleteTeamCandidateId}
        onAssignToProject={handleAssignMemberToProject}
        onRemoveFromProject={handleRemoveMemberFromProject}
      />

      <ConfirmDialog
        open={Boolean(deleteTeamCandidateId)}
        title="Remove this team member?"
        description="This removes the teammate from the dashboard and automatically reassigns their ownership to the nearest matching team member so active work keeps moving."
        confirmLabel="Remove member"
        onCancel={() => setDeleteTeamCandidateId(null)}
        onConfirm={handleDeleteTeamMember}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
};
