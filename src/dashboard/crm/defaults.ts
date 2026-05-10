import type { CrmPermission, CrmPipeline, CrmSettings, CrmTaskType } from './types';

export const DEFAULT_CRM_PIPELINE_ID = 'default-sales-pipeline';

export const allCrmPermissions: CrmPermission[] = [
  'view_crm',
  'create_records',
  'edit_records',
  'delete_records',
  'assign_records',
  'view_all_records',
  'manage_settings',
  'manage_pipelines',
  'export_data',
];

export const defaultTaskTypes: CrmTaskType[] = ['call', 'meeting', 'email', 'whatsapp', 'visit', 'payment_follow_up', 'custom'];

export const buildDefaultCrmSettings = (businessId: string): CrmSettings => {
  const now = new Date().toISOString();
  return {
    id: 'main',
    businessId,
    defaultPipelineId: DEFAULT_CRM_PIPELINE_ID,
    defaultCurrency: 'INR',
    leadSources: ['Walk-in', 'Referral', 'Website', 'Social media', 'Campaign', 'Partner', 'Repeat customer', 'Other'],
    lostReasons: ['Price', 'No response', 'Competitor selected', 'Timeline mismatch', 'Not qualified', 'Other'],
    wonReasons: ['Best fit', 'Price accepted', 'Existing relationship', 'Fast response', 'Referral trust', 'Other'],
    taskTypes: defaultTaskTypes,
    defaultView: 'dashboard',
    rolePermissions: {
      owner: allCrmPermissions,
      admin: allCrmPermissions,
      manager: ['view_crm', 'create_records', 'edit_records', 'assign_records', 'view_all_records', 'manage_pipelines', 'export_data'],
      sales: ['view_crm', 'create_records', 'edit_records', 'assign_records'],
      support: ['view_crm', 'create_records', 'edit_records'],
      viewer: ['view_crm'],
    },
    createdAt: now,
    updatedAt: now,
  };
};

export const buildDefaultPipeline = (businessId: string, createdBy: string): CrmPipeline => {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_CRM_PIPELINE_ID,
    businessId,
    createdBy,
    createdAt: now,
    updatedAt: now,
    name: 'Sales pipeline',
    description: 'Configurable default pipeline for leads, deals, orders, service requests, and local business opportunities.',
    module: 'deals',
    active: true,
    customFields: {},
    stages: [
      { id: 'new', name: 'New', order: 10, probability: 10, color: '#dbeafe' },
      { id: 'contacted', name: 'Contacted', order: 20, probability: 25, color: '#e0e7ff' },
      { id: 'qualified', name: 'Qualified', order: 30, probability: 45, color: '#fef3c7' },
      { id: 'proposal', name: 'Proposal / Quote', order: 40, probability: 65, color: '#dcfce7' },
      { id: 'negotiation', name: 'Negotiation', order: 50, probability: 80, color: '#fce7f3' },
      { id: 'won', name: 'Won', order: 60, probability: 100, color: '#bbf7d0', isWon: true },
      { id: 'lost', name: 'Lost', order: 70, probability: 0, color: '#fee2e2', isLost: true },
    ],
  };
};
