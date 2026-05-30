import type { User } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../../lib/firebase';
import { createId } from '../../lib/id';
import type {
  AccountType,
  AccountingSource,
  ActivityItem,
  BillingDefaults,
  BusinessType,
  CashRegisterCategorySuggestion,
  CashRegisterMenuItem,
  CashRegisterMenuSize,
  CustomerProject,
  DashboardView,
  DashboardData,
  DeletedCustomerRecord,
  FinanceEntry,
  GstTaxMode,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  InventoryProcurementStatus,
  NoteItem,
  PlatformCoupon,
  PlatformBusinessAccount,
  RenderAsset,
  RenderRequest,
  SalesInvoice,
  SalesDocumentType,
  SalesInvoiceLineItem,
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionHistoryItem,
  SubscriptionAccessRules,
  TaskItem,
  TeamMember,
  WeeklyMiscRecord,
  WorkspaceProfile,
  InventoryItem,
  TimesheetEntry,
  LeaveRequest,
} from '../types';
import { defaultSidebarViews, filterDashboardViews, getInitials, getInventoryStatus, getStageProgress, recalculateTeamMetrics, stageProgressMap, subscriptionPlanViews } from '../utils';
import { buildBusinessBarcodeKey, buildInventoryBarcodeValue, buildInvoiceNumber } from '../barcodeUtils';

type DashboardSnapshotListener = (data: DashboardData) => void;
type DashboardErrorListener = (error: Error) => void;
type SuperAdminSnapshotListener = (data: { businesses: PlatformBusinessAccount[]; supportThreads: SupportThread[]; coupons: PlatformCoupon[] }) => void;
type TeamMemberIndex = Record<string, { teamMemberIds: string[]; teamAuthUids: string[]; teamMemberCount: number }>;
type SubscriptionAccessListener = (rules: SubscriptionAccessRules) => void;

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
  profileSetupCompleted?: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  renewalDate: string;
  subscriptionHistory?: SubscriptionHistoryItem[];
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

type TeamMemberPayload = Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status' | 'allowedViews' | 'permissions' | 'loginEnabled' | 'authUid' | 'loginEmail'>;

const usersCollection = (userId: string, collectionName: string) =>
  collection(requireDb(), 'users', userId, collectionName);

const userDoc = (userId: string) => doc(requireDb(), 'users', userId);
const rootUsersCollection = () => collection(requireDb(), 'users');
const cashRegisterCategoriesCollection = () => collection(requireDb(), 'cashRegisterCategorySuggestions');
const cashRegisterCategoryDoc = (categoryId: string) => doc(requireDb(), 'cashRegisterCategorySuggestions', categoryId);
const customerDoc = (userId: string, customerId: string) => doc(requireDb(), 'users', userId, 'customers', customerId);
const teamMemberDoc = (userId: string, memberId: string) => doc(requireDb(), 'users', userId, 'teamMembers', memberId);
const taskDoc = (userId: string, taskId: string) => doc(requireDb(), 'users', userId, 'tasks', taskId);
const inventoryItemDoc = (userId: string, itemId: string) => doc(requireDb(), 'users', userId, 'inventoryItems', itemId);
const cashRegisterMenuItemDoc = (userId: string, itemId: string) => doc(requireDb(), 'users', userId, 'cashRegisterMenuItems', itemId);
const financeEntryDoc = (userId: string, entryId: string) => doc(requireDb(), 'users', userId, 'financeEntries', entryId);
const weeklyMiscRecordDoc = (userId: string, recordId: string) => doc(requireDb(), 'users', userId, 'weeklyMiscRecords', recordId);
const salesInvoiceDoc = (userId: string, invoiceId: string) => doc(requireDb(), 'users', userId, 'salesInvoices', invoiceId);
const deletedCustomerDoc = (userId: string, recordId: string) => doc(requireDb(), 'users', userId, 'deletedCustomers', recordId);
const supportThreadsCollection = () => collection(requireDb(), 'supportThreads');
const supportThreadDoc = (ticketId: string) => doc(requireDb(), 'supportThreads', ticketId);
const subscriptionAccessDoc = () => doc(requireDb(), 'platformSettings', 'subscriptionAccess');
const platformCouponsCollection = () => collection(requireDb(), 'platformCoupons');
const platformCouponDoc = (couponId: string) => doc(requireDb(), 'platformCoupons', couponId);

const nowIso = () => new Date().toISOString();
const calculateInvoiceTotals = (subtotal: number, discountAmount: number, taxRate: number, taxMode: GstTaxMode) => {
  const normalizedDiscount = Math.min(Math.max(0, Number(discountAmount || 0)), subtotal);
  const taxableAmount = Number((subtotal - normalizedDiscount).toFixed(2));
  const taxAmount = taxMode === 'no_gst' ? 0 : Number(((taxableAmount * Number(taxRate || 0)) / 100).toFixed(2));
  const cgstAmount = taxMode === 'intra_state' ? Number((taxAmount / 2).toFixed(2)) : 0;
  const sgstAmount = taxMode === 'intra_state' ? Number((taxAmount - cgstAmount).toFixed(2)) : 0;
  const igstAmount = taxMode === 'inter_state' ? taxAmount : 0;
  return {
    discountAmount: normalizedDiscount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount: Number((taxableAmount + taxAmount).toFixed(2)),
  };
};
const salesDocumentNumber = (userId: string, documentId: string, createdAt: string, type: SalesDocumentType, prefix?: string) => {
  const normalizedPrefix = (prefix || (type === 'quotation' ? 'QUO' : 'INV')).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'INV';
  return buildInvoiceNumber(userId, documentId, createdAt).replace(/^INV-/, `${normalizedPrefix}-`);
};
const shortUserId = (userId: string) => userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || userId.slice(0, 8).toUpperCase();
const normalizeSubscriptionPlan = (plan?: string): SubscriptionPlan =>
  plan === 'focused' || plan === 'growth' || plan === 'business_pro' ? plan : 'freemium';
const normalizeSubscriptionStatus = (status?: string): SubscriptionStatus =>
  status === 'trialing' || status === 'paused' || status === 'cancelled' ? status : 'active';
const normalizeCouponStatus = (status?: string): PlatformCoupon['status'] =>
  status === 'paused' || status === 'expired' ? status : 'active';
const normalizeCouponPlans = (plans?: unknown): SubscriptionPlan[] => {
  const source = Array.isArray(plans) ? plans : ['focused', 'growth', 'business_pro'];
  const normalized = source.map((plan) => normalizeSubscriptionPlan(String(plan)));
  return Array.from(new Set(normalized));
};
const normalizeCoupon = (id: string, value: Partial<PlatformCoupon>): PlatformCoupon => ({
  id,
  code: value.code?.trim().toUpperCase() || id.toUpperCase(),
  description: value.description?.trim() || '',
  discountPercent: Math.min(100, Math.max(0, Number(value.discountPercent || 0))),
  status: normalizeCouponStatus(value.status),
  appliesToPlans: normalizeCouponPlans(value.appliesToPlans),
  validFrom: value.validFrom || nowIso(),
  validUntil: value.validUntil || '',
  maxRedemptions: Math.max(0, Number(value.maxRedemptions || 0)),
  redeemedCount: Math.max(0, Number(value.redeemedCount || 0)),
  createdAt: value.createdAt || nowIso(),
  updatedAt: value.updatedAt || nowIso(),
  createdBy: value.createdBy || '',
});
const normalizeSubscriptionAccessRules = (value?: Partial<Record<SubscriptionPlan, DashboardView[]>>): SubscriptionAccessRules => ({
  freemium: filterDashboardViews(value?.freemium).length ? filterDashboardViews(value?.freemium) : [...subscriptionPlanViews.freemium],
  focused: filterDashboardViews(value?.focused).length ? filterDashboardViews(value?.focused) : [...subscriptionPlanViews.focused],
  growth: filterDashboardViews(value?.growth).length ? filterDashboardViews(value?.growth) : [...subscriptionPlanViews.growth],
  business_pro: filterDashboardViews(value?.business_pro).length ? filterDashboardViews(value?.business_pro) : [...subscriptionPlanViews.business_pro],
});

const getAdminIdToken = async () => {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Super admin session is not available. Please sign in again.');
  }

  return currentUser.getIdToken();
};

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json() as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
};

const adminApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const projectId = firebaseConfig.projectId;
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!projectId || isLocal) {
    return `/api${normalizedPath}`;
  }

  return `https://asia-south1-${projectId}.cloudfunctions.net/api${normalizedPath}`;
};

const fetchAdminUsers = async () => {
  const token = await getAdminIdToken();
  const response = await fetch(adminApiUrl('/admin/users'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to load admin users.'));
  }

  const payload = await response.json() as { users?: PlatformBusinessAccount[] };
  return (payload.users ?? []).map((business) => ({
    ...business,
    accountType: business.accountType || 'owner',
    hashedUserId: business.hashedUserId || shortUserId(business.userId),
    subscriptionPlan: normalizeSubscriptionPlan(business.subscriptionPlan),
    subscriptionStatus: normalizeSubscriptionStatus(business.subscriptionStatus),
    teamMemberIds: business.teamMemberIds ?? [],
    teamAuthUids: business.teamAuthUids ?? [],
    teamMemberCount: business.teamMemberCount ?? 0,
    teamMembers: business.teamMembers ?? [],
    subscriptionHistory: business.subscriptionHistory ?? [],
  }));
};

const normalizePlatformBusinessAccount = (
  userId: string,
  value: Partial<UserProfileDoc> | undefined,
  teamIndex?: TeamMemberIndex,
): PlatformBusinessAccount => ({
  userId,
  hashedUserId: shortUserId(userId),
  accountType: value?.accountType || 'owner',
  companyName: value?.companyName?.trim() || 'Untitled workspace',
  ownerName: value?.userName?.trim() || 'Unknown owner',
  email: value?.email?.trim() || '',
  phone: value?.phone?.trim() || '',
  businessType: value?.businessType || 'general_business',
  subscriptionPlan: normalizeSubscriptionPlan(value?.subscriptionPlan),
  subscriptionStatus: normalizeSubscriptionStatus(value?.subscriptionStatus),
  renewalDate: value?.renewalDate || '',
  teamMemberIds: teamIndex?.[userId]?.teamMemberIds ?? [],
  teamAuthUids: teamIndex?.[userId]?.teamAuthUids ?? [],
  teamMemberCount: teamIndex?.[userId]?.teamMemberCount ?? 0,
  teamMembers: [],
  subscriptionHistory: (value?.subscriptionHistory ?? []) as SubscriptionHistoryItem[],
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || nowIso(),
});

const fetchFirestoreAdminUsers = async () => {
  const [usersSnapshot, teamSnapshot] = await Promise.all([
    getDocs(rootUsersCollection()),
    getDocs(collectionGroup(requireDb(), 'teamMembers')).catch(() => null),
  ]);
  const teamIndex: TeamMemberIndex = {};

  teamSnapshot?.docs.forEach((item) => {
    const ownerId = item.ref.parent.parent?.id;
    if (!ownerId) return;
    const member = normalizeTeamMember(item.id, item.data() as Partial<TeamMember>);
    const current = teamIndex[ownerId] ?? { teamMemberIds: [], teamAuthUids: [], teamMemberCount: 0 };
    current.teamMemberIds.push(item.id);
    if (member.authUid) current.teamAuthUids.push(member.authUid);
    current.teamMemberCount += 1;
    teamIndex[ownerId] = current;
  });

  return usersSnapshot.docs
    .map((item) => ({ id: item.id, data: item.data() as Partial<UserProfileDoc> }))
    .filter((item) => item.data.accountType !== 'super_admin' && item.data.accountType !== 'team_member')
    .map((item) => normalizePlatformBusinessAccount(item.id, item.data, teamIndex));
};
const defaultBillingDefaults: BillingDefaults = {
  defaultTaxRate: 5,
  defaultPaymentStatus: 'paid',
  defaultPaymentMethod: 'cash',
  defaultInvoiceNotes: '',
  defaultUpiId: '',
  physicalInvoicePrintingEnabled: false,
  printerConnectionType: 'system',
  printerDeviceName: '',
  printerPaperWidth: '80mm',
  networkPrinterAddress: '',
  defaultTaxMode: 'intra_state',
  defaultPlaceOfSupply: '',
  invoicePrefix: 'INV',
  quotationPrefix: 'QUO',
};

const getUserName = (user: User, preferredName?: string) =>
  preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'User';

const getCompanyName = (user: User, preferredName?: string) => {
  const baseName = preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Workspace';
  return `${baseName} Workspace`;
};

const normalizeSidebarViews = (views?: DashboardView[]) => {
  if (!views) return [...defaultSidebarViews];
  return Array.from(new Set(filterDashboardViews(views)));
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
  profileSetupCompleted: Boolean(profile?.profileSetupCompleted),
  subscriptionPlan: normalizeSubscriptionPlan(profile?.subscriptionPlan),
  subscriptionStatus: normalizeSubscriptionStatus(profile?.subscriptionStatus),
  renewalDate: profile?.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  sidebarViews: normalizeSidebarViews(profile?.sidebarViews),
  billingDefaults: {
    defaultTaxRate: Number(profile?.billingDefaults?.defaultTaxRate ?? defaultBillingDefaults.defaultTaxRate),
    defaultPaymentStatus: profile?.billingDefaults?.defaultPaymentStatus || defaultBillingDefaults.defaultPaymentStatus,
    defaultPaymentMethod: profile?.billingDefaults?.defaultPaymentMethod || defaultBillingDefaults.defaultPaymentMethod,
    defaultInvoiceNotes: profile?.billingDefaults?.defaultInvoiceNotes || defaultBillingDefaults.defaultInvoiceNotes,
    defaultUpiId: profile?.billingDefaults?.defaultUpiId || '',
    physicalInvoicePrintingEnabled: Boolean(profile?.billingDefaults?.physicalInvoicePrintingEnabled),
    printerConnectionType: profile?.billingDefaults?.printerConnectionType || defaultBillingDefaults.printerConnectionType,
    printerDeviceName: profile?.billingDefaults?.printerDeviceName || '',
    printerPaperWidth: profile?.billingDefaults?.printerPaperWidth || defaultBillingDefaults.printerPaperWidth,
    networkPrinterAddress: profile?.billingDefaults?.networkPrinterAddress || '',
    defaultTaxMode: profile?.billingDefaults?.defaultTaxMode || 'intra_state',
    defaultPlaceOfSupply: profile?.billingDefaults?.defaultPlaceOfSupply || profile?.city?.trim() || '',
    invoicePrefix: profile?.billingDefaults?.invoicePrefix?.trim() || 'INV',
    quotationPrefix: profile?.billingDefaults?.quotationPrefix?.trim() || 'QUO',
  },
  workspaceOwnerId: profile?.workspaceOwnerId,
  linkedTeamMemberId: profile?.linkedTeamMemberId,
});

const isWorkspaceProfileSetupComplete = (
  profile: Pick<UserProfileDoc, 'companyName' | 'userName' | 'businessType' | 'phone' | 'city' | 'studioAddress' | 'teamSize'>,
) => {
  const phone = profile.phone.replace(/\D/g, '');
  const teamSize = profile.teamSize.replace(/\D/g, '');

  return Boolean(
    profile.companyName.trim() &&
      profile.userName.trim() &&
      String(profile.businessType).trim() &&
      phone.length === 10 &&
      profile.city.trim() &&
      profile.studioAddress.trim() &&
      teamSize,
  );
};

const emptyDashboardData = (user: User, profile?: Partial<UserProfileDoc>): DashboardData => ({
  companyName: profile?.companyName?.trim() || getCompanyName(user),
  userName: profile?.userName?.trim() || getUserName(user),
  profile: buildWorkspaceProfile(user, profile),
  team: [],
  inventory: [],
  cashRegisterMenuItems: [],
  financeEntries: [],
  weeklyMiscRecords: [],
  salesInvoices: [],
  supportThreads: [],
  cashRegisterCategorySuggestions: [],
  customers: [],
  deletedCustomers: [],
  tasks: [],
  recentlyViewedIds: profile?.recentlyViewedIds ?? [],
  timesheets: [],
  leaveRequests: [],
});

const normalizeNote = (value: Partial<NoteItem> | undefined): NoteItem => ({
  id: value?.id || createId(),
  authorId: value?.authorId || '',
  authorName: value?.authorName || 'Unknown',
  createdAt: value?.createdAt || nowIso(),
  content: value?.content || '',
});

const normalizeTimesheet = (id: string, value: Partial<TimesheetEntry> | undefined): TimesheetEntry => ({
  id,
  userId: value?.userId || '',
  date: value?.date || new Date().toISOString().split('T')[0],
  clockInTime: value?.clockInTime || nowIso(),
  clockOutTime: value?.clockOutTime,
  totalMinutes: value?.totalMinutes,
});

const normalizeLeaveRequest = (id: string, value: Partial<LeaveRequest> | undefined): LeaveRequest => ({
  id,
  userId: value?.userId || '',
  startDate: value?.startDate || '',
  endDate: value?.endDate || '',
  type: value?.type || 'casual',
  reason: value?.reason || '',
  status: value?.status || 'pending',
  createdAt: value?.createdAt || nowIso(),
});

const normalizeActivity = (value: Partial<ActivityItem> | undefined): ActivityItem => ({
  id: value?.id || createId(),
  type: value?.type || 'comment',
  title: value?.title || 'Activity updated',
  description: value?.description || '',
  createdAt: value?.createdAt || nowIso(),
  actorName: value?.actorName || 'System',
});

const normalizeRender = (value: Partial<RenderAsset> | undefined): RenderAsset => ({
  id: value?.id || createId(),
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
  id: value?.id || createId(),
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
    quote: {
      estimatedValue: value?.quote?.estimatedValue ?? 0,
      quoteValue: value?.quote?.quoteValue ?? 0,
      quoteStatus: value?.quote?.quoteStatus || 'draft',
      paymentStage: value?.quote?.paymentStage || 'not_started',
      advanceReceived: value?.quote?.advanceReceived ?? 0,
      partiallyPaidAmount: value?.quote?.partiallyPaidAmount ?? 0,
    },
    renders: (value?.renders ?? []).map(normalizeRender),
    renderQueue: (value?.renderQueue ?? []).map(normalizeRenderRequest),
    activities: (value?.activities ?? []).map(normalizeActivity),
    internalNotes: (value?.internalNotes ?? []).map(normalizeNote),
    canonicalContactId: value?.canonicalContactId,
    canonicalCompanyId: value?.canonicalCompanyId,
    canonicalLeadId: value?.canonicalLeadId,
    canonicalDealId: value?.canonicalDealId,
    quotationIds: value?.quotationIds ?? [],
    invoiceIds: value?.invoiceIds ?? [],
    supportThreadIds: value?.supportThreadIds ?? [],
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
  permissions: value?.permissions ?? ['view', 'create', 'edit'],
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
  hsnSac: value?.hsnSac || '',
  size: value?.size || '',
  color: value?.color || '',
  variantLabel: value?.variantLabel || '',
  branchId: value?.branchId || 'main',
  supplierGstin: value?.supplierGstin || '',
  damagedStock: value?.damagedStock ?? 0,
  purchaseOrderNumber: value?.purchaseOrderNumber || '',
  goodsReceiptNumber: value?.goodsReceiptNumber || '',
  physicalCount: value?.physicalCount,
  lastPhysicalCountAt: value?.lastPhysicalCountAt,
});

const normalizeCashRegisterSize = (value: Partial<CashRegisterMenuSize> | undefined): CashRegisterMenuSize => ({
  id: value?.id || createId(),
  label: value?.label || 'Regular',
  price: Number(value?.price ?? 0),
});

const normalizeCashRegisterMenuItem = (
  itemId: string,
  value: Partial<CashRegisterMenuItem> | undefined,
): CashRegisterMenuItem => ({
  id: itemId,
  name: value?.name || 'Menu item',
  category: value?.category || 'Other',
  description: value?.description || '',
  price: Number(value?.price ?? 0),
  taxRate: Number(value?.taxRate ?? defaultBillingDefaults.defaultTaxRate),
  barcodeValue: value?.barcodeValue || '',
  iconKey: value?.iconKey || 'cup',
  active: value?.active ?? true,
  sortHint: Number(value?.sortHint ?? 0),
  sizes: (value?.sizes ?? []).map(normalizeCashRegisterSize).filter((size) => size.label.trim()),
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
});

const normalizeCashRegisterCategorySuggestion = (
  categoryId: string,
  value: Partial<CashRegisterCategorySuggestion> | undefined,
): CashRegisterCategorySuggestion => ({
  id: categoryId,
  name: value?.name || categoryId,
  usageCount: Number(value?.usageCount ?? 0),
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
});

const categorySuggestionId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const upsertCategorySuggestions = (batch: ReturnType<typeof writeBatch>, categories: string[], timestamp: string) => {
  Array.from(new Set(categories.map((category) => category.trim()).filter(Boolean))).forEach((category) => {
    const id = categorySuggestionId(category);
    if (!id) return;
    batch.set(
      cashRegisterCategoryDoc(id),
      {
        name: category,
        usageCount: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true },
    );
  });
};

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
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
  customerId: value?.customerId,
  linkedCustomerName: value?.linkedCustomerName,
  projectTitle: value?.projectTitle,
  sourceInvoiceId: value?.sourceInvoiceId,
  employeeMemberId: value?.employeeMemberId,
  employeeName: value?.employeeName,
  paycheckNumber: value?.paycheckNumber,
  payPeriodLabel: value?.payPeriodLabel,
  paymentMethod: value?.paymentMethod,
  issuedBy: value?.issuedBy,
  accountingSource: value?.accountingSource,
  transactionFlow: value?.transactionFlow,
  referenceDate: value?.referenceDate,
  autoGenerated: value?.autoGenerated,
  autoGroupKey: value?.autoGroupKey,
  notes: value?.notes || '',
});

const normalizeWeeklyMiscRecord = (recordId: string, value: Partial<WeeklyMiscRecord> | undefined): WeeklyMiscRecord => ({
  id: recordId,
  title: value?.title || 'Miscellaneous',
  amount: value?.amount ?? 0,
  spentAt: value?.spentAt || nowIso(),
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
  notes: value?.notes || '',
  weekKey: value?.weekKey || '',
});

const normalizeSalesInvoiceLine = (value: Partial<SalesInvoiceLineItem> | undefined): SalesInvoiceLineItem => ({
  inventoryItemId: value?.inventoryItemId || '',
  barcodeValue: value?.barcodeValue || '',
  itemName: value?.itemName || 'Unknown item',
  sku: value?.sku || '',
  quantity: value?.quantity ?? 1,
  unitPrice: value?.unitPrice ?? 0,
  lineSubtotal: value?.lineSubtotal ?? 0,
  hsnSac: value?.hsnSac || '',
  discountAmount: value?.discountAmount ?? 0,
});

const normalizeSalesInvoice = (invoiceId: string, value: Partial<SalesInvoice> | undefined): SalesInvoice => ({
  id: invoiceId,
  invoiceNumber: value?.invoiceNumber || `INV-${invoiceId.slice(0, 8).toUpperCase()}`,
  status: value?.status || 'finalized',
  documentType: value?.documentType || (value?.status === 'quotation' ? 'quotation' : 'invoice'),
  businessBarcodeKey: value?.businessBarcodeKey || '',
  customerName: value?.customerName || 'Walk-in customer',
  customerGstin: value?.customerGstin || '',
  placeOfSupply: value?.placeOfSupply || '',
  taxMode: value?.taxMode || 'inter_state',
  paymentStatus: value?.paymentStatus || 'pending',
  paymentMethod: value?.paymentMethod || 'cash',
  lineItems: (value?.lineItems ?? []).map(normalizeSalesInvoiceLine),
  subtotal: value?.subtotal ?? 0,
  discountAmount: value?.discountAmount ?? 0,
  taxableAmount: value?.taxableAmount ?? value?.subtotal ?? 0,
  taxRate: value?.taxRate ?? 0,
  taxAmount: value?.taxAmount ?? 0,
  cgstAmount: value?.cgstAmount ?? 0,
  sgstAmount: value?.sgstAmount ?? 0,
  igstAmount: value?.igstAmount ?? value?.taxAmount ?? 0,
  totalAmount: value?.totalAmount ?? 0,
  notes: value?.notes || '',
  billedBy: value?.billedBy || 'System',
  createdAt: value?.createdAt || nowIso(),
  updatedAt: value?.updatedAt || value?.createdAt || nowIso(),
  validUntil: value?.validUntil,
  voidedAt: value?.voidedAt,
  voidedBy: value?.voidedBy,
  voidReason: value?.voidReason,
  originalInvoiceId: value?.originalInvoiceId,
  printCount: value?.printCount ?? 0,
  lastPrintedAt: value?.lastPrintedAt,
  shiftId: value?.shiftId,
});

const normalizeSupportMessage = (value: Partial<SupportMessage> | undefined): SupportMessage => ({
  id: value?.id || createId(),
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
    quote: {
      estimatedValue: 0,
      quoteValue: 0,
      quoteStatus: 'draft',
      paymentStage: 'not_started',
      advanceReceived: 0,
      partiallyPaidAmount: 0,
    },
    renders: [],
    renderQueue: [],
    activities: [
      {
        id: createId(),
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
      userName: user.displayName?.trim() || 'Pula Labs Super Admin',
      companyName: 'Pula Labs Platform',
      accountType: 'super_admin',
      businessType: 'general_business',
      workspaceLogoUrl: '',
      email: user.email || '',
      phone: '',
      city: '',
      studioAddress: '',
      gstNumber: '',
      teamSize: '',
      website: 'https://pulalabs.com',
      profileSetupCompleted: true,
      subscriptionPlan: 'business_pro',
      subscriptionStatus: 'active',
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      recentlyViewedIds: [],
      sidebarViews: [],
      billingDefaults: defaultBillingDefaults,
      workspaceOwnerId: user.uid,
      linkedTeamMemberId: '',
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
      profileSetupCompleted: false,
      subscriptionPlan: 'freemium',
      subscriptionStatus: 'active',
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recentlyViewedIds: [],
      sidebarViews: defaultSidebarViews,
      billingDefaults: defaultBillingDefaults,
      workspaceOwnerId: user.uid,
      linkedTeamMemberId: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

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
      profileSetupCompleted:
        data.profileSetupCompleted ??
        isWorkspaceProfileSetupComplete({
          companyName: data.companyName?.trim() || fallbackProfile.companyName,
          userName: data.userName?.trim() || fallbackProfile.userName,
          businessType: data.businessType || fallbackProfile.businessType,
          phone: data.phone?.trim() || fallbackProfile.phone,
          city: data.city?.trim() || fallbackProfile.city,
          studioAddress: data.studioAddress?.trim() || fallbackProfile.studioAddress,
          teamSize: data.teamSize?.trim() || fallbackProfile.teamSize,
        }),
      subscriptionPlan: normalizeSubscriptionPlan(data.subscriptionPlan),
      subscriptionStatus: normalizeSubscriptionStatus(data.subscriptionStatus),
      renewalDate: data.renewalDate || fallbackProfile.renewalDate,
      recentlyViewedIds: data.recentlyViewedIds ?? [],
      sidebarViews: normalizeSidebarViews(data.sidebarViews ?? fallbackProfile.sidebarViews),
      billingDefaults: {
        defaultTaxRate: Number(data.billingDefaults?.defaultTaxRate ?? defaultBillingDefaults.defaultTaxRate),
        defaultPaymentStatus: data.billingDefaults?.defaultPaymentStatus || defaultBillingDefaults.defaultPaymentStatus,
        defaultPaymentMethod: data.billingDefaults?.defaultPaymentMethod || defaultBillingDefaults.defaultPaymentMethod,
        defaultInvoiceNotes: data.billingDefaults?.defaultInvoiceNotes || defaultBillingDefaults.defaultInvoiceNotes,
        defaultUpiId: data.billingDefaults?.defaultUpiId || fallbackProfile.billingDefaults?.defaultUpiId || '',
        physicalInvoicePrintingEnabled: Boolean(data.billingDefaults?.physicalInvoicePrintingEnabled ?? fallbackProfile.billingDefaults?.physicalInvoicePrintingEnabled),
        printerConnectionType: data.billingDefaults?.printerConnectionType || fallbackProfile.billingDefaults?.printerConnectionType || defaultBillingDefaults.printerConnectionType,
        printerDeviceName: data.billingDefaults?.printerDeviceName || fallbackProfile.billingDefaults?.printerDeviceName || '',
        printerPaperWidth: data.billingDefaults?.printerPaperWidth || fallbackProfile.billingDefaults?.printerPaperWidth || defaultBillingDefaults.printerPaperWidth,
      networkPrinterAddress: data.billingDefaults?.networkPrinterAddress || fallbackProfile.billingDefaults?.networkPrinterAddress || '',
      defaultTaxMode: data.billingDefaults?.defaultTaxMode || fallbackProfile.billingDefaults?.defaultTaxMode || 'intra_state',
      defaultPlaceOfSupply: data.billingDefaults?.defaultPlaceOfSupply || fallbackProfile.billingDefaults?.defaultPlaceOfSupply || data.city?.trim() || '',
      invoicePrefix: data.billingDefaults?.invoicePrefix?.trim() || fallbackProfile.billingDefaults?.invoicePrefix || 'INV',
      quotationPrefix: data.billingDefaults?.quotationPrefix?.trim() || fallbackProfile.billingDefaults?.quotationPrefix || 'QUO',
      },
      workspaceOwnerId: data.workspaceOwnerId || fallbackProfile.workspaceOwnerId,
      linkedTeamMemberId: data.linkedTeamMemberId || fallbackProfile.linkedTeamMemberId,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
    };

    await setDoc(ref, nextProfile, { merge: true });
    return nextProfile;
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
    let cashRegisterMenuItems: CashRegisterMenuItem[] = [];
    let cashRegisterCategorySuggestions: CashRegisterCategorySuggestion[] = [];
    let financeEntries: FinanceEntry[] = [];
    let weeklyMiscRecords: WeeklyMiscRecord[] = [];
    let salesInvoices: SalesInvoice[] = [];
    let supportThreads: SupportThread[] = [];
    let timesheets: TimesheetEntry[] = [];
    let leaveRequests: LeaveRequest[] = [];
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
          subscriptionPlan: normalizeSubscriptionPlan(sourceProfile?.subscriptionPlan ?? viewerProfile?.subscriptionPlan),
          subscriptionStatus: normalizeSubscriptionStatus(sourceProfile?.subscriptionStatus ?? viewerProfile?.subscriptionStatus),
          renewalDate: sourceProfile?.renewalDate || viewerProfile?.renewalDate || base.profile.renewalDate,
          sidebarViews: visibleViews,
          workspaceOwnerId: viewerProfile?.workspaceOwnerId,
          linkedTeamMemberId: viewerProfile?.linkedTeamMemberId,
        },
        customers,
        team: recalculateTeamMetrics(team, customers, tasks),
        inventory,
        cashRegisterMenuItems,
        cashRegisterCategorySuggestions,
        financeEntries,
        weeklyMiscRecords,
        salesInvoices,
        supportThreads,
        tasks,
        deletedCustomers,
        timesheets,
        leaveRequests,
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
      cashRegisterMenuItems = [];
      cashRegisterCategorySuggestions = [];
      financeEntries = [];
      weeklyMiscRecords = [];
      salesInvoices = [];
      supportThreads = [];
      timesheets = [];
      leaveRequests = [];
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
          usersCollection(ownerUserId, 'cashRegisterMenuItems'),
          (snapshot) => {
            cashRegisterMenuItems = snapshot.docs
              .map((item) => normalizeCashRegisterMenuItem(item.id, item.data() as Partial<CashRegisterMenuItem>))
              .sort((left, right) => {
                if (left.category !== right.category) return left.category.localeCompare(right.category);
                return left.name.localeCompare(right.name);
              });
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          cashRegisterCategoriesCollection(),
          (snapshot) => {
            cashRegisterCategorySuggestions = snapshot.docs
              .map((item) => normalizeCashRegisterCategorySuggestion(item.id, item.data() as Partial<CashRegisterCategorySuggestion>))
              .sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name));
            emit();
          },
          () => {
            cashRegisterCategorySuggestions = [];
            emit();
          },
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
          usersCollection(ownerUserId, 'weeklyMiscRecords'),
          (snapshot) => {
            weeklyMiscRecords = snapshot.docs
              .map((item) => normalizeWeeklyMiscRecord(item.id, item.data() as Partial<WeeklyMiscRecord>))
              .sort((left, right) => new Date(right.spentAt).getTime() - new Date(left.spentAt).getTime());
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
        onSnapshot(
          usersCollection(ownerUserId, 'timesheets'),
          (snapshot) => {
            timesheets = snapshot.docs
              .map((item) => normalizeTimesheet(item.id, item.data() as Partial<TimesheetEntry>))
              .sort((left, right) => new Date(right.clockInTime).getTime() - new Date(left.clockInTime).getTime());
            emit();
          },
          (error) => onError(error),
        ),
        onSnapshot(
          usersCollection(ownerUserId, 'leaveRequests'),
          (snapshot) => {
            leaveRequests = snapshot.docs
              .map((item) => normalizeLeaveRequest(item.id, item.data() as Partial<LeaveRequest>))
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
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
    const profileSetupCompleted = isWorkspaceProfileSetupComplete(profile);

    await setDoc(
      userDoc(userId),
      {
        userId,
        ...profile,
        profileSetupCompleted,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  },

  subscribeToSubscriptionAccessRules(onData: SubscriptionAccessListener) {
    return onSnapshot(
      subscriptionAccessDoc(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() as Partial<SubscriptionAccessRules> : undefined;
        onData(normalizeSubscriptionAccessRules(data));
      },
      () => onData(normalizeSubscriptionAccessRules()),
    );
  },

  async updateSubscriptionAccessRules(rules: SubscriptionAccessRules) {
    await setDoc(
      subscriptionAccessDoc(),
      {
        ...normalizeSubscriptionAccessRules(rules),
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  },

  subscribeToSuperAdminConsole(onData: SuperAdminSnapshotListener) {
    let businesses: PlatformBusinessAccount[] = [];
    let supportThreads: SupportThread[] = [];
    let coupons: PlatformCoupon[] = [];
    let disposed = false;

    const emit = () => {
      onData({
        businesses,
        supportThreads,
        coupons,
      });
    };

    const loadBusinesses = async () => {
      try {
        let nextBusinesses: PlatformBusinessAccount[] = [];
        try {
          nextBusinesses = await fetchAdminUsers();
        } catch {
          nextBusinesses = await fetchFirestoreAdminUsers();
        }
        if (disposed) return;
        businesses = nextBusinesses.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        emit();
      } catch (error) {
        if (disposed) return;
        businesses = [];
        emit();
        console.warn('Unable to load admin users.', error);
      }
    };

    void loadBusinesses();
    const refreshTimer = window.setInterval(loadBusinesses, 30000);

    const unsubscribeSupport = onSnapshot(
      supportThreadsCollection(),
      (snapshot) => {
        supportThreads = snapshot.docs
          .map((item) => normalizeSupportThread(item.id, item.data() as Partial<SupportThread>))
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
        emit();
      },
      () => {
        supportThreads = [];
        emit();
      },
    );

    const unsubscribeCoupons = onSnapshot(
      platformCouponsCollection(),
      (snapshot) => {
        coupons = snapshot.docs
          .map((item) => normalizeCoupon(item.id, item.data() as Partial<PlatformCoupon>))
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
        emit();
      },
      () => {
        coupons = [];
        emit();
      },
    );

    return () => {
      disposed = true;
      window.clearInterval(refreshTimer);
      unsubscribeSupport();
      unsubscribeCoupons();
    };
  },

  async savePlatformCoupon(
    couponId: string | null,
    payload: Pick<PlatformCoupon, 'code' | 'description' | 'discountPercent' | 'status' | 'appliesToPlans' | 'validFrom' | 'validUntil' | 'maxRedemptions'>,
  ) {
    const timestamp = nowIso();
    const normalizedCode = payload.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!normalizedCode) {
      throw new Error('Enter a coupon code.');
    }

    const id = couponId || normalizedCode.toLowerCase();
    try {
      const token = await getAdminIdToken();
      const response = await fetch(adminApiUrl('/admin/coupons'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponId: id,
          ...payload,
          code: normalizedCode,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Unable to save this coupon.'));
      }
      return;
    } catch (apiError) {
      const existing = await getDoc(platformCouponDoc(id));
    await setDoc(
      platformCouponDoc(id),
      {
        id,
        code: normalizedCode,
        description: payload.description.trim(),
        discountPercent: Math.min(100, Math.max(0, Number(payload.discountPercent || 0))),
        status: normalizeCouponStatus(payload.status),
        appliesToPlans: normalizeCouponPlans(payload.appliesToPlans),
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
        maxRedemptions: Math.max(0, Number(payload.maxRedemptions || 0)),
        redeemedCount: existing.exists() ? Number((existing.data() as Partial<PlatformCoupon>).redeemedCount || 0) : 0,
        createdAt: existing.exists() ? String((existing.data() as Partial<PlatformCoupon>).createdAt || timestamp) : timestamp,
        updatedAt: timestamp,
        createdBy: auth?.currentUser?.email || 'super_admin',
      },
      { merge: true },
    ).catch(() => {
      throw apiError;
    });
    }
  },

  async deletePlatformCoupon(couponId: string) {
    try {
      const token = await getAdminIdToken();
      const response = await fetch(adminApiUrl('/admin/coupons'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponId }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Unable to delete this coupon.'));
      }
      return;
    } catch (apiError) {
      await deleteDoc(platformCouponDoc(couponId)).catch(() => {
        throw apiError;
      });
    }
  },

  async updateUserSubscription(
    userId: string,
    patch: {
      subscriptionPlan: SubscriptionPlan;
      subscriptionStatus?: SubscriptionStatus;
      renewalDate?: string;
    },
  ) {
    const timestamp = nowIso();
    const nextPlan = normalizeSubscriptionPlan(patch.subscriptionPlan);
    const nextStatus = normalizeSubscriptionStatus(patch.subscriptionStatus);
    const nextRenewalDate = patch.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const token = await getAdminIdToken();
      const response = await fetch(adminApiUrl('/admin/users/subscription'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscriptionPlan: nextPlan,
          subscriptionStatus: nextStatus,
          renewalDate: nextRenewalDate,
          updatedAt: timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Unable to update this user subscription.'));
      }
      return;
    } catch (apiError) {
      const existing = await getDoc(userDoc(userId));
      const current = existing.exists() ? (existing.data() as Partial<UserProfileDoc>) : {};
      await setDoc(
        userDoc(userId),
        {
          userId,
          subscriptionPlan: nextPlan,
          subscriptionStatus: nextStatus,
          renewalDate: nextRenewalDate,
          subscriptionHistory: arrayUnion({
            id: createId(),
            fromPlan: normalizeSubscriptionPlan(current.subscriptionPlan),
            toPlan: nextPlan,
            status: nextStatus,
            renewalDate: nextRenewalDate,
            changedAt: timestamp,
            changedBy: auth?.currentUser?.email || 'super_admin',
          }),
          updatedAt: timestamp,
        },
        { merge: true },
      ).catch(() => {
        throw apiError;
      });
    }
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
    const contactId = createId();
    const timestamp = nowIso();
    const batch = writeBatch(requireDb());
    batch.set(ref, {
      ...buildCustomerPayload(payload, actorName),
      canonicalContactId: contactId,
      userId: workspaceUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    batch.set(doc(requireDb(), 'users', workspaceUserId, 'crmContacts', contactId), {
      id: contactId,
      businessId: workspaceUserId,
      createdBy: user.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
      type: 'customer',
      name: payload.customerName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      companyId: '',
      companyName: '',
      address: payload.address.trim(),
      city: payload.location.trim(),
      state: '',
      country: 'India',
      status: 'Active',
      source: 'Customer workspace',
      assignedTo: payload.ownerId || '',
      tagIds: [],
      notes: payload.notes.trim(),
      lastActivityAt: timestamp,
      customFields: { legacyCustomerId: ref.id },
    });
    await batch.commit();
    return ref.id;
  },

  async updateCustomer(userId: string, customerId: string, patch: Partial<Omit<CustomerProject, 'id'>>) {
    const timestamp = nowIso();
    const currentSnapshot = await getDoc(customerDoc(userId, customerId));
    const currentCustomer = currentSnapshot.exists() ? normalizeCustomer(customerId, currentSnapshot.data() as Partial<CustomerProject>) : null;
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

    const batch = writeBatch(requireDb());
    batch.update(customerDoc(userId, customerId), nextPayload);
    if (currentCustomer?.canonicalContactId) {
      batch.set(
        doc(requireDb(), 'users', userId, 'crmContacts', currentCustomer.canonicalContactId),
        {
          ...(patch.customerName !== undefined ? { name: patch.customerName.trim() } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
          ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
          ...(patch.address !== undefined ? { address: patch.address.trim() } : {}),
          ...(patch.location !== undefined ? { city: patch.location.trim() } : {}),
          ...(patch.ownerId !== undefined ? { assignedTo: patch.ownerId } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
          updatedAt: timestamp,
          lastActivityAt: timestamp,
        },
        { merge: true },
      );
    }
    await batch.commit();
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
      permissions: payload.permissions?.length ? payload.permissions : ['view', 'create', 'edit'],
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
      ...(patch.permissions ? { permissions: patch.permissions } : {}),
      updatedAt: timestamp,
    };

    await updateDoc(memberRef, nextPatch);

    const authUid = patch.authUid || currentMember?.authUid;
    if (authUid) {
      const nextAllowedViews = patch.allowedViews ? filterDashboardViews(patch.allowedViews) : currentMember?.allowedViews || [];
      const nextPermissions = patch.permissions || currentMember?.permissions || ['view', 'create', 'edit'];
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
          subscriptionPlan: normalizeSubscriptionPlan(ownerProfile?.subscriptionPlan),
          subscriptionStatus: normalizeSubscriptionStatus(ownerProfile?.subscriptionStatus),
          renewalDate: ownerProfile?.renewalDate || '',
          sidebarViews: nextAllowedViews,
          permissions: nextPermissions,
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
    payload: Pick<TeamMember, 'name' | 'phone' | 'authUid' | 'loginEmail' | 'allowedViews' | 'permissions' | 'loginEnabled'>,
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
        permissions: payload.permissions?.length ? payload.permissions : ['view', 'create', 'edit'],
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
      | 'supplierGstin'
      | 'hsnSac'
      | 'size'
      | 'color'
      | 'variantLabel'
      | 'branchId'
      | 'damagedStock'
      | 'purchaseOrderNumber'
      | 'goodsReceiptNumber'
      | 'physicalCount'
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
      lastPhysicalCountAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, itemPayload);
    return ref.id;
  },

  async updateInventoryItem(userId: string, itemId: string, patch: Partial<InventoryItem>) {
    const timestamp = nowIso();
    const existingSnapshot = await getDoc(inventoryItemDoc(userId, itemId));
    const existing = existingSnapshot.data() as InventoryItem | undefined;
    const stockWasManuallyUpdated = typeof patch.currentStock === 'number' && patch.currentStock !== existing?.currentStock;

    await updateDoc(inventoryItemDoc(userId, itemId), {
      ...patch,
      ...(stockWasManuallyUpdated ? { lastRestockedAt: timestamp } : {}),
      updatedAt: timestamp,
    });
  },

  async deleteInventoryItem(userId: string, itemId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(inventoryItemDoc(userId, itemId));
    await batch.commit();
  },

  async saveCashRegisterMenuItems(
    userId: string,
    items: Array<Omit<CashRegisterMenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }>,
  ) {
    const timestamp = nowIso();
    const batch = writeBatch(requireDb());

    const categories = items.map((item) => item.category);
    items.forEach((item) => {
      const ref = item.id ? cashRegisterMenuItemDoc(userId, item.id) : doc(usersCollection(userId, 'cashRegisterMenuItems'));
      batch.set(
        ref,
        {
          name: item.name.trim(),
          category: item.category.trim() || 'Other',
          description: item.description?.trim() || '',
          price: Number(item.price || 0),
          taxRate: Number(item.taxRate ?? defaultBillingDefaults.defaultTaxRate),
          barcodeValue: item.barcodeValue.trim(),
          iconKey: item.iconKey || 'cup',
          active: item.active,
          sortHint: Number(item.sortHint ?? 0),
          sizes: item.sizes.map((size) => ({
            id: size.id || createId(),
            label: size.label.trim(),
            price: Number(size.price || 0),
          })),
          createdAt: item.createdAt || timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    });
    await batch.commit();
    try {
      const categoryBatch = writeBatch(requireDb());
      upsertCategorySuggestions(categoryBatch, categories, timestamp);
      await categoryBatch.commit();
    } catch {
      // Global category suggestions are best-effort and should never block register item creation.
    }
  },

  async updateCashRegisterMenuItem(userId: string, itemId: string, patch: Partial<CashRegisterMenuItem>) {
    const timestamp = nowIso();
    const batch = writeBatch(requireDb());
    batch.set(
      cashRegisterMenuItemDoc(userId, itemId),
      {
        ...patch,
        updatedAt: timestamp,
      },
      { merge: true },
    );
    await batch.commit();
    if (patch.category) {
      try {
        const categoryBatch = writeBatch(requireDb());
        upsertCategorySuggestions(categoryBatch, [patch.category], timestamp);
        await categoryBatch.commit();
      } catch {
        // Global category suggestions are best-effort.
      }
    }
  },

  async saveCashRegisterCategorySuggestion(category: string) {
    const timestamp = nowIso();
    const batch = writeBatch(requireDb());
    upsertCategorySuggestions(batch, [category], timestamp);
    await batch.commit();
  },

  async deleteCashRegisterMenuItem(userId: string, itemId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(cashRegisterMenuItemDoc(userId, itemId));
    await batch.commit();
  },

  async addFinanceEntry(
    userId: string,
    payload: Pick<FinanceEntry, 'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'linkedCustomerName' | 'projectTitle' | 'notes' | 'employeeMemberId' | 'employeeName' | 'paycheckNumber' | 'payPeriodLabel' | 'paymentMethod' | 'issuedBy' | 'referenceDate' | 'transactionFlow' | 'autoGenerated' | 'autoGroupKey'> & { accountingSource?: AccountingSource },
  ) {
    const ref = doc(usersCollection(userId, 'financeEntries'));
    const timestamp = nowIso();
    await setDoc(ref, {
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
      accountingSource: payload.accountingSource || 'manual',
    });
    return ref.id;
  },

  async addWeeklyMiscRecord(
    userId: string,
    payload: Pick<WeeklyMiscRecord, 'title' | 'amount' | 'spentAt' | 'notes' | 'weekKey'>,
  ) {
    const ref = doc(usersCollection(userId, 'weeklyMiscRecords'));
    const timestamp = nowIso();
    await setDoc(ref, {
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return ref.id;
  },

  async deleteWeeklyMiscRecord(userId: string, recordId: string) {
    const batch = writeBatch(requireDb());
    batch.delete(weeklyMiscRecordDoc(userId, recordId));
    await batch.commit();
  },

  async clearWeeklyMiscRecords(userId: string, recordIds: string[]) {
    if (!recordIds.length) return;
    const batch = writeBatch(requireDb());
    recordIds.forEach((recordId) => {
      batch.delete(weeklyMiscRecordDoc(userId, recordId));
    });
    await batch.commit();
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
      accountingSource: 'salary',
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
      taxMode?: GstTaxMode;
      customerGstin?: string;
      placeOfSupply?: string;
      discountAmount?: number;
      documentType?: SalesDocumentType;
      validUntil?: string;
      documentPrefix?: string;
      notes: string;
      billedBy: string;
      lineItems: SalesInvoiceLineItem[];
    },
  ) {
    const timestamp = nowIso();
    const ref = payload.draftId ? salesInvoiceDoc(userId, payload.draftId) : doc(usersCollection(userId, 'salesInvoices'));
    const subtotal = payload.lineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const totals = calculateInvoiceTotals(subtotal, payload.discountAmount || 0, payload.taxRate, payload.taxMode || 'intra_state');
    const isQuotation = payload.documentType === 'quotation';
    const draftNumber = isQuotation
      ? salesDocumentNumber(userId, ref.id, timestamp, 'quotation', payload.documentPrefix)
      : `DRAFT-${ref.id.slice(0, 6).toUpperCase()}`;

    await setDoc(
      ref,
      {
        invoiceNumber: draftNumber,
        status: isQuotation ? 'quotation' : 'draft',
        documentType: isQuotation ? 'quotation' : 'invoice',
        businessBarcodeKey: buildBusinessBarcodeKey(userId),
        customerName: payload.customerName.trim() || 'Walk-in customer',
        customerGstin: payload.customerGstin?.trim() || '',
        placeOfSupply: payload.placeOfSupply?.trim() || '',
        taxMode: payload.taxMode || 'intra_state',
        paymentStatus: payload.paymentStatus,
        paymentMethod: payload.paymentMethod,
        lineItems: payload.lineItems,
        subtotal,
        ...totals,
        taxRate: payload.taxRate,
        notes: payload.notes.trim(),
        billedBy: payload.billedBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        validUntil: payload.validUntil || '',
      },
      { merge: true },
    );

    return {
      invoiceId: ref.id,
      invoiceNumber: draftNumber,
      subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
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
      taxMode?: GstTaxMode;
      customerGstin?: string;
      placeOfSupply?: string;
      discountAmount?: number;
      documentPrefix?: string;
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
        hsnSac: item.hsnSac || line.hsnSac || '',
      });
    }

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const totals = calculateInvoiceTotals(subtotal, payload.discountAmount || 0, payload.taxRate, payload.taxMode || 'intra_state');
    const invoiceNumber = salesDocumentNumber(userId, invoiceRef.id, timestamp, 'invoice', payload.documentPrefix);
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
      documentType: 'invoice',
      businessBarcodeKey,
      customerName: payload.customerName.trim() || 'Walk-in customer',
      customerGstin: payload.customerGstin?.trim() || '',
      placeOfSupply: payload.placeOfSupply?.trim() || '',
      taxMode: payload.taxMode || 'intra_state',
      paymentStatus: payload.paymentStatus,
      paymentMethod: payload.paymentMethod,
      lineItems,
      subtotal,
      ...totals,
      taxRate: payload.taxRate,
      notes: payload.notes.trim(),
      billedBy: payload.billedBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    batch.set(financeEntryDoc(userId, financeRef.id), {
      title: invoiceNumber,
      kind: 'income',
      category: 'client_payment',
      amount: totals.totalAmount,
      status: payload.paymentStatus,
      dueAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      projectTitle: 'Barcode desk sale',
      sourceInvoiceId: invoiceRef.id,
      accountingSource: 'invoice',
      referenceDate: timestamp,
      notes: payload.notes.trim() || `Generated from barcode billing for ${payload.customerName.trim() || 'Walk-in customer'}.`,
    });

    await batch.commit();

    return {
      invoiceId: invoiceRef.id,
      invoiceNumber,
      subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      lineItems,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  async completeCashRegisterSale(
    userId: string,
    payload: {
      existingInvoiceId?: string;
      customerName: string;
      paymentStatus: InvoicePaymentStatus;
      paymentMethod: InvoicePaymentMethod;
      taxRate: number;
      taxMode?: GstTaxMode;
      customerGstin?: string;
      placeOfSupply?: string;
      discountAmount?: number;
      documentPrefix?: string;
      notes: string;
      billedBy: string;
      lineItems: SalesInvoiceLineItem[];
    },
  ) {
    if (!payload.lineItems.length) {
      throw new Error('Add at least one item before finalizing the cash register bill.');
    }

    const timestamp = nowIso();
    const invoiceRef = payload.existingInvoiceId ? salesInvoiceDoc(userId, payload.existingInvoiceId) : doc(usersCollection(userId, 'salesInvoices'));
    const financeRef = doc(usersCollection(userId, 'financeEntries'));
    const businessBarcodeKey = buildBusinessBarcodeKey(userId);
    const lineItems = payload.lineItems.map((line) => ({
      inventoryItemId: line.inventoryItemId,
      barcodeValue: line.barcodeValue,
      itemName: line.itemName,
      sku: line.sku,
      quantity: Number(line.quantity || 1),
      unitPrice: Number(line.unitPrice || 0),
      lineSubtotal: Number(line.lineSubtotal || line.unitPrice * line.quantity || 0),
    }));
    const subtotal = lineItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const totals = calculateInvoiceTotals(subtotal, payload.discountAmount || 0, payload.taxRate, payload.taxMode || 'intra_state');
    const invoiceNumber = salesDocumentNumber(userId, invoiceRef.id, timestamp, 'invoice', payload.documentPrefix);
    const batch = writeBatch(requireDb());

    batch.set(salesInvoiceDoc(userId, invoiceRef.id), {
      invoiceNumber,
      status: 'finalized',
      documentType: 'invoice',
      businessBarcodeKey,
      customerName: payload.customerName.trim() || 'Walk-in customer',
      customerGstin: payload.customerGstin?.trim() || '',
      placeOfSupply: payload.placeOfSupply?.trim() || '',
      taxMode: payload.taxMode || 'intra_state',
      paymentStatus: payload.paymentStatus,
      paymentMethod: payload.paymentMethod,
      lineItems,
      subtotal,
      ...totals,
      taxRate: payload.taxRate,
      notes: payload.notes.trim(),
      billedBy: payload.billedBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    batch.set(financeEntryDoc(userId, financeRef.id), {
      title: invoiceNumber,
      kind: 'income',
      category: 'client_payment',
      amount: totals.totalAmount,
      status: payload.paymentStatus,
      dueAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      projectTitle: 'Cash register sale',
      sourceInvoiceId: invoiceRef.id,
      accountingSource: 'invoice',
      referenceDate: timestamp,
      paymentMethod: payload.paymentMethod,
      issuedBy: payload.billedBy,
      notes: payload.notes.trim() || `Generated from cash register for ${payload.customerName.trim() || 'Walk-in customer'}.`,
    });

    await batch.commit();

    return {
      invoiceId: invoiceRef.id,
      invoiceNumber,
      subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
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

  async voidSalesInvoice(userId: string, invoiceId: string, voidedBy: string, reason: string) {
    const invoiceRef = salesInvoiceDoc(userId, invoiceId);
    const invoiceSnapshot = await getDoc(invoiceRef);
    if (!invoiceSnapshot.exists()) throw new Error('Invoice not found.');
    const invoice = normalizeSalesInvoice(invoiceId, invoiceSnapshot.data() as Partial<SalesInvoice>);
    if (invoice.status !== 'finalized') throw new Error('Only finalized invoices can be voided.');

    const timestamp = nowIso();
    const batch = writeBatch(requireDb());
    for (const line of invoice.lineItems) {
      if (!line.inventoryItemId || line.inventoryItemId.startsWith('cash-')) continue;
      const itemRef = inventoryItemDoc(userId, line.inventoryItemId);
      const itemSnapshot = await getDoc(itemRef);
      if (!itemSnapshot.exists()) continue;
      const item = normalizeInventoryItem(line.inventoryItemId, itemSnapshot.data() as Partial<InventoryItem>);
      const nextStock = item.currentStock + line.quantity;
      batch.update(itemRef, {
        currentStock: nextStock,
        updatedAt: timestamp,
        status: getInventoryStatus(nextStock, item.minimumStock, item.condition),
      });
    }

    const financeSnapshot = await getDocs(query(usersCollection(userId, 'financeEntries'), where('sourceInvoiceId', '==', invoiceId)));
    financeSnapshot.docs.forEach((entry) => {
      batch.update(entry.ref, {
        amount: 0,
        status: 'paid',
        updatedAt: timestamp,
        notes: `${String(entry.data().notes || '')}\nVoided invoice ${invoice.invoiceNumber}: ${reason.trim() || 'No reason supplied.'}`.trim(),
      });
    });

    batch.update(invoiceRef, {
      status: 'voided',
      voidedAt: timestamp,
      voidedBy,
      voidReason: reason.trim() || 'Voided by authorized user.',
      updatedAt: timestamp,
    });
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
  async clockIn(userId: string, teamMemberId: string) {
    const timestamp = nowIso();
    const entryId = createId();
    const ref = doc(usersCollection(userId, 'timesheets'), entryId);
    const entry: Partial<TimesheetEntry> = {
      userId: teamMemberId,
      date: timestamp.split('T')[0],
      clockInTime: timestamp,
    };
    await setDoc(ref, entry);
  },
  async clockOut(userId: string, entryId: string, totalMinutes: number) {
    const ref = doc(usersCollection(userId, 'timesheets'), entryId);
    await updateDoc(ref, {
      clockOutTime: nowIso(),
      totalMinutes,
    });
  },
  async requestLeave(userId: string, payload: Partial<LeaveRequest>) {
    const leaveId = createId();
    const ref = doc(usersCollection(userId, 'leaveRequests'), leaveId);
    const entry: Partial<LeaveRequest> = {
      ...payload,
      status: 'pending',
      createdAt: nowIso(),
    };
    await setDoc(ref, entry);
  },
  async updateLeaveStatus(userId: string, leaveId: string, status: 'pending' | 'approved' | 'rejected') {
    const ref = doc(usersCollection(userId, 'leaveRequests'), leaveId);
    await updateDoc(ref, { status });
  },
};
