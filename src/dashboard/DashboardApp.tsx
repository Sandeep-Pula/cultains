import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { authService } from '../lib/authService';
import { dashboardService } from './services/dashboardService';
import { getBusinessConfig } from './businessConfig';
import { dashboardHash, getStageProgress, parseDashboardView } from './utils';
import type {
  BusinessType,
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
  TeamMember,
  ToastItem,
} from './types';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewPage } from './pages/OverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { TeamPage } from './pages/TeamPage';
import { InventoryPage } from './pages/InventoryPage';
import { BarcodeDeskPage } from './pages/BarcodeDeskPage';
import { BillingPage } from './pages/BillingPage';
import { CrmPage } from './pages/CrmPage';
import { AIToolsPage } from './pages/AIToolsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerDrawer } from './components/CustomerDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastStack } from './components/ToastStack';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AddProjectModal } from './components/AddProjectModal';
import { AddTeamMemberModal } from './components/AddTeamMemberModal';
import { TeamMemberDrawer } from './components/TeamMemberDrawer';
import { OperationsPage } from './pages/OperationsPage';

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
  const businessConfig = getBusinessConfig(data?.profile.businessType ?? 'general_business');

  const handleMutationError = (nextError: unknown, fallbackMessage: string) => {
    console.error(nextError);
    const message = nextError instanceof Error ? nextError.message : fallbackMessage;
    setSyncIssue(message);
    pushToast('Action failed', message);
  };

  const selectedCustomer = data?.customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedTeamMember = data?.team.find((member) => member.id === selectedTeamMemberId) ?? null;

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

  const handleArchive = async () => {
    if (!archiveCandidateId || !user || !data) return;
    const customer = data.customers.find((item) => item.id === archiveCandidateId);
    if (!customer) return;

    try {
      await dashboardService.archiveCustomer(user.uid, customer, data.userName);
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
      await dashboardService.addInventoryItem(user.uid, payload);
      pushToast('Inventory item added', `${payload.name} is now available in your stock workspace.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this inventory item.');
    }
  };

  const handleUpdateInventoryItem = async (itemId: string, patch: Partial<InventoryItem>) => {
    if (!user) return;

    try {
      await dashboardService.updateInventoryItem(user.uid, itemId, patch);
      pushToast('Inventory updated', 'The stock record was saved successfully.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update this inventory item.');
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    if (!user) return;

    try {
      await dashboardService.deleteInventoryItem(user.uid, itemId);
      pushToast('Inventory item deleted', 'The stock record has been removed from your workspace.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this inventory item.');
    }
  };

  const handleAddFinanceEntry = async (
    payload: Pick<FinanceEntry, 'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'projectTitle' | 'notes'>,
  ) => {
    if (!user) return;

    try {
      await dashboardService.addFinanceEntry(user.uid, payload);
      pushToast('Finance entry added', `${payload.title} was added to the company ledger.`);
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to create this finance entry.');
    }
  };

  const handleUpdateFinanceEntry = async (entryId: string, patch: Partial<FinanceEntry>) => {
    if (!user) return;

    try {
      await dashboardService.updateFinanceEntry(user.uid, entryId, patch);
      pushToast('Finance entry updated');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update this finance entry.');
    }
  };

  const handleDeleteFinanceEntry = async (entryId: string) => {
    if (!user) return;

    try {
      await dashboardService.deleteFinanceEntry(user.uid, entryId);
      pushToast('Finance entry deleted');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to delete this finance entry.');
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
  }) => {
    if (!user) return;

    try {
      await dashboardService.updateWorkspaceProfile(user.uid, profile);
      pushToast('Profile updated', 'Your company and workspace details were saved.');
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to update your profile.');
    }
  };

  const handleFinalizeBarcodeSale = async (payload: {
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
      const result = await dashboardService.completeBarcodeSale(user.uid, payload);
      pushToast('Invoice created', `${result.invoiceNumber} is ready to print.`);
      return result;
    } catch (nextError) {
      handleMutationError(nextError, 'Unable to finalize this sale.');
      throw nextError;
    }
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
      <Sidebar
        activeView={activeView}
        companyName={data.profile.companyName}
        workspaceLogoUrl={data.profile.workspaceLogoUrl}
        businessConfig={businessConfig}
        visibleViews={data.profile.sidebarViews}
        onNavigate={(view) => handleNavigate(dashboardHash(view))}
        onSaveViews={async (sidebarViews) => {
          if (!user) return;
          try {
            await dashboardService.updateWorkspaceProfile(user.uid, {
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
            });
            pushToast('Sidebar updated', 'Your sidebar shortcuts were saved.');
          } catch (nextError) {
            handleMutationError(nextError, 'Unable to save sidebar changes.');
          }
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Topbar
          activeView={activeView}
          businessConfig={businessConfig}
          search={filters.search}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 sm:p-6">
          {syncIssue ? (
            <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="font-semibold">Cloud sync needs attention</div>
              <div className="mt-1 text-amber-800/90">
                {syncIssue}
              </div>
            </div>
          ) : null}
          {activeView === 'overview' ? (
            <OverviewPage
              data={data}
              businessConfig={businessConfig}
              onOpenCustomer={handleOpenCustomer}
              onNavigate={handleNavigate}
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
              businessConfig={businessConfig}
              onOpenCustomer={handleOpenCustomer}
              onOpenMember={handleOpenTeamMember}
              onAddMember={() => setAddTeamMemberOpen(true)}
            />
          ) : activeView === 'inventory' ? (
            <InventoryPage
              inventory={data.inventory}
              customers={data.customers}
              businessConfig={businessConfig}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
            />
          ) : activeView === 'barcode-desk' ? (
            <BarcodeDeskPage
              companyName={data.profile.companyName}
              businessProfile={data.profile}
              billedBy={data.profile.userName}
              inventory={data.inventory}
              salesInvoices={data.salesInvoices}
              onFinalizeSale={handleFinalizeBarcodeSale}
            />
          ) : activeView === 'billing' ? (
            <BillingPage
              customers={data.customers}
              inventory={data.inventory}
              financeEntries={data.financeEntries}
              businessConfig={businessConfig}
              onAddEntry={handleAddFinanceEntry}
              onUpdateEntry={handleUpdateFinanceEntry}
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
              customers={data.customers}
              team={data.team}
              businessConfig={businessConfig}
              onOpenCustomer={handleOpenCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              actorName={data.userName}
            />
          ) : activeView === 'ai-tools' ? (
            <AIToolsPage businessConfig={businessConfig} />
          ) : activeView === 'settings' ? (
            <SettingsPage
              businessConfig={businessConfig}
              companyName={data.profile.companyName}
              userName={data.profile.userName}
              onNavigate={handleNavigate}
            />
          ) : activeView === 'profile' ? (
            <ProfilePage
              profile={data.profile}
              businessConfig={businessConfig}
              totalCustomers={data.customers.length}
              totalTeamMembers={data.team.length}
              totalInventoryItems={data.inventory.length}
              onSaveProfile={handleSaveWorkspaceProfile}
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
      <ConfirmDialog
        open={!!deleteTeamCandidateId}
        title="Remove this team member?"
        description="Assignments will be safely moved to the remaining team so project ownership stays intact."
        confirmLabel="Remove member"
        onCancel={() => setDeleteTeamCandidateId(null)}
        onConfirm={handleDeleteTeamMember}
      />
    </div>
  );
};
