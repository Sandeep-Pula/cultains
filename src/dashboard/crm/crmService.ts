import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { createId } from '../../lib/id';
import { buildDefaultCrmSettings, buildDefaultPipeline, DEFAULT_CRM_PIPELINE_ID } from './defaults';
import type {
  CrmActivity,
  CrmCollectionName,
  CrmCommunicationLog,
  CrmCompany,
  CrmContact,
  CrmCustomFieldDefinition,
  CrmData,
  CrmDeal,
  CrmEntityType,
  CrmImportJob,
  CrmLead,
  CrmNote,
  CrmNotification,
  CrmPipeline,
  CrmSettings,
  CrmTag,
  CrmTask,
  CrmWorkflowRule,
  CrmWorkflowTrigger,
} from './types';

type Listener = (data: CrmData) => void;
type ErrorListener = (error: Error) => void;

const requireDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  return db;
};

const nowIso = () => new Date().toISOString();
const userCollection = (workspaceId: string, collectionName: CrmCollectionName) =>
  collection(requireDb(), 'users', workspaceId, collectionName);
const userDoc = (workspaceId: string, collectionName: CrmCollectionName, id: string) =>
  doc(requireDb(), 'users', workspaceId, collectionName, id);
const settingsDoc = (workspaceId: string) => doc(requireDb(), 'users', workspaceId, 'crmSettings', 'main');

const entityCollectionMap: Partial<Record<CrmEntityType, CrmCollectionName>> = {
  contact: 'crmContacts',
  company: 'crmCompanies',
  lead: 'crmLeads',
  deal: 'crmDeals',
  task: 'crmTasks',
  pipeline: 'crmPipelines',
  tag: 'crmTags',
};
const collectionEntityMap: Partial<Record<CrmCollectionName, CrmEntityType>> = {
  crmContacts: 'contact',
  crmCompanies: 'company',
  crmLeads: 'lead',
  crmDeals: 'deal',
  crmTasks: 'task',
  crmPipelines: 'pipeline',
  crmTags: 'tag',
};

const notDeleted = <T extends { deletedAt?: string }>(items: T[]) => items.filter((item) => !item.deletedAt);
const sortNewest = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

const normalizeSettings = (workspaceId: string, value?: Partial<CrmSettings>): CrmSettings => ({
  ...buildDefaultCrmSettings(workspaceId),
  ...value,
  id: 'main',
  businessId: workspaceId,
  rolePermissions: {
    ...buildDefaultCrmSettings(workspaceId).rolePermissions,
    ...(value?.rolePermissions ?? {}),
  },
  leadSources: value?.leadSources?.length ? value.leadSources : buildDefaultCrmSettings(workspaceId).leadSources,
  lostReasons: value?.lostReasons?.length ? value.lostReasons : buildDefaultCrmSettings(workspaceId).lostReasons,
  wonReasons: value?.wonReasons?.length ? value.wonReasons : buildDefaultCrmSettings(workspaceId).wonReasons,
  taskTypes: value?.taskTypes?.length ? value.taskTypes : buildDefaultCrmSettings(workspaceId).taskTypes,
});

const withBase = <T extends { id: string; businessId: string; createdAt: string; updatedAt: string; createdBy: string }>(
  workspaceId: string,
  id: string,
  value: Partial<T>,
  createdBy = '',
) => ({
  ...value,
  id,
  businessId: workspaceId,
  createdBy: value.createdBy || createdBy,
  createdAt: value.createdAt || nowIso(),
  updatedAt: value.updatedAt || nowIso(),
}) as T;

const createActivityPayload = (
  workspaceId: string,
  createdBy: string,
  actorName: string,
  entityType: CrmEntityType,
  entityId: string,
  action: string,
  title: string,
  description: string,
): CrmActivity => ({
  id: createId(),
  businessId: workspaceId,
  createdBy,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  entityType,
  entityId,
  action,
  title,
  description,
  actorName,
});

const parseSnapshot = <T extends { id: string; businessId: string; createdAt: string; updatedAt: string; createdBy: string }>(
  workspaceId: string,
  docs: Array<{ id: string; data: () => Partial<T> }>,
): T[] => sortNewest(notDeleted(docs.map((item) => withBase<T>(workspaceId, item.id, item.data())) as Array<T & { deletedAt?: string }>));

export const crmService = {
  async ensureDefaults(workspaceId: string, createdBy: string) {
    const timestamp = nowIso();
    await setDoc(settingsDoc(workspaceId), { ...buildDefaultCrmSettings(workspaceId), updatedAt: timestamp }, { merge: true });
    await setDoc(userDoc(workspaceId, 'crmPipelines', DEFAULT_CRM_PIPELINE_ID), buildDefaultPipeline(workspaceId, createdBy), { merge: true });
  },

  subscribe(workspaceId: string, createdBy: string, onData: Listener, onError: ErrorListener) {
    void this.ensureDefaults(workspaceId, createdBy).catch(onError);

    let settings = buildDefaultCrmSettings(workspaceId);
    let contacts: CrmContact[] = [];
    let companies: CrmCompany[] = [];
    let leads: CrmLead[] = [];
    let deals: CrmDeal[] = [];
    let pipelines: CrmPipeline[] = [buildDefaultPipeline(workspaceId, createdBy)];
    let tasks: CrmTask[] = [];
    let notes: CrmNote[] = [];
    let activities: CrmActivity[] = [];
    let tags: CrmTag[] = [];
    let fields: CrmCustomFieldDefinition[] = [];
    let communications: CrmCommunicationLog[] = [];
    let workflows: CrmWorkflowRule[] = [];
    let notifications: CrmNotification[] = [];
    let importJobs: CrmImportJob[] = [];

    const emit = () => onData({ settings, contacts, companies, leads, deals, pipelines, tasks, notes, activities, tags, fields, communications, workflows, notifications, importJobs });

    const unsubscribers = [
      onSnapshot(settingsDoc(workspaceId), (snapshot) => {
        settings = normalizeSettings(workspaceId, snapshot.data() as Partial<CrmSettings> | undefined);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmContacts'), (snapshot) => {
        contacts = parseSnapshot<CrmContact>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmCompanies'), (snapshot) => {
        companies = parseSnapshot<CrmCompany>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmLeads'), (snapshot) => {
        leads = parseSnapshot<CrmLead>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmDeals'), (snapshot) => {
        const next = parseSnapshot<CrmDeal>(workspaceId, snapshot.docs);
        deals = next.map((deal) => ({ ...deal, products: deal.products ?? [], tagIds: deal.tagIds ?? [], stageDurations: deal.stageDurations ?? {}, customFields: deal.customFields ?? {} }));
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmPipelines'), (snapshot) => {
        const next = parseSnapshot<CrmPipeline>(workspaceId, snapshot.docs);
        pipelines = next.length ? next.map((pipeline) => ({ ...pipeline, stages: [...(pipeline.stages ?? [])].sort((left, right) => left.order - right.order), customFields: pipeline.customFields ?? {} })) : [buildDefaultPipeline(workspaceId, createdBy)];
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmTasks'), (snapshot) => {
        tasks = parseSnapshot<CrmTask>(workspaceId, snapshot.docs).map((task) => ({ ...task, customFields: task.customFields ?? {} }));
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmNotes'), (snapshot) => {
        notes = parseSnapshot<CrmNote>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmActivities'), (snapshot) => {
        activities = parseSnapshot<CrmActivity>(workspaceId, snapshot.docs).slice(0, 250);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmTags'), (snapshot) => {
        tags = parseSnapshot<CrmTag>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmCustomFields'), (snapshot) => {
        fields = parseSnapshot<CrmCustomFieldDefinition>(workspaceId, snapshot.docs).sort((left, right) => left.order - right.order);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmCommunications'), (snapshot) => {
        communications = parseSnapshot<CrmCommunicationLog>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmWorkflows'), (snapshot) => {
        workflows = parseSnapshot<CrmWorkflowRule>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmNotifications'), (snapshot) => {
        notifications = parseSnapshot<CrmNotification>(workspaceId, snapshot.docs);
        emit();
      }, onError),
      onSnapshot(userCollection(workspaceId, 'crmImportJobs'), (snapshot) => {
        importJobs = parseSnapshot<CrmImportJob>(workspaceId, snapshot.docs);
        emit();
      }, onError),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  },

  async upsert<T extends { id?: string }>(
    workspaceId: string,
    collectionName: CrmCollectionName,
    payload: T,
    createdBy: string,
  ) {
    const id = payload.id || createId();
    const timestamp = nowIso();
    await setDoc(
      userDoc(workspaceId, collectionName, id),
      {
        ...payload,
        id,
        businessId: workspaceId,
        createdBy,
        createdAt: (payload as { createdAt?: string }).createdAt || timestamp,
        updatedAt: timestamp,
      },
      { merge: true },
    );
    const entityType = collectionEntityMap[collectionName];
    if (entityType) {
      const activity = createActivityPayload(
        workspaceId,
        createdBy,
        createdBy,
        entityType,
        id,
        payload.id ? 'updated' : 'created',
        payload.id ? 'Record updated' : 'Record created',
        `${collectionName} ${payload.id ? 'updated' : 'created'}.`,
      );
      await setDoc(userDoc(workspaceId, 'crmActivities', activity.id), activity);
    }
    return id;
  },

  async softDelete(workspaceId: string, collectionName: CrmCollectionName, id: string, actorId = '') {
    await updateDoc(userDoc(workspaceId, collectionName, id), { deletedAt: nowIso(), updatedAt: nowIso() });
    const entityType = collectionEntityMap[collectionName];
    if (entityType) {
      await this.addActivity(workspaceId, actorId, actorId || 'System', entityType, id, 'deleted', 'Record deleted', `${collectionName} was soft deleted.`);
    }
  },

  async hardDelete(workspaceId: string, collectionName: CrmCollectionName, id: string) {
    await deleteDoc(userDoc(workspaceId, collectionName, id));
  },

  async addActivity(workspaceId: string, createdBy: string, actorName: string, entityType: CrmEntityType, entityId: string, action: string, title: string, description: string) {
    const activity = createActivityPayload(workspaceId, createdBy, actorName, entityType, entityId, action, title, description);
    await setDoc(userDoc(workspaceId, 'crmActivities', activity.id), activity);
    return activity.id;
  },

  async createContact(workspaceId: string, createdBy: string, actorName: string, payload: Omit<CrmContact, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    const id = await this.upsert(workspaceId, 'crmContacts', { ...payload, id: createId() }, createdBy);
    await this.addActivity(workspaceId, createdBy, actorName, 'contact', id, 'created', 'Contact created', payload.name);
    return id;
  },

  async createLead(workspaceId: string, createdBy: string, actorName: string, payload: Omit<CrmLead, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    const id = await this.upsert(workspaceId, 'crmLeads', { ...payload, id: createId() }, createdBy);
    await this.addActivity(workspaceId, createdBy, actorName, 'lead', id, 'created', 'Lead created', payload.name);
    await this.evaluateWorkflowPlaceholders(workspaceId, createdBy, actorName, 'lead_created', 'lead', id);
    return id;
  },

  async createDeal(workspaceId: string, createdBy: string, actorName: string, payload: Omit<CrmDeal, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    const id = await this.upsert(workspaceId, 'crmDeals', { ...payload, id: createId(), stageEnteredAt: payload.stageEnteredAt || nowIso() }, createdBy);
    await this.addActivity(workspaceId, createdBy, actorName, 'deal', id, 'created', 'Deal created', payload.name);
    return id;
  },

  async moveDealStage(workspaceId: string, createdBy: string, actorName: string, deal: CrmDeal, stageId: string) {
    const entered = new Date(deal.stageEnteredAt || deal.createdAt).getTime();
    const spentMs = Math.max(0, Date.now() - entered);
    await updateDoc(userDoc(workspaceId, 'crmDeals', deal.id), {
      stageId,
      stageEnteredAt: nowIso(),
      stageDurations: {
        ...(deal.stageDurations ?? {}),
        [deal.stageId]: (deal.stageDurations?.[deal.stageId] ?? 0) + spentMs,
      },
      updatedAt: nowIso(),
    });
    await this.addActivity(workspaceId, createdBy, actorName, 'deal', deal.id, 'stage_changed', 'Stage changed', `Deal moved to ${stageId}.`);
    await this.evaluateWorkflowPlaceholders(workspaceId, createdBy, actorName, 'deal_stage_changed', 'deal', deal.id);
  },

  async convertLead(workspaceId: string, createdBy: string, actorName: string, lead: CrmLead) {
    const batch = writeBatch(requireDb());
    const contactId = createId();
    const dealId = createId();
    const timestamp = nowIso();
    const contact: CrmContact = {
      id: contactId,
      businessId: workspaceId,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      type: 'customer',
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      companyId: '',
      companyName: lead.companyName,
      address: '',
      city: '',
      state: '',
      country: '',
      status: 'Active',
      source: lead.source,
      assignedTo: lead.assignedTo,
      tagIds: lead.tagIds,
      notes: lead.qualificationNotes,
      lastActivityAt: timestamp,
      customFields: lead.customFields,
    };
    const deal: CrmDeal = {
      id: dealId,
      businessId: workspaceId,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      name: `${lead.name} opportunity`,
      value: lead.estimatedValue,
      expectedCloseDate: lead.expectedCloseDate,
      probability: Math.max(lead.score, 25),
      status: 'open',
      pipelineId: lead.pipelineId,
      stageId: lead.stageId,
      assignedTo: lead.assignedTo,
      contactId,
      companyId: '',
      products: [],
      notes: lead.qualificationNotes,
      lostReason: '',
      wonReason: '',
      stageEnteredAt: timestamp,
      stageDurations: {},
      tagIds: lead.tagIds,
      customFields: {},
    };
    batch.set(userDoc(workspaceId, 'crmContacts', contactId), contact);
    batch.set(userDoc(workspaceId, 'crmDeals', dealId), deal);
    batch.update(userDoc(workspaceId, 'crmLeads', lead.id), { status: 'converted', convertedContactId: contactId, convertedDealId: dealId, updatedAt: timestamp });
    await batch.commit();
    await this.addActivity(workspaceId, createdBy, actorName, 'lead', lead.id, 'converted', 'Lead converted', `${lead.name} converted into contact and deal.`);
    return { contactId, dealId };
  },

  async logCommunication(workspaceId: string, createdBy: string, payload: Omit<CrmCommunicationLog, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    const id = await this.upsert(workspaceId, 'crmCommunications', { ...payload, id: createId() }, createdBy);
    await this.addActivity(workspaceId, createdBy, payload.actorName, payload.entityType, payload.entityId, 'communication_logged', `${payload.type} logged`, payload.summary);
    return id;
  },

  async addNote(workspaceId: string, createdBy: string, actorName: string, payload: Omit<CrmNote, 'id' | 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    const id = await this.upsert(workspaceId, 'crmNotes', { ...payload, id: createId() }, createdBy);
    await this.addActivity(workspaceId, createdBy, actorName, payload.entityType, payload.entityId, 'note_added', 'Note added', payload.body.slice(0, 160));
    return id;
  },

  async updateSettings(workspaceId: string, settings: CrmSettings) {
    await setDoc(settingsDoc(workspaceId), { ...settings, businessId: workspaceId, updatedAt: nowIso() }, { merge: true });
  },

  async markNotificationRead(workspaceId: string, notificationId: string) {
    await updateDoc(userDoc(workspaceId, 'crmNotifications', notificationId), {
      readAt: nowIso(),
      updatedAt: nowIso(),
    });
  },

  async runWorkflowOnServer(trigger: CrmWorkflowTrigger, entityType: CrmEntityType, entityId: string, actorName: string) {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/crm/workflows/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger, entityType, entityId, actorName }),
      });
      return response.ok;
    } catch (error) {
      console.warn('CRM server workflow runner unavailable; using client fallback.', error);
      return false;
    }
  },

  async evaluateWorkflowPlaceholders(workspaceId: string, createdBy: string, actorName: string, trigger: CrmWorkflowTrigger, entityType: CrmEntityType, entityId: string) {
    const ranOnServer = await this.runWorkflowOnServer(trigger, entityType, entityId, actorName);
    if (ranOnServer) return;

    const snapshot = await getDocs(query(userCollection(workspaceId, 'crmWorkflows'), where('trigger', '==', trigger), where('active', '==', true)));
    const workflows = snapshot.docs.map((item) => withBase<CrmWorkflowRule>(workspaceId, item.id, item.data() as Partial<CrmWorkflowRule>));
    let executedActions = 0;

    for (const workflow of workflows) {
      for (const action of workflow.actions ?? []) {
        executedActions += 1;
        const timestamp = nowIso();

        if (action.type === 'create_task') {
          const dueInHours = Number(action.payload.dueInHours ?? 24);
          const taskId = createId();
          await setDoc(userDoc(workspaceId, 'crmTasks', taskId), {
            id: taskId,
            businessId: workspaceId,
            createdBy,
            createdAt: timestamp,
            updatedAt: timestamp,
            title: String(action.payload.title || `Follow up ${entityType}`),
            description: String(action.payload.description || `Auto-created by workflow: ${workflow.name}`),
            dueAt: new Date(Date.now() + dueInHours * 60 * 60 * 1000).toISOString(),
            priority: action.payload.priority || 'medium',
            status: 'open',
            assignedTo: String(action.payload.assignedTo || createdBy),
            relatedEntityType: entityType,
            relatedEntityId: entityId,
            reminder: true,
            type: action.payload.taskType || 'call',
            customFields: {},
          });
        }

        if (action.type === 'add_note') {
          const noteId = createId();
          await setDoc(userDoc(workspaceId, 'crmNotes', noteId), {
            id: noteId,
            businessId: workspaceId,
            createdBy,
            createdAt: timestamp,
            updatedAt: timestamp,
            entityType,
            entityId,
            body: String(action.payload.body || `Workflow note from ${workflow.name}`),
          });
        }

        if (action.type === 'assign_owner' || action.type === 'update_status' || action.type === 'add_tag') {
          const collectionName = entityCollectionMap[entityType];
          if (collectionName) {
            const patch: Record<string, unknown> = { updatedAt: timestamp };
            if (action.type === 'assign_owner') patch.assignedTo = String(action.payload.assignedTo || createdBy);
            if (action.type === 'update_status') patch.status = String(action.payload.status || 'open');
            if (action.type === 'add_tag') {
              const tagId = String(action.payload.tagId || '');
              if (tagId) patch.tagIds = [tagId];
            }
            await setDoc(userDoc(workspaceId, collectionName, entityId), patch, { merge: true });
          }
        }

        if (action.type === 'send_notification') {
          const notificationId = createId();
          await setDoc(userDoc(workspaceId, 'crmNotifications', notificationId), {
            id: notificationId,
            businessId: workspaceId,
            createdBy,
            createdAt: timestamp,
            updatedAt: timestamp,
            channel: action.payload.channel || 'in_app',
            title: String(action.payload.title || workflow.name),
            body: String(action.payload.body || `Workflow ${workflow.name} ran for ${entityType}.`),
            recipientUserId: String(action.payload.recipientUserId || createdBy),
            relatedEntityType: entityType,
            relatedEntityId: entityId,
          });
        }
      }
    }

    if (!workflows.length) {
      const notification: CrmNotification = {
        id: createId(),
        businessId: workspaceId,
        createdBy,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        channel: 'in_app',
        title: 'Workflow trigger ready',
        body: `No active rules yet for ${trigger}.`,
        recipientUserId: createdBy,
        relatedEntityType: entityType,
        relatedEntityId: entityId,
      };
      await setDoc(userDoc(workspaceId, 'crmNotifications', notification.id), notification);
    }

    await this.addActivity(
      workspaceId,
      createdBy,
      actorName,
      entityType,
      entityId,
      'workflow_evaluated',
      'Workflow automation',
      workflows.length ? `${workflows.length} workflow rules ran with ${executedActions} actions.` : `Trigger ${trigger} evaluated with no active rules.`,
    );
  },
};
