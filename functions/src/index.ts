import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_WORKFLOW_ID = defineString('OPENAI_WORKFLOW_ID');

type AccountType = 'owner' | 'team_member' | 'super_admin';
type SubscriptionPlan = 'freemium' | 'focused' | 'growth' | 'business_pro';
type SubscriptionStatus = 'active' | 'trialing' | 'paused' | 'cancelled';
type CouponStatus = 'active' | 'paused' | 'expired';

type WorkspaceProfile = {
  accountType?: AccountType;
  companyName?: string;
  userName?: string;
  email?: string;
  phone?: string;
  businessType?: string;
  city?: string;
  workspaceOwnerId?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  renewalDate?: string;
  subscriptionHistory?: SubscriptionHistoryItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

type TeamMemberSummary = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  loginEnabled: boolean;
  authUid?: string;
  loginEmail?: string;
};

type SubscriptionHistoryItem = {
  id?: string;
  fromPlan?: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewalDate: string;
  changedAt: string;
  changedBy?: string;
};

type PlatformBusinessAccount = {
  userId: string;
  hashedUserId: string;
  accountType: AccountType;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  renewalDate: string;
  teamMemberIds: string[];
  teamAuthUids: string[];
  teamMemberCount: number;
  teamMembers: TeamMemberSummary[];
  subscriptionHistory: SubscriptionHistoryItem[];
  authCreatedAt?: string;
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
};

type PlatformCouponWriteBody = {
  couponId?: string | null;
  code?: unknown;
  description?: unknown;
  discountPercent?: unknown;
  status?: unknown;
  appliesToPlans?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
  maxRedemptions?: unknown;
};

type PlatformCouponDeleteBody = {
  couponId?: unknown;
};

type AnalyticsScope =
  | 'snapshot'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'finance'
  | 'team'
  | 'operations'
  | 'timesheets';

type FirestoreRow = Record<string, unknown> & { id: string };

type CrmEntityType = 'contact' | 'company' | 'lead' | 'deal' | 'task' | 'pipeline' | 'tag';
type CrmWorkflowTrigger = 'lead_created' | 'deal_stage_changed' | 'task_overdue' | 'deal_won' | 'deal_lost' | 'followup_due';
type CrmWorkflowActionType = 'create_task' | 'add_tag' | 'assign_owner' | 'add_note' | 'update_status' | 'send_notification';
type CrmWorkflowAction = {
  type?: CrmWorkflowActionType;
  payload?: Record<string, unknown>;
};
type CrmWorkflowRule = FirestoreRow & {
  name?: string;
  active?: boolean;
  trigger?: CrmWorkflowTrigger;
  actions?: CrmWorkflowAction[];
};
type CrmWorkflowRunBody = {
  trigger?: CrmWorkflowTrigger;
  entityType?: CrmEntityType;
  entityId?: string;
  actorName?: string;
};

const db = getFirestore();
const superAdminEmails = new Set(['superadmin@pulalabs.com', 'superadmin@aivyapari.com']);
const crmCollectionByEntity: Partial<Record<CrmEntityType, string>> = {
  contact: 'crmContacts',
  company: 'crmCompanies',
  lead: 'crmLeads',
  deal: 'crmDeals',
  task: 'crmTasks',
  pipeline: 'crmPipelines',
  tag: 'crmTags',
};

const json = (response: Parameters<Parameters<typeof onRequest>[0]>[1], status: number, body: unknown) => {
  response.status(status).json(body);
};

const readJsonBody = <T>(body: unknown): T => {
  if (!body || typeof body !== 'object') return {} as T;
  return body as T;
};

const getBearerToken = (authorizationHeader: string | string[] | undefined) => {
  const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

const requireOwnerProfile = async (authorizationHeader: string | string[] | undefined) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error('MISSING_AUTH_TOKEN');
  }

  const decoded = await getAuth().verifyIdToken(token);
  const profileSnapshot = await db.doc(`users/${decoded.uid}`).get();

  if (!profileSnapshot.exists) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const profile = profileSnapshot.data() as WorkspaceProfile;
  if ((profile.accountType || 'owner') !== 'owner') {
    throw new Error('OWNER_ONLY');
  }

  return {
    uid: decoded.uid,
    email: decoded.email || profile.email || '',
    profile,
  };
};

const requireSuperAdmin = async (authorizationHeader: string | string[] | undefined) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error('MISSING_AUTH_TOKEN');
  }

  const decoded = await getAuth().verifyIdToken(token);
  const email = (decoded.email || '').toLowerCase();
  if (!superAdminEmails.has(email)) {
    const profileSnapshot = await db.doc(`users/${decoded.uid}`).get();
    const profile = profileSnapshot.exists ? (profileSnapshot.data() as WorkspaceProfile) : null;
    if (profile?.accountType !== 'super_admin') {
      throw new Error('SUPER_ADMIN_ONLY');
    }
  }

  return {
    uid: decoded.uid,
    email,
  };
};

const shortUserId = (userId: string) =>
  userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || userId.slice(0, 8).toUpperCase();

const normalizeSubscriptionPlan = (plan?: unknown): SubscriptionPlan =>
  plan === 'focused' || plan === 'growth' || plan === 'business_pro' ? plan : 'freemium';

const normalizeSubscriptionStatus = (status?: unknown): SubscriptionStatus =>
  status === 'trialing' || status === 'paused' || status === 'cancelled' ? status : 'active';
const normalizeCouponStatus = (status?: unknown): CouponStatus =>
  status === 'paused' || status === 'expired' ? status : 'active';
const normalizeCouponPlans = (plans?: unknown): SubscriptionPlan[] => {
  const source = Array.isArray(plans) ? plans : ['focused', 'growth', 'business_pro'];
  const normalized = source.map((plan) => normalizeSubscriptionPlan(plan));
  return Array.from(new Set(normalized));
};

const toIsoString = (value: unknown, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback;
  }
  return fallback;
};

const listAllAuthUsers = async () => {
  const users = [];
  let pageToken: string | undefined;

  do {
    const result = await getAuth().listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
};

const loadTeamMemberIndex = async () => {
  const snapshot = await db.collectionGroup('teamMembers').get();
  const index = new Map<string, { teamMemberIds: string[]; teamAuthUids: string[]; teamMemberCount: number; teamMembers: TeamMemberSummary[] }>();

  snapshot.docs.forEach((item) => {
    const ownerId = item.ref.parent.parent?.id;
    if (!ownerId) return;
    const data = item.data() as Partial<TeamMemberSummary>;
    const current = index.get(ownerId) ?? { teamMemberIds: [], teamAuthUids: [], teamMemberCount: 0, teamMembers: [] };
    current.teamMemberIds.push(item.id);
    if (data.authUid) current.teamAuthUids.push(data.authUid);
    current.teamMemberCount += 1;
    current.teamMembers.push({
      id: item.id,
      name: data.name || 'Team member',
      role: data.role || 'Team member',
      email: data.email || data.loginEmail || '',
      phone: data.phone || '',
      status: data.status || 'offline',
      loginEnabled: Boolean(data.loginEnabled),
      authUid: data.authUid,
      loginEmail: data.loginEmail,
    });
    index.set(ownerId, current);
  });

  return index;
};

const buildAdminUsersPayload = async () => {
  const [authUsers, profileSnapshot, teamIndex] = await Promise.all([
    listAllAuthUsers(),
    db.collection('users').get(),
    loadTeamMemberIndex(),
  ]);
  const authByUid = new Map(authUsers.map((user) => [user.uid, user]));
  const profileByUid = new Map(profileSnapshot.docs.map((item) => [item.id, item.data() as WorkspaceProfile]));
  const allUserIds = new Set([...authByUid.keys(), ...profileByUid.keys()]);
  const users: PlatformBusinessAccount[] = [];

  allUserIds.forEach((userId) => {
    const authUser = authByUid.get(userId);
    const profile = profileByUid.get(userId);
    const email = profile?.email || authUser?.email || '';
    const accountType = profile?.accountType || 'owner';
    const lowerEmail = email.toLowerCase();

    if (accountType === 'super_admin' || superAdminEmails.has(lowerEmail)) return;
    if (accountType === 'team_member') return;

    const authCreatedAt = toIsoString(authUser?.metadata.creationTime);
    const lastSignInAt = toIsoString(authUser?.metadata.lastSignInTime);
    const name = profile?.userName || authUser?.displayName || email.split('@')[0] || 'Unknown user';
    const createdAt = toIsoString(profile?.createdAt, authCreatedAt || new Date(0).toISOString());
    const updatedAt = toIsoString(profile?.updatedAt, lastSignInAt || createdAt);
    const team = teamIndex.get(userId) ?? { teamMemberIds: [], teamAuthUids: [], teamMemberCount: 0, teamMembers: [] };

    users.push({
      userId,
      hashedUserId: shortUserId(userId),
      accountType,
      companyName: profile?.companyName || `${name} Workspace`,
      ownerName: name,
      email,
      phone: profile?.phone || authUser?.phoneNumber || '',
      businessType: profile?.businessType || 'general_business',
      subscriptionPlan: normalizeSubscriptionPlan(profile?.subscriptionPlan),
      subscriptionStatus: normalizeSubscriptionStatus(profile?.subscriptionStatus),
      renewalDate: toIsoString(profile?.renewalDate),
      teamMemberIds: team.teamMemberIds,
      teamAuthUids: team.teamAuthUids,
      teamMemberCount: team.teamMemberCount,
      teamMembers: team.teamMembers,
      subscriptionHistory: Array.isArray(profile?.subscriptionHistory) ? profile.subscriptionHistory : [],
      authCreatedAt,
      lastSignInAt,
      createdAt,
      updatedAt,
    });
  });

  return users.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

const updateAdminUserSubscription = async (body: {
  userId?: string;
  subscriptionPlan?: unknown;
  subscriptionStatus?: unknown;
  renewalDate?: unknown;
}, changedBy: string) => {
  const userId = String(body.userId || '').trim();
  if (!userId) throw new Error('INVALID_ADMIN_USER_REQUEST');

  const authUser = await getAuth().getUser(userId).catch(() => null);
  const ref = db.doc(`users/${userId}`);
  const existing = await ref.get();
  const profile = existing.exists ? (existing.data() as WorkspaceProfile) : {};
  const email = profile.email || authUser?.email || '';
  const ownerName = profile.userName || authUser?.displayName || email.split('@')[0] || 'User';
  const timestamp = new Date().toISOString();
  const nextPlan = normalizeSubscriptionPlan(body.subscriptionPlan);
  const nextStatus = normalizeSubscriptionStatus(body.subscriptionStatus);
  const nextRenewalDate = toIsoString(body.renewalDate, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
  const historyItem: SubscriptionHistoryItem = {
    id: db.collection('_ids').doc().id,
    fromPlan: normalizeSubscriptionPlan(profile.subscriptionPlan),
    toPlan: nextPlan,
    status: nextStatus,
    renewalDate: nextRenewalDate,
    changedAt: timestamp,
    changedBy,
  };

  await ref.set(
    {
      userId,
      accountType: profile.accountType || 'owner',
      userName: ownerName,
      companyName: profile.companyName || `${ownerName} Workspace`,
      email,
      phone: profile.phone || authUser?.phoneNumber || '',
      businessType: profile.businessType || 'general_business',
      subscriptionPlan: nextPlan,
      subscriptionStatus: nextStatus,
      renewalDate: nextRenewalDate,
      subscriptionHistory: FieldValue.arrayUnion(historyItem),
      createdAt: toIsoString(profile.createdAt, toIsoString(authUser?.metadata.creationTime, timestamp)),
      updatedAt: timestamp,
    },
    { merge: true },
  );
};

const saveAdminCoupon = async (body: PlatformCouponWriteBody, changedBy: string) => {
  const timestamp = new Date().toISOString();
  const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!code) {
    throw new Error('COUPON_CODE_REQUIRED');
  }

  const couponId = String(body.couponId || code.toLowerCase()).trim();
  const ref = db.doc(`platformCoupons/${couponId}`);
  const existing = await ref.get();
  const existingData = existing.exists ? existing.data() || {} : {};

  await ref.set(
    {
      id: couponId,
      code,
      description: String(body.description || '').trim(),
      discountPercent: Math.min(100, Math.max(0, Number(body.discountPercent || 0))),
      status: normalizeCouponStatus(body.status),
      appliesToPlans: normalizeCouponPlans(body.appliesToPlans),
      validFrom: String(body.validFrom || ''),
      validUntil: String(body.validUntil || ''),
      maxRedemptions: Math.max(0, Number(body.maxRedemptions || 0)),
      redeemedCount: Math.max(0, Number(existingData.redeemedCount || 0)),
      createdAt: String(existingData.createdAt || timestamp),
      updatedAt: timestamp,
      createdBy: String(existingData.createdBy || changedBy || 'super_admin'),
      updatedBy: changedBy || 'super_admin',
    },
    { merge: true },
  );
};

const deleteAdminCoupon = async (body: PlatformCouponDeleteBody) => {
  const couponId = String(body.couponId || '').trim();
  if (!couponId) {
    throw new Error('COUPON_ID_REQUIRED');
  }

  await db.doc(`platformCoupons/${couponId}`).delete();
};

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toDate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const yyyyMmDd = (date: Date) => date.toISOString().slice(0, 10);

const parseDateRange = (body: { startDate?: string; endDate?: string; year?: number }) => {
  if (body.startDate && body.endDate) {
    return {
      start: new Date(`${body.startDate}T00:00:00.000+05:30`),
      end: new Date(`${body.endDate}T23:59:59.999+05:30`),
    };
  }

  if (body.year) {
    return {
      start: new Date(`${body.year}-01-01T00:00:00.000+05:30`),
      end: new Date(`${body.year}-12-31T23:59:59.999+05:30`),
    };
  }

  const now = new Date();
  const today = yyyyMmDd(now);
  return {
    start: new Date(`${today}T00:00:00.000+05:30`),
    end: new Date(`${today}T23:59:59.999+05:30`),
  };
};

const getCollection = async (ownerUid: string, collectionName: string) => {
  const snapshot = await db.collection('users').doc(ownerUid).collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreRow[];
};

const filterByCreatedAt = (rows: FirestoreRow[], start: Date, end: Date) =>
  rows.filter((row) => {
    const date = toDate(row.createdAt);
    return date ? date >= start && date <= end : false;
  });

const summarizeSales = (salesInvoices: FirestoreRow[], start: Date, end: Date) => {
  const finalizedInvoices = filterByCreatedAt(salesInvoices, start, end).filter((invoice) => invoice.status !== 'draft');
  const lineItemMap = new Map<string, { itemName: string; quantity: number; revenue: number }>();

  for (const invoice of finalizedInvoices) {
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    for (const line of lineItems) {
      const key = String(line.inventoryItemId || line.itemName || 'unknown');
      const current = lineItemMap.get(key) || {
        itemName: String(line.itemName || 'Unknown item'),
        quantity: 0,
        revenue: 0,
      };
      current.quantity += toNumber(line.quantity);
      current.revenue += toNumber(line.lineSubtotal);
      lineItemMap.set(key, current);
    }
  }

  return {
    startDate: yyyyMmDd(start),
    endDate: yyyyMmDd(end),
    invoiceCount: finalizedInvoices.length,
    paidInvoiceCount: finalizedInvoices.filter((invoice) => invoice.paymentStatus === 'paid').length,
    pendingInvoiceCount: finalizedInvoices.filter((invoice) => invoice.paymentStatus === 'pending').length,
    subtotal: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.subtotal), 0),
    taxAmount: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.taxAmount), 0),
    totalRevenue: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0),
    topProducts: Array.from(lineItemMap.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 10),
    recentInvoices: finalizedInvoices
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 10)
      .map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        totalAmount: toNumber(invoice.totalAmount),
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
      })),
  };
};

const summarizeInventory = (inventory: FirestoreRow[], salesInvoices: FirestoreRow[]) => {
  const soldQuantityByItem = new Map<string, number>();
  for (const invoice of salesInvoices.filter((item) => item.status !== 'draft')) {
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    for (const line of lineItems) {
      const key = String(line.inventoryItemId || '');
      if (!key) continue;
      soldQuantityByItem.set(key, (soldQuantityByItem.get(key) || 0) + toNumber(line.quantity));
    }
  }

  const items = inventory.map((item) => {
    const currentStock = toNumber(item.currentStock);
    const minimumStock = toNumber(item.minimumStock);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock,
      reservedStock: toNumber(item.reservedStock),
      minimumStock,
      reorderQuantity: toNumber(item.reorderQuantity),
      stockValue: currentStock * toNumber(item.costPerUnit),
      sellingValue: currentStock * toNumber(item.sellingPrice),
      status: currentStock <= 0 ? 'out-of-stock' : currentStock <= minimumStock ? 'low-stock' : 'in-stock',
      supplierName: item.supplierName,
      storageLocation: item.storageLocation,
      soldQuantity: soldQuantityByItem.get(item.id) || 0,
    };
  });

  return {
    totalItems: items.length,
    totalUnitsInStock: items.reduce((sum, item) => sum + item.currentStock, 0),
    totalStockCostValue: items.reduce((sum, item) => sum + item.stockValue, 0),
    totalStockSellingValue: items.reduce((sum, item) => sum + item.sellingValue, 0),
    lowStockCount: items.filter((item) => item.status === 'low-stock').length,
    outOfStockCount: items.filter((item) => item.status === 'out-of-stock').length,
    lowStockItems: items
      .filter((item) => item.status !== 'in-stock')
      .sort((left, right) => left.currentStock - right.currentStock)
      .slice(0, 25),
    topMovingItems: [...items].sort((left, right) => right.soldQuantity - left.soldQuantity).slice(0, 10),
  };
};

const summarizeCustomers = (customers: FirestoreRow[]) => {
  const byStage = customers.reduce<Record<string, number>>((current, customer) => {
    const stage = String(customer.stage || 'unknown');
    current[stage] = (current[stage] || 0) + 1;
    return current;
  }, {});

  return {
    totalCustomers: customers.length,
    byStage,
    needsFollowUp: customers.filter((customer) => Boolean(customer.needsFollowUp)).length,
    renderPending: customers.filter((customer) => Boolean(customer.renderPending)).length,
    pinned: customers.filter((customer) => Boolean(customer.pinned)).length,
    activeCustomers: customers
      .filter((customer) => customer.stage !== 'completed' && customer.stage !== 'on_hold')
      .slice(0, 20)
      .map((customer) => ({
        customerName: customer.customerName,
        company: customer.company,
        title: customer.title,
        stage: customer.stage,
        priority: customer.priority,
        progress: toNumber(customer.progress),
        nextFollowUpAt: customer.nextFollowUpAt,
        quoteValue: toNumber(
          customer.quote && typeof customer.quote === 'object' && 'quoteValue' in customer.quote
            ? customer.quote.quoteValue
            : 0,
        ),
      })),
  };
};

const summarizeFinance = (financeEntries: FirestoreRow[], weeklyMiscRecords: FirestoreRow[]) => {
  const income = financeEntries.filter((entry) => entry.kind === 'income');
  const expenses = financeEntries.filter((entry) => entry.kind === 'expense');

  return {
    totalIncome: income.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    totalExpenses: expenses.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    pendingReceivables: income.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    pendingPayables: expenses.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    weeklyMiscTotal: weeklyMiscRecords.reduce((sum, record) => sum + toNumber(record.amount), 0),
    recentEntries: financeEntries
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 15)
      .map((entry) => ({
        title: entry.title,
        kind: entry.kind,
        category: entry.category,
        amount: toNumber(entry.amount),
        status: entry.status,
        dueAt: entry.dueAt,
      })),
  };
};

const buildAnalyticsPayload = async (ownerUid: string, body: { scope?: AnalyticsScope; startDate?: string; endDate?: string; year?: number }) => {
  const scope = body.scope || 'snapshot';
  const [inventory, salesInvoices, customers, team, tasks, financeEntries, weeklyMiscRecords, timesheets, leaveRequests] = await Promise.all([
    getCollection(ownerUid, 'inventoryItems'),
    getCollection(ownerUid, 'salesInvoices'),
    getCollection(ownerUid, 'customers'),
    getCollection(ownerUid, 'teamMembers'),
    getCollection(ownerUid, 'tasks'),
    getCollection(ownerUid, 'financeEntries'),
    getCollection(ownerUid, 'weeklyMiscRecords'),
    getCollection(ownerUid, 'timesheets'),
    getCollection(ownerUid, 'leaveRequests'),
  ]);
  const { start, end } = parseDateRange(body);

  const common = {
    generatedAt: new Date().toISOString(),
    scope,
  };

  const inventorySummary = summarizeInventory(inventory, salesInvoices);
  const salesSummary = summarizeSales(salesInvoices, start, end);
  const customerSummary = summarizeCustomers(customers);
  const financeSummary = summarizeFinance(financeEntries, weeklyMiscRecords);

  if (scope === 'inventory') return { ...common, inventory: inventorySummary };
  if (scope === 'sales') return { ...common, sales: salesSummary };
  if (scope === 'customers') return { ...common, customers: customerSummary };
  if (scope === 'finance') return { ...common, finance: financeSummary };
  if (scope === 'team') {
    return {
      ...common,
      team: {
        totalMembers: team.length,
        loginEnabled: team.filter((member) => Boolean(member.loginEnabled)).length,
        online: team.filter((member) => member.status === 'online').length,
        busy: team.filter((member) => member.status === 'busy').length,
        members: team.map((member) => ({
          name: member.name,
          role: member.role,
          status: member.status,
          activeProjects: toNumber(member.activeProjects),
          workload: toNumber(member.workload),
        })),
      },
    };
  }
  if (scope === 'operations') {
    return {
      ...common,
      operations: {
        openTasks: tasks.filter((task) => !task.done).length,
        completedTasks: tasks.filter((task) => Boolean(task.done)).length,
        overdueTasks: tasks.filter((task) => !task.done && toDate(task.dueAt) && toDate(task.dueAt)! < new Date()).length,
        upcomingTasks: tasks
          .filter((task) => !task.done)
          .sort((left, right) => String(left.dueAt || '').localeCompare(String(right.dueAt || '')))
          .slice(0, 15)
          .map((task) => ({
            title: task.title,
            dueAt: task.dueAt,
            priority: task.priority,
          })),
      },
    };
  }
  if (scope === 'timesheets') {
    return {
      ...common,
      timesheets: {
        entries: timesheets.length,
        leaveRequests: leaveRequests.length,
        pendingLeaves: leaveRequests.filter((leave) => leave.status === 'pending').length,
        approvedLeaves: leaveRequests.filter((leave) => leave.status === 'approved').length,
      },
    };
  }

  return {
    ...common,
    inventory: inventorySummary,
    sales: salesSummary,
    customers: customerSummary,
    finance: financeSummary,
    team: {
      totalMembers: team.length,
      loginEnabled: team.filter((member) => Boolean(member.loginEnabled)).length,
    },
    operations: {
      openTasks: tasks.filter((task) => !task.done).length,
      completedTasks: tasks.filter((task) => Boolean(task.done)).length,
    },
    timesheets: {
      entries: timesheets.length,
      pendingLeaves: leaveRequests.filter((leave) => leave.status === 'pending').length,
    },
  };
};

const crmDoc = (ownerUid: string, collectionName: string, id: string) =>
  db.collection('users').doc(ownerUid).collection(collectionName).doc(id);

const writeCrmActivity = async (
  ownerUid: string,
  createdBy: string,
  actorName: string,
  entityType: CrmEntityType,
  entityId: string,
  action: string,
  title: string,
  description: string,
) => {
  const activityRef = db.collection('users').doc(ownerUid).collection('crmActivities').doc();
  const timestamp = new Date().toISOString();
  await activityRef.set({
    id: activityRef.id,
    businessId: ownerUid,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    entityType,
    entityId,
    action,
    title,
    description,
    actorName,
  });
};

const runServerCrmWorkflows = async (ownerUid: string, actorId: string, body: CrmWorkflowRunBody) => {
  if (!body.trigger || !body.entityType || !body.entityId) {
    throw new Error('INVALID_CRM_WORKFLOW_REQUEST');
  }

  const collectionName = crmCollectionByEntity[body.entityType];
  if (!collectionName) {
    throw new Error('INVALID_CRM_ENTITY_TYPE');
  }

  const actorName = body.actorName || 'CRM automation';
  const workflowSnapshot = await db
    .collection('users')
    .doc(ownerUid)
    .collection('crmWorkflows')
    .where('trigger', '==', body.trigger)
    .where('active', '==', true)
    .get();

  const workflows = workflowSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CrmWorkflowRule);
  let executedActions = 0;

  for (const workflow of workflows) {
    for (const action of workflow.actions || []) {
      const payload = action.payload || {};
      const timestamp = new Date().toISOString();
      executedActions += 1;

      if (action.type === 'create_task') {
        const taskRef = db.collection('users').doc(ownerUid).collection('crmTasks').doc();
        const dueInHours = Math.max(1, Number(payload.dueInHours || 24));
        await taskRef.set({
          id: taskRef.id,
          businessId: ownerUid,
          createdBy: actorId,
          createdAt: timestamp,
          updatedAt: timestamp,
          title: String(payload.title || `Follow up ${body.entityType}`),
          description: String(payload.description || `Auto-created by workflow: ${workflow.name || 'Workflow'}`),
          dueAt: new Date(Date.now() + dueInHours * 60 * 60 * 1000).toISOString(),
          priority: String(payload.priority || 'medium'),
          status: 'open',
          assignedTo: String(payload.assignedTo || actorId),
          relatedEntityType: body.entityType,
          relatedEntityId: body.entityId,
          reminder: true,
          type: String(payload.taskType || 'call'),
          customFields: {},
        });
      }

      if (action.type === 'add_note') {
        const noteRef = db.collection('users').doc(ownerUid).collection('crmNotes').doc();
        await noteRef.set({
          id: noteRef.id,
          businessId: ownerUid,
          createdBy: actorId,
          createdAt: timestamp,
          updatedAt: timestamp,
          entityType: body.entityType,
          entityId: body.entityId,
          body: String(payload.body || `Workflow note from ${workflow.name || 'Workflow'}`),
        });
      }

      if (action.type === 'assign_owner' || action.type === 'update_status' || action.type === 'add_tag') {
        const targetRef = crmDoc(ownerUid, collectionName, body.entityId);
        const patch: Record<string, unknown> = { updatedAt: timestamp };
        if (action.type === 'assign_owner') patch.assignedTo = String(payload.assignedTo || actorId);
        if (action.type === 'update_status') patch.status = String(payload.status || 'open');
        if (action.type === 'add_tag') {
          const tagId = String(payload.tagId || '');
          if (tagId) {
            const current = await targetRef.get();
            const tagIds = Array.isArray(current.data()?.tagIds) ? current.data()?.tagIds as string[] : [];
            patch.tagIds = Array.from(new Set([...tagIds, tagId]));
          }
        }
        await targetRef.set(patch, { merge: true });
      }

      if (action.type === 'send_notification') {
        const notificationRef = db.collection('users').doc(ownerUid).collection('crmNotifications').doc();
        await notificationRef.set({
          id: notificationRef.id,
          businessId: ownerUid,
          createdBy: actorId,
          createdAt: timestamp,
          updatedAt: timestamp,
          channel: String(payload.channel || 'in_app'),
          title: String(payload.title || workflow.name || 'CRM workflow'),
          body: String(payload.body || `Workflow ${workflow.name || 'Workflow'} ran for ${body.entityType}.`),
          recipientUserId: String(payload.recipientUserId || actorId),
          relatedEntityType: body.entityType,
          relatedEntityId: body.entityId,
        });
      }
    }
  }

  if (!workflows.length) {
    const notificationRef = db.collection('users').doc(ownerUid).collection('crmNotifications').doc();
    const timestamp = new Date().toISOString();
    await notificationRef.set({
      id: notificationRef.id,
      businessId: ownerUid,
      createdBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      channel: 'in_app',
      title: 'Workflow trigger ready',
      body: `No active rules yet for ${body.trigger}.`,
      recipientUserId: actorId,
      relatedEntityType: body.entityType,
      relatedEntityId: body.entityId,
    });
  }

  await writeCrmActivity(
    ownerUid,
    actorId,
    actorName,
    body.entityType,
    body.entityId,
    'workflow_evaluated',
    'Workflow automation',
    workflows.length ? `${workflows.length} workflow rules ran with ${executedActions} actions.` : `Trigger ${body.trigger} evaluated with no active rules.`,
  );

  return {
    workflowsEvaluated: workflows.length,
    actionsExecuted: executedActions,
  };
};

const createMcpServer = (authorizationHeader: string | string[] | undefined) => {
  const server = new McpServer({
    name: 'pulabiz-business-data',
    version: '1.0.0',
  });

  const analyticsSchema = {
    scope: z.enum(['snapshot', 'inventory', 'sales', 'customers', 'finance', 'team', 'operations', 'timesheets']).default('snapshot'),
    startDate: z.string().optional().describe('Inclusive start date in YYYY-MM-DD format.'),
    endDate: z.string().optional().describe('Inclusive end date in YYYY-MM-DD format.'),
    year: z.number().int().min(2000).max(2100).optional().describe('Calendar year for annual reports.'),
  };

  server.registerTool(
    'get_business_analytics',
    {
      title: 'Get business analytics',
      description: 'Read-only analytics for the authenticated Pulabiz business owner across sales, inventory, customers, finance, team, operations, and timesheets.',
      inputSchema: analyticsSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_today_sales',
    {
      title: 'Get today sales',
      description: 'Read-only sales report for today in the business timezone.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'sales' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_year_sales_report',
    {
      title: 'Get year sales report',
      description: 'Read-only sales report for a calendar year.',
      inputSchema: {
        year: z.number().int().min(2000).max(2100).describe('Calendar year.'),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ year }) => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'sales', year });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_inventory_summary',
    {
      title: 'Get inventory summary',
      description: 'Read-only stock, low stock, out-of-stock, and inventory value summary.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'inventory' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  return server;
};

export const api = onRequest(
  {
    region: 'asia-south1',
    invoker: 'public',
    secrets: [OPENAI_API_KEY],
  },
  async (request, response) => {
    response.set('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      const pathname = request.path.replace(/^\/api/, '') || request.path;

      if (pathname === '/health') {
        json(response, 200, { ok: true });
        return;
      }

      if (pathname === '/mcp') {
        const server = createMcpServer(request.headers.authorization);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        response.on('close', () => {
          void transport.close();
          void server.close();
        });

        await server.connect(transport);
        await transport.handleRequest(request, response, request.body);
        return;
      }

      if (pathname === '/chatkit/session') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const owner = await requireOwnerProfile(request.headers.authorization);
        const workflowId = OPENAI_WORKFLOW_ID.value() || process.env.OPENAI_WORKFLOW_ID;
        const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY;

        if (!workflowId || !apiKey) {
          json(response, 503, {
            error: 'Copilot is not configured yet.',
            missing: {
              openaiWorkflowId: !workflowId,
              openaiApiKey: !apiKey,
            },
          });
          return;
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chatkit/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'chatkit_beta=v1',
          },
          body: JSON.stringify({
            workflow: { id: workflowId },
            user: owner.uid,
          }),
        });

        const payload = await openaiResponse.json();
        if (!openaiResponse.ok) {
          json(response, openaiResponse.status, {
            error: 'Unable to create a ChatKit session.',
            details: payload,
          });
          return;
        }

        json(response, 200, {
          client_secret: payload.client_secret,
        });
        return;
      }

      if (pathname === '/admin/users') {
        if (request.method !== 'GET') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        await requireSuperAdmin(request.headers.authorization);
        const users = await buildAdminUsersPayload();
        json(response, 200, { users });
        return;
      }

      if (pathname === '/admin/users/subscription') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const admin = await requireSuperAdmin(request.headers.authorization);
        await updateAdminUserSubscription(readJsonBody(request.body), admin.email);
        json(response, 200, { ok: true });
        return;
      }

      if (pathname === '/admin/coupons') {
        const admin = await requireSuperAdmin(request.headers.authorization);

        if (request.method === 'POST') {
          await saveAdminCoupon(readJsonBody(request.body), admin.email);
          json(response, 200, { ok: true });
          return;
        }

        if (request.method === 'DELETE') {
          await deleteAdminCoupon(readJsonBody(request.body));
          json(response, 200, { ok: true });
          return;
        }

        json(response, 405, { error: 'Method not allowed.' });
        return;
      }

      if (pathname === '/copilot/analytics') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const owner = await requireOwnerProfile(request.headers.authorization);
        const body = readJsonBody<{ scope?: AnalyticsScope; startDate?: string; endDate?: string; year?: number }>(request.body);
        const payload = await buildAnalyticsPayload(owner.uid, body);
        json(response, 200, payload);
        return;
      }

      if (pathname === '/crm/workflows/run') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const owner = await requireOwnerProfile(request.headers.authorization);
        const body = readJsonBody<CrmWorkflowRunBody>(request.body);
        const payload = await runServerCrmWorkflows(owner.uid, owner.uid, {
          ...body,
          actorName: body.actorName || owner.profile.userName || owner.profile.companyName || owner.email || 'CRM automation',
        });
        json(response, 200, payload);
        return;
      }

      json(response, 404, { error: 'API route not found.' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'MISSING_AUTH_TOKEN') {
          json(response, 401, { error: 'Sign in before using the business copilot.' });
          return;
        }
        if (error.message === 'PROFILE_NOT_FOUND') {
          json(response, 404, { error: 'Business profile not found.' });
          return;
        }
        if (error.message === 'OWNER_ONLY') {
          json(response, 403, { error: 'Only the business owner can use the business copilot.' });
          return;
        }
        if (error.message === 'SUPER_ADMIN_ONLY') {
          json(response, 403, { error: 'Only the platform super admin can use this admin action.' });
          return;
        }
        if (error.message === 'INVALID_ADMIN_USER_REQUEST') {
          json(response, 400, { error: 'Invalid admin user request.' });
          return;
        }
        if (error.message === 'INVALID_CRM_WORKFLOW_REQUEST' || error.message === 'INVALID_CRM_ENTITY_TYPE') {
          json(response, 400, { error: 'Invalid CRM workflow request.' });
          return;
        }
      }

      console.error(error);
      json(response, 500, { error: 'Business copilot backend failed.' });
    }
  },
);
