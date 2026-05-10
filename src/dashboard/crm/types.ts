import type { TaskPriority } from '../types';

export type CrmRole = 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'viewer';
export type CrmModule = 'contacts' | 'companies' | 'leads' | 'deals' | 'tasks' | 'pipelines' | 'products';
export type CrmFieldType = 'text' | 'number' | 'dropdown' | 'multi_select' | 'date' | 'boolean' | 'currency' | 'phone' | 'email' | 'url' | 'long_text' | 'file';
export type CrmContactType = 'lead' | 'customer' | 'vendor' | 'partner' | 'prospect' | 'custom';
export type CrmLeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
export type CrmDealStatus = 'open' | 'won' | 'lost';
export type CrmTaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type CrmTaskType = 'call' | 'meeting' | 'email' | 'whatsapp' | 'visit' | 'payment_follow_up' | 'custom';
export type CrmCommunicationType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'visit' | 'message' | 'other';
export type CrmWorkflowTrigger = 'lead_created' | 'deal_stage_changed' | 'task_overdue' | 'deal_won' | 'deal_lost' | 'follow_up_due';
export type CrmWorkflowAction = 'create_task' | 'add_tag' | 'assign_owner' | 'add_note' | 'update_status' | 'send_notification';
export type CrmEntityType = 'contact' | 'company' | 'lead' | 'deal' | 'task' | 'pipeline' | 'tag';
export type CrmNotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'reminder';

export type CrmPermission =
  | 'view_crm'
  | 'create_records'
  | 'edit_records'
  | 'delete_records'
  | 'assign_records'
  | 'view_all_records'
  | 'manage_settings'
  | 'manage_pipelines'
  | 'export_data';

export type CrmCustomValue = string | number | boolean | string[] | null;

export interface CrmBaseRecord {
  id: string;
  businessId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CrmSettings {
  id: 'main';
  businessId: string;
  defaultPipelineId: string;
  defaultCurrency: string;
  leadSources: string[];
  lostReasons: string[];
  wonReasons: string[];
  taskTypes: CrmTaskType[];
  defaultView: 'dashboard' | 'contacts' | 'leads' | 'deals' | 'kanban' | 'tasks' | 'reports';
  rolePermissions: Record<CrmRole, CrmPermission[]>;
  createdAt: string;
  updatedAt: string;
}

export interface CrmTag extends CrmBaseRecord {
  name: string;
  color: string;
  description: string;
}

export interface CrmCustomFieldDefinition extends CrmBaseRecord {
  module: CrmModule;
  label: string;
  key: string;
  type: CrmFieldType;
  options: string[];
  required: boolean;
  visible: boolean;
  order: number;
}

export type CrmCustomFields = Record<string, CrmCustomValue>;

export interface CrmPipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  isWon?: boolean;
  isLost?: boolean;
}

export interface CrmPipeline extends CrmBaseRecord {
  name: string;
  description: string;
  module: 'leads' | 'deals' | 'service' | 'onboarding' | 'support' | 'custom';
  stages: CrmPipelineStage[];
  active: boolean;
  customFields: CrmCustomFields;
}

export interface CrmCompany extends CrmBaseRecord {
  name: string;
  industry: string;
  size: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  notes: string;
  tagIds: string[];
  assignedTo: string;
  customFields: CrmCustomFields;
}

export interface CrmContact extends CrmBaseRecord {
  type: CrmContactType;
  name: string;
  phone: string;
  email: string;
  companyId: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: string;
  source: string;
  assignedTo: string;
  tagIds: string[];
  notes: string;
  lastActivityAt?: string;
  customFields: CrmCustomFields;
}

export interface CrmLead extends CrmBaseRecord {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  source: string;
  status: CrmLeadStatus;
  score: number;
  qualificationNotes: string;
  assignedTo: string;
  pipelineId: string;
  stageId: string;
  tagIds: string[];
  estimatedValue: number;
  expectedCloseDate: string;
  convertedContactId?: string;
  convertedDealId?: string;
  customFields: CrmCustomFields;
}

export interface CrmDeal extends CrmBaseRecord {
  name: string;
  value: number;
  expectedCloseDate: string;
  probability: number;
  status: CrmDealStatus;
  pipelineId: string;
  stageId: string;
  assignedTo: string;
  contactId: string;
  companyId: string;
  products: string[];
  notes: string;
  lostReason: string;
  wonReason: string;
  stageEnteredAt: string;
  stageDurations: Record<string, number>;
  tagIds: string[];
  customFields: CrmCustomFields;
}

export interface CrmTask extends CrmBaseRecord {
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  status: CrmTaskStatus;
  assignedTo: string;
  relatedEntityType?: CrmEntityType;
  relatedEntityId?: string;
  reminder: boolean;
  type: CrmTaskType;
  customFields: CrmCustomFields;
}

export interface CrmNote extends CrmBaseRecord {
  entityType: CrmEntityType;
  entityId: string;
  body: string;
}

export interface CrmActivity extends CrmBaseRecord {
  entityType: CrmEntityType;
  entityId: string;
  action: string;
  title: string;
  description: string;
  actorName: string;
}

export interface CrmCommunicationLog extends CrmBaseRecord {
  entityType: CrmEntityType;
  entityId: string;
  type: CrmCommunicationType;
  summary: string;
  outcome: string;
  nextFollowUpAt?: string;
  actorName: string;
}

export interface CrmWorkflowRule extends CrmBaseRecord {
  name: string;
  active: boolean;
  trigger: CrmWorkflowTrigger;
  conditions: Array<{ field: string; operator: string; value: CrmCustomValue }>;
  actions: Array<{ type: CrmWorkflowAction; payload: Record<string, CrmCustomValue> }>;
}

export interface CrmNotification extends CrmBaseRecord {
  channel: CrmNotificationChannel;
  title: string;
  body: string;
  recipientUserId: string;
  readAt?: string;
  relatedEntityType?: CrmEntityType;
  relatedEntityId?: string;
}

export interface CrmImportJob extends CrmBaseRecord {
  module: 'contacts' | 'leads' | 'deals';
  fileName: string;
  status: 'draft' | 'validating' | 'completed' | 'failed';
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errors: string[];
}

export interface CrmData {
  settings: CrmSettings;
  contacts: CrmContact[];
  companies: CrmCompany[];
  leads: CrmLead[];
  deals: CrmDeal[];
  pipelines: CrmPipeline[];
  tasks: CrmTask[];
  notes: CrmNote[];
  activities: CrmActivity[];
  tags: CrmTag[];
  fields: CrmCustomFieldDefinition[];
  communications: CrmCommunicationLog[];
  workflows: CrmWorkflowRule[];
  notifications: CrmNotification[];
  importJobs: CrmImportJob[];
}

export type CrmCollectionName =
  | 'crmContacts'
  | 'crmCompanies'
  | 'crmLeads'
  | 'crmDeals'
  | 'crmPipelines'
  | 'crmTasks'
  | 'crmNotes'
  | 'crmActivities'
  | 'crmTags'
  | 'crmCustomFields'
  | 'crmCommunications'
  | 'crmWorkflows'
  | 'crmNotifications'
  | 'crmImportJobs';
