import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  ActivityItem,
  CommunicationLog,
  CustomerProject,
  DashboardData,
  DeletedCustomerRecord,
  NoteItem,
  RenderRequest,
  TaskItem,
  TeamMember,
  InventoryItem,
} from '../types';
import { getInitials, getStageProgress, recalculateTeamMetrics, stageProgressMap } from '../utils';

type DashboardSnapshotListener = (data: DashboardData) => void;
type DashboardErrorListener = (error: Error) => void;

type UserProfileDoc = {
  userId: string;
  userName: string;
  companyName: string;
  email: string;
  recentlyViewedIds: string[];
  createdAt: string;
  updatedAt: string;
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

type TeamMemberPayload = Pick<TeamMember, 'name' | 'role' | 'email' | 'phone' | 'status'>;

const usersCollection = (userId: string, collectionName: string) =>
  collection(db, 'users', userId, collectionName);

const userDoc = (userId: string) => doc(db, 'users', userId);
const customerDoc = (userId: string, customerId: string) => doc(db, 'users', userId, 'customers', customerId);
const teamMemberDoc = (userId: string, memberId: string) => doc(db, 'users', userId, 'teamMembers', memberId);
const taskDoc = (userId: string, taskId: string) => doc(db, 'users', userId, 'tasks', taskId);
const inventoryItemDoc = (userId: string, itemId: string) => doc(db, 'users', userId, 'inventoryItems', itemId);
const deletedCustomerDoc = (userId: string, recordId: string) => doc(db, 'users', userId, 'deletedCustomers', recordId);

const nowIso = () => new Date().toISOString();

const getUserName = (user: User, preferredName?: string) =>
  preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'User';

const getCompanyName = (user: User, preferredName?: string) => {
  const baseName = preferredName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Workspace';
  return `${baseName} Studio`;
};

const emptyDashboardData = (user: User, profile?: Partial<UserProfileDoc>): DashboardData => ({
  companyName: profile?.companyName?.trim() || getCompanyName(user),
  userName: profile?.userName?.trim() || getUserName(user),
  team: [],
  inventory: [],
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
  role: value?.role || 'Lead Designer',
  email: value?.email || '',
  phone: value?.phone || '',
  avatar: value?.avatar || getInitials(value?.name || 'TM'),
  activeProjects: value?.activeProjects ?? 0,
  workload: value?.workload ?? 0,
  status: value?.status || 'offline',
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
  category: value?.category || 'Hardware & Tools',
  currentStock: value?.currentStock ?? 0,
  minimumStock: value?.minimumStock ?? 5,
  status: value?.status || 'in-stock',
  condition: value?.condition || 'new',
  costPerUnit: value?.costPerUnit ?? 0,
  lastRestockedAt: value?.lastRestockedAt || nowIso(),
  assignedTeamIds: value?.assignedTeamIds || [],
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

  async ensureUserProfile(user: User, preferredName?: string) {
    const ref = userDoc(user.uid);
    const timestamp = nowIso();
    const fallbackProfile: UserProfileDoc = {
      userId: user.uid,
      userName: getUserName(user, preferredName),
      companyName: getCompanyName(user, preferredName),
      email: user.email || '',
      recentlyViewedIds: [],
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
        email: data.email?.trim() || fallbackProfile.email,
        recentlyViewedIds: data.recentlyViewedIds ?? [],
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
    let profile: UserProfileDoc | null = null;
    let customers: CustomerProject[] = [];
    let team: TeamMember[] = [];
    let tasks: TaskItem[] = [];
    let deletedCustomers: DeletedCustomerRecord[] = [];
    let inventory: InventoryItem[] = [];

    const emit = () => {
      const base = emptyDashboardData(user, profile ?? undefined);
      onData({
        ...base,
        customers,
        team: recalculateTeamMetrics(team, customers, tasks),
        inventory,
        tasks,
        deletedCustomers,
      });
    };

    const unsubscribers = [
      onSnapshot(
        userDoc(user.uid),
        (snapshot) => {
          profile = snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        usersCollection(user.uid, 'customers'),
        (snapshot) => {
          customers = snapshot.docs
            .map((item) => normalizeCustomer(item.id, item.data() as Partial<CustomerProject>))
            .sort((left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime());
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        usersCollection(user.uid, 'teamMembers'),
        (snapshot) => {
          team = snapshot.docs
            .map((item) => normalizeTeamMember(item.id, item.data() as Partial<TeamMember>))
            .sort((left, right) => left.name.localeCompare(right.name));
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        usersCollection(user.uid, 'tasks'),
        (snapshot) => {
          tasks = snapshot.docs
            .map((item) => normalizeTask(item.id, item.data() as Partial<TaskItem>))
            .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        usersCollection(user.uid, 'deletedCustomers'),
        (snapshot) => {
          deletedCustomers = snapshot.docs
            .map((item) => normalizeDeletedCustomer(item.id, item.data() as Partial<DeletedCustomerRecord>))
            .sort((left, right) => new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime());
          emit();
        },
        (error) => onError(error),
      ),
      onSnapshot(
        usersCollection(user.uid, 'inventoryItems'),
        (snapshot) => {
          inventory = snapshot.docs
            .map((item) => normalizeInventoryItem(item.id, item.data() as Partial<InventoryItem>))
            .sort((left, right) => left.name.localeCompare(right.name));
          emit();
        },
        (error) => onError(error),
      ),
    ];

    return () => {
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

  async addCustomer(user: User, payload: CustomerCreatePayload, actorName: string) {
    const ref = doc(usersCollection(user.uid, 'customers'));
    const timestamp = nowIso();
    await setDoc(ref, {
      ...buildCustomerPayload(payload, actorName),
      userId: user.uid,
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
    const batch = writeBatch(db);
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
    await updateDoc(teamMemberDoc(userId, memberId), {
      ...patch,
      updatedAt: timestamp,
    });
  },

  async addInventoryItem(userId: string, payload: Pick<InventoryItem, 'name' | 'sku' | 'category' | 'currentStock' | 'minimumStock' | 'costPerUnit'>) {
    const ref = doc(usersCollection(userId, 'inventoryItems'));
    const timestamp = nowIso();
    const itemPayload = {
      ...payload,
      status: payload.currentStock <= payload.minimumStock ? (payload.currentStock === 0 ? 'out-of-stock' : 'low-stock') : 'in-stock',
      condition: 'new',
      lastRestockedAt: timestamp,
      assignedTeamIds: [],
      notes: '',
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
    const batch = writeBatch(db);
    batch.delete(inventoryItemDoc(userId, itemId));
    await batch.commit();
  },

  async removeTeamMember(userId: string, memberId: string, team: TeamMember[], customers: CustomerProject[], tasks: TaskItem[]) {
    const memberToRemove = team.find((member) => member.id === memberId);
    if (!memberToRemove) return;

    const remainingTeam = team.filter((member) => member.id !== memberId);
    const fallbackForRole = (role: TeamMember['role']) =>
      remainingTeam.find((member) => member.role === role)?.id ?? remainingTeam[0]?.id ?? '';

    const batch = writeBatch(db);

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
