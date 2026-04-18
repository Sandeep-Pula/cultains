import { useMemo, useState } from 'react';
import { BellRing, Clock3, MessageSquareMore, PhoneCall, Plus, Sparkles } from 'lucide-react';
import type { CommunicationChannel, CustomerProject, TeamMember } from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { StatusBadge } from '../components/StatusBadge';
import { AddCrmTouchpointModal } from '../components/AddCrmTouchpointModal';
import { relativeDate } from '../utils';

type CrmPageProps = {
  customers: CustomerProject[];
  team: TeamMember[];
  onOpenCustomer: (customerId: string) => void;
  onUpdateCustomer: (customerId: string, payload: Partial<CustomerProject>) => Promise<void> | void;
  actorName: string;
};

const channelLabels: Record<CommunicationChannel, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  meeting: 'Meeting',
  share_link: 'Share link',
  comment: 'Comment',
};

const channelIcons: Record<CommunicationChannel, typeof PhoneCall> = {
  call: PhoneCall,
  whatsapp: MessageSquareMore,
  meeting: Clock3,
  share_link: Sparkles,
  comment: BellRing,
};

export const CrmPage = ({
  customers,
  team,
  onOpenCustomer,
  onUpdateCustomer,
  actorName,
}: CrmPageProps) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const crmCustomers = useMemo(
    () =>
      [...customers]
        .sort((left, right) => {
          const leftWeight = Number(left.needsFollowUp) * 3 + Number(left.renderPending) * 2 + left.dealProbability / 100;
          const rightWeight = Number(right.needsFollowUp) * 3 + Number(right.renderPending) * 2 + right.dealProbability / 100;
          if (rightWeight !== leftWeight) return rightWeight - leftWeight;
          return new Date(left.nextFollowUpAt).getTime() - new Date(right.nextFollowUpAt).getTime();
        }),
    [customers],
  );

  const selectedCustomer = crmCustomers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const followUpQueue = crmCustomers.filter((customer) => customer.needsFollowUp);
  const renderQueue = crmCustomers.filter((customer) => customer.renderPending);
  const approvalsQueue = crmCustomers.filter((customer) => customer.stage === 'render_shared' || customer.stage === 'customer_approved');
  const hotLeads = crmCustomers.filter((customer) => customer.dealProbability >= 60);

  const recentTouchpoints = useMemo(
    () =>
      crmCustomers
        .flatMap((customer) =>
          customer.communicationLog.slice(0, 2).map((log) => ({
            customerId: customer.id,
            customerName: customer.customerName,
            title: customer.title,
            ...log,
          })),
        )
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 8),
    [crmCustomers],
  );

  const handleSaveTouchpoint = async (payload: {
    type: CommunicationChannel;
    summary: string;
    outcome: string;
    nextFollowUpAt: string;
    dealProbability: number;
    needsFollowUp: boolean;
    renderPending: boolean;
  }) => {
    if (!selectedCustomer) return;

    await onUpdateCustomer(selectedCustomer.id, {
      communicationLog: [
        {
          id: crypto.randomUUID(),
          type: payload.type,
          createdAt: new Date().toISOString(),
          actorName,
          summary: payload.summary,
          outcome: payload.outcome,
        },
        ...selectedCustomer.communicationLog,
      ].slice(0, 20),
      activities: [
        {
          id: crypto.randomUUID(),
          type: 'comment' as const,
          title: `${channelLabels[payload.type]} logged`,
          description: payload.summary,
          createdAt: new Date().toISOString(),
          actorName,
        },
        ...selectedCustomer.activities,
      ].slice(0, 20),
      lastContactedAt: new Date().toISOString(),
      nextFollowUpAt: payload.nextFollowUpAt,
      dealProbability: payload.dealProbability,
      needsFollowUp: payload.needsFollowUp,
      renderPending: payload.renderPending,
    });
  };

  return (
    <div className="flex h-full min-h-[700px] flex-col gap-5 overflow-hidden xl:h-[calc(100vh-8rem)]">
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">CRM workspace</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-brand-dark/80">
            Track follow-ups, render approvals, client conversations, and sales confidence from one working page.
          </p>
        </div>
        <button
          onClick={() => setSelectedCustomerId(crmCustomers[0]?.id ?? null)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} />
          Log touchpoint
        </button>
      </div>

      <div className="shrink-0 grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50">Follow-up queue</div>
          <div className="mt-2 text-3xl font-semibold text-brand-dark">{followUpQueue.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-700/70">Render pending</div>
          <div className="mt-2 text-3xl font-semibold text-sky-700">{renderQueue.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-violet-700/70">Approval watch</div>
          <div className="mt-2 text-3xl font-semibold text-violet-700">{approvalsQueue.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700/70">Hot leads</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">{hotLeads.length}</div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Customer action queue</h2>
            <p className="mt-0.5 text-xs text-brand-dark/60">The most urgent customers bubble to the top automatically.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {crmCustomers.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Customer', 'Stage', 'Owner', 'Last contact', 'Next follow-up', 'Probability', 'Signals'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crmCustomers.map((customer) => {
                    const owner = team.find((member) => member.id === customer.ownerId);
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="cursor-pointer transition hover:bg-brand-60/35"
                      >
                        <td className="border-b border-brand-30/70 px-5 py-4">
                          <div className="font-semibold text-brand-dark">{customer.customerName}</div>
                          <div className="mt-1 text-sm text-brand-dark/60">{customer.title}</div>
                        </td>
                        <td className="border-b border-brand-30/70 px-5 py-4"><StatusBadge stage={customer.stage} /></td>
                        <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">{owner?.name ?? 'Unassigned'}</td>
                        <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/65">{relativeDate(customer.lastContactedAt)}</td>
                        <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/65">{relativeDate(customer.nextFollowUpAt)}</td>
                        <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">{customer.dealProbability}%</td>
                        <td className="border-b border-brand-30/70 px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {customer.needsFollowUp ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">Follow-up</span> : null}
                            {customer.renderPending ? <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700">Render pending</span> : null}
                            {customer.priority === 'high' ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700">High priority</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyStatePanel
                  icon={MessageSquareMore}
                  title="No CRM records yet"
                  description="Customer follow-ups will start appearing here as soon as you create projects and begin logging conversations."
                  actions={[{ label: 'Create first customer', onClick: () => (window.location.hash = '#dashboard/customers'), emphasis: 'primary' }]}
                />
              </div>
            )}
          </div>
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-rows-[1fr_1fr]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
            <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Recent touchpoints</h2>
              <p className="mt-0.5 text-xs text-brand-dark/60">Latest calls, meetings, WhatsApp follow-ups, and shared previews.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 hide-scrollbar space-y-3">
              {recentTouchpoints.length ? (
                recentTouchpoints.map((log) => {
                  const Icon = channelIcons[log.type];
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedCustomerId(log.customerId)}
                      className="w-full rounded-[24px] border border-brand-30 bg-white p-4 text-left shadow-sm transition hover:border-brand-10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-60/50 text-brand-dark">
                            <Icon size={16} />
                          </span>
                          <div>
                            <div className="font-semibold text-brand-dark">{log.customerName}</div>
                            <div className="mt-1 text-sm text-brand-dark/60">{channelLabels[log.type]} • {relativeDate(log.createdAt)}</div>
                            <div className="mt-2 text-sm text-brand-dark">{log.summary}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-brand-30 bg-brand-60/35 p-6 text-center text-sm text-brand-dark/55">
                  No CRM touchpoints logged yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
            <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Today’s focus</h2>
              <p className="mt-0.5 text-xs text-brand-dark/60">Immediate actions that should help the team close faster.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 hide-scrollbar space-y-3">
              {[
                { label: 'Needs follow-up', items: followUpQueue.slice(0, 3) },
                { label: 'Render pending', items: renderQueue.slice(0, 3) },
                { label: 'High probability', items: hotLeads.slice(0, 3) },
              ].map((group) => (
                <div key={group.label} className="rounded-[24px] border border-brand-30 bg-brand-60/35 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/55">{group.label}</div>
                  <div className="mt-3 space-y-2">
                    {group.items.length ? (
                      group.items.map((customer) => (
                        <div key={customer.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium text-brand-dark">{customer.customerName}</div>
                            <div className="text-brand-dark/55">{customer.title}</div>
                          </div>
                          <button
                            onClick={() => onOpenCustomer(customer.id)}
                            className="rounded-xl border border-brand-30 px-3 py-1.5 text-xs font-semibold text-brand-dark"
                          >
                            Open
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-brand-30 bg-white px-4 py-4 text-center text-sm text-brand-dark/50">
                        Nothing urgent in this bucket.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <AddCrmTouchpointModal
        open={!!selectedCustomerId}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomerId(null)}
        onSubmit={handleSaveTouchpoint}
      />
    </div>
  );
};
