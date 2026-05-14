import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AlertTriangle, ArrowRight, Building2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { authService } from '../lib/authService';
import { createId } from '../lib/id';
import { isAdminHost, isSuperAdminEmail, redirectToAdminDashboard } from '../lib/adminRouting';
import { dashboardService } from './services/dashboardService';
import { getBusinessConfig } from './businessConfig';
import { getInventoryMovement } from './inventoryMovement';
import {
  applySubscriptionAccess,
  dashboardHash,
  defaultSidebarViews,
  getStageProgress,
  isOwnerAccount,
  parseDashboardView,
  subscriptionPlanLabels,
  subscriptionPlanViews,
  viewTitles,
} from './utils';
import type {
  BillingDefaults,
  BusinessType,
  CashRegisterMenuItem,
  CustomerFilters,
  CustomerProject,
  DashboardData,
  DashboardView,
  FinanceEntry,
  InventoryItem,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  ProjectStage,
  SalesInvoiceLineItem,
  SubscriptionAccessRules,
  TeamMember,
  ToastItem,
  WeeklyMiscRecord,
} from './types';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { Sidebar } from './components/Sidebar';
import { Topbar, type TopbarSearchResult } from './components/Topbar';
import { OverviewPage } from './pages/OverviewPage';
import { SalesOverviewPage } from './pages/SalesOverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { TeamPage } from './pages/TeamPage';
import { InventoryPage } from './pages/InventoryPage';
import { BarcodeDeskPage } from './pages/BarcodeDeskPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { EmailPage } from './pages/EmailPage';
import { TallyExportPage } from './pages/TallyExportPage';
import { BillingPage } from './pages/BillingPage';
import { CrmPage } from './pages/CrmPage';
import { AIToolsPage } from './pages/AIToolsPage';
import { CopilotPage } from './pages/CopilotPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamMemberProfilePage } from './pages/TeamMemberProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { RaiseIssuePage } from './pages/RaiseIssuePage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { CustomerDrawer } from './components/CustomerDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastStack } from './components/ToastStack';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AddProjectModal } from './components/AddProjectModal';
import { AddTeamMemberModal } from './components/AddTeamMemberModal';
import { TeamMemberDrawer } from './components/TeamMemberDrawer';
import { AIBusinessAssistant } from './components/AIBusinessAssistant';
import { OperationsPage } from './pages/OperationsPage';
import { AccountLedgerPage } from './pages/AccountLedgerPage';
import { TimesheetPage } from './pages/TimesheetPage';

const defaultFilters: CustomerFilters = {
  search: '',
  stage: 'all',
  ownerId: 'all',
  completion: 'all',
  sortBy: 'latest',
};

export const DashboardApp = () => {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [hash, setHash] = useState(window.location.hash || '#dashboard');
  const [data, setData] = useState<DashboardData | null>(() => auth?.currentUser ? dashboardService.getEmptyDashboardData(auth.currentUser) : null);
  const [loading, setLoading] = useState(false);
  const [hasInitialSnapshot, setHasInitialSnapshot] = useState(false);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
  const [subscriptionAccessRules, setSubscriptionAccessRules] = useState<SubscriptionAccessRules>(subscriptionPlanViews);
  const [upgradePromptView, setUpgradePromptView] = useState<DashboardView | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>(defaultFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [focusedInventoryItemId, setFocusedInventoryItemId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('dashboard-sidebar-collapsed') === 'true';
  });
  const [archiveCandidateId, setArchiveCandidateId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [deleteTeamCandidateId, setDeleteTeamCandidateId] = useState<string | null>(null);
  const [aivaOpen, setAivaOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((title: string, description?: string) => {
    setToasts((current) => [...current, { id: createId(), title, description }]);
  }, []);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      setUser(null);
      setData(null);
      return;
    }

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
    if (!user) return;
    return dashboardService.subscribeToSubscriptionAccessRules(setSubscriptionAccessRules);
  }, [user]);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('dashboard-sidebar-collapsed', String(desktopSidebarCollapsed));
  }, [desktopSidebarCollapsed]);

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
        setSyncIssue(null);
        setLoading(false);
      },
      (nextError) => {
        console.error(nextError);
        setSyncIssue(nextError.message || 'Cloud sync is temporarily unavailable.');
        setLoading(false);
      },
    );

    dashboardService
      .getExistingUserProfile(user.uid)
      .then((profile) => {
        if (profile) return;

        if (isSuperAdminEmail(user.email)) {
          return dashboardService.ensureSuperAdminProfile(user).then(() => undefined);
        }

        return dashboardService.ensureUserProfile(user, user.displayName || undefined).then(() => undefined);
      })
      .catch((nextError) => {
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
  const businessConfig = getBusinessConfig(data?.profile.businessType ?? 'general_business');
  const workspaceUserId = data?.profile.workspaceOwnerId || user?.uid || '';
  const isSuperAdminIdentity = isSuperAdminEmail(user?.email);
  const isSuperAdmin = data?.profile.accountType === 'super_admin' || isSuperAdminIdentity;
  const isOwner = isOwnerAccount(data?.profile.accountType);
  const requiresProfileSetup = Boolean(data && isOwner && !isSuperAdmin && !data.profile.profileSetupCompleted);
  const allowedViews = applySubscriptionAccess(data?.profile.sidebarViews, data?.profile.subscriptionPlan, subscriptionAccessRules);
  const navigableViews: DashboardView[] = useMemo(
    () => (
      isSuperAdmin
        ? ['super-admin']
        : isOwner
          ? allowedViews
          : Array.from(new Set<DashboardView>([...allowedViews.filter((view) => view !== 'copilot'), 'profile']))
    ),
    [allowedViews, isOwner, isSuperAdmin],
  );

  useEffect(() => {
    if (!user || !data) return;
    if (isSuperAdmin) {
      if (!isAdminHost()) {
        redirectToAdminDashboard();
        return;
      }

      if (activeView !== 'super-admin') {
        window.location.hash = '#dashboard/super-admin';
      }
      return;
    }
    const fallbackView = navigableViews[0] || 'sales-overview';
    const canUseUtilityView = activeView === 'profile' || (isOwner && activeView === 'settings');
    if (!canUseUtilityView && !navigableViews.includes(activeView)) {
      if (defaultSidebarViews.includes(activeView)) {
        setUpgradePromptView(activeView);
      }
      window.location.hash = dashboardHash(fallbackView);
    }
  }, [activeView, data, isOwner, isSuperAdmin, navigableViews, user]);

  const handleMutationError = (nextError: unknown, fallbackMessage: string) => {
    console.error(nextError);
    const message = nextError instanceof Error ? nextError.message : fallbackMessage;
    setSyncIssue(message);
    pushToast('Action failed', message);
  };

  const selectedCustomer = data?.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedTeamMember = data?.team.find((member) => member.id === selectedTeamMemberId) ?? null;
  const topbarSearchResults = useMemo<TopbarSearchResult[]>(() => {
    if (!data) return [];
    const query = filters.search.trim().toLowerCase();
    if (!query) return [];

    const includesQuery = (...values: Array<string | undefined>) =>
      values.some((value) => value?.toLowerCase().includes(query));

    const inventoryResults = data.inventory
      .filter((item) =>
        includesQuery(item.name, item.sku, item.itemCode, item.barcodeValue, item.storageLocation, item.supplierName),
      )
      .slice(0, 5)
      .map<TopbarSearchResult>((item) => {
        const movement = getInventoryMovement(item, data.salesInvoices);
        return {
          id: item.id,
          type: 'inventory',
          title: item.name,
          subtitle: `${movement.stockLeft} ${item.unit} left • ${movement.soldSinceLastInventoryUpdate} sold since last inventory update`,
          badge: 'Inventory',
        };
      });

    const customerResults = data.customers
      .filter((customer) =>
        includesQuery(customer.customerName, customer.company, customer.email, customer.phone, customer.title),
      )
      .slice(0, 3)
      .map<TopbarSearchResult>((customer) => ({
        id: customer.id,
        type: 'customer',
        title: customer.customerName,
        subtitle: `${customer.title || businessConfig.workLabel} • ${customer.stage.replace(/_/g, ' ')}`,
        badge: businessConfig.customerLabel,
      }));

    const teamResults = data.team
      .filter((member) => includesQuery(member.name, member.role, member.email, member.phone))
      .slice(0, 2)
      .map<TopbarSearchResult>((member) => ({
        id: member.id,
        type: 'team',
        title: member.name,
        subtitle: `${member.role} • ${member.status}`,
        badge: 'Team',
      }));

    return [...inventoryResults, ...customerResults, ...teamResults].slice(0, 8);
  }, [businessConfig.customerLabel, businessConfig.workLabel, data, filters.search]);

  const handleNavigate = (nextHash: string) => {
    window.location.hash = nextHash;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80);
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

  const handleSearchResultSelect = (result: TopbarSearchResult) => {
    setFilters((current) => ({ ...current, search: '' }));

    if (result.type === 'inventory') {
      setFocusedInventoryItemId(result.id);
      handleNavigate(dashboardHash('inventory'));
      return;
    }

    if (result.type === 'customer') {
      handleNavigate(dashboardHash('customers'));
      void handleOpenCustomer(result.id);
      return;
    }

    handleNavigate(dashboardHash('team'));
    handleOpenTeamMember(result.id);
  };

  const handleStageChange = async (customerId: string, stage: ProjectStage) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
        stage,
        progress: getStageProgress(stage),
        activities: [
          {
            id: createId(),
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
        internalNotes: [
          {
            id: createId(),
            authorId: user.uid,
            authorName: data.userName,
            createdAt: new Date().toISOString(),
            content: note,
          },
          ...customer.internalNotes,
        ],
        activities: [
          {
            id: createId(),
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, payload);
      // Suppress toast for silent typing saves unless it's a major milestone if you want, 
      // but let's just let it auto-save quietly to avoid spamming for every field onBlur.
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update customer information.');
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
        }, data.userName, workspaceUserId);
      }

      await dashboardService.addTask(
        workspaceUserId,
        title,
        dueAt,
        data.profile.linkedTeamMemberId || user.uid,
        finalCustomerId,
      );
      pushToast('Task saved', customerOption.isNew ? 'New customer mapped successfully.' : undefined);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save smart task.');
    }
  };

  const handleArchive = async () => {
    if (!archiveCandidateId || !user || !data) return;
    const customer = data.customers.find((item) => item.id === archiveCandidateId);
    if (!customer) return;

    try {
      await dashboardService.archiveCustomer(workspaceUserId, customer, data.userName);
      setSelectedCustomerId(null);
      setArchiveCandidateId(null);
      pushToast('Record archived', 'The active record has been moved to history.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to archive this project.');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCandidateId || !user || !data) return;
    const customer = data.customers.find((item) => item.id === deleteCandidateId);
    if (!customer) return;

    try {
      await dashboardService.deleteCustomerRecord(workspaceUserId, customer, data.userName);
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
      const customerId = await dashboardService.addCustomer(user, payload, data.userName, workspaceUserId);
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
    payload: Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status' | 'allowedViews' | 'loginEnabled' | 'loginEmail'> & { password?: string },
  ) => {
    if (!user || !data) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can create teammate login credentials.');
      return;
    }

    try {
      let authUid: string | undefined;
      const loginEmail = payload.loginEmail?.trim() || payload.email?.trim() || '';

      if (payload.loginEnabled) {
        if (!loginEmail || !payload.password) {
          throw new Error('Add a login email and temporary password before enabling teammate login.');
        }

        const createdUser = await authService.createTeamMemberAccount(loginEmail, payload.password, payload.name);
        authUid = createdUser.uid;
      }

      const memberId = await dashboardService.addTeamMember(workspaceUserId, {
        ...payload,
        allowedViews: payload.allowedViews.length ? payload.allowedViews : ['billing'],
        authUid,
        loginEmail,
      });

      if (authUid) {
        await dashboardService.provisionTeamMemberAccess(
          workspaceUserId,
          data.profile,
          memberId,
          {
            name: payload.name,
            phone: payload.phone,
            authUid,
            loginEmail,
            allowedViews: payload.allowedViews.length ? payload.allowedViews : ['billing'],
            loginEnabled: payload.loginEnabled,
          },
        );
      }

      setAddTeamMemberOpen(false);
      setSelectedTeamMemberId(memberId);
      pushToast(
        'Team member added',
        authUid
          ? `${payload.name} can now log in with the teammate credentials you just created.`
          : `${payload.name} can now be assigned across customers and projects.`,
      );
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to add this team member.');
    }
  };

  const handleUpdateTeamMember = async (memberId: string, payload: Partial<TeamMember>) => {
    if (!user || !data) return;
    try {
      await dashboardService.updateTeamMember(workspaceUserId, memberId, payload);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update team member.');
    }
  };

  const handleProvisionExistingTeamMemberLogin = async (
    memberId: string,
    payload: { loginEmail: string; password: string },
  ) => {
    if (!user || !data) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can create teammate login credentials.');
      return;
    }

    const member = data.team.find((item) => item.id === memberId);
    if (!member) {
      throw new Error('We could not find that team member anymore.');
    }

    const loginEmail = payload.loginEmail.trim();
    if (!loginEmail || payload.password.length < 8) {
      throw new Error('Add a valid login email and a temporary password with at least 8 characters.');
    }

    try {
      const createdUser = await authService.createTeamMemberAccount(loginEmail, payload.password, member.name);
      await dashboardService.updateTeamMember(workspaceUserId, memberId, {
        loginEnabled: true,
        loginEmail,
        authUid: createdUser.uid,
      });
      await dashboardService.provisionTeamMemberAccess(
        workspaceUserId,
        data.profile,
        memberId,
        {
          name: member.name,
          phone: member.phone,
          authUid: createdUser.uid,
          loginEmail,
          allowedViews: member.allowedViews,
          loginEnabled: true,
        },
      );
      pushToast('Login created', `${member.name} can now sign in as a team member.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create teammate login credentials.');
      throw nextError;
    }
  };

  const handleSendTeamMemberReset = async (email: string) => {
    try {
      await authService.requestPasswordReset(email.trim());
      pushToast('Reset link sent', `A password reset email was sent to ${email.trim()}.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to send a password reset email.');
      throw nextError;
    }
  };

  const handleAssignMemberToProject = async (customerId: string, memberId: string) => {
    if (!user || !data) return;
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;

    try {
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
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
      await dashboardService.updateCustomer(workspaceUserId, customerId, {
        assignedTeamIds: customer.assignedTeamIds.filter((id) => id !== memberId),
      });
      pushToast('Team member removed');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove the team member.');
    }
  };

  const handleDeleteTeamMember = async () => {
    if (!deleteTeamCandidateId || !user || !data) return;
    const member = data.team.find((item) => item.id === deleteTeamCandidateId);

    try {
      await dashboardService.removeTeamMember(
        workspaceUserId,
        deleteTeamCandidateId,
        data.team,
        data.customers,
        data.tasks,
      );
      setSelectedTeamMemberId(null);
      setDeleteTeamCandidateId(null);
      pushToast(
        'Team member removed',
        member?.authUid
          ? 'Assignments were safely reallocated and this teammate can no longer sign in.'
          : 'Assignments were safely reallocated to the remaining team.',
      );
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove this team member.');
    }
  };

  const handleAddInventoryItem = async (
    payload: Pick<
      InventoryItem,
      | 'name'
      | 'sku'
      | 'itemCode'
      | 'category'
      | 'unit'
      | 'currentStock'
      | 'reservedStock'
      | 'minimumStock'
      | 'reorderQuantity'
      | 'costPerUnit'
      | 'sellingPrice'
      | 'barcodeValue'
      | 'storageLocation'
      | 'supplierName'
      | 'supplierPhone'
      | 'notes'
    >,
  ) => {
    if (!user || !data) return;

    try {
      await dashboardService.addInventoryItem(workspaceUserId, payload);
      pushToast('Inventory item added', `${payload.name} is now available in your stock workspace.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this inventory item.');
    }
  };

  const handleUpdateInventoryItem = async (itemId: string, patch: Partial<InventoryItem>) => {
    if (!user) return;

    try {
      await dashboardService.updateInventoryItem(workspaceUserId, itemId, patch);
      pushToast('Inventory updated', 'The stock record was saved successfully.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update this inventory item.');
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    if (!user) return;

    try {
      await dashboardService.deleteInventoryItem(workspaceUserId, itemId);
      pushToast('Inventory item deleted', 'The stock record has been removed from your workspace.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this inventory item.');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.hash = '#login';
  };

  const handleSaveWorkspaceProfile = async (profile: {
    companyName: string;
    userName: string;
    businessType: BusinessType;
    workspaceLogoUrl: string;
    email: string;
    phone: string;
    city: string;
    studioAddress: string;
    gstNumber: string;
    teamSize: string;
    website: string;
    sidebarViews: DashboardView[];
    billingDefaults: BillingDefaults;
  }) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can update workspace profile details.');
      return;
    }

    try {
      await dashboardService.updateWorkspaceProfile(workspaceUserId, profile);
      pushToast('Profile updated', 'Your company and workspace details were saved.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update your profile.');
    }
  };

  const handleFinalizeBarcodeSale = async (payload: {
    existingInvoiceId?: string;
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
    paymentMethod: InvoicePaymentMethod;
    taxRate: number;
    notes: string;
    billedBy: string;
    lineItems: SalesInvoiceLineItem[];
  }) => {
    if (!user) {
      throw new Error('Please log in again before finalizing the sale.');
    }

    try {
      const result = await dashboardService.completeBarcodeSale(workspaceUserId, payload);
      pushToast('Invoice created', `${result.invoiceNumber} is ready to print.`);
      return result;
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to finalize this sale.');
      throw nextError;
    }
  };

  const handleFinalizeCashRegisterSale = async (payload: {
    existingInvoiceId?: string;
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
    paymentMethod: InvoicePaymentMethod;
    taxRate: number;
    notes: string;
    billedBy: string;
    lineItems: SalesInvoiceLineItem[];
  }) => {
    if (!user) {
      throw new Error('Please log in again before finalizing the sale.');
    }

    try {
      const result = await dashboardService.completeCashRegisterSale(workspaceUserId, payload);
      pushToast('Cash register invoice created', `${result.invoiceNumber} is ready to print.`);
      return result;
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to finalize this cash register sale.');
      throw nextError;
    }
  };

  const handleSaveCashRegisterMenuItems = async (
    items: Array<Omit<CashRegisterMenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }>,
  ) => {
    if (!user) return;

    try {
      await dashboardService.saveCashRegisterMenuItems(workspaceUserId, items);
      pushToast('Cash register updated', 'Menu buttons were saved.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save cash register menu items.');
      throw nextError;
    }
  };

  const handleUpdateCashRegisterMenuItem = async (itemId: string, patch: Partial<CashRegisterMenuItem>) => {
    if (!user) return;

    try {
      await dashboardService.updateCashRegisterMenuItem(workspaceUserId, itemId, patch);
      pushToast('Cash register item saved');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update this cash register item.');
      throw nextError;
    }
  };

  const handleDeleteCashRegisterMenuItem = async (itemId: string) => {
    if (!user) return;

    try {
      await dashboardService.deleteCashRegisterMenuItem(workspaceUserId, itemId);
      pushToast('Cash register item deleted');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this cash register item.');
      throw nextError;
    }
  };

  const handleSaveCashRegisterCategorySuggestion = async (category: string) => {
    if (!category.trim()) return;

    try {
      await dashboardService.saveCashRegisterCategorySuggestion(category);
    } catch {
      // Shared category learning is best-effort. Local register edits should never fail because of it.
    }
  };

  const handleSaveInvoiceDraft = async (payload: {
    draftId?: string;
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
    paymentMethod: InvoicePaymentMethod;
    taxRate: number;
    notes: string;
    billedBy: string;
    lineItems: SalesInvoiceLineItem[];
  }) => {
    if (!user) {
      throw new Error('Please log in again before saving the draft.');
    }

    try {
      const result = await dashboardService.saveSalesInvoiceDraft(workspaceUserId, payload);
      pushToast('Draft saved', `${result.invoiceNumber} is ready to resume later.`);
      return result;
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save this invoice draft.');
      throw nextError;
    }
  };

  const handleDeleteInvoiceDraft = async (invoiceId: string) => {
    if (!user) {
      throw new Error('Please log in again before removing the draft.');
    }

    try {
      await dashboardService.deleteSalesInvoice(workspaceUserId, invoiceId);
      pushToast('Draft removed', 'The invoice draft was deleted.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove this invoice draft.');
      throw nextError;
    }
  };

  const handleCreatePaycheck = async (payload: {
    employeeMemberId: string;
    employeeName: string;
    amount: number;
    dueAt: string;
    notes: string;
    payPeriodLabel: string;
    paymentMethod: InvoicePaymentMethod;
    status: FinanceEntry['status'];
    issuedBy: string;
  }) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can generate salary paychecks.');
      return;
    }

    try {
      await dashboardService.createSalaryPaycheck(workspaceUserId, payload);
      pushToast('Paycheck created', `${payload.employeeName}'s paycheck is now available in both owner and staff profiles.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this paycheck.');
      throw nextError;
    }
  };

  const handleAddFinanceEntry = async (payload: Pick<FinanceEntry, 'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'linkedCustomerName' | 'projectTitle' | 'notes' | 'paymentMethod' | 'issuedBy' | 'referenceDate' | 'transactionFlow'>) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can add accounting book entries.');
      return;
    }

    try {
      await dashboardService.addFinanceEntry(workspaceUserId, {
        ...payload,
        accountingSource: 'manual',
      });
      pushToast('Entry added', 'The transaction is now reflected in journal, ledger, and trial balance.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to add this accounting entry.');
      throw nextError;
    }
  };

  const handleDeleteFinanceEntry = async (entryId: string) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can delete accounting book entries.');
      return;
    }

    try {
      await dashboardService.deleteFinanceEntry(workspaceUserId, entryId);
      pushToast('Entry deleted', 'The selected transaction has been removed from the books.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this accounting entry.');
      throw nextError;
    }
  };

  const handleAddWeeklyMiscRecord = async (payload: Pick<WeeklyMiscRecord, 'title' | 'amount' | 'spentAt' | 'notes' | 'weekKey'>) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can record weekly miscellaneous spends.');
      return;
    }

    try {
      await dashboardService.addWeeklyMiscRecord(workspaceUserId, payload);
      pushToast('Weekly record saved', 'This small spend is parked in the weekly miscellaneous stack for weekend book posting.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to save this weekly miscellaneous record.');
      throw nextError;
    }
  };

  const handleDeleteWeeklyMiscRecord = async (recordId: string) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can remove weekly miscellaneous records.');
      return;
    }

    try {
      await dashboardService.deleteWeeklyMiscRecord(workspaceUserId, recordId);
      pushToast('Weekly record removed', 'The miscellaneous stack has been updated.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to remove this weekly miscellaneous record.');
      throw nextError;
    }
  };

  const handleCloseWeeklyMiscRecords = async (payload: {
    title: string;
    amount: number;
    dueAt: string;
    referenceDate: string;
    notes: string;
    autoGroupKey: string;
    recordIds: string[];
  }) => {
    if (!user) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can post weekly miscellaneous close entries.');
      return;
    }

    try {
      await dashboardService.addFinanceEntry(workspaceUserId, {
        title: payload.title,
        kind: 'expense',
        category: 'operations',
        amount: payload.amount,
        status: 'paid',
        dueAt: payload.dueAt,
        notes: payload.notes,
        paymentMethod: 'cash',
        issuedBy: data?.userName || 'Business owner',
        referenceDate: payload.referenceDate,
        transactionFlow: 'business_to_person',
        accountingSource: 'weekly_misc_summary',
        autoGenerated: true,
        autoGroupKey: payload.autoGroupKey,
      });
      await dashboardService.clearWeeklyMiscRecords(workspaceUserId, payload.recordIds);
      pushToast('Weekly miscellaneous posted', 'The weekly stack has been moved into the books as one combined entry.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to post the weekly miscellaneous close entry.');
      throw nextError;
    }
  };

  const handleCreateSupportTicket = async (payload: { subject: string; body: string; category: 'general' | 'technical' | 'billing' | 'feature_request' | 'account'; priority: 'low' | 'medium' | 'high' | 'urgent' }) => {
    if (!user || !data) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can open and manage platform support complaints.');
      return;
    }

    try {
      await dashboardService.createBusinessSupportTicket(workspaceUserId, data.profile, payload);
      pushToast('Ticket created', 'The platform super admin can now pick up this new support ticket.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this support ticket.');
      throw nextError;
    }
  };

  const handleSendSupportMessage = async (payload: { ticketId: string; body: string }) => {
    if (!user || !data) return;
    if (!isOwner) {
      pushToast('Owner access required', 'Only the business owner can open and manage platform support complaints.');
      return;
    }

    try {
      await dashboardService.replyToSupportTicketAsBusiness(payload.ticketId, { name: data.profile.userName, email: data.profile.email }, payload.body);
      pushToast('Reply sent', 'Your message was added to this support ticket.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to send this support message.');
      throw nextError;
    }
  };

  if (authLoading || (loading && !data)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-60 px-6 py-10 text-brand-dark">
        <div className="mx-auto max-w-xl rounded-[32px] border border-brand-30 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <AlertTriangle size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Reconnecting your dashboard session</h1>
          <p className="mt-2 text-sm text-brand-dark/75">
            The dashboard is waiting for Firebase Auth to confirm your login. If this stays here for more than a few seconds, return to login and sign in again.
          </p>
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

  if (isSuperAdmin) {
    return (
      <>
        <SuperAdminPage
          profile={data.profile}
          onLogout={handleLogout}
          onError={handleMutationError}
          onSuccess={pushToast}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-brand-60 text-brand-dark">
      <Sidebar
        activeView={activeView}
        companyName={data.profile.companyName}
        workspaceLogoUrl={data.profile.workspaceLogoUrl}
        viewerName={data.userName}
        viewerLabel={isOwner ? 'Business owner' : 'Team member'}
        businessConfig={businessConfig}
        visibleViews={isOwner ? allowedViews : allowedViews.filter((view) => view !== 'copilot')}
        canManageSidebar={isOwner}
        canViewProfile
        onNavigate={(view) => handleNavigate(dashboardHash(view))}
        onSaveViews={async (sidebarViews) => {
          if (!user || !isOwner) return;
          try {
            await dashboardService.updateWorkspaceProfile(workspaceUserId, {
              companyName: data.profile.companyName,
              userName: data.profile.userName,
              businessType: data.profile.businessType,
              workspaceLogoUrl: data.profile.workspaceLogoUrl,
              email: data.profile.email,
              phone: data.profile.phone,
              city: data.profile.city,
              studioAddress: data.profile.studioAddress,
              gstNumber: data.profile.gstNumber,
              teamSize: data.profile.teamSize,
              website: data.profile.website,
              sidebarViews,
              billingDefaults: data.profile.billingDefaults,
            });
            setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, sidebarViews } } : null));
            pushToast('Sidebar updated', 'Your sidebar shortcuts were saved.');
          } catch (nextError) {
            handleMutationError(nextError, 'Unable to save sidebar changes.');
            throw nextError;
          }
        }}
        open={sidebarOpen}
        collapsed={desktopSidebarCollapsed}
        onToggleCollapse={() => setDesktopSidebarCollapsed((current) => !current)}
        onClose={() => setSidebarOpen(false)}
      />
      {upgradePromptView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/45 p-4">
          <section className="w-full max-w-md rounded-[28px] border border-brand-30 bg-white p-6 text-brand-dark shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
              <AlertTriangle size={22} />
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Upgrade required</h2>
            <p className="mt-2 text-sm leading-6 text-brand-dark/70">
              {viewTitles[upgradePromptView]} is not included in your current {subscriptionPlanLabels[data.profile.subscriptionPlan]} plan.
              Upgrade your subscription to unlock this dashboard page.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setUpgradePromptView(null)}
                className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-60/40"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => setUpgradePromptView(null)}
                className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-semibold text-brand-60"
              >
                Contact admin
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <div className={clsx('flex min-h-screen flex-col transition-[padding] duration-300', desktopSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72')}>
        <Topbar
          activeView={activeView}
          businessConfig={businessConfig}
          search={filters.search}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          searchResults={topbarSearchResults}
          onSearchResultSelect={handleSearchResultSelect}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenAiva={() => setAivaOpen(true)}
          onToggleDesktopSidebar={() => setDesktopSidebarCollapsed((current) => !current)}
          desktopSidebarCollapsed={desktopSidebarCollapsed}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 sm:p-6" tabIndex={-1}>
          {syncIssue ? (
            <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="font-semibold">Cloud sync needs attention</div>
              <div className="mt-1 text-amber-800/90">
                {syncIssue}
              </div>
            </div>
          ) : null}
          {requiresProfileSetup && activeView === 'profile' ? (
            <div className="mb-4 rounded-[24px] border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark shadow-sm">
              <div className="font-semibold">Complete your business profile to unlock the workspace</div>
              <div className="mt-1 text-brand-dark/70">
                Add your business type, contact number, city, address, and team size, then save the profile.
              </div>
            </div>
          ) : null}
          {activeView === 'sales-overview' ? (
            <SalesOverviewPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              salesInvoices={data.salesInvoices}
            />
          ) : activeView === 'overview' ? (
            <OverviewPage
              data={data}
              businessConfig={businessConfig}
              onOpenCustomer={handleOpenCustomer}
              onNavigate={handleNavigate}
              onSaveSmartTask={handleSaveSmartTask}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onAddProject={() => setAddProjectOpen(true)}
              onAddTeamMember={() => {
                if (isOwner) {
                  setAddTeamMemberOpen(true);
                }
              }}
            />
          ) : activeView === 'customers' ? (
            <CustomersPage
              customers={data.customers}
              deletedCustomers={data.deletedCustomers}
              team={data.team}
              businessConfig={businessConfig}
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
              financeEntries={data.financeEntries}
              profile={data.profile}
              businessConfig={businessConfig}
              onOpenCustomer={handleOpenCustomer}
              onOpenMember={handleOpenTeamMember}
              onCreatePaycheck={handleCreatePaycheck}
              onAddMember={() => {
                if (isOwner) {
                  setAddTeamMemberOpen(true);
                } else {
                  pushToast('Owner access required', 'Only the business owner can add or provision teammates.');
                }
              }}
            />
          ) : activeView === 'inventory' ? (
            <InventoryPage
              inventory={data.inventory}
              customers={data.customers}
              salesInvoices={data.salesInvoices}
              businessConfig={businessConfig}
              focusItemId={focusedInventoryItemId}
              onFocusItemHandled={() => setFocusedInventoryItemId(null)}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
            />
          ) : activeView === 'barcode-desk' ? (
            <BarcodeDeskPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              inventory={data.inventory}
              salesInvoices={data.salesInvoices}
            />
          ) : activeView === 'cash-register' ? (
            <CashRegisterPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              billedBy={data.userName}
              menuItems={data.cashRegisterMenuItems}
              categorySuggestions={data.cashRegisterCategorySuggestions}
              salesInvoices={data.salesInvoices}
              onSaveMenuItems={handleSaveCashRegisterMenuItems}
              onUpdateMenuItem={handleUpdateCashRegisterMenuItem}
              onDeleteMenuItem={handleDeleteCashRegisterMenuItem}
              onFinalizeSale={handleFinalizeCashRegisterSale}
              onSaveDraft={handleSaveInvoiceDraft}
              onDeleteDraft={handleDeleteInvoiceDraft}
              onSaveCategorySuggestion={handleSaveCashRegisterCategorySuggestion}
            />
          ) : activeView === 'email' ? (
            <EmailPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
            />
          ) : activeView === 'tally-export' ? (
            <TallyExportPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              financeEntries={data.financeEntries}
              salesInvoices={data.salesInvoices}
              inventory={data.inventory}
              customers={data.customers}
            />
          ) : activeView === 'billing' ? (
            <BillingPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              billedBy={data.userName}
              inventory={data.inventory}
              salesInvoices={data.salesInvoices}
              onFinalizeSale={handleFinalizeBarcodeSale}
              onSaveDraft={handleSaveInvoiceDraft}
              onDeleteDraft={handleDeleteInvoiceDraft}
            />
          ) : activeView === 'account-ledger' ? (
            <AccountLedgerPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              financeEntries={data.financeEntries}
              weeklyMiscRecords={data.weeklyMiscRecords}
              salesInvoices={data.salesInvoices}
              inventory={data.inventory}
              customers={data.customers}
              actorName={data.userName}
              onAddEntry={handleAddFinanceEntry}
              onAddWeeklyMiscRecord={handleAddWeeklyMiscRecord}
              onDeleteWeeklyMiscRecord={handleDeleteWeeklyMiscRecord}
              onCloseWeeklyMiscRecords={handleCloseWeeklyMiscRecords}
              onDeleteEntry={handleDeleteFinanceEntry}
            />
          ) : activeView === 'render-history' ? (
            <OperationsPage
              businessConfig={businessConfig}
              customers={data.customers}
              tasks={data.tasks}
              inventory={data.inventory}
              financeEntries={data.financeEntries}
              onOpenCustomer={handleOpenCustomer}
            />
          ) : activeView === 'crm' ? (
            <CrmPage
              workspaceId={workspaceUserId}
              currentUserId={user.uid}
              actorName={data.userName}
              team={data.team}
              viewerTeamMemberId={data.profile.linkedTeamMemberId || user.uid}
              isOwner={isOwner}
              onError={handleMutationError}
              onSuccess={pushToast}
            />
          ) : activeView === 'copilot' ? (
            isOwner ? (
              <CopilotPage
                profile={data.profile}
              />
            ) : (
              <div className="rounded-[28px] border border-brand-30 bg-white p-6 text-sm text-brand-dark shadow-sm">
                Business Copilot is available only to the business owner.
              </div>
            )
          ) : activeView === 'ai-tools' ? (
            <AIToolsPage businessConfig={businessConfig} />
          ) : activeView === 'timesheet' ? (
            <TimesheetPage
              timesheets={data.timesheets}
              leaveRequests={data.leaveRequests}
              team={data.team}
              isOwner={isOwnerAccount(data.profile.accountType)}
              viewerId={data.profile.linkedTeamMemberId || user.uid}
              onClockIn={async (userId) => {
                await dashboardService.clockIn(user.uid, userId);
                pushToast('Clocked In', 'Your attendance has been recorded.');
              }}
              onClockOut={async (entryId, totalMinutes) => {
                await dashboardService.clockOut(user.uid, entryId, totalMinutes);
                pushToast('Clocked Out', 'Your attendance has been updated.');
              }}
              onRequestLeave={async (payload) => {
                await dashboardService.requestLeave(user.uid, payload);
                pushToast('Leave Requested', 'Your request has been submitted for approval.');
              }}
              onUpdateLeaveStatus={async (leaveId, status) => {
                await dashboardService.updateLeaveStatus(user.uid, leaveId, status);
                pushToast('Leave Updated', `Leave request has been ${status}.`);
              }}
            />
          ) : activeView === 'settings' ? (
            <SettingsPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              onSaveBillingDefaults={handleSaveWorkspaceProfile}
            />
          ) : activeView === 'raise-issue' ? (
            <RaiseIssuePage
              companyName={data.profile.companyName}
              supportThreads={data.supportThreads}
              onCreateSupportTicket={handleCreateSupportTicket}
              onSendSupportMessage={handleSendSupportMessage}
            />
          ) : activeView === 'profile' ? (
            isOwner ? (
              <ProfilePage
                profile={data.profile}
                businessConfig={businessConfig}
                totalCustomers={data.customers.length}
                totalTeamMembers={data.team.length}
                totalInventoryItems={data.inventory.length}
                onSaveProfile={handleSaveWorkspaceProfile}
              />
            ) : (
              <TeamMemberProfilePage
                profile={data.profile}
                member={data.team.find((member) => member.id === data.profile.linkedTeamMemberId) ?? null}
                businessConfig={businessConfig}
                salesInvoices={data.salesInvoices}
                financeEntries={data.financeEntries}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-brand-dark/50">
              Workspace intentionally cleared for layout redesign focus.
            </div>
          )}
        </main>
      </div>
      {requiresProfileSetup && activeView !== 'profile' ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-dark/45 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-setup-title"
        >
          <div className="w-full max-w-xl rounded-[32px] border border-brand-30 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
              <Building2 size={26} aria-hidden="true" />
            </div>
            <h2 id="profile-setup-title" className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark">
              Set up your business profile
            </h2>
            <p className="mt-3 text-base leading-7 text-brand-dark/70">
              Before using the dashboard, complete your business profile so PULA Biz can personalize the workspace, sidebar, billing details, and reports for your business.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate(dashboardHash('profile'))}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-10/20 transition hover:bg-brand-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-10/25 sm:w-auto"
            >
              Visit profile setup
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
      <ToastStack toasts={toasts} />
      <CustomerDrawer
        customer={selectedCustomer}
        team={data.team}
        businessConfig={businessConfig}
        open={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onStageChange={handleStageChange}
        onOwnerChange={handleOwnerChange}
        onTogglePinned={handleTogglePinned}
        onToggleFollowUp={handleToggleFollowUp}
        onAddNote={handleAddNote}
        onRequestArchive={(id) => setArchiveCandidateId(id)}
        onRequestDelete={(id) => setDeleteCandidateId(id)}
        onUpdateCustomer={handleUpdateCustomer}
      />
      <ConfirmDialog
        open={!!archiveCandidateId}
        title="Archive this workspace?"
        description="The customer will move out of the active dashboard and remain available in history."
        confirmLabel="Archive"
        onCancel={() => setArchiveCandidateId(null)}
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={!!deleteCandidateId}
        title="Delete this customer?"
        description="This will remove the active record and keep only a history entry."
        confirmLabel="Delete"
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={handleDeleteCustomer}
      />
      <AddCustomerModal 
        open={addCustomerOpen} 
        team={data.team} 
        businessConfig={businessConfig}
        onClose={() => setAddCustomerOpen(false)} 
        onSubmit={handleAddCustomer} 
      />
      <AddProjectModal 
        open={addProjectOpen} 
        team={data.team}
        businessConfig={businessConfig}
        onClose={() => setAddProjectOpen(false)} 
        onSubmit={handleAddProject} 
      />
      <AddTeamMemberModal 
        open={addTeamMemberOpen} 
        existingTeam={data.team} 
        businessConfig={businessConfig}
        onClose={() => setAddTeamMemberOpen(false)} 
        onSubmit={handleAddTeamMember} 
      />
      <TeamMemberDrawer
        member={selectedTeamMember}
        customers={data.customers}
        tasks={data.tasks}
        salesInvoices={data.salesInvoices}
        financeEntries={data.financeEntries}
        businessCompanyName={data.profile.companyName}
        businessProfile={data.profile}
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
        onProvisionLogin={handleProvisionExistingTeamMemberLogin}
        onSendPasswordReset={handleSendTeamMemberReset}
      />
      <ConfirmDialog
        open={!!deleteTeamCandidateId}
        title="Remove this team member?"
        description="Assignments will be safely moved to the remaining team so project ownership stays intact."
        confirmLabel="Remove member"
        onCancel={() => setDeleteTeamCandidateId(null)}
        onConfirm={handleDeleteTeamMember}
      />
      <AIBusinessAssistant
        data={data}
        businessConfig={businessConfig}
        canWrite={isOwner}
        open={aivaOpen}
        onClose={() => setAivaOpen(false)}
        onAddInventoryItem={handleAddInventoryItem}
        onUpdateInventoryItem={handleUpdateInventoryItem}
        onDeleteInventoryItem={handleDeleteInventoryItem}
      />
    </div>
  );
};
