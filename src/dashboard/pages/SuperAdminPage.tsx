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
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import type { PlatformBusinessAccount, SubscriptionPlan, SupportThread, SupportThreadStatus, WorkspaceProfile } from '../types';
import { formatDate, formatDateTime, subscriptionPlanLabels, subscriptionPlanOptions } from '../utils';
import { BrandWordmark } from '../../components/BrandWordmark';

type SuperAdminPageProps = {
  profile: WorkspaceProfile;
  onLogout: () => void;
  onError: (error: unknown, fallbackMessage: string) => void;
  onSuccess: (title: string, description?: string) => void;
};

type TicketFilter = 'all' | 'new' | 'active' | 'waiting' | 'closed';
type AdminSection = 'support' | 'users';

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

  useEffect(() => {
    const unsubscribe = dashboardService.subscribeToSuperAdminConsole(
      (nextData) => {
        setBusinesses(nextData.businesses);
        setSupportThreads(nextData.supportThreads);
        setSelectedTicketId((current) => {
          if (current && nextData.supportThreads.some((thread) => thread.id === current)) {
            return current;
          }
          return nextData.supportThreads[0]?.id || null;
        });
      },
      (error) => onError(error, 'Unable to load the super admin dashboard.'),
    );

    return () => unsubscribe();
  }, [onError]);

  const selectedThread = useMemo(
    () => supportThreads.find((thread) => thread.id === selectedTicketId) || null,
    [selectedTicketId, supportThreads],
  );

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.userId === selectedThread?.ownerUserId) || null,
    [businesses, selectedThread],
  );

  useEffect(() => {
    if (!selectedThread) return;
    setReplyStatus(selectedThread.status === 'new' ? 'open' : selectedThread.status);
  }, [selectedThread]);

  const newBusinessesThisWeek = useMemo(
    () => businesses.filter((business) => Date.now() - new Date(business.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
    [businesses],
  );

  const newTickets = useMemo(
    () => supportThreads.filter((thread) => thread.status === 'new').length,
    [supportThreads],
  );

  const activeTickets = useMemo(
    () => supportThreads.filter((thread) => ['open', 'in_progress', 'waiting_on_admin', 'waiting_on_business'].includes(thread.status)).length,
    [supportThreads],
  );

  const closedTickets = useMemo(
    () => supportThreads.filter((thread) => thread.status === 'resolved' || thread.status === 'closed').length,
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
    if (!normalizedSearch) return businesses;

    return businesses.filter((business) => [
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
  }, [businesses, userSearchText]);

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
    setUpdatingUserId(business.userId);
    try {
      await dashboardService.updateUserSubscription(business.userId, {
        subscriptionPlan,
        subscriptionStatus: 'active',
        renewalDate: business.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      onSuccess('Subscription updated', `${business.companyName} is now on ${subscriptionPlanLabels[subscriptionPlan]}.`);
    } catch (error) {
      onError(error, 'Unable to update this user subscription.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-60 text-brand-dark">
      <div className="grid min-h-screen xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-r border-brand-30 bg-white/92 p-6 xl:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-10 text-brand-60 shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/55">Platform admin</div>
              <div className="mt-1 text-lg font-semibold">
                <BrandWordmark />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-brand-30 bg-brand-60/40 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">Signed in as</div>
            <div className="mt-2 text-lg font-semibold">{profile.userName}</div>
            <div className="mt-1 text-sm text-brand-dark/65">{profile.email}</div>
            <p className="mt-3 text-sm leading-6 text-brand-dark/70">
              Use the normal forgot-password flow on the login page whenever you need to reset this super admin credential.
            </p>
          </div>

          <nav className="mt-6 grid gap-2" aria-label="Super admin sections">
            {([
              { id: 'users' as const, label: 'Users', icon: UsersRound },
              { id: 'support' as const, label: 'Support', icon: LifeBuoy },
            ]).map((item) => {
              const Icon = item.icon;
              const active = adminSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdminSection(item.id)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? 'bg-brand-10 text-brand-60' : 'bg-white text-brand-dark hover:bg-brand-60/45'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">Business accounts</div>
              <div className="mt-2 text-3xl font-semibold">{businesses.length}</div>
            </div>
            <div className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">New this week</div>
              <div className="mt-2 text-3xl font-semibold">{newBusinessesThisWeek}</div>
            </div>
            <div className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">New tickets</div>
              <div className="mt-2 text-3xl font-semibold">{newTickets}</div>
            </div>
            <div className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">Active tickets</div>
              <div className="mt-2 text-3xl font-semibold">{activeTickets}</div>
            </div>
            <div className="rounded-[24px] border border-brand-30 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-brand-dark/55">Closed tickets</div>
              <div className="mt-2 text-3xl font-semibold">{closedTickets}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark transition hover:bg-brand-60/40"
          >
            <LogOut size={16} />
            Log out
          </button>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 xl:p-8">
          {adminSection === 'users' ? (
            <>
              <section className="rounded-[36px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                  <UsersRound size={14} />
                  Users
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  User subscriptions and access control.
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-dark/70 sm:text-base">
                  Track signed-up owner accounts, their short user IDs, team IDs, and assign a subscription plan for dashboard access testing.
                </p>
              </section>

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {subscriptionPlanOptions.map((plan) => (
                  <div key={plan} className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/50">{subscriptionPlanLabels[plan]}</div>
                    <div className="mt-2 text-3xl font-semibold">{planCounts[plan]}</div>
                  </div>
                ))}
              </section>

              <section className="mt-6 rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">All users</h2>
                    <p className="mt-1 text-sm text-brand-dark/65">
                      Showing owner profile data only. Business financial records stay untouched.
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

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[1080px] w-full border-separate border-spacing-y-3 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">
                        <th className="px-4">User ID</th>
                        <th className="px-4">User</th>
                        <th className="px-4">Company</th>
                        <th className="px-4">Joined</th>
                        <th className="px-4">Team IDs</th>
                        <th className="px-4">Subscription</th>
                        <th className="px-4">Renewal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((business) => (
                        <tr key={business.userId} className="rounded-[24px] bg-brand-60/20 align-top">
                          <td className="rounded-l-[24px] px-4 py-4 font-mono text-sm font-semibold text-brand-10">
                            {business.hashedUserId}
                            <div className="mt-1 max-w-32 truncate text-[11px] font-normal text-brand-dark/45" title={business.userId}>{business.userId}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-brand-dark">{business.ownerName}</div>
                            <div className="mt-1 text-brand-dark/60">{business.email || 'No email yet'}</div>
                            <div className="mt-1 text-brand-dark/55">{business.phone || 'No phone yet'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-brand-dark">{business.companyName}</div>
                            <div className="mt-1 capitalize text-brand-dark/55">{business.businessType.replace(/_/g, ' ')}</div>
                          </td>
                          <td className="px-4 py-4 text-brand-dark/70">{formatDate(business.createdAt)}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-brand-dark">{business.teamMemberCount} team members</div>
                            <div className="mt-2 flex max-w-64 flex-wrap gap-1.5">
                              {business.teamMemberIds.length ? business.teamMemberIds.map((teamId) => (
                                <span key={teamId} className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] text-brand-dark/70">{teamId}</span>
                              )) : <span className="text-brand-dark/50">No team IDs</span>}
                            </div>
                            {business.teamAuthUids.length ? (
                              <div className="mt-2 text-xs text-brand-dark/45">Auth: {business.teamAuthUids.map((id) => id.slice(0, 8)).join(', ')}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={business.subscriptionPlan}
                              disabled={updatingUserId === business.userId}
                              onChange={(event) => updateUserPlan(business, event.target.value as SubscriptionPlan)}
                              className="w-full min-w-40 rounded-2xl border border-brand-30 bg-white px-3 py-2 font-semibold text-brand-dark outline-none"
                            >
                              {subscriptionPlanOptions.map((plan) => (
                                <option key={plan} value={plan}>{subscriptionPlanLabels[plan]}</option>
                              ))}
                            </select>
                            <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-800">
                              {updatingUserId === business.userId ? 'updating' : business.subscriptionStatus}
                            </div>
                          </td>
                          <td className="rounded-r-[24px] px-4 py-4 text-brand-dark/70">
                            {business.renewalDate ? formatDate(business.renewalDate) : 'Not set'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredBusinesses.length ? (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-8 text-sm text-brand-dark/60">
                      No users match this search.
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <>
          <section className="rounded-[36px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Sparkles size={14} />
              Super admin dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Platform control room for business accounts, live ticket queues, and support operations.
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-dark/70 sm:text-base">
              Watch new business signups, triage incoming tickets, move work across statuses, and keep each business inside its own private thread with
              {' '}
              <BrandWordmark />
              .
            </p>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="min-h-0 space-y-6">
              <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
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

              <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
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

            <div className="min-h-0 rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
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
    </div>
  );
};
