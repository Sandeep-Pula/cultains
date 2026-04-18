import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AlertTriangle, LogOut, Plus } from 'lucide-react';
import { auth } from '../lib/firebase';
import { authService } from '../lib/authService';
import { dashboardService } from './services/dashboardService';
import { dashboardHash, getStageProgress, parseDashboardView } from './utils';
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
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(!auth.currentUser);
  const [hash, setHash] = useState(window.location.hash || '#dashboard');
  const [data, setData] = useState<DashboardData | null>(() => auth.currentUser ? dashboardService.getEmptyDashboardData(auth.currentUser) : null);
  const [loading, setLoading] = useState(false);
  const [hasInitialSnapshot, setHasInitialSnapshot] = useState(false);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
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

  const pushToast = useCallback((title: string, description?: string) => {
    setToasts((current) => [...current, { id: crypto.randomUUID(), title, description }]);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setData(null);
        window.location.hash = '#login';
      }
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

    let unsubscribeDashboard = () => {};
    // Skip setting loading to true if we already have partial synchronous data
    setHasInitialSnapshot(false);
    setData((current) => current ?? dashboardService.getEmptyDashboardData(user));
    setSyncIssue(null);

    unsubscribeDashboard = dashboardService.subscribeToDashboardData(
      user,
      (nextData) => {
        setData(nextData);
        setHasInitialSnapshot(true);
        setLoading(false);
      },
      (nextError) => {
        console.error(nextError);
        setSyncIssue(nextError.message || 'Cloud sync is temporarily unavailable.');
        setLoading(false);
      },
    );

    dashboardService.ensureUserProfile(user).catch((nextError) => {
      console.error(nextError);
      setSyncIssue(nextError instanceof Error ? nextError.message : 'Cloud sync is temporarily unavailable.');
    });

    return () => unsubscribeDashboard();
  }, [user]);

  useEffect(() => {
    const handleOffline = () => {
      setSyncIssue('You appear to be offline. Reconnect to sync your dashboard.');
      pushToast('You’re offline', 'Reconnect to load and save dashboard updates.');
    };
    const handleOnline = () => {
      setSyncIssue(null);
      pushToast('Back online', 'Cloud sync will resume automatically.');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [pushToast]);

  useEffect(() => {
    if (!toasts.length) return;
    const timeout = window.setTimeout(() => setToasts((current) => current.slice(1)), 2600);
    return () => window.clearTimeout(timeout);
  }, [toasts]);

  const activeView = parseDashboardView(hash);

  const handleMutationError = (nextError: unknown, fallbackMessage: string) => {
    console.error(nextError);
    pushToast('Action failed', nextError instanceof Error ? nextError.message : fallbackMessage);
  };

  const selectedCustomer = data?.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedTeamMember = data?.team.find((member) => member.id === selectedTeamMemberId) ?? null;

  const recentlyViewed = useMemo(
    () =>
      data
        ? (data.recentlyViewedIds
            .map((id) => data.customers.find((customer) => customer.id === id))
            .filter(Boolean) as CustomerProject[])
        : [],
    [data],
  );

  const handleNavigate = (nextHash: string) => {
    window.location.hash = nextHash;
  };

  const handleOpenCustomer = async (customerId: string) => {
    if (!user || !data) return;
    setSelectedCustomerId(customerId);

    const nextRecent = [customerId, ...data.recentlyViewedIds.filter((id) => id !== customerId)].slice(0, 4);
    try {
      await dashboardService.updateRecentlyViewed(user.uid, nextRecent);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save recently viewed items.');
    }
  };

  const handleOpenTeamMember = (teamMemberId: string) => {
    setSelectedTeamMemberId(teamMemberId);
  };

  const handleStageChange = async (customerId: string, stage: ProjectStage) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        stage,
        progress: getStageProgress(stage),
        activities: [
          {
            id: crypto.randomUUID(),
            type: 'status' as const,
            title: 'Project stage updated',
            description: `Stage moved to ${stage.replace(/_/g, ' ')}.`,
            createdAt: new Date().toISOString(),
            actorName: data.userName,
          },
          ...customer.activities,
        ].slice(0, 20),
      });
      pushToast('Project stage updated');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update project stage.');
    }
  };

  const handleOwnerChange = async (customerId: string, ownerId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        ownerId,
        assignedTeamIds: Array.from(new Set([ownerId, ...customer.assignedTeamIds].filter(Boolean))),
      });
      pushToast('Project owner changed');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update owner.');
    }
  };

  const handleTogglePinned = async (customerId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        pinned: !customer.pinned,
      });
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update pinned state.');
    }
  };

  const handleToggleFollowUp = async (customerId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        needsFollowUp: !customer.needsFollowUp,
      });
      pushToast('Follow-up updated');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update follow-up state.');
    }
  };

  const handleAddNote = async (customerId: string, note: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        internalNotes: [
          {
            id: crypto.randomUUID(),
            authorId: user.uid,
            authorName: data.userName,
            createdAt: new Date().toISOString(),
            content: note,
          },
          ...customer.internalNotes,
        ],
        activities: [
          {
            id: crypto.randomUUID(),
            type: 'comment' as const,
            title: 'Internal note added',
            description: note,
            createdAt: new Date().toISOString(),
            actorName: data.userName,
          },
          ...customer.activities,
        ].slice(0, 20),
      });
      pushToast('Internal note added');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save the note.');
    }
  };

  const handleUpdateCustomer = async (customerId: string, payload: Partial<CustomerProject>) => {
    if (!user || !data) return;
    try {
      await dashboardService.updateCustomer(user.uid, customerId, payload);
      // Suppress toast for silent typing saves unless it's a major milestone if you want, 
      // but let's just let it auto-save quietly to avoid spamming for every field onBlur.
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update customer information.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!user || !data) return;
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) return;

    try {
      await dashboardService.toggleTask(user.uid, task);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update task status.');
    }
  };

  const handleAddTask = async (title: string, dueAt: string, customerId: string = '') => {
    if (!user) return;

    try {
      await dashboardService.addTask(user.uid, title, dueAt, user.uid, customerId);
      pushToast('Task added');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create the task.');
    }
  };

  const handleSaveSmartTask = async (
    title: string,
    dueAt: string,
    customerOption: { id?: string; isNew?: boolean; name?: string; phone?: string; address?: string }
  ) => {
    if (!user || !data) return;

    try {
      let finalCustomerId = customerOption.id || '';

      if (customerOption.isNew && customerOption.name) {
        finalCustomerId = await dashboardService.addCustomer(user, {
          customerName: customerOption.name,
          title: 'Auto-generated Project',
          phone: customerOption.phone || '',
          email: '',
          address: customerOption.address || '',
          location: '',
          projectType: 'living_room',
          siteStatus: 'ready',
          ownerId: user.uid,
          leadDesignerId: '',
          fieldStaffId: '',
          notes: 'Auto-mapped via Calendar',
        }, data.userName);
      }

      await dashboardService.addTask(user.uid, title, dueAt, user.uid, finalCustomerId);
      pushToast('Task saved', customerOption.isNew ? 'New customer mapped successfully.' : undefined);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save smart task.');
    }
  };

  const handleReassignTeam = async (customerId: string, teamIds: string[]) => {
    if (!user) return;
    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        assignedTeamIds: Array.from(new Set(teamIds.filter(Boolean))),
      });
      pushToast('Team assignment updated');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update team assignment.');
    }
  };

  const handleArchive = async () => {
    if (!archiveCandidateId || !user || !data) return;
    const customer = data.customers.find((item) => item.id === archiveCandidateId);
    if (!customer) return;

    try {
      await dashboardService.archiveCustomer(user.uid, customer, data.userName);
      setSelectedCustomerId(null);
      setArchiveCandidateId(null);
      pushToast('Project archived', 'The customer workspace has been moved to history.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to archive this project.');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCandidateId || !user || !data) return;
    const customer = data.customers.find((item) => item.id === deleteCandidateId);
    if (!customer) return;

    try {
      await dashboardService.deleteCustomerRecord(user.uid, customer, data.userName);
      setSelectedCustomerId(null);
      setDeleteCandidateId(null);
      pushToast('Customer deleted', 'The customer and project were moved to history.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this customer.');
    }
  };

  const handleAddCustomer = async (
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
    if (!user || !data) return;

    try {
      const customerId = await dashboardService.addCustomer(user, payload, data.userName);
      setAddCustomerOpen(false);
      setSelectedCustomerId(customerId);
      window.location.hash = '#dashboard/customers';
      pushToast('Customer created', `${payload.customerName} has been added to your workspace.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this customer.');
    }
  };

  const handleAddProject = async (
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
    await handleAddCustomer(payload);
    setAddProjectOpen(false);
  };

  const handleAddTeamMember = async (
    payload: Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status'>,
  ) => {
    if (!user) return;

    try {
      const memberId = await dashboardService.addTeamMember(user.uid, payload);
      setAddTeamMemberOpen(false);
      setSelectedTeamMemberId(memberId);
      pushToast('Team member added', `${payload.name} can now be assigned across customers and projects.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to add this team member.');
    }
  };

  const handleUpdateTeamMember = async (memberId: string, payload: Partial<TeamMember>) => {
    if (!user || !data) return;
    try {
      await dashboardService.updateTeamMember(user.uid, memberId, payload);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update team member.');
    }
  };

  const handleAssignMemberToProject = async (customerId: string, memberId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        assignedTeamIds: Array.from(new Set([...customer.assignedTeamIds, memberId])),
      });
      pushToast('Team member assigned');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to assign team member.');
    }
  };

  const handleRemoveMemberFromProject = async (customerId: string, memberId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(user.uid, customerId, {
        assignedTeamIds: customer.assignedTeamIds.filter((id) => id !== memberId),
      });
      pushToast('Team member removed');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove the team member.');
    }
  };

  const handleDeleteTeamMember = async () => {
    if (!deleteTeamCandidateId || !user || !data) return;

    try {
      await dashboardService.removeTeamMember(
        user.uid,
        deleteTeamCandidateId,
        data.team,
        data.customers,
        data.tasks,
      );
      setSelectedTeamMemberId(null);
      setDeleteTeamCandidateId(null);
      pushToast('Team member removed', 'Assignments were safely reallocated to the remaining team.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove this team member.');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.hash = '#login';
  };

  if (authLoading || (loading && !data)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null;
  }
  if (!data) {
    if (syncIssue && !hasInitialSnapshot) {
      return (
        <div className="min-h-screen bg-brand-60 px-6 py-10 text-brand-dark">
          <div className="mx-auto max-w-xl rounded-[32px] border border-brand-30 bg-white p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle size={22} />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">We couldn’t load your dashboard</h1>
            <p className="mt-2 text-sm text-brand-dark/75">{syncIssue}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60"
              >
                Reload
              </button>
              <a
                href="#login"
                className="rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2.5 text-sm font-medium text-brand-dark"
              >
                Back to login
              </a>
            </div>
          </div>
          <ToastStack toasts={toasts} />
        </div>
      );
    }

    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-brand-60 text-brand-dark">
      <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(dashboardHash(view))} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Topbar
          activeView={activeView}
          search={filters.search}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 sm:p-6">
          {activeView === 'overview' ? (
            <OverviewPage
              data={data}
              onOpenCustomer={handleOpenCustomer}
              onNavigate={handleNavigate}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onSaveSmartTask={handleSaveSmartTask}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onAddProject={() => setAddProjectOpen(true)}
              onAddTeamMember={() => setAddTeamMemberOpen(true)}
            />
          ) : activeView === 'customers' ? (
            <CustomersPage
              customers={data.customers}
              deletedCustomers={data.deletedCustomers}
              team={data.team}
              filters={filters}
              onFiltersChange={(next) => setFilters((current) => ({ ...current, ...next }))}
              onOpenCustomer={handleOpenCustomer}
              onTogglePinned={handleTogglePinned}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onDeleteCustomer={(id) => setDeleteCandidateId(id)}
            />
          ) : activeView === 'team' ? (
            <TeamPage
              team={data.team}
              customers={data.customers}
              tasks={data.tasks}
              onOpenCustomer={handleOpenCustomer}
              onOpenMember={handleOpenTeamMember}
              onAddMember={() => setAddTeamMemberOpen(true)}
              onRemoveMember={(id) => setDeleteTeamCandidateId(id)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-brand-dark/50">
              Workspace intentionally cleared for layout redesign focus.
            </div>
          )}
        </main>
      </div>
      <ToastStack toasts={toasts} />
      <CustomerDrawer
        customer={selectedCustomer}
        team={data.team}
        open={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onStageChange={handleStageChange}
        onOwnerChange={handleOwnerChange}
        onTogglePinned={handleTogglePinned}
        onToggleFollowUp={handleToggleFollowUp}
        onAddNote={handleAddNote}
        onRequestDelete={(id) => setDeleteCandidateId(id)}
        onReassignTeam={handleReassignTeam}
        onUpdateCustomer={handleUpdateCustomer}
      />
      <AddCustomerModal 
        open={addCustomerOpen} 
        team={data.team} 
        onClose={() => setAddCustomerOpen(false)} 
        onSubmit={handleAddCustomer} 
      />
      <AddProjectModal 
        open={addProjectOpen} 
        team={data.team} 
        onClose={() => setAddProjectOpen(false)} 
        onSubmit={handleAddProject} 
      />
      <AddTeamMemberModal 
        open={addTeamMemberOpen} 
        existingTeam={data.team} 
        onClose={() => setAddTeamMemberOpen(false)} 
        onSubmit={handleAddTeamMember} 
      />
      <TeamMemberDrawer
        member={data.team.find((m) => m.id === selectedTeamMemberId) || null}
        team={data.team}
        customers={data.customers}
        tasks={data.tasks}
        open={!!selectedTeamMemberId}
        onClose={() => setSelectedTeamMemberId(null)}
        onOpenCustomer={handleOpenCustomer}
        onRemoveMember={(id) => {
          setSelectedTeamMemberId(null);
          setDeleteTeamCandidateId(id);
        }}
        onAssignToProject={handleAssignMemberToProject}
        onRemoveFromProject={handleRemoveMemberFromProject}
        onUpdateMember={handleUpdateTeamMember}
      />
    </div>
  );
};
