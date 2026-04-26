import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  AccountType,
  ActivityItem,
  BillingDefaults,
  BusinessType,
  CommunicationLog,
  CustomerProject,
  DashboardView,
  DashboardData,
  DeletedCustomerRecord,
  FinanceEntry,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  InventoryProcurementStatus,
  NoteItem,
  PlatformBusinessAccount,
  RenderAsset,
  RenderRequest,
  SalesInvoice,
  SalesInvoiceLineItem,
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
  TaskItem,
  TeamMember,
  InventoryItem,
  WorkspaceProfile,
} from '../types';
import { defaultSidebarViews, filterDashboardViews, getInitials, getInventoryStatus, getStageProgress, recalculateTeamMetrics, stageProgressMap } from '../utils';
import { buildBusinessBarcodeKey, buildInventoryBarcodeValue, buildInvoiceNumber } from '../barcodeUtils';

type DashboardSnapshotListener = (data: DashboardData) => void;
type DashboardErrorListener = (error: Error) => void;
type SuperAdminSnapshotListener = (data: { businesses: PlatformBusinessAccount[]; supportThreads: SupportThread[] }) => void;

type UserProfileDoc = {
  userId: string;
  userName: string;
  companyName: string;
  accountType: AccountType;
  businessType: BusinessType;
  workspaceLogoUrl: string;
  email: string;
  phone: string;
  city: string;
  studioAddress: string;
  gstNumber: string;
  teamSize: string;
  website: string;
  subscriptionPlan: 'freemium';
  subscriptionStatus: 'active';
  renewalDate: string;
  recentlyViewedIds: string[];
  sidebarViews: DashboardView[];
  billingDefaults?: BillingDefaults;
  workspaceOwnerId?: string;
  linkedTeamMemberId?: string;
  createdAt: string;
  updatedAt: string;
};

const requireDb = () => {
  if (!db) {
    throw new Error('Firebase Firestore is not configured yet. Add the required VITE_FIREBASE_* variables and reload the app.');
  }

  return db;
};

type CustomerCreatePayload = Pick<
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
>;

type TeamMemberPayload = Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status' | 'allowedViews' | 'loginEnabled' | 'authUid' | 'loginEmail'>;

const usersCollection = (userId: string, collectionName: string) =>
  collection(requireDb(), 'users', userId, collectionName);

const userDoc = (userId: string) => doc(requireDb(), 'users', userId);
const rootUsersCollection = () => collection(requireDb(), 'users');
const customerDoc = (userId: string, customerId: string) => doc(requireDb(), 'users', userId, 'customers', customerId);
const teamMemberDoc = (userId: string, memberId: string) => doc(requireDb(), 'users', userId, 'teamMembers', memberId);
const taskDoc = (userId: string, taskId: string) => doc(requireDb(), 'users', userId, 'tasks', taskId);
const inventoryItemDoc = (userId: string, itemId: string) => doc(requireDb(), 'users', userId, 'inventoryItems', itemId);
const financeEntryDoc = (userId: string, entryId: string) => doc(requireDb(), 'users', userId, 'financeEntries', entryId);
const salesInvoiceDoc = (userId: string, invoiceId: string) => doc(requireDb(), 'users', userId, 'salesInvoices', invoiceId);
const deletedCustomerDoc = (userId: string, recordId: string) => doc(requireDb(), 'users', userId, 'deletedCustomers', recordId);
const supportThreadsCollection = () => collection(requireDb(), 'supportThreads');
const supportThreadDoc = (ticketId: string) => doc(requireDb(), 'supportThreads', ticketId);

const nowIso = () => new Date().toISOString();
const defaultBillingDefaults: BillingDefaults = {
  defaultTaxRate: 5,
  defaultPaymentStatus: 'paid',
  defaultPaymentMethod: 'cash',
  defaultInvoiceNotes: '',
};

const getUserName = (user: User, preferredName?: string) =>
  preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'User';

const getCompanyName = (user: User, preferredName?: string) => {
  const baseName = preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Workspace';
  return `${baseName} Workspace`;
};

const normalizeSidebarViews = (views?: DashboardView[]) => {
  const filtered = filterDashboardViews(views);
  const next = filtered.length ? [...filtered] : [...defaultSidebarViews];

  if (!next.includes('sales-overview')) {
    next.unshift('sales-overview');
  }

  if (!next.includes('overview')) {
    const overviewInsertIndex = next.includes('sales-overview') ? 1 : 0;
    next.splice(overviewInsertIndex, 0, 'overview');
  }

  return Array.from(new Set(next));
};

const buildWorkspaceProfile = (user: User, profile?: Partial<UserProfileDoc>): WorkspaceProfile => ({
  companyName: profile?.companyName?.trim() || getCompanyName(user),
  userName: profile?.userName?.trim() || getUserName(user),
  accountType: profile?.accountType || 'owner',
  businessType: profile?.businessType || 'general_business',
  workspaceLogoUrl: profile?.workspaceLogoUrl?.trim() || '',
  email: profile?.email?.trim() || user.email || '',
  phone: profile?.phone?.trim() || '',
  city: profile?.city?.trim() || '',
  studioAddress: profile?.studioAddress?.trim() || '',
  gstNumber: profile?.gstNumber?.trim() || '',
  teamSize: profile?.teamSize?.trim() || '',
  website: profile?.website?.trim() || '',
  subscriptionPlan: 'freemium',
  subscriptionStatus: 'active',
  renewalDate: profile?.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  sidebarViews: normalizeSidebarViews(profile?.sidebarViews),
  billingDefaults: {
    defaultTaxRate: Number(profile?.billingDefaults?.defaultTaxRate ?? defaultBillingDefaults.defaultTaxRate),
    defaultPaymentStatus: profile?.billingDefaults?.defaultPaymentStatus || defaultBillingDefaults.defaultPaymentStatus,
    defaultPaymentMethod: profile?.billingDefaults?.defaultPaymentMethod || defaultBillingDefaults.defaultPaymentMethod,
    defaultInvoiceNotes: profile?.billingDefaults?.defaultInvoiceNotes || defaultBillingDefaults.defaultInvoiceNotes,
  },
  workspaceOwnerId: profile?.workspaceOwnerId,
  linkedTeamMemberId: profile?.linkedTeamMemberId,
});

const emptyDashboardData = (user: User, profile?: Partial<UserProfileDoc>): DashboardData => ({
  companyName: profile?.companyName?.trim() || getCompanyName(user),
  userName: profile?.userName?.trim() || getUserName(user),
  profile: buildWorkspaceProfile(user, profile),
  team: [],
  inventory: [],
  financeEntries: [],
  salesInvoices: [],
  supportThreads: [],
  customers: [],
  deletedCustomers: [],
  tasks: [],
  recentlyViewedIds: profile?.recentlyViewedIds ?? [],
});

const normalizeNote = (value: Partial<NoteItem> | undefined): NoteItem => ({
  id: value?.id || crypto.randomUUID(),
  authorId: value?.authorId || '',
  authorName: value?.authorName || 'Unknown',
  createdAt: value?.createdAt || nowIso(),
  content: value?.content || '',
});

const normalizeActivity = (value: Partial<ActivityItem> | undefined): ActivityItem => ({
  id: value?.id || crypto.randomUUID(),
  type: value?.type || 'comment',
  title: value?.title || 'Activity updated',
  description: value?.description || '',
  createdAt: value?.createdAt || nowIso(),
  actorName: value?.actorName || 'System',
});

const normalizeCommunication = (value: Partial<CommunicationLog> | undefined): CommunicationLog => ({
  id: value?.id || crypto.randomUUID(),
  type: value?.type || 'comment',
  createdAt: value?.createdAt || nowIso(),
  actorName: value?.actorName || 'System',
  summary: value?.summary || '',
  outcome: value?.outcome || '',
});

const normalizeRender = (value: Partial<RenderAsset> | undefined): RenderAsset => ({
  id: value?.id || crypto.randomUUID(),
  name: value?.name || 'Untitled render',
  type: value?.type || 'combined',
  version: value?.version || 'v1',
  createdAt: value?.createdAt || nowIso(),
  imageUrl: value?.imageUrl || '',
  shared: value?.shared ?? false,
  approvalStatus: value?.approvalStatus || 'draft',
  roomLabel: value?.roomLabel || 'Room',
  wallpaperCode: value?.wallpaperCode,
  curtainCode: value?.curtainCode,
  materialCodeSummary: value?.materialCodeSummary ?? [],
  shareLink: value?.shareLink || '',
  shareCount: value?.shareCount ?? 0,
  comparisonRenderId: value?.comparisonRenderId,
});

const normalizeRenderRequest = (value: Partial<RenderRequest> | undefined): RenderRequest => ({
  id: value?.id || crypto.randomUUID(),
  title: value?.title || 'New render request',
  requestedAt: value?.requestedAt || nowIso(),
  status: value?.status || 'queued',
  roomLabel: value?.roomLabel || 'Room',
  ownerId: value?.ownerId || '',
});

const normalizeCustomer = (
  customerId: string,
  value: Partial<CustomerProject> | undefined,
): CustomerProject => {
  const timestamp = nowIso();

  return {
    id: customerId,
    customerName: value?.customerName || '',
    company: value?.company,
    phone: value?.phone || '',
    email: value?.email || '',
    address: value?.address || '',
    location: value?.location || '',
    notes: value?.notes || '',
    title: value?.title || 'Untitled project',
    projectType: value?.projectType || 'living_room',
    siteStatus: value?.siteStatus || 'ready',
    stage: value?.stage || 'inquiry',
    progress: value?.progress ?? getStageProgress(value?.stage || 'inquiry'),
    startDate: value?.startDate || timestamp,
    targetDate: value?.targetDate || timestamp,
    lastUpdated: value?.lastUpdated || timestamp,
    renderCount: value?.renderCount ?? (value?.renders?.length ?? 0),
    nextFollowUpAt: value?.nextFollowUpAt || timestamp,
    lastContactedAt: value?.lastContactedAt || timestamp,
    dealProbability: value?.dealProbability ?? 0,
    ownerId: value?.ownerId || '',
    leadDesignerId: value?.leadDesignerId || '',
    fieldStaffId: value?.fieldStaffId || '',
    assignedTeamIds: value?.assignedTeamIds ?? [],
    priority: value?.priority || 'medium',
    pinned: value?.pinned ?? false,
    needsFollowUp: value?.needsFollowUp ?? false,
    renderPending: value?.renderPending ?? false,
    siteVisitScheduledAt: value?.siteVisitScheduledAt,
    activityScore: value?.activityScore ?? 0,
    wallpaperCode: value?.wallpaperCode,
    curtainCode: value?.curtainCode,
    communicationLog: (value?.communicationLog ?? []).map(normalizeCommunication),
    quote: {
      estimatedValue: value?.quote?.estimatedValue ?? 0,
      quoteValue: value?.quote?.quoteValue ?? 0,
      quoteStatus: value?.quote?.quoteStatus || 'draft',
      paymentStage: value?.quote?.paymentStage || 'not_started',
      advanceReceived: value?.quote?.advanceReceived ?? 0,
    },
    renders: (value?.renders ?? []).map(normalizeRender),
    renderQueue: (value?.renderQueue ?? []).map(normalizeRenderRequest),
    activities: (value?.activities ?? []).map(normalizeActivity),
    internalNotes: (value?.internalNotes ?? []).map(normalizeNote),
  };
};

const normalizeTeamMember = (memberId: string, value: Partial<TeamMember> | undefined): TeamMember => ({
  id: memberId,
  name: value?.name || '',
  role: value?.role || 'Operations Coordinator',
  email: value?.email || '',
  phone: value?.phone || '',
  avatar: value?.avatar || getInitials(value?.name || 'TM'),
  activeProjects: value?.activeProjects ?? 0,
  workload: value?.workload ?? 0,
  status: value?.status || 'offline',
  allowedViews: filterDashboardViews(value?.allowedViews),
  loginEnabled: value?.loginEnabled ?? false,
  authUid: value?.authUid,
  loginEmail: value?.loginEmail || value?.email || '',
});

const normalizeTask = (taskId: string, value: Partial<TaskItem> | undefined): TaskItem => ({
  id: taskId,
  title: value?.title || '',
  dueAt: value?.dueAt || nowIso(),
  customerId: value?.customerId || '',
  ownerId: value?.ownerId || '',
  priority: value?.priority || 'medium',
  done: value?.done ?? false,
});

const normalizeInventoryItem = (itemId: string, value: Partial<InventoryItem> | undefined): InventoryItem => ({
  id: itemId,
  name: value?.name || 'Unknown Item',
  sku: value?.sku || `SKU-${itemId.slice(0, 4).toUpperCase()}`,
  itemCode: value?.itemCode || value?.sku || `ITEM-${itemId.slice(0, 4).toUpperCase()}`,
  barcodeValue: value?.barcodeValue || '',
  barcodeBusinessKey: value?.barcodeBusinessKey || '',
  category: value?.category || 'Hardware & Tools',
  unit: value?.unit || 'pcs',
  currentStock: value?.currentStock ?? 0,
  reservedStock: value?.reservedStock ?? 0,
  minimumStock: value?.minimumStock ?? 5,
  reorderQuantity: value?.reorderQuantity ?? Math.max((value?.minimumStock ?? 5) * 2, 10),
  status: value?.status || getInventoryStatus(value?.currentStock ?? 0, value?.minimumStock ?? 5, value?.condition || 'new'),
  condition: value?.condition || 'new',
  costPerUnit: value?.costPerUnit ?? 0,
  sellingPrice: value?.sellingPrice ?? value?.costPerUnit ?? 0,
  storageLocation: value?.storageLocation || 'Main store',
  supplierName: value?.supplierName || '',
  supplierPhone: value?.supplierPhone || '',
  procurementStatus: value?.procurementStatus || 'none',
  lastRestockedAt: value?.lastRestockedAt || nowIso(),
  lastIssuedAt: value?.lastIssuedAt,
  lastAuditAt: value?.lastAuditAt,
  assignedTeamIds: value?.assignedTeamIds || [],
  assignedProjectIds: value?.assignedProjectIds || [],
  clearanceReason: value?.clearanceReason || '',
  notes: value?.notes || '',
});

const normalizeDeletedCustomer = (
  recordId: string,
  value: Partial<DeletedCustomerRecord> | undefined,
): DeletedCustomerRecord => ({
  id: recordId,
  customerName: value?.customerName || '',
  title: value?.title || '',
  location: value?.location || '',
  deletedAt: value?.deletedAt || nowIso(),
  deletedBy: value?.deletedBy || 'Unknown',
  lastStage: value?.lastStage || 'inquiry',
});

const normalizeFinanceEntry = (entryId: string, value: Partial<FinanceEntry> | undefined): FinanceEntry => ({
  id: entryId,
  title: value?.title || 'Untitled entry',
  kind: value?.kind || 'expense',
  category: value?.category || 'operations',
  amount: value?.amount ?? 0,
  status: value?.status || 'pending',
  dueAt: value?.dueAt || nowIso(),
  createdAt: value?.createdAt || nowIso(),
  customerId: value?.customerId,
  projectTitle: value?.projectTitle,
  sourceInvoiceId: value?.sourceInvoiceId,
  employeeMemberId: value?.employeeMemberId,
  employeeName: value?.employeeName,
  paycheckNumber: value?.paycheckNumber,
  payPeriodLabel: value?.payPeriodLabel,
  paymentMethod: value?.paymentMethod,
  issuedBy: value?.issuedBy,
  notes: value?.notes || '',
});

const normalizeSalesInvoiceLine = (value: Partial<SalesInvoiceLineItem> | undefined): SalesInvoiceLineItem => ({
  inventoryItemId: value?.inventoryItemId || '',
  barcodeValue: value?.barcodeValue || '',
  itemName: value?.itemName || 'Unknown item',
  sku: value?.sku || '',
  quantity: value?.quantity ?? 1,
  unitPrice: value?.unitPrice ?? 0,
  lineSubtotal: value?.lineSubtotal ?? 0,
});

const normalizeSalesInvoice = (invoiceId: string, value: Partial<SalesInvoice> | undefined): SalesInvoice => ({
  id: invoiceId,
  invoiceNumber: value?.invoiceNumber || `INV-${invoiceId.slice(0, 8).toUpperCase()}`,
  status: value?.status || 'finalized',
  businessBarcodeKey: value?.businessBarcodeKey || '',
  customerName: value?.customerName || 'Walk-in customer',
  paymentStatus: value?.paymentStatus || 'pending',
  paymentMethod: value?.paymentMethod || 'cash',
  lineItems: (value?.lineItems ?? []).map(normalizeSalesInvoiceLine),
  subtotal: value?.subtotal ?? 0,
  taxRate: value?.taxRate ?? 0,
  taxAmount: value?.taxAmount ?? 0,
  totalAmount: value?.totalAmount ?? 0,
  notes: value?.notes || '',
  billedBy: value?.billedBy || 'System',
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
});

const normalizeSupportMessage = (value: Partial<SupportMessage> | undefined): SupportMessage => ({
  id: value?.id || crypto.randomUUID(),
  senderType: value?.senderType || 'business',
  senderName: value?.senderName || 'Unknown sender',
  senderEmail: value?.senderEmail || '',
  body: value?.body || '',
  createdAt: value?.createdAt || nowIso(),
});

const normalizeSupportThread = (threadId: string, value: Partial<SupportThread> | undefined): SupportThread => ({
  id: threadId,
  ownerUserId: value?.ownerUserId || threadId,
  ticketNumber: value?.ticketNumber || `TKT-${threadId.slice(0, 6).toUpperCase()}`,
  businessName: value?.businessName || 'Unknown business',
  ownerName: value?.ownerName || 'Unknown owner',
  ownerEmail: value?.ownerEmail || '',
  subject: value?.subject || 'General support',
  category: value?.category || 'general',
  priority: value?.priority || 'medium',
  status: value?.status || 'open',
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || nowIso(),
  closedAt: value?.closedAt,
  assignedAdminName: value?.assignedAdminName,
  assignedAdminEmail: value?.assignedAdminEmail,
  messages: (value?.messages ?? []).map(normalizeSupportMessage),
  unreadForBusiness: value?.unreadForBusiness ?? false,
  unreadForAdmin: value?.unreadForAdmin ?? false,
});

const normalizePlatformBusinessAccount = (userId: string, value: Partial<UserProfileDoc> | undefined): PlatformBusinessAccount => ({
  userId,
  companyName: value?.companyName?.trim() || 'Untitled workspace',
  ownerName: value?.userName?.trim() || 'Unknown owner',
  email: value?.email?.trim() || '',
  phone: value?.phone?.trim() || '',
  businessType: value?.businessType || 'general_business',
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || nowIso(),
});

const buildCustomerPayload = (
  payload: CustomerCreatePayload,
  actorName: string,
): Omit<CustomerProject, 'id'> => {
  const now = nowIso();
  const nextFollowUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const targetDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
  const assignedTeamIds = Array.from(
    new Set([payload.ownerId, payload.leadDesignerId, payload.fieldStaffId].filter(Boolean)),
  );

  return {
    customerName: payload.customerName.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    address: payload.address.trim(),
    location: payload.location.trim(),
    notes: payload.notes.trim(),
    title: payload.title.trim(),
    projectType: payload.projectType,
    siteStatus: payload.siteStatus,
    stage: 'inquiry',
    progress: stageProgressMap.inquiry,
    startDate: now,
    targetDate,
    lastUpdated: now,
    renderCount: 0,
    nextFollowUpAt,
    lastContactedAt: now,
    dealProbability: 25,
    ownerId: payload.ownerId || '',
    leadDesignerId: payload.leadDesignerId || '',
    fieldStaffId: payload.fieldStaffId || '',
    assignedTeamIds,
    priority: 'medium',
    pinned: false,
    needsFollowUp: true,
    renderPending: false,
    activityScore: 12,
    communicationLog: [
      {
        id: crypto.randomUUID(),
        type: 'comment',
        createdAt: now,
        actorName,
        summary: 'Customer created from dashboard',
        outcome: 'Ready for first room upload and project intake.',
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
        description: `${payload.customerName.trim()} was added to the dashboard.`,
        createdAt: now,
        actorName,
      },
    ],
    internalNotes: [],
  };
};

export const dashboardService = {
  getEmptyDashboardData(user: User, profile?: Partial<UserProfileDoc>) {
    return emptyDashboardData(user, profile);
  },

  async getExistingUserProfile(userId: string) {
    const snapshot = await getDoc(userDoc(userId));
    return snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
  },

  async getTeamMemberAccess(ownerUserId: string, teamMemberId: string) {
    const snapshot = await getDoc(teamMemberDoc(ownerUserId, teamMemberId));
    return snapshot.exists() ? normalizeTeamMember(snapshot.id, snapshot.data() as Partial<TeamMember>) : null;
  },

  async ensureSuperAdminProfile(user: User) {
    const ref = userDoc(user.uid);
    const timestamp = nowIso();
    const existing = await getDoc(ref);
    const nextProfile: UserProfileDoc = {
      userId: user.uid,
      userName: user.displayName?.trim() || 'AIvyapari Super Admin',
      companyName: 'AIvyapari Platform',
      accountType: 'super_admin',
      businessType: 'general_business',
      workspaceLogoUrl: '',
      email: user.email || '',
      phone: '',
      city: '',
      studioAddress: '',
      gstNumber: '',
      teamSize: '',
      website: 'https://aivyapari.com',
      subscriptionPlan: 'freemium',
      subscriptionStatus: 'active',
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      recentlyViewedIds: [],
      sidebarViews: [],
      billingDefaults: defaultBillingDefaults,
      workspaceOwnerId: undefined,
      linkedTeamMemberId: undefined,
      createdAt: existing.exists() ? String(existing.data().createdAt || timestamp) : timestamp,
      updatedAt: timestamp,
    };

    await setDoc(ref, nextProfile, { merge: true });
    return nextProfile;
  },

  async ensureUserProfile(user: User, preferredName?: string) {
    const ref = userDoc(user.uid);
    const timestamp = nowIso();
    const fallbackProfile: UserProfileDoc = {
      userId: user.uid,
      userName: getUserName(user, preferredName),
      companyName: getCompanyName(user, preferredName),
      accountType: 'owner',
      businessType: 'general_business',
      workspaceLogoUrl: '',
      email: user.email || '',
      phone: '',
      city: '',
      studioAddress: '',
      gstNumber: '',
      teamSize: '',
      website: '',
      subscriptionPlan: 'freemium',
      subscriptionStatus: 'active',
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recentlyViewedIds: [],
      sidebarViews: defaultSidebarViews,
      billingDefaults: defaultBillingDefaults,
      workspaceOwnerId: undefined,
      linkedTeamMemberId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      const existing = await getDoc(ref);

      if (!existing.exists()) {
        await setDoc(ref, fallbackProfile, { merge: true });
        return fallbackProfile;
      }

      const data = existing.data() as Partial<UserProfileDoc>;
      const nextProfile: UserProfileDoc = {
        userId: user.uid,
        userName: data.userName?.trim() || fallbackProfile.userName,
        companyName: data.companyName?.trim() || fallbackProfile.companyName,
        accountType: data.accountType || fallbackProfile.accountType,
        businessType: data.businessType || fallbackProfile.businessType,
        workspaceLogoUrl: data.workspaceLogoUrl?.trim() || fallbackProfile.workspaceLogoUrl,
        email: data.email?.trim() || fallbackProfile.email,
        phone: data.phone?.trim() || fallbackProfile.phone,
        city: data.city?.trim() || fallbackProfile.city,
        studioAddress: data.studioAddress?.trim() || fallbackProfile.studioAddress,
        gstNumber: data.gstNumber?.trim() || fallbackProfile.gstNumber,
        teamSize: data.teamSize?.trim() || fallbackProfile.teamSize,
        website: data.website?.trim() || fallbackProfile.website,
        subscriptionPlan: 'freemium',
        subscriptionStatus: 'active',
        renewalDate: data.renewalDate || fallbackProfile.renewalDate,
        recentlyViewedIds: data.recentlyViewedIds ?? [],
        sidebarViews: normalizeSidebarViews(data.sidebarViews ?? fallbackProfile.sidebarViews),
        billingDefaults: {
          defaultTaxRate: Number(data.billingDefaults?.defaultTaxRate ?? defaultBillingDefaults.defaultTaxRate),
          defaultPaymentStatus: data.billingDefaults?.defaultPaymentStatus || defaultBillingDefaults.defaultPaymentStatus,
          defaultPaymentMethod: data.billingDefaults?.defaultPaymentMethod || defaultBillingDefaults.defaultPaymentMethod,
          defaultInvoiceNotes: data.billingDefaults?.defaultInvoiceNotes || defaultBillingDefaults.defaultInvoiceNotes,
        },
        workspaceOwnerId: data.workspaceOwnerId,
        linkedTeamMemberId: data.linkedTeamMemberId,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp,
      };

      await setDoc(ref, nextProfile, { merge: true });
      return nextProfile;
    } catch {
      return fallbackProfile;
    }
  },

  subscribeToDashboardData(user: User, onData: DashboardSnapshotListener, onError: DashboardErrorListener) {
    let viewerProfile: UserProfileDoc | null = null;
    let workspaceProfile: UserProfileDoc | null = null;
    let accessMember: TeamMember | null = null;
    let customers: CustomerProject[] = [];
    let team: TeamMember[] = [];
    let tasks: TaskItem[] = [];
    let deletedCustomers: DeletedCustomerRecord[] = [];
    let inventory: InventoryItem[] = [];
    let financeEntries: FinanceEntry[] = [];
    let salesInvoices: SalesInvoice[] = [];
    let supportThreads: SupportThread[] = [];
    let workspaceKey = '';
    let teamAccessKey = '';
    let workspaceUnsubscribers: Array<() => void> = [];

    const emit = () => {
      const sourceProfile = workspaceProfile ?? viewerProfile;
      const base = emptyDashboardData(user, sourceProfile ?? undefined);
      const isTeamMember = viewerProfile?.accountType === 'team_member';
      const isSuperAdmin = viewerProfile?.accountType === 'super_admin';
      if (isSuperAdmin) {
        onData({
          ...base,
          companyName: viewerProfile?.companyName?.trim() || base.companyName,
          userName: viewerProfile?.userName?.trim() || base.userName,
          profile: buildWorkspaceProfile(user, viewerProfile ?? undefined),
          supportThreads: [],
        });
        return;
      }
      const visibleViews = isTeamMember
        ? filterDashboardViews(accessMember?.allowedViews ?? viewerProfile?.sidebarViews)
        : normalizeSidebarViews(sourceProfile?.sidebarViews ?? viewerProfile?.sidebarViews);
      const viewerName = isTeamMember
        ? accessMember?.name || viewerProfile?.userName?.trim() || base.userName
        : viewerProfile?.userName?.trim() || sourceProfile?.userName?.trim() || base.userName;
      onData({
        ...base,
        companyName: sourceProfile?.companyName?.trim() || base.companyName,
        userName: viewerName,
        profile: {
          ...base.profile,
          companyName: sourceProfile?.companyName?.trim() || base.profile.companyName,
          userName: viewerName,
          accountType: viewerProfile?.accountType || base.profile.accountType,
          email: isTeamMember
            ? accessMember?.loginEmail || viewerProfile?.email?.trim() || base.profile.email
            : sourceProfile?.email?.trim() || base.profile.email,
          phone: isTeamMember
            ? accessMember?.phone || viewerProfile?.phone?.trim() || base.profile.phone
            : sourceProfile?.phone?.trim() || base.profile.phone,
          sidebarViews: visibleViews,
          workspaceOwnerId: viewerProfile?.workspaceOwnerId,
          linkedTeamMemberId: viewerProfile?.linkedTeamMemberId,
        },
        customers,
        team: recalculateTeamMetrics(team, customers, tasks),
        inventory,
        financeEntries,
        salesInvoices,
        supportThreads,
        tasks,
        deletedCustomers,
        recentlyViewedIds: viewerProfile?.recentlyViewedIds ?? [],
      });
    };

    const resetWorkspaceState = () => {
      workspaceProfile = null;
      accessMember = null;
      customers = [];
      team = [];
      tasks = [];
      deletedCustomers = [];
      inventory = [];
      financeEntries = [];
      salesInvoices = [];
      supportThreads = [];
    };

    const subscribeToWorkspace = (ownerUserId: string, linkedTeamMemberId?: string) => {
      workspaceUnsubscribers.forEach((unsubscribe) => unsubscribe());
      workspaceUnsubscribers = [];
      resetWorkspaceState();

      workspaceUnsubscribers = [
        onSnapshot(
          userDoc(ownerUserId),
          (snapshot) => {
            workspaceProfile = snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'customers'),
          (snapshot) => {
            customers = snapshot.docs
              .map((item) => normalizeCustomer(item.id, item.data() as Partial<CustomerProject>))
              .sort((left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'teamMembers'),
          (snapshot) => {
            team = snapshot.docs
              .map((item) => normalizeTeamMember(item.id, item.data() as Partial<TeamMember>))
              .sort((left, right) => left.name.localeCompare(right.name));
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'tasks'),
          (snapshot) => {
            tasks = snapshot.docs
              .map((item) => normalizeTask(item.id, item.data() as Partial<TaskItem>))
              .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'deletedCustomers'),
          (snapshot) => {
            deletedCustomers = snapshot.docs
              .map((item) => normalizeDeletedCustomer(item.id, item.data() as Partial<DeletedCustomerRecord>))
              .sort((left, right) => new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'inventoryItems'),
          (snapshot) => {
            inventory = snapshot.docs
              .map((item) => {
                const normalized = normalizeInventoryItem(item.id, item.data() as Partial<InventoryItem>);
                const sku = normalized.sku;
                const itemCode = normalized.itemCode;
                return {
                  ...normalized,
                  barcodeBusinessKey: normalized.barcodeBusinessKey || buildBusinessBarcodeKey(ownerUserId),
                  barcodeValue: normalized.barcodeValue || buildInventoryBarcodeValue(ownerUserId, item.id, sku, itemCode),
                };
              })
              .sort((left, right) => left.name.localeCompare(right.name));
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'financeEntries'),
          (snapshot) => {
            financeEntries = snapshot.docs
              .map((item) => normalizeFinanceEntry(item.id, item.data() as Partial<FinanceEntry>))
              .sort((left, right) => new Date(right.dueAt).getTime() - new Date(left.dueAt).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'salesInvoices'),
          (snapshot) => {
            salesInvoices = snapshot.docs
              .map((item) => normalizeSalesInvoice(item.id, item.data() as Partial<SalesInvoice>))
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          query(supportThreadsCollection(), where('ownerUserId', '==', ownerUserId)),
          (snapshot) => {
            supportThreads = snapshot.docs
              .map((item) => normalizeSupportThread(item.id, item.data() as Partial<SupportThread>))
              .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
            emit();
          },
          (error) => onError(error),
        ),
      ];

      if (linkedTeamMemberId) {
        workspaceUnsubscribers.push(
          onSnapshot(
            teamMemberDoc(ownerUserId, linkedTeamMemberId),
            (snapshot) => {
              accessMember = snapshot.exists() ? normalizeTeamMember(snapshot.id, snapshot.data() as Partial<TeamMember>) : null;
              emit();
            },
            (error) => onError(error),
          ),
        );
      }
    };

    const unsubscribers = [
      onSnapshot(
        userDoc(user.uid),
        (snapshot) => {
          viewerProfile = snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
          const nextWorkspaceKey =
            viewerProfile?.accountType === 'team_member' && viewerProfile.workspaceOwnerId
              ? viewerProfile.workspaceOwnerId
              : user.uid;
          const nextTeamAccessKey =
            viewerProfile?.accountType === 'team_member' ? viewerProfile.linkedTeamMemberId || '' : '';

          if (nextWorkspaceKey !== workspaceKey || nextTeamAccessKey !== teamAccessKey) {
            workspaceKey = nextWorkspaceKey;
            teamAccessKey = nextTeamAccessKey;
            subscribeToWorkspace(workspaceKey, nextTeamAccessKey || undefined);
          }

          emit();
        },
        (error) => onError(error),
      ),
    ];

    return () => {
      workspaceUnsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  },

  async updateRecentlyViewed(userId: string, recentlyViewedIds: string[]) {
    await setDoc(
      userDoc(userId),
      {
        userId,
        recentlyViewedIds,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  },

  async updateWorkspaceProfile(
    userId: string,
    profile: Pick<
      WorkspaceProfile,
      | 'companyName'
      | 'userName'
      | 'businessType'
      | 'workspaceLogoUrl'
      | 'email'
      | 'phone'
      | 'city'
      | 'studioAddress'
      | 'gstNumber'
      | 'teamSize'
      | 'website'
      | 'sidebarViews'
      | 'billingDefaults'
    >,
  ) {
    await setDoc(
      userDoc(userId),
      {
        userId,
        ...profile,
        subscriptionPlan: 'freemium',
        subscriptionStatus: 'active',
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  },

  subscribeToSuperAdminConsole(onData: SuperAdminSnapshotListener, onError: DashboardErrorListener) {
    let businesses: PlatformBusinessAccount[] = [];
    let supportThreads: SupportThread[] = [];

    const emit = () => {
      onData({
        businesses,
        supportThreads,
      });
    };

    const unsubscribers = [
      onSnapshot(
        rootUsersCollection(),
        (snapshot) => {
          businesses = snapshot.docs
            .map((item) => ({ id: item.id, data: item.data() as Partial<UserProfileDoc> }))
            .filter((item) => item.data.accountType === 'owner')
            .map((item) => normalizePlatformBusinessAccount(item.id, item.data))
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        supportThreadsCollection(),
        (snapshot) => {
          supportThreads = snapshot.docs
            .map((item) => normalizeSupportThread(item.id, item.data() as Partial<SupportThread>))
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
          emit();
        },
        (error) => onError(error),
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  },

  async createBusinessSupportTicket(
    ownerUserId: string,
    profile: WorkspaceProfile,
    payload: { subject: string; body: string; category: SupportThread['category']; priority: SupportThread['priority'] },
  ) {
    const ref = doc(supportThreadsCollection());
    const timestamp = nowIso();
    const nextMessage = normalizeSupportMessage({
      senderType: 'business',
      senderName: profile.userName,
      senderEmail: profile.email,
      body: payload.body.trim(),
      createdAt: timestamp,
    });
    const ticketNumber = `TKT-${new Date().getFullYear()}-${ref.id.slice(0, 6).toUpperCase()}`;

    await setDoc(
      ref,
      {
        ticketNumber,
        ownerUserId,
        businessName: profile.companyName,
        ownerName: profile.userName,
        ownerEmail: profile.email,
        subject: payload.subject.trim() || 'General support',
        category: payload.category,
        priority: payload.priority,
        status: 'new' as SupportThreadStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [nextMessage],
        unreadForBusiness: false,
        unreadForAdmin: true,
      },
      { merge: true },
    );
    return ref.id;
  },

  async replyToSupportTicketAsBusiness(
    ticketId: string,
    sender: { name: string; email: string },
    body: string,
  ) {
    const ref = supportThreadDoc(ticketId);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('This support ticket no longer exists.');
    }

    const existingThread = normalizeSupportThread(existing.id, existing.data() as Partial<SupportThread>);
    const timestamp = nowIso();
    const nextMessage = normalizeSupportMessage({
      senderType: 'business',
      senderName: sender.name,
      senderEmail: sender.email,
      body: body.trim(),
      createdAt: timestamp,
    });

    await setDoc(
      ref,
      {
        ...existingThread,
        status: existingThread.status === 'resolved' || existingThread.status === 'closed' ? 'waiting_on_admin' : 'waiting_on_admin',
        updatedAt: timestamp,
        messages: [...existingThread.messages, nextMessage],
        unreadForBusiness: false,
        unreadForAdmin: true,
      },
      { merge: true },
    );
  },

  async replyToSupportThreadAsAdmin(
    ticketId: string,
    sender: { name: string; email: string },
    body: string,
    status: SupportThreadStatus = 'waiting_on_business',
  ) {
    const ref = supportThreadDoc(ticketId);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('This support ticket no longer exists.');
    }

    const existingThread = normalizeSupportThread(existing.id, existing.data() as Partial<SupportThread>);
    const timestamp = nowIso();
    const nextMessage = normalizeSupportMessage({
      senderType: 'super_admin',
      senderName: sender.name,
      senderEmail: sender.email,
      body: body.trim(),
      createdAt: timestamp,
    });

    await setDoc(
      ref,
      {
        ...existingThread,
        status,
        updatedAt: timestamp,
        closedAt: status === 'closed' ? timestamp : existingThread.closedAt,
        assignedAdminName: sender.name,
        assignedAdminEmail: sender.email,
        messages: [...existingThread.messages, nextMessage],
        unreadForBusiness: true,
        unreadForAdmin: false,
      },
      { merge: true },
    );
  },

  async updateSupportThreadStatus(ticketId: string, status: SupportThreadStatus) {
    await setDoc(
      supportThreadDoc(ticketId),
      {
        status,
        updatedAt: nowIso(),
        closedAt: status === 'closed' ? nowIso() : null,
      },
      { merge: true },
    );
  },

  async addCustomer(user: User, payload: CustomerCreatePayload, actorName: string, workspaceUserId: string = user.uid) {
    const ref = doc(usersCollection(workspaceUserId, 'customers'));
    const timestamp = nowIso();
    await setDoc(ref, {
      ...buildCustomerPayload(payload, actorName),
      userId: workspaceUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return ref.id;
  },

  async updateCustomer(userId: string, customerId: string, patch: Partial<Omit<CustomerProject, 'id'>>) {
    const timestamp = nowIso();
    const nextPayload = {
      ...patch,
      lastUpdated: patch.lastUpdated || timestamp,
      updatedAt: timestamp,
      renderCount: patch.renders ? patch.renders.length : patch.renderCount,
    };

    Object.keys(nextPayload).forEach((key) => {
      if (nextPayload[key as keyof typeof nextPayload] === undefined) {
        delete nextPayload[key as keyof typeof nextPayload];
      }
    });

    await updateDoc(customerDoc(userId, customerId), nextPayload);
  },

  async archiveCustomer(userId: string, customer: CustomerProject, deletedBy: string) {
    const batch = writeBatch(requireDb());
    batch.set(deletedCustomerDoc(userId, customer.id), {
      userId,
      customerName: customer.customerName,
      title: customer.title,
      location: customer.location,
      deletedAt: nowIso(),
      deletedBy,
      lastStage: customer.stage,
    });
    batch.delete(customerDoc(userId, customer.id));
    await batch.commit();
  },

  async addTask(userId: string, title: string, dueAt: string, ownerId: string, customerId: string = '') {
    const ref = doc(usersCollection(userId, 'tasks'));
    const timestamp = nowIso();
    await setDoc(ref, {
      userId,
      title,
      dueAt,
      customerId,
      ownerId,
      priority: 'medium',
      done: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  async toggleTask(userId: string, task: TaskItem) {
    await updateDoc(taskDoc(userId, task.id), {
      done: !task.done,
      updatedAt: nowIso(),
    });
  },

  async addTeamMember(userId: string, payload: TeamMemberPayload) {
    const ref = doc(usersCollection(userId, 'teamMembers'));
    const timestamp = nowIso();
    await setDoc(ref, {
      userId,
      ...payload,
      allowedViews: filterDashboardViews(payload.allowedViews),
      avatar: getInitials(payload.name),
      activeProjects: 0,
      workload: 12,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return ref.id;
  },

  async updateTeamMember(userId: string, memberId: string, patch: Partial<TeamMember>) {
    const timestamp = nowIso();
    const memberRef = teamMemberDoc(userId, memberId);
    const memberSnapshot = await getDoc(memberRef);
    const currentMember = memberSnapshot.exists()
      ? normalizeTeamMember(memberId, memberSnapshot.data() as Partial<TeamMember>)
      : null;
    const ownerSnapshot = await getDoc(userDoc(userId));
    const ownerProfile = ownerSnapshot.exists() ? (ownerSnapshot.data() as Partial<UserProfileDoc>) : null;

    const nextPatch = {
      ...patch,
      ...(patch.allowedViews ? { allowedViews: filterDashboardViews(patch.allowedViews) } : {}),
      updatedAt: timestamp,
    };

    await updateDoc(memberRef, nextPatch);

    const authUid = patch.authUid || currentMember?.authUid;
    if (authUid) {
      const nextAllowedViews = patch.allowedViews ? filterDashboardViews(patch.allowedViews) : currentMember?.allowedViews || [];
      await setDoc(
        userDoc(authUid),
        {
          userId: authUid,
          userName: patch.name?.trim() || currentMember?.name || '',
          companyName: ownerProfile?.companyName?.trim() || '',
          accountType: 'team_member' as const,
          businessType: ownerProfile?.businessType || 'general_business',
          workspaceLogoUrl: ownerProfile?.workspaceLogoUrl?.trim() || '',
          email: patch.loginEmail?.trim() || patch.email?.trim() || currentMember?.loginEmail || currentMember?.email || '',
          phone: patch.phone?.trim() || currentMember?.phone || '',
          city: ownerProfile?.city?.trim() || '',
          studioAddress: ownerProfile?.studioAddress?.trim() || '',
          gstNumber: ownerProfile?.gstNumber?.trim() || '',
          teamSize: ownerProfile?.teamSize?.trim() || '',
          website: ownerProfile?.website?.trim() || '',
          subscriptionPlan: 'freemium',
          subscriptionStatus: 'active',
          renewalDate: ownerProfile?.renewalDate || '',
          sidebarViews: nextAllowedViews,
          workspaceOwnerId: userId,
          linkedTeamMemberId: memberId,
          loginEnabled: patch.loginEnabled ?? currentMember?.loginEnabled ?? true,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }
  },

  async provisionTeamMemberAccess(
    ownerUserId: string,
    ownerProfile: WorkspaceProfile,
    teamMemberId: string,
    payload: Pick<TeamMember, 'name' | 'phone' | 'authUid' | 'loginEmail' | 'allowedViews' | 'loginEnabled'>,
  ) {
    if (!payload.authUid) return;

    const timestamp = nowIso();
    await setDoc(
      userDoc(payload.authUid),
      {
        userId: payload.authUid,
        userName: payload.name.trim(),
        companyName: ownerProfile.companyName,
        accountType: 'team_member' as const,
        businessType: ownerProfile.businessType,
        workspaceLogoUrl: ownerProfile.workspaceLogoUrl,
        email: payload.loginEmail?.trim() || '',
        phone: payload.phone?.trim() || '',
        city: ownerProfile.city,
        studioAddress: ownerProfile.studioAddress,
        gstNumber: ownerProfile.gstNumber,
        teamSize: ownerProfile.teamSize,
        website: ownerProfile.website,
        subscriptionPlan: ownerProfile.subscriptionPlan,
        subscriptionStatus: ownerProfile.subscriptionStatus,
        renewalDate: ownerProfile.renewalDate,
        recentlyViewedIds: [],
        sidebarViews: filterDashboardViews(payload.allowedViews),
        workspaceOwnerId: ownerUserId,
        linkedTeamMemberId: teamMemberId,
        createdAt: timestamp,
        updatedAt: timestamp,
        loginEnabled: payload.loginEnabled,
      },
      { merge: true },
    );
  },

  async addInventoryItem(
    userId: string,
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
  ) {
    const ref = doc(usersCollection(userId, 'inventoryItems'));
    const timestamp = nowIso();
    const condition: InventoryItem['condition'] = 'new';
    const procurementStatus: InventoryProcurementStatus =
      payload.currentStock <= payload.minimumStock ? 'to_order' : 'none';
    const barcodeBusinessKey = buildBusinessBarcodeKey(userId);
    const barcodeValue = payload.barcodeValue?.trim() || buildInventoryBarcodeValue(userId, ref.id, payload.sku, payload.itemCode);
    const itemPayload = {
      ...payload,
      barcodeValue,
      barcodeBusinessKey,
      status: getInventoryStatus(payload.currentStock, payload.minimumStock, condition),
      condition,
      procurementStatus,
      lastRestockedAt: timestamp,
      lastIssuedAt: '',
      lastAuditAt: timestamp,
      assignedTeamIds: [],
      assignedProjectIds: [],
      clearanceReason: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, itemPayload);
    return ref.id;
  },

  async updateInventoryItem(userId: string, itemId: string, patch: Partial<InventoryItem>) {
    const timestamp = nowIso();
    await updateDoc(inventoryItemDoc(userId, itemId), {
      ...patch,
      updatedAt: timestamp,
    });
  },

  async deleteInventoryItem(userId: string, itemId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(inventoryItemDoc(userId, itemId));
    await batch.commit();
  },

  async addFinanceEntry(
    userId: string,
    payload: Pick<FinanceEntry, 'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'projectTitle' | 'notes' | 'employeeMemberId' | 'employeeName' | 'paycheckNumber' | 'payPeriodLabel' | 'paymentMethod' | 'issuedBy'>,
  ) {
    const ref = doc(usersCollection(userId, 'financeEntries'));
    const timestamp = nowIso();
    await setDoc(ref, {
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return ref.id;
  },

  async createSalaryPaycheck(
    userId: string,
    payload: Pick<FinanceEntry, 'amount' | 'status' | 'dueAt' | 'notes' | 'employeeMemberId' | 'employeeName' | 'payPeriodLabel' | 'paymentMethod' | 'issuedBy'>,
  ) {
    const ref = doc(usersCollection(userId, 'financeEntries'));
    const timestamp = nowIso();
    const paycheckNumber = `PAY-${new Date().getFullYear()}-${ref.id.slice(0, 6).toUpperCase()}`;
    await setDoc(ref, {
      title: `${payload.employeeName} paycheck`,
      kind: 'expense',
      category: 'salary',
      amount: payload.amount,
      status: payload.status,
      dueAt: payload.dueAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      notes: payload.notes,
      employeeMemberId: payload.employeeMemberId,
      employeeName: payload.employeeName,
      paycheckNumber,
      payPeriodLabel: payload.payPeriodLabel,
      paymentMethod: payload.paymentMethod,
      issuedBy: payload.issuedBy,
    });
    return ref.id;
  },

  async saveSalesInvoiceDraft(
    userId: string,
    payload: {
      draftId?: string;
      customerName: string;
      paymentStatus: InvoicePaymentStatus;
      paymentMethod: InvoicePaymentMethod;
      taxRate: number;
      notes: string;
      billedBy: string;
      lineItems: SalesInvoiceLineItem[];
    },
  ) {
    const timestamp = nowIso();
    const ref = payload.draftId ? salesInvoiceDoc(userId, payload.draftId) : doc(usersCollection(userId, 'salesInvoices'));
    const subtotal = payload.lineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxAmount = Number(((subtotal * payload.taxRate) / 100).toFixed(2));
    const totalAmount = subtotal + taxAmount;
    const draftNumber = `DRAFT-${ref.id.slice(0, 6).toUpperCase()}`;

    await setDoc(
      ref,
      {
        invoiceNumber: draftNumber,
        status: 'draft',
        businessBarcodeKey: buildBusinessBarcodeKey(userId),
        customerName: payload.customerName.trim() || 'Walk-in customer',
        paymentStatus: payload.paymentStatus,
        paymentMethod: payload.paymentMethod,
        lineItems: payload.lineItems,
        subtotal,
        taxRate: payload.taxRate,
        taxAmount,
        totalAmount,
        notes: payload.notes.trim(),
        billedBy: payload.billedBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true },
    );

    return {
      invoiceId: ref.id,
      invoiceNumber: draftNumber,
      subtotal,
      taxAmount,
      totalAmount,
      lineItems: payload.lineItems,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  async completeBarcodeSale(
    userId: string,
    payload: {
      existingInvoiceId?: string;
      customerName: string;
      paymentStatus: InvoicePaymentStatus;
      paymentMethod: InvoicePaymentMethod;
      taxRate: number;
      notes: string;
      billedBy: string;
      lineItems: SalesInvoiceLineItem[];
    },
  ) {
    if (!payload.lineItems.length) {
      throw new Error('Add at least one item before finalizing the bill.');
    }

    const timestamp = nowIso();
    const invoiceRef = payload.existingInvoiceId ? salesInvoiceDoc(userId, payload.existingInvoiceId) : doc(usersCollection(userId, 'salesInvoices'));
    const financeRef = doc(usersCollection(userId, 'financeEntries'));
    const businessBarcodeKey = buildBusinessBarcodeKey(userId);
    const lineItems: SalesInvoiceLineItem[] = [];
    const inventorySnapshots: InventoryItem[] = [];

    for (const line of payload.lineItems) {
      const inventoryRef = inventoryItemDoc(userId, line.inventoryItemId);
      const snapshot = await getDoc(inventoryRef);
      if (!snapshot.exists()) {
        throw new Error(`One of the scanned items is no longer available in inventory.`);
      }

      const item = normalizeInventoryItem(line.inventoryItemId, snapshot.data() as Partial<InventoryItem>);
      const nextStock = item.currentStock - line.quantity;
      if (nextStock < 0) {
        throw new Error(`Insufficient stock for ${item.name}. Available quantity is ${item.currentStock}.`);
      }

      inventorySnapshots.push(item);
      lineItems.push({
        inventoryItemId: item.id,
        barcodeValue: item.barcodeValue || line.barcodeValue,
        itemName: item.name,
        sku: item.sku,
        quantity: line.quantity,
        unitPrice: item.sellingPrice,
        lineSubtotal: item.sellingPrice * line.quantity,
      });
    }

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxAmount = Number(((subtotal * payload.taxRate) / 100).toFixed(2));
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = buildInvoiceNumber(userId, invoiceRef.id, timestamp);
    const batch = writeBatch(requireDb());

    lineItems.forEach((line, index) => {
      const item = inventorySnapshots[index];
      const nextStock = Math.max(0, item.currentStock - line.quantity);
      batch.update(inventoryItemDoc(userId, line.inventoryItemId), {
        currentStock: nextStock,
        lastIssuedAt: timestamp,
        updatedAt: timestamp,
        status: getInventoryStatus(nextStock, item.minimumStock, item.condition),
        procurementStatus: nextStock <= item.minimumStock ? 'to_order' : 'none',
      });
    });

    batch.set(salesInvoiceDoc(userId, invoiceRef.id), {
      invoiceNumber,
      status: 'finalized',
      businessBarcodeKey,
      customerName: payload.customerName.trim() || 'Walk-in customer',
      paymentStatus: payload.paymentStatus,
      paymentMethod: payload.paymentMethod,
      lineItems,
      subtotal,
      taxRate: payload.taxRate,
      taxAmount,
      totalAmount,
      notes: payload.notes.trim(),
      billedBy: payload.billedBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    batch.set(financeEntryDoc(userId, financeRef.id), {
      title: invoiceNumber,
      kind: 'income',
      category: 'client_payment',
      amount: totalAmount,
      status: payload.paymentStatus,
      dueAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      projectTitle: 'Barcode desk sale',
      sourceInvoiceId: invoiceRef.id,
      notes: payload.notes.trim() || `Generated from barcode billing for ${payload.customerName.trim() || 'Walk-in customer'}.`,
    });

    await batch.commit();

    return {
      invoiceId: invoiceRef.id,
      invoiceNumber,
      subtotal,
      taxAmount,
      totalAmount,
      lineItems,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  async deleteSalesInvoice(userId: string, invoiceId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(salesInvoiceDoc(userId, invoiceId));
    await batch.commit();
  },

  async updateFinanceEntry(userId: string, entryId: string, patch: Partial<FinanceEntry>) {
    await updateDoc(financeEntryDoc(userId, entryId), {
      ...patch,
      updatedAt: nowIso(),
    });
  },

  async deleteFinanceEntry(userId: string, entryId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(financeEntryDoc(userId, entryId));
    await batch.commit();
  },

  async removeTeamMember(userId: string, memberId: string, team: TeamMember[], customers: CustomerProject[], tasks: TaskItem[]) {
    const memberToRemove = team.find((member) => member.id === memberId);
    if (!memberToRemove) return;

    const remainingTeam = team.filter((member) => member.id !== memberId);
    const fallbackForRole = (role: TeamMember['role']) =>
      remainingTeam.find((member) => member.role === role)?.id ?? remainingTeam[0]?.id ?? '';

    const batch = writeBatch(requireDb());

    customers.forEach((customer) => {
      if (
        customer.ownerId !== memberId &&
        customer.leadDesignerId !== memberId &&
        customer.fieldStaffId !== memberId &&
        !customer.assignedTeamIds.includes(memberId)
      ) {
        return;
      }

      const nextAssignedTeamIds = customer.assignedTeamIds.filter((id) => id !== memberId);
      const ownerId =
        customer.ownerId === memberId
          ? fallbackForRole('Sales Owner') || fallbackForRole(memberToRemove.role)
          : customer.ownerId;
      const leadDesignerId =
        customer.leadDesignerId === memberId ? fallbackForRole('Lead Designer') || ownerId : customer.leadDesignerId;
      const fieldStaffId =
        customer.fieldStaffId === memberId
          ? fallbackForRole('Field Staff') || fallbackForRole('Site Coordinator') || ownerId
          : customer.fieldStaffId;

      batch.update(customerDoc(userId, customer.id), {
        ownerId,
        leadDesignerId,
        fieldStaffId,
        assignedTeamIds: Array.from(new Set([ownerId, leadDesignerId, fieldStaffId, ...nextAssignedTeamIds].filter(Boolean))),
        lastUpdated: nowIso(),
        updatedAt: nowIso(),
      });
    });

    tasks.forEach((task) => {
      if (task.ownerId !== memberId) return;
      batch.update(taskDoc(userId, task.id), {
        ownerId: fallbackForRole('Sales Owner') || remainingTeam[0]?.id || task.ownerId,
        updatedAt: nowIso(),
      });
    });

    batch.delete(teamMemberDoc(userId, memberId));
    await batch.commit();
  },
  async deleteCustomerRecord(userId: string, customer: CustomerProject, deletedBy: string) {
    await this.archiveCustomer(userId, customer, deletedBy);
  },
};
