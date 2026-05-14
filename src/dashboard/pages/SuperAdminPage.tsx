import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock3,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardView, PlatformBusinessAccount, SubscriptionAccessRules, SubscriptionPlan, SupportThread, SupportThreadStatus, WorkspaceProfile } from '../types';
import { defaultSidebarViews, formatDate, formatDateTime, subscriptionPlanLabels, subscriptionPlanOptions, subscriptionPlanViews, viewTitles } from '../utils';
import { ProductWordmark } from '../../components/BrandWordmark';

type SuperAdminPageProps = {
  profile: WorkspaceProfile;
  onLogout: () => void;
  onError: (error: unknown, fallbackMessage: string) => void;
  onSuccess: (title: string, description?: string) => void;
};

type TicketFilter = 'all' | 'new' | 'active' | 'waiting' | 'closed';
type AdminSection = 'support' | 'users' | 'access';
type UserPlanFilter = SubscriptionPlan | 'all';

const statusLabels: Record<SupportThreadStatus, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In progress',
  waiting_on_admin: 'Waiting on admin',
  waiting_on_business: 'Waiting on business',
  resolved: 'Resolved',
  closed: 'Closed',
};

const filterOptions: Array<{ id: TicketFilter; label: string }> = [
  { id: 'all', label: 'All tickets' },
  { id: 'new', label: 'New' },
  { id: 'active', label: 'Active' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'closed', label: 'Closed' },
];

const statusActions: SupportThreadStatus[] = ['open', 'in_progress', 'waiting_on_business', 'resolved', 'closed'];

const statusTone = (status: SupportThreadStatus) => {
  if (status === 'closed') return 'bg-brand-dark text-white';
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-800';
  if (status === 'new') return 'bg-amber-100 text-amber-800';
  if (status === 'in_progress') return 'bg-sky-100 text-sky-800';
  if (status === 'waiting_on_admin') return 'bg-rose-100 text-rose-800';
  return 'bg-violet-100 text-violet-800';
};

export const SuperAdminPage = ({
  profile,
  onLogout,
  onError,
  onSuccess,
}: SuperAdminPageProps) => {
  const [businesses, setBusinesses] = useState<PlatformBusinessAccount[]>([]);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [adminSection, setAdminSection] = useState<AdminSection>('users');
  const [searchText, setSearchText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState<SupportThreadStatus>('waiting_on_business');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<SupportThreadStatus | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [userPlanFilter, setUserPlanFilter] = useState<UserPlanFilter>('all');
  const [accessRules, setAccessRules] = useState<SubscriptionAccessRules>(subscriptionPlanViews);
  const [savingAccessRules, setSavingAccessRules] = useState(false);

  useEffect(() => {
    const unsubscribe = dashboardService.subscribeToSuperAdminConsole(
      (nextData) => {
        setBusinesses(nextData.businesses);
        setSelectedBusinessId((current) => current && nextData.businesses.some((business) => business.userId === current) ? current : null);
        setSupportThreads(nextData.supportThreads);
        setSelectedTicketId((current) => {
          if (current && nextData.supportThreads.some((thread) => thread.id === current)) {
            return current;
          }
          return nextData.supportThreads[0]?.id || null;
        });
      },
    );

    return () => unsubscribe();
  }, [onError]);

  useEffect(() => dashboardService.subscribeToSubscriptionAccessRules(setAccessRules), []);

  const selectedThread = useMemo(
    () => supportThreads.find((thread) => thread.id === selectedTicketId) || null,
    [selectedTicketId, supportThreads],
  );

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.userId === selectedThread?.ownerUserId) || null,
    [businesses, selectedThread],
  );

  const selectedUserBusiness = useMemo(
    () => businesses.find((business) => business.userId === selectedBusinessId) || null,
    [businesses, selectedBusinessId],
  );

  useEffect(() => {
    if (!selectedThread) return;
    setReplyStatus(selectedThread.status === 'new' ? 'open' : selectedThread.status);
  }, [selectedThread]);

  const newBusinessesThisWeek = useMemo(
    () => businesses.filter((business) => Date.now() - new Date(business.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
    [businesses],
  );

  const activeTickets = useMemo(
    () => supportThreads.filter((thread) => ['open', 'in_progress', 'waiting_on_admin', 'waiting_on_business'].includes(thread.status)).length,
    [supportThreads],
  );

  const businessesWithTickets = useMemo(
    () => new Set(supportThreads.map((thread) => thread.ownerUserId)).size,
    [supportThreads],
  );

  const planCounts = useMemo(
    () => subscriptionPlanOptions.reduce<Record<SubscriptionPlan, number>>((counts, plan) => {
      counts[plan] = businesses.filter((business) => business.subscriptionPlan === plan).length;
      return counts;
    }, { freemium: 0, focused: 0, growth: 0, business_pro: 0 }),
    [businesses],
  );

  const filteredBusinesses = useMemo(() => {
    const normalizedSearch = userSearchText.trim().toLowerCase();
    const byPlan = userPlanFilter === 'all'
      ? businesses
      : businesses.filter((business) => business.subscriptionPlan === userPlanFilter);
    if (!normalizedSearch) return byPlan;

    return byPlan.filter((business) => [
      business.hashedUserId,
      business.userId,
      business.companyName,
      business.ownerName,
      business.email,
      business.phone,
      business.subscriptionPlan,
      ...business.teamMemberIds,
      ...business.teamAuthUids,
    ].join(' ').toLowerCase().includes(normalizedSearch));
  }, [businesses, userPlanFilter, userSearchText]);

  const updateAccessRules = (plan: SubscriptionPlan, view: DashboardView, shouldInclude: boolean) => {
    setAccessRules((current) => {
      const nextViews = shouldInclude
        ? Array.from(new Set([...current[plan], view]))
        : current[plan].filter((item) => item !== view);
      return { ...current, [plan]: nextViews };
    });
  };

  const saveAccessRules = async () => {
    setSavingAccessRules(true);
    try {
      await dashboardService.updateSubscriptionAccessRules(accessRules);
      onSuccess('Access rules updated', 'Dashboard page access was updated for every user.');
    } catch (error) {
      onError(error, 'Unable to update access rules.');
    } finally {
      setSavingAccessRules(false);
    }
  };

  const filteredThreads = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return supportThreads.filter((thread) => {
      if (ticketFilter === 'new' && thread.status !== 'new') return false;
      if (ticketFilter === 'active' && !['open', 'in_progress', 'waiting_on_admin', 'waiting_on_business'].includes(thread.status)) return false;
      if (ticketFilter === 'waiting' && !['waiting_on_admin', 'waiting_on_business'].includes(thread.status)) return false;
      if (ticketFilter === 'closed' && !['resolved', 'closed'].includes(thread.status)) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        thread.ticketNumber,
        thread.businessName,
        thread.ownerName,
        thread.ownerEmail,
        thread.subject,
        thread.messages[thread.messages.length - 1]?.body || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchText, supportThreads, ticketFilter]);

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedThread || !replyBody.trim()) return;

    setSubmitting(true);
    try {
      await dashboardService.replyToSupportThreadAsAdmin(
        selectedThread.id,
        { name: profile.userName, email: profile.email },
        replyBody,
        replyStatus,
      );
      setReplyBody('');
      onSuccess('Reply sent', 'The business account will see this response inside the same ticket thread.');
    } catch (error) {
      onError(error, 'Unable to send the admin reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicketStatus = async (status: SupportThreadStatus) => {
    if (!selectedThread) return;
    setStatusUpdating(status);
    try {
      await dashboardService.updateSupportThreadStatus(selectedThread.id, status);
      setReplyStatus(status === 'new' ? 'open' : status);
      onSuccess('Ticket updated', `Ticket ${selectedThread.ticketNumber} is now ${statusLabels[status].toLowerCase()}.`);
    } catch (error) {
      onError(error, 'Unable to update the ticket status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  const updateUserPlan = async (business: PlatformBusinessAccount, subscriptionPlan: SubscriptionPlan) => {
    if (business.subscriptionPlan === subscriptionPlan) return;
    setUpdatingUserId(business.userId);
    try {
      await dashboardService.updateUserSubscription(business.userId, {
        subscriptionPlan,
        subscriptionStatus: 'active',
        renewalDate: business.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const changedAt = new Date().toISOString();
      const renewalDate = business.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setBusinesses((current) =>
        current.map((item) =>
          item.userId === business.userId
            ? {
                ...item,
                subscriptionPlan,
                subscriptionStatus: 'active',
                renewalDate,
                subscriptionHistory: [
                  {
                    id: `${business.userId}-${changedAt}`,
                    fromPlan: business.subscriptionPlan,
                    toPlan: subscriptionPlan,
                    status: 'active',
                    renewalDate,
                    changedAt,
                    changedBy: profile.email,
                  },
                  ...(item.subscriptionHistory ?? []),
                ],
                updatedAt: changedAt,
              }
            : item,
        ),
      );
      onSuccess('Subscription updated', `${business.companyName} is now on ${subscriptionPlanLabels[subscriptionPlan]}.`);
    } catch (error) {
      onError(error, 'Unable to update this user subscription.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-brand-dark">
      <div className="grid min-h-screen xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 h-screen border-r border-brand-30 bg-white p-5 xl:p-6">
          <div className="flex items-center gap-3 rounded-[26px] border border-brand-30 bg-brand-60/25 p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-10 text-brand-60 shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark/50">Admin console</div>
              <div className="mt-1 text-xl font-black leading-none">
                <ProductWordmark />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark/45">Signed in</div>
            <div className="mt-2 text-base font-semibold">{profile.userName}</div>
            <div className="mt-1 truncate text-sm text-brand-dark/58">{profile.email}</div>
          </div>

          <nav className="mt-5 grid gap-2" aria-label="PULA Biz admin sections">
            {([
              { id: 'users' as const, label: 'Users', description: `${businesses.length} accounts`, icon: UsersRound },
              { id: 'access' as const, label: 'Plan access', description: 'Modules by plan', icon: SlidersHorizontal },
              { id: 'support' as const, label: 'Support', description: `${activeTickets} active tickets`, icon: LifeBuoy },
            ]).map((item) => {
              const Icon = item.icon;
              const active = adminSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdminSection(item.id)}
                  className={`flex items-center gap-3 rounded-[20px] border px-3.5 py-3 text-left transition ${
                    active ? 'border-brand-10 bg-brand-10 text-brand-60 shadow-sm' : 'border-transparent bg-white text-brand-dark hover:border-brand-30 hover:bg-brand-60/30'
                  }`}
                >
                  <Icon size={18} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`mt-0.5 block text-xs ${active ? 'text-brand-60/70' : 'text-brand-dark/45'}`}>{item.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[20px] border border-brand-30 bg-brand-60/25 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-brand-dark/45">Users</div>
              <div className="mt-1 text-2xl font-semibold">{businesses.length}</div>
            </div>
            <div className="rounded-[20px] border border-brand-30 bg-brand-60/25 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-brand-dark/45">New</div>
              <div className="mt-1 text-2xl font-semibold">{newBusinessesThisWeek}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="absolute bottom-6 left-5 right-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-60/40 xl:left-6 xl:right-6"
          >
            <LogOut size={16} />
            Log out
          </button>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 xl:p-7">
          {adminSection === 'users' ? (
            <>
              <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-60/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                  <UsersRound size={14} />
                  Users
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  PULA Biz user access management
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-dark/70 sm:text-base">
                  Review signed-up business owners, assign plans, inspect teams, and control subscription access from one clean workspace.
                </p>
              </section>

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <button
                  type="button"
                  onClick={() => setUserPlanFilter('all')}
                  className={`rounded-[28px] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                    userPlanFilter === 'all' ? 'border-brand-10 bg-brand-10 text-brand-60' : 'border-brand-30 bg-white text-brand-dark'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">All users</div>
                  <div className="mt-2 text-3xl font-semibold">{businesses.length}</div>
                </button>
                {subscriptionPlanOptions.map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setUserPlanFilter(plan)}
                    className={`rounded-[28px] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                      userPlanFilter === plan ? 'border-brand-10 bg-brand-10 text-brand-60' : 'border-brand-30 bg-white text-brand-dark'
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">{subscriptionPlanLabels[plan]}</div>
                    <div className="mt-2 text-3xl font-semibold">{planCounts[plan]}</div>
                  </button>
                ))}
              </section>

              <section className="mt-6 rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {userPlanFilter === 'all' ? 'All users' : `${subscriptionPlanLabels[userPlanFilter]} users`}
                    </h2>
                    <p className="mt-1 text-sm text-brand-dark/65">
                      Showing Firebase Auth signups with profile and team IDs when available. Business financial records stay untouched.
                    </p>
                  </div>
                  <label className="relative block w-full sm:w-80">
                    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/45" />
                    <input
                      value={userSearchText}
                      onChange={(event) => setUserSearchText(event.target.value)}
                      placeholder="Search users, IDs, company, email"
                      className="w-full rounded-2xl border border-brand-30 bg-brand-60/25 py-3 pl-11 pr-4 text-sm outline-none"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 2xl:grid-cols-2">
                  {filteredBusinesses.map((business) => (
                    <article
                      key={business.userId}
                      onClick={() => setSelectedBusinessId(business.userId)}
                      className="cursor-pointer rounded-[28px] border border-brand-30 bg-brand-60/18 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10/40 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-bold text-brand-10">{business.hashedUserId}</div>
                          <div className="mt-1 max-w-full truncate font-mono text-[11px] text-brand-dark/45" title={business.userId}>{business.userId}</div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-brand-dark/65">
                            {business.accountType.replace(/_/g, ' ')}
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-brand-dark/65">
                            {business.subscriptionStatus}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-dark/45">User</div>
                          <div className="mt-1 text-base font-semibold text-brand-dark">{business.ownerName}</div>
                          <div className="mt-1 text-sm text-brand-dark/60">{business.email || 'No email yet'}</div>
                          <div className="mt-1 text-sm text-brand-dark/55">{business.phone || 'No phone yet'}</div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Company</div>
                          <div className="mt-1 text-base font-semibold text-brand-dark">{business.companyName}</div>
                          <div className="mt-1 text-sm capitalize text-brand-dark/55">{business.businessType.replace(/_/g, ' ')}</div>
                          <div className="mt-2 text-xs text-brand-dark/50">Joined {formatDate(business.createdAt)}</div>
                        </div>

                        <label className="min-w-44">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Plan</span>
                          <select
                            value={business.subscriptionPlan}
                            disabled={updatingUserId === business.userId}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateUserPlan(business, event.target.value as SubscriptionPlan)}
                            className="mt-1 w-full rounded-2xl border border-brand-30 bg-white px-3 py-2 font-semibold text-brand-dark outline-none"
                          >
                            {subscriptionPlanOptions.map((plan) => (
                              <option key={plan} value={plan}>{subscriptionPlanLabels[plan]}</option>
                            ))}
                          </select>
                          <div className="mt-2 text-xs text-brand-dark/50">
                            {updatingUserId === business.userId ? 'Updating...' : business.renewalDate ? `Renewal ${formatDate(business.renewalDate)}` : 'Renewal not set'}
                          </div>
                        </label>
                      </div>

                      <div className="mt-4 rounded-[22px] border border-brand-30 bg-white/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-brand-dark">{business.teamMemberCount} team members</div>
                          {business.teamAuthUids.length ? (
                            <div className="text-xs text-brand-dark/45">Auth IDs: {business.teamAuthUids.map((id) => id.slice(0, 8)).join(', ')}</div>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {business.teamMemberIds.length ? business.teamMemberIds.map((teamId) => (
                            <span key={teamId} className="rounded-full bg-brand-60/45 px-2.5 py-1 font-mono text-[11px] text-brand-dark/70">{teamId}</span>
                          )) : <span className="text-sm text-brand-dark/50">No team IDs</span>}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedBusinessId(business.userId);
                          }}
                          className="mt-3 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-10 hover:text-brand-60"
                        >
                          View access details
                        </button>
                      </div>
                    </article>
                  ))}
                  {!filteredBusinesses.length ? (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-8 text-sm text-brand-dark/60">
                      No users match this search.
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : adminSection === 'access' ? (
            <>
              <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-60/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                  <SlidersHorizontal size={14} />
                  Plan access
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Build the access matrix for every plan
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-dark/70 sm:text-base">
                  Drag a dashboard page into a plan, or use the checkboxes. Changes apply globally to every user on that subscription.
                </p>
              </section>

              <section className="mt-6 rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Dashboard pages</h2>
                    <p className="mt-1 text-sm text-brand-dark/65">Drag any page chip into the subscription cards below.</p>
                  </div>
                  <button
                    type="button"
                    disabled={savingAccessRules}
                    onClick={saveAccessRules}
                    className="rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-brand-60 disabled:opacity-60"
                  >
                    {savingAccessRules ? 'Saving...' : 'Save access rules'}
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {defaultSidebarViews.map((view) => (
                    <button
                      key={view}
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('text/plain', view)}
                      className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-60"
                    >
                      {viewTitles[view]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-6 grid gap-4 xl:grid-cols-4">
                {subscriptionPlanOptions.map((plan) => (
                  <article
                    key={plan}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const view = event.dataTransfer.getData('text/plain') as DashboardView;
                      if (defaultSidebarViews.includes(view)) updateAccessRules(plan, view, true);
                    }}
                    className="rounded-[28px] border border-brand-30 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/50">{subscriptionPlanLabels[plan]}</div>
                        <div className="mt-1 text-sm text-brand-dark/60">{accessRules[plan].length} pages enabled</div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {defaultSidebarViews.map((view) => {
                        const checked = accessRules[plan].includes(view);
                        return (
                          <label
                            key={view}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                              checked ? 'border-brand-10/30 bg-brand-60/45 text-brand-dark' : 'border-brand-30 bg-white text-brand-dark/55'
                            }`}
                          >
                            <span>{viewTitles[view]}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => updateAccessRules(plan, view, event.target.checked)}
                              className="h-4 w-4 accent-brand-10"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : (
            <>
          <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Sparkles size={14} />
              Support desk
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Handle PULA Biz support without leaving admin
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-dark/70 sm:text-base">
              Triage tickets, update status, and keep each business inside its own private thread with
              {' '}
              <ProductWordmark />
              .
            </p>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="min-h-0 space-y-6">
              <div className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-brand-dark">
                  <Building2 size={18} />
                  <h2 className="text-xl font-semibold">All business accounts</h2>
                </div>
                <div className="mt-4 max-h-[44vh] space-y-3 overflow-y-auto pr-1">
                  {businesses.length ? businesses.map((business) => (
                    <button
                      key={business.userId}
                      type="button"
                      onClick={() => {
                        const latestTicket = supportThreads.find((thread) => thread.ownerUserId === business.userId);
                        if (latestTicket) {
                          setSelectedTicketId(latestTicket.id);
                        }
                      }}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedBusiness?.userId === business.userId
                          ? 'border-brand-10 bg-brand-10 text-brand-60'
                          : 'border-brand-30 bg-brand-60/20 text-brand-dark hover:bg-brand-60/45'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold">{business.companyName}</div>
                          <div className={`mt-1 text-sm ${selectedBusiness?.userId === business.userId ? 'text-brand-60/78' : 'text-brand-dark/65'}`}>
                            {business.ownerName} • {business.email || 'No email yet'}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                          selectedBusiness?.userId === business.userId
                            ? 'bg-white/10 text-brand-60'
                            : 'bg-white text-brand-dark/65'
                        }`}>
                          {business.businessType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className={`mt-3 text-xs uppercase tracking-[0.14em] ${selectedBusiness?.userId === business.userId ? 'text-brand-60/62' : 'text-brand-dark/50'}`}>
                        Created {formatDate(business.createdAt)}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-8 text-sm text-brand-dark/60">
                      No business accounts are available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-brand-dark">
                    <LifeBuoy size={18} />
                    <h2 className="text-xl font-semibold">Ticket queue</h2>
                  </div>
                  <span className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-1 text-sm font-medium text-brand-dark">
                    {filteredThreads.length} shown
                  </span>
                </div>

                <div className="mt-4 rounded-[24px] border border-brand-30 bg-brand-60/20 p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="relative block">
                      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/45" />
                      <input
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="Search ticket number, business, email, or subject"
                        className="w-full rounded-2xl border border-brand-30 bg-white py-3 pl-11 pr-4 text-sm outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTicketFilter(option.id)}
                          className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                            ticketFilter === option.id
                              ? 'border-brand-10 bg-brand-10 text-brand-60'
                              : 'border-brand-30 bg-white text-brand-dark hover:bg-brand-60/45'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 max-h-[34vh] space-y-3 overflow-y-auto pr-1">
                  {filteredThreads.length ? filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketId(thread.id);
                        setReplyStatus(thread.status === 'new' ? 'open' : thread.status);
                      }}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedTicketId === thread.id
                          ? 'border-brand-10 bg-brand-10 text-brand-60'
                          : 'border-brand-30 bg-brand-60/20 text-brand-dark hover:bg-brand-60/45'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{thread.ticketNumber} • {thread.businessName}</div>
                          <div className={`mt-1 text-sm ${selectedTicketId === thread.id ? 'text-brand-60/76' : 'text-brand-dark/65'}`}>
                            {thread.subject}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedTicketId === thread.id ? 'bg-white/10 text-brand-60' : statusTone(thread.status)}`}>
                          {statusLabels[thread.status]}
                        </span>
                      </div>
                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] ${selectedTicketId === thread.id ? 'text-brand-60/62' : 'text-brand-dark/50'}`}>
                        <span>{thread.priority} priority</span>
                        <span>•</span>
                        <span>{thread.category.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{thread.ownerName || thread.ownerEmail || 'Unknown sender'}</span>
                        <span>•</span>
                        <span>Updated {formatDateTime(thread.updatedAt)}</span>
                      </div>
                      <div className={`mt-3 text-sm ${selectedTicketId === thread.id ? 'text-brand-60/72' : 'text-brand-dark/60'}`}>
                        {thread.messages[thread.messages.length - 1]?.body || 'No messages yet.'}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-8 text-sm text-brand-dark/60">
                      No tickets match this queue yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                    <MessageSquareText size={14} />
                    Ticket thread
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-brand-dark">
                    {selectedThread ? `${selectedThread.ticketNumber} • ${selectedThread.subject}` : 'Select a ticket'}
                  </h2>
                  <p className="mt-2 text-sm text-brand-dark/68">
                    {selectedThread
                      ? `${selectedThread.businessName} • ${selectedThread.ownerName} • ${selectedThread.ownerEmail || 'No email'}`
                      : 'Choose a ticket from the queue to see the full thread, update status, and reply.'}
                  </p>
                </div>
                {selectedThread ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-2 text-sm font-medium ${statusTone(selectedThread.status)}`}>
                      {statusLabels[selectedThread.status]}
                    </span>
                    <span className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-2 text-sm font-medium text-brand-dark">
                      {selectedThread.priority} priority
                    </span>
                  </div>
                ) : null}
              </div>

              {selectedThread ? (
                <>
                  <div className="mt-5 grid gap-3 rounded-[28px] border border-brand-30 bg-brand-60/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Raised by</div>
                      <div className="mt-1 font-medium">{selectedThread.ownerName || 'Unknown sender'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Created</div>
                      <div className="mt-1 font-medium">{formatDateTime(selectedThread.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Last updated</div>
                      <div className="mt-1 font-medium">{formatDateTime(selectedThread.updatedAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Assigned admin</div>
                      <div className="mt-1 font-medium">{selectedThread.assignedAdminName || 'Unassigned'}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">
                        <Clock3 size={14} />
                        Workflow actions
                      </div>
                      {statusActions.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateTicketStatus(status)}
                          disabled={statusUpdating !== null && statusUpdating !== status}
                          className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                            selectedThread.status === status
                              ? 'border-brand-10 bg-brand-10 text-brand-60'
                              : 'border-brand-30 bg-white text-brand-dark hover:bg-brand-60/45'
                          } disabled:opacity-60`}
                        >
                          {statusUpdating === status ? 'Updating...' : statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 max-h-[42vh] space-y-3 overflow-y-auto rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
                    {selectedThread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[90%] rounded-[24px] px-4 py-3 ${
                          message.senderType === 'super_admin'
                            ? 'ml-auto bg-brand-10 text-brand-60'
                            : 'bg-white text-brand-dark shadow-sm'
                        }`}
                      >
                        <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          message.senderType === 'super_admin' ? 'text-brand-60/70' : 'text-brand-dark/45'
                        }`}>
                          {message.senderName} • {message.senderEmail || 'No email'} • {formatDateTime(message.createdAt)}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={sendReply} className="mt-5 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                      <label className="space-y-2 text-sm text-brand-dark">
                        <span className="font-medium">Next status after reply</span>
                        <select
                          value={replyStatus}
                          onChange={(event) => setReplyStatus(event.target.value as SupportThreadStatus)}
                          className="w-full rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm text-brand-dark">
                        <span className="font-medium">Reply inside this ticket only</span>
                        <textarea
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          rows={5}
                          placeholder="Write the next step, answer the complaint, or ask for more details."
                          className="w-full rounded-[24px] border border-brand-30 bg-brand-60/25 px-4 py-3 outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !replyBody.trim()}
                        className="rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 disabled:opacity-60"
                      >
                        {submitting ? 'Sending...' : 'Send admin reply'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="mt-6 flex min-h-[34vh] items-center justify-center rounded-[28px] border border-dashed border-brand-30 bg-brand-60/20 px-6 text-center text-sm leading-6 text-brand-dark/60">
                  Pick a ticket from the left to start helping that business.
                </div>
              )}

              {selectedBusiness ? (
                <div className="mt-5 rounded-[28px] border border-brand-30 bg-brand-60/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">
                      <UserRound size={14} />
                      Business account snapshot
                    </div>
                    <span className="rounded-full border border-brand-30 bg-white px-3 py-1 text-sm font-medium text-brand-dark">
                      {businessesWithTickets} accounts with tickets
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Owner</div>
                      <div className="mt-1 font-medium">{selectedBusiness.ownerName}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Phone</div>
                      <div className="mt-1 font-medium">{selectedBusiness.phone || 'Not added yet'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Business type</div>
                      <div className="mt-1 font-medium capitalize">{selectedBusiness.businessType.replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Joined</div>
                      <div className="mt-1 font-medium">{formatDate(selectedBusiness.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
            </>
          )}
        </main>
      </div>

      {selectedUserBusiness ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/45 p-4">
          <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-brand-30 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-sm font-bold text-brand-10">{selectedUserBusiness.hashedUserId}</div>
                <h2 className="mt-2 text-2xl font-semibold text-brand-dark">{selectedUserBusiness.companyName}</h2>
                <p className="mt-1 text-sm text-brand-dark/60">
                  {selectedUserBusiness.ownerName} • {selectedUserBusiness.email || 'No email'} • {selectedUserBusiness.phone || 'No phone'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBusinessId(null)}
                className="rounded-2xl border border-brand-30 bg-brand-60/30 p-3 text-brand-dark transition hover:bg-brand-10 hover:text-brand-60"
                aria-label="Close user details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-brand-30 bg-brand-60/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Current plan</div>
                <div className="mt-2 text-2xl font-semibold">{subscriptionPlanLabels[selectedUserBusiness.subscriptionPlan]}</div>
                <div className="mt-1 text-sm capitalize text-brand-dark/60">{selectedUserBusiness.subscriptionStatus}</div>
              </div>
              <div className="rounded-[24px] border border-brand-30 bg-brand-60/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Renewal</div>
                <div className="mt-2 text-2xl font-semibold">{selectedUserBusiness.renewalDate ? formatDate(selectedUserBusiness.renewalDate) : 'Not set'}</div>
                <div className="mt-1 text-sm text-brand-dark/60">Joined {formatDate(selectedUserBusiness.createdAt)}</div>
              </div>
              <div className="rounded-[24px] border border-brand-30 bg-brand-60/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Team</div>
                <div className="mt-2 text-2xl font-semibold">{selectedUserBusiness.teamMemberCount}</div>
                <div className="mt-1 text-sm text-brand-dark/60">Linked team members</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[24px] border border-brand-30 bg-white p-4">
                <h3 className="text-lg font-semibold">Access management</h3>
                <p className="mt-1 text-sm text-brand-dark/60">Change this plan to control which dashboard modules this owner can access.</p>
                <label className="mt-4 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/45">Assigned plan</span>
                  <select
                    value={selectedUserBusiness.subscriptionPlan}
                    disabled={updatingUserId === selectedUserBusiness.userId}
                    onChange={(event) => updateUserPlan(selectedUserBusiness, event.target.value as SubscriptionPlan)}
                    className="mt-2 w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-lg font-semibold text-brand-dark outline-none"
                  >
                    {subscriptionPlanOptions.map((plan) => (
                      <option key={plan} value={plan}>{subscriptionPlanLabels[plan]}</option>
                    ))}
                  </select>
                </label>
                <div className="mt-4 grid gap-3 text-sm text-brand-dark/70">
                  <div><span className="font-semibold text-brand-dark">Full UID:</span> <span className="font-mono">{selectedUserBusiness.userId}</span></div>
                  <div><span className="font-semibold text-brand-dark">Business type:</span> {selectedUserBusiness.businessType.replace(/_/g, ' ')}</div>
                  <div><span className="font-semibold text-brand-dark">Last sign-in:</span> {selectedUserBusiness.lastSignInAt ? formatDateTime(selectedUserBusiness.lastSignInAt) : 'Not available'}</div>
                </div>
              </div>

              <div className="rounded-[24px] border border-brand-30 bg-white p-4">
                <h3 className="text-lg font-semibold">Team members</h3>
                <div className="mt-3 space-y-3">
                  {selectedUserBusiness.teamMembers.length ? selectedUserBusiness.teamMembers.map((member) => (
                    <div key={member.id} className="rounded-[20px] border border-brand-30 bg-brand-60/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{member.name}</div>
                          <div className="mt-1 text-sm text-brand-dark/60">{member.email || member.loginEmail || 'No email'} • {member.phone || 'No phone'}</div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-brand-dark/65">{member.status}</span>
                      </div>
                      <div className="mt-2 text-xs text-brand-dark/55">
                        {member.role} • ID <span className="font-mono">{member.id}</span>{member.authUid ? ` • Auth ${member.authUid.slice(0, 8)}` : ''}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[20px] border border-dashed border-brand-30 bg-brand-60/20 p-4 text-sm text-brand-dark/55">
                      No team members are linked to this owner yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-brand-30 bg-white p-4">
              <h3 className="text-lg font-semibold">Subscription history</h3>
              <div className="mt-3 space-y-3">
                {selectedUserBusiness.subscriptionHistory.length ? selectedUserBusiness.subscriptionHistory.map((item, index) => (
                  <div key={item.id || `${item.changedAt}-${index}`} className="rounded-[20px] border border-brand-30 bg-brand-60/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold">
                        {item.fromPlan ? `${subscriptionPlanLabels[item.fromPlan]} to ` : ''}{subscriptionPlanLabels[item.toPlan]}
                      </div>
                      <span className="text-sm text-brand-dark/60">{formatDateTime(item.changedAt)}</span>
                    </div>
                    <div className="mt-1 text-sm text-brand-dark/60">
                      Status {item.status} • Renewal {item.renewalDate ? formatDate(item.renewalDate) : 'not set'}{item.changedBy ? ` • Changed by ${item.changedBy}` : ''}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[20px] border border-dashed border-brand-30 bg-brand-60/20 p-4 text-sm text-brand-dark/55">
                    No previous subscription changes recorded yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};
