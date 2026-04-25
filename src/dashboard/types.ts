export type DashboardView =
  | 'sales-overview'
  | 'overview'
  | 'customers'
  | 'team'
  | 'inventory'
  | 'barcode-desk'
  | 'billing'
  | 'ai-tools'
  | 'render-history'
  | 'crm'
  | 'settings'
  | 'profile';

export type BusinessType =
  | 'general_business'
  | 'interior_decorator'
  | 'shoe_shop'
  | 'sports_shop'
  | 'retail_store'
  | 'service_business';

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
export type TeamRole = string;
export type AccountType = 'owner' | 'team_member';

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
  allowedViews: DashboardView[];
  loginEnabled: boolean;
  authUid?: string;
  loginEmail?: string;
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

export interface WorkspaceProfile {
  companyName: string;
  userName: string;
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
  sidebarViews: DashboardView[];
  workspaceOwnerId?: string;
  linkedTeamMemberId?: string;
}

export interface DashboardData {
  companyName: string;
  userName: string;
  profile: WorkspaceProfile;
  team: TeamMember[];
  customers: CustomerProject[];
  deletedCustomers: DeletedCustomerRecord[];
  tasks: TaskItem[];
  inventory: InventoryItem[];
  financeEntries: FinanceEntry[];
  salesInvoices: SalesInvoice[];
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

export type InventoryCategory = string;
export type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'clearance';
export type InventoryCondition = 'new' | 'good' | 'fair' | 'aging' | 'damaged';
export type InventoryUnit = 'pcs' | 'rolls' | 'boxes' | 'sets' | 'sqm' | 'kg' | 'litres';
export type InventoryProcurementStatus = 'none' | 'to_order' | 'ordered' | 'received';
export type InventoryFlag = 'needs_purchase' | 'clearance_watch' | 'over_reserved' | 'audit_due';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  itemCode: string;
  barcodeValue: string;
  barcodeBusinessKey: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  reorderQuantity: number;
  status: InventoryStatus;
  condition: InventoryCondition;
  costPerUnit: number;
  sellingPrice: number;
  storageLocation: string;
  supplierName: string;
  supplierPhone: string;
  procurementStatus: InventoryProcurementStatus;
  lastRestockedAt: string;
  lastIssuedAt?: string;
  lastAuditAt?: string;
  assignedTeamIds: string[];
  assignedProjectIds: string[];
  clearanceReason: string;
  notes: string;
}

export type FinanceKind = 'income' | 'expense';
export type FinanceCategory =
  | 'client_payment'
  | 'project_material'
  | 'labour'
  | 'salary'
  | 'vendor'
  | 'operations';
export type FinanceStatus = 'pending' | 'paid' | 'overdue';

export interface FinanceEntry {
  id: string;
  title: string;
  kind: FinanceKind;
  category: FinanceCategory;
  amount: number;
  status: FinanceStatus;
  dueAt: string;
  createdAt: string;
  customerId?: string;
  projectTitle?: string;
  sourceInvoiceId?: string;
  employeeMemberId?: string;
  employeeName?: string;
  paycheckNumber?: string;
  payPeriodLabel?: string;
  paymentMethod?: InvoicePaymentMethod;
  issuedBy?: string;
  notes: string;
}

export type InvoicePaymentStatus = 'pending' | 'paid';
export type InvoicePaymentMethod = 'cash' | 'upi' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'mixed';

export interface SalesInvoiceLineItem {
  inventoryItemId: string;
  barcodeValue: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  businessBarcodeKey: string;
  customerName: string;
  paymentStatus: InvoicePaymentStatus;
  paymentMethod: InvoicePaymentMethod;
  lineItems: SalesInvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
  billedBy: string;
  createdAt: string;
}
