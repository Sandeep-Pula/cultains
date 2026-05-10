import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Filter,
  Flame,
  KanbanSquare,
  ListChecks,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Upload,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type { TeamMember } from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DevelopmentFlag } from '../components/DevelopmentFlag';
import { formatCurrency, formatDateTime, relativeDate } from '../utils';
import { buildCrmAnalytics } from '../crm/crmAnalytics';
import { crmService } from '../crm/crmService';
import { detectDuplicate, downloadCsv, exportContactsCsv, exportDealsCsv, exportLeadsCsv, parseCsv, validateContactRow } from '../crm/crmCsv';
import { buildDefaultCrmSettings, buildDefaultPipeline } from '../crm/defaults';
import type {
  CrmCollectionName,
  CrmCommunicationLog,
  CrmCompany,
  CrmContact,
  CrmContactType,
  CrmCustomFields,
  CrmCustomFieldDefinition,
  CrmCustomValue,
  CrmData,
  CrmDeal,
  CrmDealStatus,
  CrmEntityType,
  CrmFieldType,
  CrmLead,
  CrmLeadStatus,
  CrmModule,
  CrmPermission,
  CrmRole,
  CrmPipeline,
  CrmPipelineStage,
  CrmSettings,
  CrmTag,
  CrmTask,
  CrmTaskStatus,
  CrmTaskType,
} from '../crm/types';
import { createId } from '../../lib/id';

type CrmPageProps = {
  workspaceId: string;
  currentUserId: string;
  actorName: string;
  team: TeamMember[];
  viewerTeamMemberId: string;
  isOwner: boolean;
  onError: (error: unknown, fallbackMessage: string) => void;
  onSuccess: (title: string, description?: string) => void;
};

type CrmTab = 'dashboard' | 'contacts' | 'companies' | 'leads' | 'deals' | 'kanban' | 'tasks' | 'reports' | 'settings' | 'import';
type ModalKind = 'contact' | 'company' | 'lead' | 'deal' | 'task' | 'communication' | 'note' | 'tag' | 'field' | 'pipeline' | 'workflow' | null;

const tabItems: Array<{ id: CrmTab; label: string; icon: typeof Users }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'leads', label: 'Leads', icon: Flame },
  { id: 'deals', label: 'Deals', icon: BriefcaseBusiness },
  { id: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'import', label: 'Import / Export', icon: Upload },
];

const emptyData = (workspaceId: string, currentUserId: string): CrmData => ({
  settings: buildDefaultCrmSettings(workspaceId),
  contacts: [],
  companies: [],
  leads: [],
  deals: [],
  pipelines: [buildDefaultPipeline(workspaceId, currentUserId)],
  tasks: [],
  notes: [],
  activities: [],
  tags: [],
  fields: [],
  communications: [],
  workflows: [],
  notifications: [],
  importJobs: [],
});

const entityCollections: Record<CrmEntityType, CrmCollectionName> = {
  contact: 'crmContacts',
  company: 'crmCompanies',
  lead: 'crmLeads',
  deal: 'crmDeals',
  task: 'crmTasks',
  pipeline: 'crmPipelines',
  tag: 'crmTags',
};

const contactTypes: CrmContactType[] = ['lead', 'customer', 'vendor', 'partner', 'prospect', 'custom'];
const taskStatuses: CrmTaskStatus[] = ['open', 'in_progress', 'completed', 'cancelled'];
const taskTypes: CrmTaskType[] = ['call', 'meeting', 'email', 'whatsapp', 'visit', 'payment_follow_up', 'custom'];
const fieldTypes: CrmFieldType[] = ['text', 'number', 'dropdown', 'multi_select', 'date', 'boolean', 'currency', 'phone', 'email', 'url', 'long_text', 'file'];
const entityModuleMap: Partial<Record<CrmEntityType, CrmModule>> = {
  contact: 'contacts',
  company: 'companies',
  lead: 'leads',
  deal: 'deals',
  task: 'tasks',
  pipeline: 'pipelines',
};

const todayLocalInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const toIsoFromInput = (value: string) => (value ? new Date(value).toISOString() : new Date().toISOString());
const toDateInput = (value: string) => (value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10));
const matches = (query: string, ...values: Array<string | undefined>) => values.some((value) => value?.toLowerCase().includes(query));
const ownerName = (team: TeamMember[], id: string) => team.find((member) => member.id === id)?.name || (id ? 'Assigned user' : 'Unassigned');
const moduleFields = (data: CrmData, module: CrmModule) => data.fields.filter((field) => field.module === module && field.visible).sort((left, right) => left.order - right.order);
const validateCustomFields = (fields: CrmCustomFieldDefinition[], values: CrmCustomFields) => {
  const missing = fields.filter((field) => {
    const value = values[field.key];
    return field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
  });
  if (missing.length) throw new Error(`Complete required custom fields: ${missing.map((field) => field.label).join(', ')}`);
};
const roleFromMember = (isOwner: boolean, member?: TeamMember): CrmRole => {
  if (isOwner) return 'owner';
  const role = `${member?.role || ''}`.toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('manager') || role.includes('lead')) return 'manager';
  if (role.includes('support')) return 'support';
  if (role.includes('sales')) return 'sales';
  return 'viewer';
};
const can = (settings: CrmSettings, role: CrmRole, permission: CrmPermission) =>
  (settings.rolePermissions[role] || []).includes(permission);

export const CrmPage = ({ workspaceId, currentUserId, actorName, team, viewerTeamMemberId, isOwner, onError, onSuccess }: CrmPageProps) => {
  const [data, setData] = useState<CrmData>(() => emptyData(workspaceId, currentUserId));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CrmTab>('dashboard');
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState<{ type: CrmEntityType; id: string } | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: CrmEntityType; id: string; label: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = crmService.subscribe(
      workspaceId,
      currentUserId,
      (nextData) => {
        setData(nextData);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        onError(error, 'Unable to sync CRM data.');
      },
    );
    return unsubscribe;
  }, [currentUserId, onError, workspaceId]);

  const analytics = useMemo(() => buildCrmAnalytics(data), [data]);
  const viewerMember = team.find((member) => member.id === viewerTeamMemberId || member.authUid === currentUserId);
  const viewerRole = roleFromMember(isOwner, viewerMember);
  const canCreate = can(data.settings, viewerRole, 'create_records');
  const canEdit = can(data.settings, viewerRole, 'edit_records');
  const canDelete = can(data.settings, viewerRole, 'delete_records');
  const canExport = can(data.settings, viewerRole, 'export_data');
  const canManageSettings = can(data.settings, viewerRole, 'manage_settings');
  const canViewAll = can(data.settings, viewerRole, 'view_all_records');
  const canManagePipelines = can(data.settings, viewerRole, 'manage_pipelines');
  const lowerQuery = query.trim().toLowerCase();
  const firstPipeline = data.pipelines[0] || buildDefaultPipeline(workspaceId, currentUserId);
  const selectedEntity = useMemo(() => {
    if (!selected) return null;
    const list = selected.type === 'contact'
      ? data.contacts
      : selected.type === 'company'
        ? data.companies
        : selected.type === 'lead'
          ? data.leads
          : selected.type === 'deal'
            ? data.deals
            : selected.type === 'task'
              ? data.tasks
              : selected.type === 'pipeline'
                ? data.pipelines
                : data.tags;
    return list.find((item) => item.id === selected.id) ?? null;
  }, [data, selected]);

  const scopedContacts = canViewAll ? data.contacts : data.contacts.filter((contact) => !contact.assignedTo || contact.assignedTo === viewerTeamMemberId);
  const scopedCompanies = canViewAll ? data.companies : data.companies.filter((company) => !company.assignedTo || company.assignedTo === viewerTeamMemberId);
  const scopedLeads = canViewAll ? data.leads : data.leads.filter((lead) => !lead.assignedTo || lead.assignedTo === viewerTeamMemberId);
  const scopedDeals = canViewAll ? data.deals : data.deals.filter((deal) => !deal.assignedTo || deal.assignedTo === viewerTeamMemberId);
  const scopedTasks = canViewAll ? data.tasks : data.tasks.filter((task) => !task.assignedTo || task.assignedTo === viewerTeamMemberId);

  const filteredContacts = scopedContacts.filter((contact) =>
    (!lowerQuery || matches(lowerQuery, contact.name, contact.phone, contact.email, contact.companyName, contact.city)) &&
    (ownerFilter === 'all' || contact.assignedTo === ownerFilter) &&
    (tagFilter === 'all' || contact.tagIds.includes(tagFilter)) &&
    (sourceFilter === 'all' || contact.source === sourceFilter)
  );
  const filteredCompanies = scopedCompanies.filter((company) => !lowerQuery || matches(lowerQuery, company.name, company.industry, company.email, company.phone, company.city));
  const filteredLeads = scopedLeads.filter((lead) =>
    (!lowerQuery || matches(lowerQuery, lead.name, lead.phone, lead.email, lead.companyName, lead.source)) &&
    (ownerFilter === 'all' || lead.assignedTo === ownerFilter) &&
    (sourceFilter === 'all' || lead.source === sourceFilter) &&
    (tagFilter === 'all' || lead.tagIds.includes(tagFilter))
  );
  const filteredDeals = scopedDeals.filter((deal) =>
    (!lowerQuery || matches(lowerQuery, deal.name, deal.notes, deal.lostReason, deal.wonReason)) &&
    (ownerFilter === 'all' || deal.assignedTo === ownerFilter) &&
    (tagFilter === 'all' || deal.tagIds.includes(tagFilter))
  );
  const filteredTasks = scopedTasks.filter((task) =>
    (!lowerQuery || matches(lowerQuery, task.title, task.description, task.type)) &&
    (ownerFilter === 'all' || task.assignedTo === ownerFilter)
  );

  const saveRecord = async <T extends { id?: string }>(collectionName: CrmCollectionName, payload: T, success: string) => {
    if (!canEdit && payload.id) {
      onError(new Error('Permission denied'), 'You do not have permission to edit CRM records.');
      return;
    }
    if (!canCreate && !payload.id) {
      onError(new Error('Permission denied'), 'You do not have permission to create CRM records.');
      return;
    }
    try {
      const id = await crmService.upsert(workspaceId, collectionName, payload, currentUserId);
      onSuccess(success);
      return id;
    } catch (error) {
      onError(error, `Unable to save ${success.toLowerCase()}.`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      onError(new Error('Permission denied'), 'You do not have permission to delete CRM records.');
      return;
    }
    try {
      await crmService.softDelete(workspaceId, entityCollections[deleteTarget.type], deleteTarget.id, currentUserId);
      setDeleteTarget(null);
      setSelected(null);
      onSuccess('CRM record deleted', 'The record was soft deleted and removed from active views.');
    } catch (error) {
      onError(error, 'Unable to delete this CRM record.');
    }
  };

  return (
    <div className="flex min-h-[760px] flex-col gap-5">
      <DevelopmentFlag pageLabel="CRM" />

      <div className="flex flex-col gap-4 px-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Configurable CRM</h1>
          <p className="mt-1 max-w-4xl text-[15px] text-brand-dark/75">
            A tenant-scoped CRM foundation for retail, services, real estate, clinics, education, consultants, agencies, wholesalers, repair shops, salons, and local merchants.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <>
              <QuickButton icon={Plus} label="Contact" onClick={() => setModal('contact')} />
              <QuickButton icon={Flame} label="Lead" onClick={() => setModal('lead')} />
              <QuickButton icon={BriefcaseBusiness} label="Deal" onClick={() => setModal('deal')} />
              <QuickButton icon={CalendarClock} label="Task" onClick={() => setModal('task')} />
            </>
          ) : (
            <div className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark/60">View-only CRM access</div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-brand-30 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
                  activeTab === tab.id ? 'bg-brand-10 text-white shadow-sm' : 'text-brand-dark hover:bg-brand-60/60',
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
        <label className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm shadow-sm">
          <Search size={17} className="text-brand-dark/50" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CRM by name, phone, email, company, tag, deal, source..." className="min-w-0 flex-1 bg-transparent text-brand-dark outline-none" />
        </label>
        <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark shadow-sm outline-none">
          <option value="all">All owners</option>
          {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark shadow-sm outline-none">
          <option value="all">All tags</option>
          {data.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark shadow-sm outline-none">
          <option value="all">All sources</option>
          {data.settings.leadSources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-[32px] border border-brand-30 bg-white p-10 text-center text-brand-dark/60 shadow-sm">Loading CRM workspace...</div>
      ) : activeTab === 'dashboard' ? (
        <CrmDashboard data={data} analytics={analytics} team={team} onOpen={(type, id) => setSelected({ type, id })} />
      ) : activeTab === 'contacts' ? (
        <EntityTable
          title="Contacts and customers"
          icon={Users}
          rows={filteredContacts}
          emptyTitle="No contacts yet"
          onAdd={() => setModal('contact')}
          canAdd={canCreate}
          canDelete={canDelete}
          renderHeader={() => ['Name', 'Type', 'Company', 'Source', 'Owner', 'Tags']}
          renderRow={(contact) => [
            <StrongCell title={contact.name} subtitle={`${contact.phone || 'No phone'} · ${contact.email || 'No email'}`} />,
            contact.type,
            contact.companyName || '-',
            contact.source || '-',
            ownerName(team, contact.assignedTo),
            <TagList ids={contact.tagIds} tags={data.tags} />,
          ]}
          onOpen={(contact) => setSelected({ type: 'contact', id: contact.id })}
          onDelete={(contact) => setDeleteTarget({ type: 'contact', id: contact.id, label: contact.name })}
        />
      ) : activeTab === 'companies' ? (
        <EntityTable
          title="Companies and accounts"
          icon={Building2}
          rows={filteredCompanies}
          emptyTitle="No companies yet"
          onAdd={() => setModal('company')}
          canAdd={canCreate}
          canDelete={canDelete}
          renderHeader={() => ['Company', 'Industry', 'Website', 'City', 'Owner', 'Tags']}
          renderRow={(company) => [
            <StrongCell title={company.name} subtitle={`${company.phone || 'No phone'} · ${company.email || 'No email'}`} />,
            company.industry || '-',
            company.website || '-',
            company.city || '-',
            ownerName(team, company.assignedTo),
            <TagList ids={company.tagIds} tags={data.tags} />,
          ]}
          onOpen={(company) => setSelected({ type: 'company', id: company.id })}
          onDelete={(company) => setDeleteTarget({ type: 'company', id: company.id, label: company.name })}
        />
      ) : activeTab === 'leads' ? (
        <EntityTable
          title="Leads"
          icon={Flame}
          rows={filteredLeads}
          emptyTitle="No leads yet"
          onAdd={() => setModal('lead')}
          canAdd={canCreate}
          canDelete={canDelete}
          renderHeader={() => ['Lead', 'Status', 'Source', 'Score', 'Value', 'Owner']}
          renderRow={(lead) => [
            <StrongCell title={lead.name} subtitle={`${lead.phone || 'No phone'} · ${lead.email || 'No email'}`} />,
            lead.status,
            lead.source,
            String(lead.score),
            formatCurrency(lead.estimatedValue),
            ownerName(team, lead.assignedTo),
          ]}
          onOpen={(lead) => setSelected({ type: 'lead', id: lead.id })}
          onDelete={(lead) => setDeleteTarget({ type: 'lead', id: lead.id, label: lead.name })}
          rowAction={(lead) => lead.status !== 'converted' ? { label: 'Convert', onClick: () => crmService.convertLead(workspaceId, currentUserId, actorName, lead).then(() => onSuccess('Lead converted')) } : undefined}
        />
      ) : activeTab === 'deals' ? (
        <EntityTable
          title="Deals and opportunities"
          icon={BriefcaseBusiness}
          rows={filteredDeals}
          emptyTitle="No deals yet"
          onAdd={() => setModal('deal')}
          canAdd={canCreate}
          canDelete={canDelete}
          renderHeader={() => ['Deal', 'Value', 'Probability', 'Status', 'Close date', 'Owner']}
          renderRow={(deal) => [
            <StrongCell title={deal.name} subtitle={data.contacts.find((contact) => contact.id === deal.contactId)?.name || 'No contact linked'} />,
            formatCurrency(deal.value),
            `${deal.probability}%`,
            deal.status,
            toDateInput(deal.expectedCloseDate),
            ownerName(team, deal.assignedTo),
          ]}
          onOpen={(deal) => setSelected({ type: 'deal', id: deal.id })}
          onDelete={(deal) => setDeleteTarget({ type: 'deal', id: deal.id, label: deal.name })}
        />
      ) : activeTab === 'kanban' ? (
        <KanbanBoard data={data} team={team} pipeline={firstPipeline} deals={filteredDeals} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} onOpen={(id) => setSelected({ type: 'deal', id })} />
      ) : activeTab === 'tasks' ? (
        <EntityTable
          title="Tasks and follow-ups"
          icon={ListChecks}
          rows={filteredTasks}
          emptyTitle="No tasks yet"
          onAdd={() => setModal('task')}
          canAdd={canCreate}
          canDelete={canDelete}
          renderHeader={() => ['Task', 'Type', 'Due', 'Priority', 'Status', 'Owner']}
          renderRow={(task) => [
            <StrongCell title={task.title} subtitle={task.description || 'No description'} />,
            task.type.replace(/_/g, ' '),
            relativeDate(task.dueAt),
            task.priority,
            task.status.replace(/_/g, ' '),
            ownerName(team, task.assignedTo),
          ]}
          onOpen={(task) => setSelected({ type: 'task', id: task.id })}
          onDelete={(task) => setDeleteTarget({ type: 'task', id: task.id, label: task.title })}
          rowAction={(task) => task.status !== 'completed' ? { label: 'Done', onClick: async () => { await saveRecord('crmTasks', { ...task, status: 'completed' }, 'Task completed'); } } : undefined}
        />
      ) : activeTab === 'reports' ? (
        <ReportsView data={data} analytics={analytics} team={team} />
      ) : activeTab === 'settings' ? (
        canManageSettings ? (
          <SettingsView data={data} isOwner={isOwner} team={team} canManagePipelines={canManagePipelines} onModal={setModal} onSettingsSave={(settings) => crmService.updateSettings(workspaceId, settings).then(() => onSuccess('CRM settings saved')).catch((error) => onError(error, 'Unable to save CRM settings.'))} onDelete={setDeleteTarget} />
        ) : (
          <PermissionState title="Settings restricted" description="Your CRM role does not allow settings or pipeline management." />
        )
      ) : (
        canExport ? <ImportExportView
          data={data}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          actorName={actorName}
          onSuccess={onSuccess}
          onError={onError}
        /> : <PermissionState title="Export restricted" description="Your CRM role does not allow importing or exporting CRM data." />
      )}

      <DetailDrawer
        data={data}
        team={team}
        selected={selected}
        entity={selectedEntity}
        onClose={() => setSelected(null)}
        onModal={setModal}
        canEdit={canEdit}
        canDelete={canDelete}
        onDelete={(target) => setDeleteTarget(target)}
      />

      <CrmModal
        modal={modal}
        data={data}
        team={team}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        actorName={actorName}
        selected={selected}
        onClose={() => setModal(null)}
        onSuccess={(title) => {
          setModal(null);
          onSuccess(title);
        }}
        onError={onError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete CRM record?"
        description={`This will soft delete ${deleteTarget?.label || 'this record'} from active CRM views. Audit history remains tenant-scoped.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

const QuickButton = ({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
    <Icon size={16} />
    {label}
  </button>
);

const MetricCard = ({ icon: Icon, label, value, tone = 'brand' }: { icon: typeof Users; label: string; value: string; tone?: 'brand' | 'amber' | 'emerald' | 'sky' | 'rose' }) => {
  const toneClass = {
    brand: 'bg-brand-60 text-brand-dark',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone];
  return (
    <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}><Icon size={18} /></span>
      <div className="mt-4 text-xs font-bold uppercase tracking-wider text-brand-dark/50">{label}</div>
      <div className="mt-2 truncate text-2xl font-semibold text-brand-dark">{value}</div>
    </div>
  );
};

const CrmDashboard = ({ data, analytics, team, onOpen }: { data: CrmData; analytics: ReturnType<typeof buildCrmAnalytics>; team: TeamMember[]; onOpen: (type: CrmEntityType, id: string) => void }) => (
  <div className="grid gap-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={Users} label="Total contacts" value={String(analytics.totalContacts)} />
      <MetricCard icon={Flame} label="New leads" value={String(analytics.newLeads)} tone="amber" />
      <MetricCard icon={BriefcaseBusiness} label="Open deals" value={String(analytics.openDeals)} tone="sky" />
      <MetricCard icon={CalendarClock} label="Follow-ups today" value={String(analytics.followUpsDueToday)} tone="rose" />
      <MetricCard icon={ListChecks} label="Pending tasks" value={String(analytics.pendingTasks)} />
      <MetricCard icon={BarChart3} label="Pipeline value" value={formatCurrency(analytics.pipelineValue)} tone="emerald" />
      <MetricCard icon={CheckCircle2} label="Won deals" value={String(analytics.wonDeals)} tone="emerald" />
      <MetricCard icon={X} label="Lost deals" value={String(analytics.lostDeals)} tone="rose" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-dark">Lead source performance</h2>
        <div className="mt-4 space-y-3">
          {analytics.sourcePerformance.map((source) => (
            <div key={source.source} className="rounded-2xl border border-brand-30 bg-brand-60/25 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-brand-dark">
                <span>{source.source}</span>
                <span>{source.leads + source.contacts} records</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-medium text-brand-dark/65">
                <span className="rounded-xl bg-white py-2">{source.leads} leads</span>
                <span className="rounded-xl bg-white py-2">{source.contacts} contacts</span>
                <span className="rounded-xl bg-white py-2">{source.converted} converted</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-dark">Recent activity</h2>
        <div className="mt-4 space-y-3">
          {data.activities.slice(0, 8).map((activity) => (
            <button key={activity.id} onClick={() => onOpen(activity.entityType, activity.entityId)} className="w-full rounded-2xl border border-brand-30 p-4 text-left transition hover:border-brand-10">
              <div className="text-sm font-semibold text-brand-dark">{activity.title}</div>
              <div className="mt-1 text-sm text-brand-dark/65">{activity.description}</div>
              <div className="mt-2 text-xs text-brand-dark/45">{activity.actorName} · {formatDateTime(activity.createdAt)}</div>
            </button>
          ))}
          {!data.activities.length ? <div className="rounded-2xl border border-dashed border-brand-30 p-6 text-center text-sm text-brand-dark/50">No CRM activity yet.</div> : null}
        </div>
      </section>
    </div>
    <div className="grid gap-5 xl:grid-cols-3">
      <InsightPanel title="Likely to close" rows={analytics.likelyToClose.map((deal) => [`${deal.name}`, `${deal.probability}% · ${formatCurrency(deal.value)}`])} />
      <InsightPanel title="No recent activity" rows={analytics.staleContacts.map((contact) => [contact.name, contact.lastActivityAt ? relativeDate(contact.lastActivityAt) : 'No activity'])} />
      <InsightPanel title="Pending tasks by staff" rows={Object.entries(analytics.pendingTasksByOwner).map(([owner, count]) => [ownerName(team, owner), `${count} open`])} />
    </div>
    <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-brand-dark"><Bell size={18} /> Notification center</h2>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {data.notifications.slice(0, 8).map((notification) => (
          <button
            key={notification.id}
            onClick={() => crmService.markNotificationRead(notification.businessId, notification.id)}
            className={clsx(
              'rounded-2xl border p-4 text-left transition hover:border-brand-10',
              notification.readAt ? 'border-brand-30 bg-brand-60/20' : 'border-amber-200 bg-amber-50',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-brand-dark">{notification.title}</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand-dark/60">{notification.channel}</span>
            </div>
            <p className="mt-1 text-sm text-brand-dark/70">{notification.body}</p>
            <div className="mt-2 text-xs text-brand-dark/45">{formatDateTime(notification.createdAt)}</div>
          </button>
        ))}
        {!data.notifications.length ? <div className="rounded-2xl border border-dashed border-brand-30 p-6 text-center text-sm text-brand-dark/50 xl:col-span-2">No CRM notifications yet.</div> : null}
      </div>
    </section>
  </div>
);

const InsightPanel = ({ title, rows }: { title: string; rows: string[][] }) => (
  <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>
    <div className="mt-4 space-y-2">
      {rows.length ? rows.map(([left, right]) => (
        <div key={`${left}-${right}`} className="flex items-center justify-between gap-3 rounded-2xl bg-brand-60/30 px-4 py-3 text-sm">
          <span className="truncate font-medium text-brand-dark">{left}</span>
          <span className="shrink-0 text-brand-dark/55">{right}</span>
        </div>
      )) : <div className="rounded-2xl border border-dashed border-brand-30 p-5 text-center text-sm text-brand-dark/50">Nothing to show yet.</div>}
    </div>
  </section>
);

const StrongCell = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div>
    <div className="font-semibold text-brand-dark">{title || 'Untitled'}</div>
    <div className="mt-1 text-xs text-brand-dark/55">{subtitle}</div>
  </div>
);

const PermissionState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[32px] border border-brand-30 bg-white p-10 text-center shadow-sm">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
      <Settings size={20} />
    </div>
    <h2 className="mt-4 text-xl font-semibold text-brand-dark">{title}</h2>
    <p className="mt-2 text-sm text-brand-dark/65">{description}</p>
  </div>
);

const TagList = ({ ids, tags }: { ids: string[]; tags: CrmTag[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {ids.length ? ids.slice(0, 3).map((id) => {
      const tag = tags.find((item) => item.id === id);
      return tag ? <span key={id} className="rounded-full px-2 py-1 text-[11px] font-semibold text-brand-dark" style={{ background: tag.color || '#eef2ff' }}>{tag.name}</span> : null;
    }) : <span className="text-brand-dark/45">-</span>}
  </div>
);

const EntityTable = <T extends { id: string }>({
  title,
  icon: Icon,
  rows,
  emptyTitle,
  onAdd,
  canAdd = true,
  canDelete = true,
  renderHeader,
  renderRow,
  onOpen,
  onDelete,
  rowAction,
}: {
  title: string;
  icon: typeof Users;
  rows: T[];
  emptyTitle: string;
  onAdd: () => void;
  canAdd?: boolean;
  canDelete?: boolean;
  renderHeader: () => string[];
  renderRow: (row: T) => React.ReactNode[];
  onOpen: (row: T) => void;
  onDelete: (row: T) => void;
  rowAction?: (row: T) => { label: string; onClick: () => void | Promise<void> } | undefined;
}) => (
  <PagedEntityTable title={title} icon={Icon} rows={rows} emptyTitle={emptyTitle} onAdd={onAdd} canAdd={canAdd} canDelete={canDelete} renderHeader={renderHeader} renderRow={renderRow} onOpen={onOpen} onDelete={onDelete} rowAction={rowAction} />
);

const PagedEntityTable = <T extends { id: string }>({
  title,
  icon: Icon,
  rows,
  emptyTitle,
  onAdd,
  canAdd,
  canDelete,
  renderHeader,
  renderRow,
  onOpen,
  onDelete,
  rowAction,
}: {
  title: string;
  icon: typeof Users;
  rows: T[];
  emptyTitle: string;
  onAdd: () => void;
  canAdd: boolean;
  canDelete: boolean;
  renderHeader: () => string[];
  renderRow: (row: T) => React.ReactNode[];
  onOpen: (row: T) => void;
  onDelete: (row: T) => void;
  rowAction?: (row: T) => { label: string; onClick: () => void | Promise<void> } | undefined;
}) => {
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount, rows.length]);

  return (
  <section className="overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-4 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-dark"><Icon size={18} /></span>
        <div>
          <h2 className="text-xl font-semibold text-brand-dark">{title}</h2>
          <p className="text-xs text-brand-dark/55">{rows.length} visible records</p>
        </div>
      </div>
      {canAdd ? <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add</button> : null}
    </div>
    {rows.length ? (
      <>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-white">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                {renderHeader().map((label) => <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>)}
                <th className="border-b border-brand-30 px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const action = rowAction?.(row);
                return (
                  <tr key={row.id} className="transition hover:bg-brand-60/30">
                    {renderRow(row).map((cell, index) => <td key={`${row.id}-${index}`} onClick={() => onOpen(row)} className="cursor-pointer border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">{cell}</td>)}
                    <td className="border-b border-brand-30/70 px-5 py-4">
                      <div className="flex gap-2">
                        {action ? <button onClick={action.onClick} className="rounded-xl border border-brand-30 px-3 py-1.5 text-xs font-semibold text-brand-dark">{action.label}</button> : null}
                        {canDelete ? <button onClick={() => onDelete(row)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-brand-30 px-5 py-3 text-sm text-brand-dark/65">
          <span>Showing {rows.length ? page * pageSize + 1 : 0}-{Math.min(rows.length, page * pageSize + pageSize)} of {rows.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-xl border border-brand-30 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1} className="rounded-xl border border-brand-30 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>
      </>
    ) : (
      <div className="p-8">
        <EmptyStatePanel icon={Icon} title={emptyTitle} description="Use Add to create records, or import a CSV from the Import / Export tab." actions={canAdd ? [{ label: 'Add record', onClick: onAdd, emphasis: 'primary' }] : []} />
      </div>
    )}
  </section>
  );
};

const KanbanBoard = ({ data, team, pipeline, deals, workspaceId, currentUserId, actorName, onSuccess, onError, onOpen }: {
  data: CrmData;
  team: TeamMember[];
  pipeline: CrmPipeline;
  deals: CrmDeal[];
  workspaceId: string;
  currentUserId: string;
  actorName: string;
  onSuccess: (title: string, description?: string) => void;
  onError: (error: unknown, fallbackMessage: string) => void;
  onOpen: (id: string) => void;
}) => (
  <section className="overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
    <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
      <h2 className="text-xl font-semibold text-brand-dark">{pipeline.name} Kanban</h2>
      <p className="mt-0.5 text-xs text-brand-dark/60">Drag deals between stages. Time-in-stage is tracked on every move.</p>
    </div>
    <div className="flex gap-3 overflow-x-auto p-4">
      {pipeline.stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.pipelineId === pipeline.id && deal.stageId === stage.id);
        return (
          <div
            key={stage.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const deal = deals.find((item) => item.id === event.dataTransfer.getData('text/plain'));
              if (!deal || deal.stageId === stage.id) return;
              crmService.moveDealStage(workspaceId, currentUserId, actorName, deal, stage.id).then(() => onSuccess('Deal stage updated')).catch((error) => onError(error, 'Unable to move deal.'));
            }}
            className="w-80 shrink-0 rounded-[24px] border border-brand-30 bg-brand-60/30 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-brand-dark">{stage.name}</div>
                <div className="text-xs text-brand-dark/50">{stageDeals.length} deals · {stage.probability}%</div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-dark">{formatCurrency(stageDeals.reduce((sum, deal) => sum + deal.value, 0))}</span>
            </div>
            <div className="mt-3 space-y-2">
              {stageDeals.map((deal) => (
                <button
                  key={deal.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', deal.id)}
                  onClick={() => onOpen(deal.id)}
                  className="w-full rounded-[18px] border border-brand-30 bg-white p-4 text-left shadow-sm transition hover:border-brand-10"
                >
                  <div className="font-semibold text-brand-dark">{deal.name}</div>
                  <div className="mt-1 text-xs text-brand-dark/55">{formatCurrency(deal.value)} · {deal.probability}% · {ownerName(team, deal.assignedTo)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5"><TagList ids={deal.tagIds} tags={data.tags} /></div>
                  <div className="mt-3 text-xs text-brand-dark/45">Close {toDateInput(deal.expectedCloseDate)}</div>
                  <select
                    value={deal.stageId}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      crmService.moveDealStage(workspaceId, currentUserId, actorName, deal, event.target.value).then(() => onSuccess('Deal stage updated')).catch((error) => onError(error, 'Unable to move deal.'));
                    }}
                    className="mt-3 w-full rounded-xl border border-brand-30 bg-brand-60/30 px-3 py-2 text-xs font-semibold text-brand-dark outline-none lg:hidden"
                  >
                    {pipeline.stages.map((nextStage) => <option key={nextStage.id} value={nextStage.id}>{nextStage.name}</option>)}
                  </select>
                </button>
              ))}
              {!stageDeals.length ? <div className="rounded-2xl border border-dashed border-brand-30 bg-white px-4 py-6 text-center text-sm text-brand-dark/45">Drop deals here.</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const ReportsView = ({ data, analytics, team }: { data: CrmData; analytics: ReturnType<typeof buildCrmAnalytics>; team: TeamMember[] }) => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const inRange = (value: string) => {
    const date = new Date(value);
    return date >= start && date <= end;
  };
  const rangeLeads = data.leads.filter((lead) => inRange(lead.createdAt));
  const rangeDeals = data.deals.filter((deal) => inRange(deal.createdAt));
  const converted = rangeLeads.filter((lead) => lead.status === 'converted').length;
  const conversionRate = rangeLeads.length ? Math.round((converted / rangeLeads.length) * 100) : 0;
  const stageAging = data.deals.map((deal) => [deal.name, data.pipelines.flatMap((pipeline) => pipeline.stages).find((stage) => stage.id === deal.stageId)?.name || deal.stageId, `${Math.max(0, Math.round((Date.now() - new Date(deal.stageEnteredAt || deal.updatedAt).getTime()) / 86_400_000))} days`]);
  const reasonRows = [
    ...Object.entries(rangeDeals.filter((deal) => deal.status === 'won').reduce<Record<string, number>>((map, deal) => {
      map[deal.wonReason || 'No reason'] = (map[deal.wonReason || 'No reason'] || 0) + 1;
      return map;
    }, {})).map(([reason, count]) => [`Won: ${reason}`, `${count}`, '']),
    ...Object.entries(rangeDeals.filter((deal) => deal.status === 'lost').reduce<Record<string, number>>((map, deal) => {
      map[deal.lostReason || 'No reason'] = (map[deal.lostReason || 'No reason'] || 0) + 1;
      return map;
    }, {})).map(([reason, count]) => [`Lost: ${reason}`, `${count}`, '']),
  ];

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-brand-dark">CRM reports</h2>
            <p className="mt-1 text-sm text-brand-dark/60">Date-filtered conversion, pipeline, owner, activity, and win/loss reporting.</p>
          </div>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm outline-none" />
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-2xl border border-brand-30 px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard icon={Flame} label="Range leads" value={String(rangeLeads.length)} />
          <MetricCard icon={CheckCircle2} label="Conversion rate" value={`${conversionRate}%`} tone="emerald" />
          <MetricCard icon={BriefcaseBusiness} label="Range deal value" value={formatCurrency(rangeDeals.reduce((sum, deal) => sum + deal.value, 0))} tone="sky" />
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportCard title="Deals by stage" rows={analytics.stageSummary.map((row) => [row.stage, `${row.deals} deals`, formatCurrency(row.value)])} />
        <ReportCard title="Lead source conversion" rows={analytics.sourcePerformance.map((row) => [row.source, `${row.leads} leads`, `${row.converted} converted`])} />
        <ReportCard title="Staff performance" rows={team.map((member) => [member.name, `${data.deals.filter((deal) => deal.assignedTo === member.id).length} deals`, `${data.tasks.filter((task) => task.assignedTo === member.id && task.status !== 'completed').length} tasks`])} />
        <ReportCard title="Stage aging" rows={stageAging.slice(0, 20)} />
        <ReportCard title="Win/loss reasons" rows={reasonRows} />
        <ReportCard title="Activity summary" rows={data.activities.filter((activity) => inRange(activity.createdAt)).slice(0, 12).map((activity) => [activity.title, activity.entityType, relativeDate(activity.createdAt)])} />
      </div>
    </div>
  );
};

const ReportCard = ({ title, rows }: { title: string; rows: string[][] }) => (
  <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-semibold text-brand-dark">{title}</h2>
    <div className="mt-4 space-y-2">
      {rows.length ? rows.map((row, index) => (
        <div key={`${title}-${index}`} className="grid grid-cols-3 gap-3 rounded-2xl bg-brand-60/30 px-4 py-3 text-sm text-brand-dark/75">
          {row.map((cell) => <span key={cell} className="truncate">{cell}</span>)}
        </div>
      )) : <div className="rounded-2xl border border-dashed border-brand-30 p-6 text-center text-sm text-brand-dark/50">No report data yet.</div>}
    </div>
  </section>
);

const SettingsView = ({ data, isOwner, team, canManagePipelines, onModal, onSettingsSave, onDelete }: {
  data: CrmData;
  isOwner: boolean;
  team: TeamMember[];
  canManagePipelines: boolean;
  onModal: (modal: ModalKind) => void;
  onSettingsSave: (settings: CrmSettings) => void;
  onDelete: (target: { type: CrmEntityType; id: string; label: string }) => void;
}) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <SettingsPanel title="Pipelines" icon={Workflow} onAdd={canManagePipelines ? () => onModal('pipeline') : undefined}>
      {!canManagePipelines ? <PermissionState title="Pipeline editing is restricted" description="Your CRM role can view pipeline configuration, but cannot add, remove, or reorder stages." /> : null}
      {data.pipelines.map((pipeline) => (
        <div key={pipeline.id} className="rounded-2xl border border-brand-30 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-brand-dark">{pipeline.name}</div>
              <div className="text-xs text-brand-dark/55">{pipeline.stages.length} stages · {pipeline.module}</div>
            </div>
            {canManagePipelines ? <button onClick={() => onDelete({ type: 'pipeline', id: pipeline.id, label: pipeline.name })} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button> : null}
          </div>
          {canManagePipelines ? (
            <PipelineStageManager
              pipeline={pipeline}
              deals={data.deals}
              onSave={async (nextPipeline) => {
                await crmService.upsert(nextPipeline.businessId, 'crmPipelines', nextPipeline, nextPipeline.createdBy);
              }}
            />
          ) : null}
        </div>
      ))}
    </SettingsPanel>
    <SettingsPanel title="Custom fields" icon={SlidersHorizontal} onAdd={() => onModal('field')}>
      {data.fields.map((field) => <div key={field.id} className="rounded-2xl border border-brand-30 bg-white p-4 text-sm"><b>{field.label}</b> · {field.module} · {field.type} {field.required ? '· required' : ''}</div>)}
    </SettingsPanel>
    <SettingsPanel title="Tags and segmentation" icon={Tag} onAdd={() => onModal('tag')}>
      {data.tags.map((tag) => <div key={tag.id} className="flex items-center justify-between rounded-2xl border border-brand-30 bg-white p-4 text-sm"><span><b>{tag.name}</b> · {tag.description}</span><span className="h-5 w-5 rounded-full" style={{ background: tag.color }} /></div>)}
    </SettingsPanel>
    <SettingsPanel title="Lead sources and reasons" icon={Filter}>
      <SettingsList label="Lead sources" items={data.settings.leadSources} onSave={(items) => onSettingsSave({ ...data.settings, leadSources: items })} />
      <SettingsList label="Lost reasons" items={data.settings.lostReasons} onSave={(items) => onSettingsSave({ ...data.settings, lostReasons: items })} />
      <SettingsList label="Won reasons" items={data.settings.wonReasons} onSave={(items) => onSettingsSave({ ...data.settings, wonReasons: items })} />
    </SettingsPanel>
    <SettingsPanel title="Workflow foundation" icon={Workflow} onAdd={() => onModal('workflow')}>
      {data.workflows.map((workflow) => <div key={workflow.id} className="rounded-2xl border border-brand-30 bg-white p-4 text-sm"><b>{workflow.name}</b> · {workflow.trigger} · {workflow.actions.length} actions</div>)}
    </SettingsPanel>
    <SettingsPanel title="Permissions" icon={Settings}>
      <div className="text-sm leading-6 text-brand-dark/70">
        Current app owner mode: <b>{isOwner ? 'Owner/Admin' : 'Staff'}</b>. CRM roles are modeled for Owner/Admin, Manager, Sales, Support, and Viewer. Team members available: {team.length}.
      </div>
    </SettingsPanel>
  </div>
);

const SettingsPanel = ({ title, icon: Icon, onAdd, children }: { title: string; icon: typeof Settings; onAdd?: () => void; children: React.ReactNode }) => (
  <section className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-dark"><Icon size={18} /></span>
        <h2 className="text-xl font-semibold text-brand-dark">{title}</h2>
      </div>
      {onAdd ? <button onClick={onAdd} className="rounded-2xl bg-brand-10 px-4 py-2 text-sm font-semibold text-white">Add</button> : null}
    </div>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

const PipelineStageManager = ({ pipeline, deals, onSave }: { pipeline: CrmPipeline; deals: CrmDeal[]; onSave: (pipeline: CrmPipeline) => Promise<void> }) => {
  const [draft, setDraft] = useState(pipeline.stages);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(pipeline.stages), [pipeline.stages]);

  const updateStage = (stageId: string, patch: Partial<CrmPipelineStage>) => {
    setDraft((current) => current.map((stage) => stage.id === stageId ? { ...stage, ...patch } : stage));
  };

  const addStage = () => {
    const order = Math.max(0, ...draft.map((stage) => stage.order)) + 10;
    setDraft((current) => [...current, { id: `stage_${createId().slice(0, 6)}`, name: 'New stage', order, probability: 25, color: '#dbeafe' }]);
  };

  const moveStage = (stageId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const ordered = [...current].sort((left, right) => left.order - right.order);
      const index = ordered.findIndex((stage) => stage.id === stageId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return current;
      const [stage] = ordered.splice(index, 1);
      ordered.splice(targetIndex, 0, stage);
      return ordered.map((item, nextIndex) => ({ ...item, order: (nextIndex + 1) * 10 }));
    });
  };

  const save = async () => {
    setSaving(true);
    await onSave({ ...pipeline, stages: draft.map((stage, index) => ({ ...stage, order: (index + 1) * 10 })), updatedAt: new Date().toISOString() });
    setSaving(false);
  };
  const removeStage = (stage: CrmPipelineStage) => {
    const dealCount = deals.filter((deal) => deal.pipelineId === pipeline.id && deal.stageId === stage.id).length;
    if (dealCount) {
      window.alert(`Move ${dealCount} deal${dealCount === 1 ? '' : 's'} out of "${stage.name}" before removing this stage.`);
      return;
    }
    setDraft((current) => current.filter((item) => item.id !== stage.id));
  };

  return (
    <div className="mt-4 rounded-2xl border border-brand-30 bg-brand-60/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Stage manager</div>
        <div className="flex gap-2">
          <button onClick={addStage} className="rounded-xl border border-brand-30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark">Add stage</button>
          <button onClick={save} disabled={saving} className="rounded-xl bg-brand-10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save stages'}</button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {draft.sort((left, right) => left.order - right.order).map((stage) => (
          <div key={stage.id} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_90px_80px_120px]">
            <input value={stage.name} onChange={(event) => updateStage(stage.id, { name: event.target.value })} className="rounded-xl border border-brand-30 px-3 py-2 text-sm outline-none" />
            <input type="number" min="0" max="100" value={stage.probability} onChange={(event) => updateStage(stage.id, { probability: Number(event.target.value) })} className="rounded-xl border border-brand-30 px-3 py-2 text-sm outline-none" />
            <input type="color" value={stage.color} onChange={(event) => updateStage(stage.id, { color: event.target.value })} className="h-10 rounded-xl border border-brand-30 bg-white px-2 py-1" />
            <div className="flex gap-1">
              <button onClick={() => moveStage(stage.id, -1)} className="rounded-lg border border-brand-30 px-2 text-xs">Up</button>
              <button onClick={() => moveStage(stage.id, 1)} className="rounded-lg border border-brand-30 px-2 text-xs">Down</button>
              <button onClick={() => removeStage(stage)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs text-rose-700">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsList = ({ label, items, onSave }: { label: string; items: string[]; onSave: (items: string[]) => void }) => {
  const [draft, setDraft] = useState(items.join(', '));
  useEffect(() => setDraft(items.join(', ')), [items]);
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-brand-dark">{label}</span>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => onSave(draft.split(',').map((item) => item.trim()).filter(Boolean))} className="min-h-20 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none" />
    </label>
  );
};

const ImportExportView = ({ data, workspaceId, currentUserId, actorName, onSuccess, onError }: { data: CrmData; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string, description?: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [csv, setCsv] = useState('');
  const headers = useMemo(() => csv.split(/\r?\n/)[0]?.split(',').map((header) => header.trim().replace(/^"|"$/g, '')).filter(Boolean) ?? [], [csv]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const rows = useMemo(() => parseCsv(csv), [csv]);
  const mappedRows = useMemo(() => rows.map((row) => Object.entries(mapping).reduce<Record<string, string>>((mapped, [header, field]) => {
    if (field) mapped[field] = row[header] || '';
    return mapped;
  }, {})), [mapping, rows]);
  const duplicateCount = mappedRows.filter((row) => detectDuplicate(row, data.contacts)).length;
  const errors = mappedRows.flatMap((row, index) => validateContactRow(row).map((error) => `Row ${index + 2}: ${error}`));

  useEffect(() => {
    setMapping((current) => {
      const next = { ...current };
      headers.forEach((header) => {
        const normalized = header.toLowerCase().replace(/\s+/g, '');
        if (!next[header]) {
          next[header] = normalized === 'company' ? 'companyName' : normalized;
        }
      });
      return next;
    });
  }, [headers]);

  const importContacts = async () => {
    try {
      for (const row of mappedRows) {
        if (detectDuplicate(row, data.contacts) || validateContactRow(row).length) continue;
        await crmService.createContact(workspaceId, currentUserId, actorName, {
          type: 'customer',
          name: row.name,
          phone: row.phone || '',
          email: row.email || '',
          companyId: '',
          companyName: row.companyName || row.company || '',
          address: row.address || '',
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
          status: row.status || 'Active',
          source: row.source || 'CSV import',
          assignedTo: '',
          tagIds: [],
          notes: row.notes || '',
          customFields: {},
        });
      }
      await crmService.upsert(workspaceId, 'crmImportJobs', { id: createId(), module: 'contacts', fileName: 'mapped-csv.csv', status: 'completed', totalRows: mappedRows.length, importedRows: mappedRows.length - duplicateCount - errors.length, duplicateRows: duplicateCount, errors }, currentUserId);
      onSuccess('CSV import completed', `${mappedRows.length - duplicateCount - errors.length} contacts imported.`);
    } catch (error) {
      onError(error, 'Unable to import contacts.');
    }
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-dark">CSV import</h2>
        <p className="mt-1 text-sm text-brand-dark/65">Paste CSV with headers like name, phone, email, company, city, source, notes. Duplicate phone/email rows are skipped.</p>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="mt-4 min-h-72 w-full rounded-2xl border border-brand-30 bg-brand-60/30 px-4 py-3 text-sm outline-none" placeholder="name,phone,email,company,city,source" />
        {headers.length ? (
          <div className="mt-4 rounded-2xl border border-brand-30 bg-brand-60/25 p-4">
            <div className="text-sm font-semibold text-brand-dark">Field mapping</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {headers.map((header) => (
                <label key={header} className="grid gap-1 text-xs font-semibold text-brand-dark/60">
                  {header}
                  <select value={mapping[header] || ''} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} className="rounded-xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark outline-none">
                    <option value="">Ignore</option>
                    {['name', 'phone', 'email', 'companyName', 'address', 'city', 'state', 'country', 'status', 'source', 'notes'].map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-brand-dark/60">{mappedRows.length} rows · {duplicateCount} duplicates · {errors.length} validation errors</div>
          <button onClick={importContacts} disabled={!mappedRows.length || !!errors.length} className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Import contacts</button>
        </div>
        {errors.length ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{errors.slice(0, 6).join(' · ')}</div> : null}
        {mappedRows[0] ? <div className="mt-3 rounded-2xl border border-brand-30 bg-white p-4 text-xs text-brand-dark/65">Preview: {JSON.stringify(mappedRows[0])}</div> : null}
      </section>
      <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-dark">Export data</h2>
        <div className="mt-4 grid gap-3">
          <ExportButton label="Export contacts" onClick={() => downloadCsv('crm-contacts.csv', exportContactsCsv(data.contacts))} />
          <ExportButton label="Export leads" onClick={() => downloadCsv('crm-leads.csv', exportLeadsCsv(data.leads))} />
          <ExportButton label="Export deals" onClick={() => downloadCsv('crm-deals.csv', exportDealsCsv(data.deals))} />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-brand-dark">Import jobs</h3>
        <div className="mt-3 space-y-2">
          {data.importJobs.map((job) => <div key={job.id} className="rounded-2xl border border-brand-30 bg-brand-60/25 p-4 text-sm">{job.fileName} · {job.importedRows}/{job.totalRows} imported</div>)}
        </div>
      </section>
    </div>
  );
};

const ExportButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center justify-between rounded-2xl border border-brand-30 px-4 py-3 text-sm font-semibold text-brand-dark hover:border-brand-10">
    {label}
    <Download size={16} />
  </button>
);

const DetailDrawer = ({ data, team, selected, entity, onClose, onModal, canEdit, canDelete, onDelete }: {
  data: CrmData;
  team: TeamMember[];
  selected: { type: CrmEntityType; id: string } | null;
  entity: { id: string; createdAt: string; updatedAt: string; assignedTo?: string; name?: string; title?: string; customFields?: CrmCustomFields } | null;
  onClose: () => void;
  onModal: (modal: ModalKind) => void;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (target: { type: CrmEntityType; id: string; label: string }) => void;
}) => {
  if (!selected || !entity) return null;
  const activities = data.activities.filter((activity) => activity.entityType === selected.type && activity.entityId === selected.id);
  const notes = data.notes.filter((note) => note.entityType === selected.type && note.entityId === selected.id);
  const communications = data.communications.filter((communication) => communication.entityType === selected.type && communication.entityId === selected.id);
  const fields = selected.type in entityModuleMap ? moduleFields(data, entityModuleMap[selected.type] as CrmModule) : [];
  const title = entity.name || entity.title || selected.type;
  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-brand-dark/25 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-brand-60 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/45">{selected.type} detail</div>
            <h2 className="mt-1 text-2xl font-semibold text-brand-dark">{title}</h2>
            <p className="mt-1 text-sm text-brand-dark/60">Owner {ownerName(team, entity.assignedTo || '')} · Updated {relativeDate(entity.updatedAt)}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            {canEdit ? <button onClick={() => onModal(selected.type === 'contact' || selected.type === 'company' || selected.type === 'lead' || selected.type === 'deal' || selected.type === 'task' ? selected.type : null)} className="rounded-2xl bg-brand-10 px-4 py-2 text-sm font-semibold text-white">Edit record</button> : null}
            {canEdit ? <button onClick={() => onModal('note')} className="rounded-2xl bg-brand-10 px-4 py-2 text-sm font-semibold text-white">Add note</button> : null}
            {canEdit ? <button onClick={() => onModal('communication')} className="rounded-2xl border border-brand-30 bg-white px-4 py-2 text-sm font-semibold text-brand-dark">Log communication</button> : null}
            {canEdit ? <button onClick={() => onModal('task')} className="rounded-2xl border border-brand-30 bg-white px-4 py-2 text-sm font-semibold text-brand-dark">Create task</button> : null}
            {canDelete ? <button onClick={() => onDelete({ type: selected.type, id: selected.id, label: title })} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">Delete</button> : null}
          </div>
          <div className="mt-6 grid gap-4">
            {fields.length ? (
              <DetailSection title="Custom fields" icon={SlidersHorizontal}>
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between gap-4 rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm">
                    <span className="font-semibold text-brand-dark">{field.label}</span>
                    <span className="text-brand-dark/70">{Array.isArray(entity.customFields?.[field.key]) ? (entity.customFields?.[field.key] as string[]).join(', ') : String(entity.customFields?.[field.key] ?? '-')}</span>
                  </div>
                ))}
              </DetailSection>
            ) : null}
            <DetailSection title="Timeline" icon={ClipboardList}>
              {activities.map((activity) => <TimelineItem key={activity.id} title={activity.title} body={activity.description} meta={`${activity.actorName} · ${formatDateTime(activity.createdAt)}`} />)}
              {!activities.length ? <EmptyLine text="No activity yet." /> : null}
            </DetailSection>
            <DetailSection title="Notes" icon={FileText}>
              {notes.map((note) => <TimelineItem key={note.id} title="Note" body={note.body} meta={formatDateTime(note.createdAt)} />)}
              {!notes.length ? <EmptyLine text="No notes yet." /> : null}
            </DetailSection>
            <DetailSection title="Communication log" icon={MessageSquareText}>
              {communications.map((communication) => <TimelineItem key={communication.id} title={communication.type} body={`${communication.summary} ${communication.outcome ? `· ${communication.outcome}` : ''}`} meta={communication.nextFollowUpAt ? `Next ${relativeDate(communication.nextFollowUpAt)}` : formatDateTime(communication.createdAt)} />)}
              {!communications.length ? <EmptyLine text="No communication logged yet." /> : null}
            </DetailSection>
          </div>
        </div>
      </aside>
    </div>
  );
};

const DetailSection = ({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-brand-30 bg-white p-5">
    <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-dark"><Icon size={18} /> {title}</h3>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

const TimelineItem = ({ title, body, meta }: { title: string; body: string; meta: string }) => (
  <div className="rounded-2xl border border-brand-30 bg-brand-60/25 p-4">
    <div className="font-semibold text-brand-dark capitalize">{title.replace(/_/g, ' ')}</div>
    <div className="mt-1 text-sm text-brand-dark/70">{body}</div>
    <div className="mt-2 text-xs text-brand-dark/45">{meta}</div>
  </div>
);

const EmptyLine = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed border-brand-30 p-5 text-center text-sm text-brand-dark/50">{text}</div>;

const CrmModal = ({ modal, data, team, workspaceId, currentUserId, actorName, selected, onClose, onSuccess, onError }: {
  modal: ModalKind;
  data: CrmData;
  team: TeamMember[];
  workspaceId: string;
  currentUserId: string;
  actorName: string;
  selected: { type: CrmEntityType; id: string } | null;
  onClose: () => void;
  onSuccess: (title: string) => void;
  onError: (error: unknown, fallbackMessage: string) => void;
}) => {
  if (!modal) return null;
  const existing = selected
    ? selected.type === 'contact'
      ? data.contacts.find((item) => item.id === selected.id)
      : selected.type === 'company'
        ? data.companies.find((item) => item.id === selected.id)
        : selected.type === 'lead'
          ? data.leads.find((item) => item.id === selected.id)
          : selected.type === 'deal'
            ? data.deals.find((item) => item.id === selected.id)
            : selected.type === 'task'
              ? data.tasks.find((item) => item.id === selected.id)
              : null
    : null;
  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-brand-dark/30 p-3 pt-6 backdrop-blur-sm sm:items-center sm:pt-3">
      <div className="w-full max-w-3xl rounded-[30px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-start justify-between border-b border-brand-30 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/45">CRM</div>
            <h2 className="mt-1 text-2xl font-semibold text-brand-dark">{existing ? 'Edit' : 'Add'} {modal.replace('_', ' ')}</h2>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2"><X size={18} /></button>
        </div>
        {modal === 'contact' ? <ContactForm existing={existing?.id && selected?.type === 'contact' ? data.contacts.find((item) => item.id === existing.id) : undefined} data={data} team={team} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'company' ? <CompanyForm existing={existing?.id && selected?.type === 'company' ? data.companies.find((item) => item.id === existing.id) : undefined} data={data} team={team} workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'lead' ? <LeadForm existing={existing?.id && selected?.type === 'lead' ? data.leads.find((item) => item.id === existing.id) : undefined} data={data} team={team} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'deal' ? <DealForm existing={existing?.id && selected?.type === 'deal' ? data.deals.find((item) => item.id === existing.id) : undefined} data={data} team={team} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'task' ? <TaskForm existing={existing?.id && selected?.type === 'task' ? data.tasks.find((item) => item.id === existing.id) : undefined} data={data} selected={selected} team={team} workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'communication' && selected ? <CommunicationForm selected={selected} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'note' && selected ? <NoteForm selected={selected} workspaceId={workspaceId} currentUserId={currentUserId} actorName={actorName} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'tag' ? <TagForm workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'field' ? <FieldForm workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'pipeline' ? <PipelineForm workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
        {modal === 'workflow' ? <WorkflowForm workspaceId={workspaceId} currentUserId={currentUserId} onSuccess={onSuccess} onError={onError} /> : null}
      </div>
    </div>
  );
};

const FormShell = ({ children, onSubmit }: { children: React.ReactNode; onSubmit: (event: React.FormEvent) => void }) => (
  <form onSubmit={onSubmit} className="grid gap-4 px-6 py-6 md:grid-cols-2">{children}</form>
);

const TextField = ({ label, value, onChange, required, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) => (
  <label className="grid gap-2 text-sm text-brand-dark/75">
    <span className="font-semibold text-brand-dark">{label}</span>
    <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none" />
  </label>
);

const SelectField = ({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) => (
  <label className="grid gap-2 text-sm text-brand-dark/75">
    <span className="font-semibold text-brand-dark">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);

const CustomFieldsEditor = ({
  fields,
  values,
  onChange,
}: {
  fields: CrmCustomFieldDefinition[];
  values: CrmCustomFields;
  onChange: (values: CrmCustomFields) => void;
}) => {
  if (!fields.length) return null;

  const setValue = (key: string, value: CrmCustomValue) => onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-4 rounded-[24px] border border-brand-30 bg-white/70 p-4 md:col-span-2 md:grid-cols-2">
      <div className="text-sm font-bold uppercase tracking-wider text-brand-dark/55 md:col-span-2">Custom fields</div>
      {fields.map((field) => {
        const rawValue = values[field.key];
        const stringValue = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue ?? '');

        if (field.type === 'dropdown') {
          return (
            <SelectField
              key={field.id}
              label={`${field.label}${field.required ? ' *' : ''}`}
              value={stringValue}
              options={[{ value: '', label: 'Select' }, ...field.options.map((option) => ({ value: option, label: option }))]}
              onChange={(value) => setValue(field.key, value)}
            />
          );
        }

        if (field.type === 'multi_select') {
          return (
            <TextField
              key={field.id}
              label={`${field.label}${field.required ? ' *' : ''}`}
              value={stringValue}
              onChange={(value) => setValue(field.key, value.split(',').map((item) => item.trim()).filter(Boolean))}
            />
          );
        }

        if (field.type === 'boolean') {
          return (
            <label key={field.id} className="flex items-center gap-3 rounded-2xl border border-brand-30 bg-white px-3 py-3 text-sm font-semibold text-brand-dark">
              <input type="checkbox" checked={Boolean(rawValue)} onChange={(event) => setValue(field.key, event.target.checked)} />
              {field.label}{field.required ? ' *' : ''}
            </label>
          );
        }

        const inputType = field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text';
        return (
          <TextField
            key={field.id}
            label={`${field.label}${field.required ? ' *' : ''}`}
            type={inputType}
            value={stringValue}
            onChange={(value) => setValue(field.key, field.type === 'number' || field.type === 'currency' ? Number(value) : value)}
          />
        );
      })}
    </div>
  );
};

const TagPicker = ({ tags, value, onChange }: { tags: CrmTag[]; value: string[]; onChange: (value: string[]) => void }) => {
  if (!tags.length) return null;
  return (
    <div className="rounded-[24px] border border-brand-30 bg-white/70 p-4 md:col-span-2">
      <div className="text-sm font-bold uppercase tracking-wider text-brand-dark/55">Tags</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(selected ? value.filter((id) => id !== tag.id) : [...value, tag.id])}
              className={clsx('rounded-full border px-3 py-1.5 text-xs font-semibold transition', selected ? 'border-brand-10 text-brand-dark' : 'border-brand-30 bg-white text-brand-dark/60')}
              style={selected ? { background: tag.color } : undefined}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SubmitRow = ({ label }: { label: string }) => (
  <div className="flex justify-end md:col-span-2">
    <button type="submit" className="rounded-2xl bg-brand-10 px-5 py-2.5 text-sm font-semibold text-white">{label}</button>
  </div>
);

const ContactForm = ({ existing, data, team, workspaceId, currentUserId, actorName, onSuccess, onError }: { existing?: CrmContact; data: CrmData; team: TeamMember[]; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ name: existing?.name || '', phone: existing?.phone || '', email: existing?.email || '', companyId: existing?.companyId || '', companyName: existing?.companyName || '', address: existing?.address || '', city: existing?.city || '', state: existing?.state || '', country: existing?.country || '', status: existing?.status || 'Active', notes: existing?.notes || '', source: existing?.source || data.settings.leadSources[0] || 'Other', assignedTo: existing?.assignedTo || team[0]?.id || '', type: existing?.type || 'customer' as CrmContactType });
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds || []);
  const [customFields, setCustomFields] = useState<CrmCustomFields>(existing?.customFields || {});
  const fields = moduleFields(data, 'contacts');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return onError(new Error('Invalid email'), 'Enter a valid email.');
    try {
      validateCustomFields(fields, customFields);
      if (existing) {
        await crmService.upsert(workspaceId, 'crmContacts', { ...existing, ...form, tagIds, companyName: form.companyName || data.companies.find((company) => company.id === form.companyId)?.name || '', customFields }, currentUserId);
      } else {
        await crmService.createContact(workspaceId, currentUserId, actorName, { ...form, companyName: form.companyName || data.companies.find((company) => company.id === form.companyId)?.name || '', tagIds, customFields });
      }
      onSuccess(existing ? 'Contact updated' : 'Contact created');
    } catch (error) {
      onError(error, 'Unable to create contact.');
    }
  };
  return <FormShell onSubmit={submit}><TextField label="Name" value={form.name} required onChange={(name) => setForm({ ...form, name })} /><TextField label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /><TextField label="Email" value={form.email} type="email" onChange={(email) => setForm({ ...form, email })} /><SelectField label="Company account" value={form.companyId} options={[{ value: '', label: 'No linked company' }, ...data.companies.map((company) => ({ value: company.id, label: company.name }))]} onChange={(companyId) => setForm({ ...form, companyId })} /><TextField label="Company text" value={form.companyName} onChange={(companyName) => setForm({ ...form, companyName })} /><TextField label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} /><TextField label="City" value={form.city} onChange={(city) => setForm({ ...form, city })} /><TextField label="State" value={form.state} onChange={(state) => setForm({ ...form, state })} /><TextField label="Country" value={form.country} onChange={(country) => setForm({ ...form, country })} /><TextField label="Status" value={form.status} onChange={(status) => setForm({ ...form, status })} /><SelectField label="Type" value={form.type} options={contactTypes.map((type) => ({ value: type, label: type }))} onChange={(type) => setForm({ ...form, type: type as CrmContactType })} /><SelectField label="Source" value={form.source} options={data.settings.leadSources.map((source) => ({ value: source, label: source }))} onChange={(source) => setForm({ ...form, source })} /><SelectField label="Assigned to" value={form.assignedTo} options={[{ value: '', label: 'Unassigned' }, ...team.map((member) => ({ value: member.id, label: member.name }))]} onChange={(assignedTo) => setForm({ ...form, assignedTo })} /><TextField label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /><TagPicker tags={data.tags} value={tagIds} onChange={setTagIds} /><CustomFieldsEditor fields={fields} values={customFields} onChange={setCustomFields} /><SubmitRow label={existing ? 'Update contact' : 'Create contact'} /></FormShell>;
};

const CompanyForm = ({ existing, data, team, workspaceId, currentUserId, onSuccess, onError }: { existing?: CrmCompany; data: CrmData; team: TeamMember[]; workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ name: existing?.name || '', industry: existing?.industry || '', size: existing?.size || '', website: existing?.website || '', phone: existing?.phone || '', email: existing?.email || '', address: existing?.address || '', city: existing?.city || '', state: existing?.state || '', country: existing?.country || '', notes: existing?.notes || '', assignedTo: existing?.assignedTo || team[0]?.id || '' });
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds || []);
  const [customFields, setCustomFields] = useState<CrmCustomFields>(existing?.customFields || {});
  const fields = moduleFields(data, 'companies');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      validateCustomFields(fields, customFields);
      await crmService.upsert(workspaceId, 'crmCompanies', existing ? { ...existing, ...form, tagIds, customFields } : { id: createId(), ...form, tagIds, customFields }, currentUserId);
      onSuccess(existing ? 'Company updated' : 'Company created');
    } catch (error) { onError(error, 'Unable to create company.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Company name" value={form.name} required onChange={(name) => setForm({ ...form, name })} /><TextField label="Industry" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} /><TextField label="Business size" value={form.size} onChange={(size) => setForm({ ...form, size })} /><TextField label="Website" value={form.website} onChange={(website) => setForm({ ...form, website })} /><TextField label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /><TextField label="Email" value={form.email} type="email" onChange={(email) => setForm({ ...form, email })} /><TextField label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} /><TextField label="City" value={form.city} onChange={(city) => setForm({ ...form, city })} /><TextField label="State" value={form.state} onChange={(state) => setForm({ ...form, state })} /><TextField label="Country" value={form.country} onChange={(country) => setForm({ ...form, country })} /><SelectField label="Assigned to" value={form.assignedTo} options={[{ value: '', label: 'Unassigned' }, ...team.map((member) => ({ value: member.id, label: member.name }))]} onChange={(assignedTo) => setForm({ ...form, assignedTo })} /><TextField label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /><TagPicker tags={data.tags} value={tagIds} onChange={setTagIds} /><CustomFieldsEditor fields={fields} values={customFields} onChange={setCustomFields} /><SubmitRow label={existing ? 'Update company' : 'Create company'} /></FormShell>;
};

const LeadForm = ({ existing, data, team, workspaceId, currentUserId, actorName, onSuccess, onError }: { existing?: CrmLead; data: CrmData; team: TeamMember[]; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const pipeline = data.pipelines[0];
  const [form, setForm] = useState<{ name: string; phone: string; email: string; companyName: string; source: string; status: CrmLeadStatus; qualificationNotes: string; score: number; estimatedValue: number; assignedTo: string }>({ name: existing?.name || '', phone: existing?.phone || '', email: existing?.email || '', companyName: existing?.companyName || '', source: existing?.source || data.settings.leadSources[0] || 'Other', status: existing?.status || 'new', qualificationNotes: existing?.qualificationNotes || '', score: existing?.score || 25, estimatedValue: existing?.estimatedValue || 0, assignedTo: existing?.assignedTo || team[0]?.id || '' });
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds || []);
  const [customFields, setCustomFields] = useState<CrmCustomFields>(existing?.customFields || {});
  const fields = moduleFields(data, 'leads');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const duplicate = data.leads.some((lead) => lead.id !== existing?.id && ((form.phone && lead.phone === form.phone) || (form.email && lead.email.toLowerCase() === form.email.toLowerCase())));
    if (duplicate) return onError(new Error('Duplicate lead'), 'A lead with this phone or email already exists.');
    try {
      validateCustomFields(fields, customFields);
      if (existing) {
        await crmService.upsert(workspaceId, 'crmLeads', { ...existing, ...form, tagIds, customFields }, currentUserId);
      } else {
        await crmService.createLead(workspaceId, currentUserId, actorName, { ...form, status: form.status as CrmLead['status'], pipelineId: pipeline.id, stageId: pipeline.stages[0]?.id || 'new', tagIds, expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), customFields });
      }
      onSuccess(existing ? 'Lead updated' : 'Lead created');
    } catch (error) { onError(error, 'Unable to create lead.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Lead name" value={form.name} required onChange={(name) => setForm({ ...form, name })} /><TextField label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /><TextField label="Email" value={form.email} type="email" onChange={(email) => setForm({ ...form, email })} /><TextField label="Company" value={form.companyName} onChange={(companyName) => setForm({ ...form, companyName })} /><SelectField label="Status" value={form.status} options={['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'].map((status) => ({ value: status, label: status }))} onChange={(status) => setForm({ ...form, status: status as CrmLeadStatus })} /><SelectField label="Source" value={form.source} options={data.settings.leadSources.map((source) => ({ value: source, label: source }))} onChange={(source) => setForm({ ...form, source })} /><TextField label="Score" value={String(form.score)} type="number" onChange={(score) => setForm({ ...form, score: Number(score) })} /><TextField label="Estimated value" value={String(form.estimatedValue)} type="number" onChange={(estimatedValue) => setForm({ ...form, estimatedValue: Number(estimatedValue) })} /><SelectField label="Assigned to" value={form.assignedTo} options={[{ value: '', label: 'Unassigned' }, ...team.map((member) => ({ value: member.id, label: member.name }))]} onChange={(assignedTo) => setForm({ ...form, assignedTo })} /><TextField label="Qualification notes" value={form.qualificationNotes} onChange={(qualificationNotes) => setForm({ ...form, qualificationNotes })} /><TagPicker tags={data.tags} value={tagIds} onChange={setTagIds} /><CustomFieldsEditor fields={fields} values={customFields} onChange={setCustomFields} /><SubmitRow label={existing ? 'Update lead' : 'Create lead'} /></FormShell>;
};

const DealForm = ({ existing, data, team, workspaceId, currentUserId, actorName, onSuccess, onError }: { existing?: CrmDeal; data: CrmData; team: TeamMember[]; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const pipeline = data.pipelines[0];
  const [form, setForm] = useState<{ name: string; value: number; probability: number; status: CrmDealStatus; assignedTo: string; contactId: string; companyId: string; products: string; notes: string; lostReason: string; wonReason: string; expectedCloseDate: string }>({ name: existing?.name || '', value: existing?.value || 0, probability: existing?.probability || 30, status: existing?.status || 'open', assignedTo: existing?.assignedTo || team[0]?.id || '', contactId: existing?.contactId || '', companyId: existing?.companyId || '', products: existing?.products?.join(', ') || '', notes: existing?.notes || '', lostReason: existing?.lostReason || '', wonReason: existing?.wonReason || '', expectedCloseDate: existing?.expectedCloseDate ? existing.expectedCloseDate.slice(0, 10) : new Date().toISOString().slice(0, 10) });
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds || []);
  const [customFields, setCustomFields] = useState<CrmCustomFields>(existing?.customFields || {});
  const fields = moduleFields(data, 'deals');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      validateCustomFields(fields, customFields);
      if (existing) {
        await crmService.upsert(workspaceId, 'crmDeals', { ...existing, ...form, status: form.status as CrmDeal['status'], products: form.products.split(',').map((item) => item.trim()).filter(Boolean), tagIds, expectedCloseDate: new Date(form.expectedCloseDate).toISOString(), customFields }, currentUserId);
      } else {
        await crmService.createDeal(workspaceId, currentUserId, actorName, { ...form, status: form.status as CrmDeal['status'], products: form.products.split(',').map((item) => item.trim()).filter(Boolean), tagIds, expectedCloseDate: new Date(form.expectedCloseDate).toISOString(), pipelineId: pipeline.id, stageId: pipeline.stages[0]?.id || 'new', stageEnteredAt: new Date().toISOString(), stageDurations: {}, customFields });
      }
      onSuccess(existing ? 'Deal updated' : 'Deal created');
    } catch (error) { onError(error, 'Unable to create deal.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Deal name" value={form.name} required onChange={(name) => setForm({ ...form, name })} /><TextField label="Value" value={String(form.value)} type="number" onChange={(value) => setForm({ ...form, value: Number(value) })} /><TextField label="Probability" value={String(form.probability)} type="number" onChange={(probability) => setForm({ ...form, probability: Number(probability) })} /><SelectField label="Status" value={form.status} options={['open', 'won', 'lost'].map((status) => ({ value: status, label: status }))} onChange={(status) => setForm({ ...form, status: status as CrmDealStatus })} /><TextField label="Expected close date" value={form.expectedCloseDate} type="date" onChange={(expectedCloseDate) => setForm({ ...form, expectedCloseDate })} /><SelectField label="Contact" value={form.contactId} options={[{ value: '', label: 'No contact' }, ...data.contacts.map((contact) => ({ value: contact.id, label: contact.name }))]} onChange={(contactId) => setForm({ ...form, contactId })} /><SelectField label="Company" value={form.companyId} options={[{ value: '', label: 'No company' }, ...data.companies.map((company) => ({ value: company.id, label: company.name }))]} onChange={(companyId) => setForm({ ...form, companyId })} /><SelectField label="Assigned to" value={form.assignedTo} options={[{ value: '', label: 'Unassigned' }, ...team.map((member) => ({ value: member.id, label: member.name }))]} onChange={(assignedTo) => setForm({ ...form, assignedTo })} /><TextField label="Products/services interested in" value={form.products} onChange={(products) => setForm({ ...form, products })} /><TextField label="Won reason" value={form.wonReason} onChange={(wonReason) => setForm({ ...form, wonReason })} /><TextField label="Lost reason" value={form.lostReason} onChange={(lostReason) => setForm({ ...form, lostReason })} /><TextField label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} /><TagPicker tags={data.tags} value={tagIds} onChange={setTagIds} /><CustomFieldsEditor fields={fields} values={customFields} onChange={setCustomFields} /><SubmitRow label={existing ? 'Update deal' : 'Create deal'} /></FormShell>;
};

const TaskForm = ({ existing, data, selected, team, workspaceId, currentUserId, onSuccess, onError }: { existing?: CrmTask; data: CrmData; selected: { type: CrmEntityType; id: string } | null; team: TeamMember[]; workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ title: existing?.title || '', description: existing?.description || '', dueAt: existing?.dueAt ? existing.dueAt.slice(0, 16) : todayLocalInput(), priority: existing?.priority || 'medium', status: existing?.status || 'open' as CrmTaskStatus, assignedTo: existing?.assignedTo || team[0]?.id || '', type: existing?.type || 'call' as CrmTaskType });
  const [customFields, setCustomFields] = useState<CrmCustomFields>(existing?.customFields || {});
  const fields = moduleFields(data, 'tasks');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      validateCustomFields(fields, customFields);
      await crmService.upsert(workspaceId, 'crmTasks', existing ? { ...existing, ...form, dueAt: toIsoFromInput(form.dueAt), customFields } : { id: createId(), ...form, dueAt: toIsoFromInput(form.dueAt), reminder: true, relatedEntityType: selected?.type, relatedEntityId: selected?.id, customFields }, currentUserId);
      onSuccess(existing ? 'Task updated' : 'Task saved');
    } catch (error) { onError(error, 'Unable to save task.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Title" value={form.title} required onChange={(title) => setForm({ ...form, title })} /><TextField label="Due" value={form.dueAt} type="datetime-local" onChange={(dueAt) => setForm({ ...form, dueAt })} /><SelectField label="Type" value={form.type} options={taskTypes.map((type) => ({ value: type, label: type.replace(/_/g, ' ') }))} onChange={(type) => setForm({ ...form, type: type as CrmTaskType })} /><SelectField label="Status" value={form.status} options={taskStatuses.map((status) => ({ value: status, label: status.replace(/_/g, ' ') }))} onChange={(status) => setForm({ ...form, status: status as CrmTaskStatus })} /><SelectField label="Assigned to" value={form.assignedTo} options={[{ value: '', label: 'Unassigned' }, ...team.map((member) => ({ value: member.id, label: member.name }))]} onChange={(assignedTo) => setForm({ ...form, assignedTo })} /><TextField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} /><CustomFieldsEditor fields={fields} values={customFields} onChange={setCustomFields} /><SubmitRow label="Save task" /></FormShell>;
};

const CommunicationForm = ({ selected, workspaceId, currentUserId, actorName, onSuccess, onError }: { selected: { type: CrmEntityType; id: string }; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ type: 'call', summary: '', outcome: '', nextFollowUpAt: '' });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await crmService.logCommunication(workspaceId, currentUserId, { entityType: selected.type, entityId: selected.id, type: form.type as CrmCommunicationLog['type'], summary: form.summary, outcome: form.outcome, nextFollowUpAt: form.nextFollowUpAt ? toIsoFromInput(form.nextFollowUpAt) : undefined, actorName });
      onSuccess('Communication logged');
    } catch (error) { onError(error, 'Unable to log communication.'); }
  };
  return <FormShell onSubmit={submit}><SelectField label="Type" value={form.type} options={['call', 'whatsapp', 'email', 'meeting', 'visit', 'message', 'other'].map((type) => ({ value: type, label: type }))} onChange={(type) => setForm({ ...form, type })} /><TextField label="Next follow-up" value={form.nextFollowUpAt} type="datetime-local" onChange={(nextFollowUpAt) => setForm({ ...form, nextFollowUpAt })} /><TextField label="Summary" value={form.summary} required onChange={(summary) => setForm({ ...form, summary })} /><TextField label="Outcome" value={form.outcome} onChange={(outcome) => setForm({ ...form, outcome })} /><SubmitRow label="Log communication" /></FormShell>;
};

const NoteForm = ({ selected, workspaceId, currentUserId, actorName, onSuccess, onError }: { selected: { type: CrmEntityType; id: string }; workspaceId: string; currentUserId: string; actorName: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [body, setBody] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await crmService.addNote(workspaceId, currentUserId, actorName, { entityType: selected.type, entityId: selected.id, body });
      onSuccess('Note added');
    } catch (error) { onError(error, 'Unable to add note.'); }
  };
  return <FormShell onSubmit={submit}><label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2"><span className="font-semibold text-brand-dark">Note</span><textarea value={body} required onChange={(event) => setBody(event.target.value)} className="min-h-40 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none" /></label><SubmitRow label="Add note" /></FormShell>;
};

const TagForm = ({ workspaceId, currentUserId, onSuccess, onError }: { workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ name: '', color: '#dbeafe', description: '' });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await crmService.upsert(workspaceId, 'crmTags', { id: createId(), ...form }, currentUserId); onSuccess('Tag saved'); } catch (error) { onError(error, 'Unable to save tag.'); } };
  return <FormShell onSubmit={submit}><TextField label="Name" value={form.name} required onChange={(name) => setForm({ ...form, name })} /><TextField label="Color" value={form.color} type="color" onChange={(color) => setForm({ ...form, color })} /><TextField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} /><SubmitRow label="Save tag" /></FormShell>;
};

const FieldForm = ({ workspaceId, currentUserId, onSuccess, onError }: { workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [form, setForm] = useState({ label: '', module: 'contacts', type: 'text' as CrmFieldType, required: false, visible: true, order: 10, options: '' });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await crmService.upsert(workspaceId, 'crmCustomFields', { id: createId(), ...form, key: form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), options: form.options.split(',').map((item) => item.trim()).filter(Boolean) } as Omit<CrmCustomFieldDefinition, 'businessId' | 'createdBy' | 'createdAt' | 'updatedAt'>, currentUserId); onSuccess('Custom field saved'); } catch (error) { onError(error, 'Unable to save custom field.'); } };
  return <FormShell onSubmit={submit}><TextField label="Label" value={form.label} required onChange={(label) => setForm({ ...form, label })} /><SelectField label="Module" value={form.module} options={['contacts', 'companies', 'leads', 'deals', 'tasks', 'pipelines', 'products'].map((module) => ({ value: module, label: module }))} onChange={(module) => setForm({ ...form, module })} /><SelectField label="Type" value={form.type} options={fieldTypes.map((type) => ({ value: type, label: type.replace(/_/g, ' ') }))} onChange={(type) => setForm({ ...form, type: type as CrmFieldType })} /><TextField label="Options comma separated" value={form.options} onChange={(options) => setForm({ ...form, options })} /><label className="flex items-center gap-2 text-sm font-semibold text-brand-dark"><input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} /> Required</label><label className="flex items-center gap-2 text-sm font-semibold text-brand-dark"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} /> Visible</label><SubmitRow label="Save custom field" /></FormShell>;
};

const PipelineForm = ({ workspaceId, currentUserId, onSuccess, onError }: { workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [name, setName] = useState('');
  const [stages, setStages] = useState('New, Contacted, Qualified, Proposal, Won, Lost');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const stageNames = stages.split(',').map((stage) => stage.trim()).filter(Boolean);
    const pipelineStages: CrmPipelineStage[] = stageNames.map((stage, index) => ({ id: stage.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: stage, order: (index + 1) * 10, probability: index === stageNames.length - 1 ? 100 : Math.min(90, (index + 1) * 15), color: '#dbeafe', isWon: /won/i.test(stage), isLost: /lost/i.test(stage) }));
    try { await crmService.upsert(workspaceId, 'crmPipelines', { id: createId(), name, description: '', module: 'custom', active: true, stages: pipelineStages, customFields: {} }, currentUserId); onSuccess('Pipeline saved'); } catch (error) { onError(error, 'Unable to save pipeline.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Pipeline name" value={name} required onChange={setName} /><TextField label="Stages comma separated" value={stages} required onChange={setStages} /><SubmitRow label="Save pipeline" /></FormShell>;
};

const WorkflowForm = ({ workspaceId, currentUserId, onSuccess, onError }: { workspaceId: string; currentUserId: string; onSuccess: (title: string) => void; onError: (error: unknown, fallbackMessage: string) => void }) => {
  const [name, setName] = useState('New lead follow-up task');
  const [trigger, setTrigger] = useState('lead_created');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await crmService.upsert(workspaceId, 'crmWorkflows', { id: createId(), name, active: true, trigger, conditions: [], actions: [{ type: 'create_task', payload: { title: 'Follow up', dueInHours: 4 } }] }, currentUserId); onSuccess('Workflow saved'); } catch (error) { onError(error, 'Unable to save workflow.'); }
  };
  return <FormShell onSubmit={submit}><TextField label="Workflow name" value={name} required onChange={setName} /><SelectField label="Trigger" value={trigger} options={['lead_created', 'deal_stage_changed', 'task_overdue', 'deal_won', 'deal_lost', 'follow_up_due'].map((item) => ({ value: item, label: item.replace(/_/g, ' ') }))} onChange={setTrigger} /><SubmitRow label="Save workflow" /></FormShell>;
};
