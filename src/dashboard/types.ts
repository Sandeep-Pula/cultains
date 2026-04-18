export type DashboardView =
  | 'overview'
  | 'customers'
  | 'team'
  | 'inventory'
  | 'billing'
  | 'render-history'
  | 'crm'
  | 'settings'
  | 'profile';

export type ProjectStage =
  | 'inquiry'
  | 'consultation'
  | 'design_in_progress'
  | 'render_shared'
  | 'customer_approved'
  | 'execution_started'
  | 'completed'
  | 'on_hold';

export type SiteStatus = 'under_construction' | 'ready' | 'in_progress';
export type ProjectType = 'living_room' | 'bedroom' | 'office' | 'full_home' | 'kitchen' | 'retail';
export type RenderType = 'wallpaper' | 'curtain' | 'lighting' | 'combined';
export type RenderApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type CustomerPriority = 'low' | 'medium' | 'high';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SortOption = 'latest' | 'activity' | 'pending';
export type CommunicationChannel = 'call' | 'whatsapp' | 'meeting' | 'share_link' | 'comment';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'revised';
export type PaymentStage = 'not_started' | 'advance_received' | 'partial_paid' | 'paid';
export type RenderQueueStatus = 'queued' | 'in_progress' | 'done';
export type TeamRole = 'Lead Designer' | 'Visualizer' | 'Site Coordinator' | 'Sales Owner' | 'Field Staff';

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  email: string;
  phone: string;
  avatar: string;
  activeProjects: number;
  workload: number;
  status: 'online' | 'busy' | 'offline';
}

export interface NoteItem {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  content: string;
}

export interface ActivityItem {
  id: string;
  type: 'customer' | 'upload' | 'render' | 'share' | 'comment' | 'status';
  title: string;
  description: string;
  createdAt: string;
  actorName: string;
}

export interface RenderAsset {
  id: string;
  name: string;
  type: RenderType;
  version: string;
  createdAt: string;
  imageUrl: string;
  shared: boolean;
  approvalStatus: RenderApprovalStatus;
  roomLabel: string;
  wallpaperCode?: string;
  curtainCode?: string;
  materialCodeSummary: string[];
  shareLink: string;
  shareCount: number;
  comparisonRenderId?: string;
}

export interface RenderRequest {
  id: string;
  title: string;
  requestedAt: string;
  status: RenderQueueStatus;
  roomLabel: string;
  ownerId: string;
}

export interface CommunicationLog {
  id: string;
  type: CommunicationChannel;
  createdAt: string;
  actorName: string;
  summary: string;
  outcome: string;
}

export interface QuoteSummary {
  estimatedValue: number;
  quoteValue: number;
  quoteStatus: QuoteStatus;
  paymentStage: PaymentStage;
  advanceReceived: number;
  partiallyPaidAmount?: number;
}

export interface CustomerProject {
  id: string;
  customerName: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  notes: string;
  title: string;
  projectType: ProjectType;
  siteStatus: SiteStatus;
  stage: ProjectStage;
  progress: number;
  startDate: string;
  targetDate: string;
  lastUpdated: string;
  renderCount: number;
  nextFollowUpAt: string;
  lastContactedAt: string;
  dealProbability: number;
  ownerId: string;
  leadDesignerId: string;
  fieldStaffId: string;
  assignedTeamIds: string[];
  priority: CustomerPriority;
  pinned: boolean;
  needsFollowUp: boolean;
  renderPending: boolean;
  siteVisitScheduledAt?: string;
  activityScore: number;
  wallpaperCode?: string;
  curtainCode?: string;
  communicationLog: CommunicationLog[];
  quote: QuoteSummary;
  renders: RenderAsset[];
  renderQueue: RenderRequest[];
  activities: ActivityItem[];
  internalNotes: NoteItem[];
}

export interface DeletedCustomerRecord {
  id: string;
  customerName: string;
  title: string;
  location: string;
  deletedAt: string;
  deletedBy: string;
  lastStage: ProjectStage;
}

export interface TaskItem {
  id: string;
  title: string;
  dueAt: string;
  customerId: string;
  ownerId: string;
  priority: TaskPriority;
  done: boolean;
}

export interface DashboardData {
  companyName: string;
  userName: string;
  team: TeamMember[];
  customers: CustomerProject[];
  deletedCustomers: DeletedCustomerRecord[];
  tasks: TaskItem[];
  inventory: InventoryItem[];
  recentlyViewedIds: string[];
}

export interface CustomerFilters {
  search: string;
  stage: 'all' | ProjectStage;
  ownerId: 'all' | string;
  completion: 'all' | 'active' | 'completed' | 'pending';
  sortBy: SortOption;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
}

export type InventoryCategory = 'Hardware & Tools' | 'Office & Tech' | 'Decor & Lighting' | 'Raw Material' | 'Vehicle';
export type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'clearance';
export type InventoryCondition = 'new' | 'good' | 'fair' | 'aging' | 'damaged';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  currentStock: number;
  minimumStock: number;
  status: InventoryStatus;
  condition: InventoryCondition;
  costPerUnit: number;
  lastRestockedAt: string;
  assignedTeamIds: string[];
  notes: string;
}
