import { useEffect, useMemo, useState } from 'react';
import { Bot, CreditCard, LifeBuoy, Plus, Send, Settings2, ShieldCheck, Sparkles, Ticket, UserCircle2 } from 'lucide-react';
import { firebaseStatus } from '../../lib/firebase';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import type { SupportThread, SupportTicketCategory, SupportTicketPriority } from '../types';
import { formatDateTime } from '../utils';

type SettingsPageProps = {
  businessConfig: WorkspaceBusinessConfig;
  companyName: string;
  userName: string;
  supportThreads: SupportThread[];
  onNavigate: (hash: string) => void;
  onCreateSupportTicket: (payload: { subject: string; body: string; category: SupportTicketCategory; priority: SupportTicketPriority }) => Promise<void>;
  onSendSupportMessage: (payload: { ticketId: string; body: string }) => Promise<void>;
};

const cards = [
  {
    title: 'Workspace profile',
    description: 'Update brand identity, business type, contact details, and team size from one place.',
    action: 'Open profile',
    view: '#dashboard/profile',
    icon: UserCircle2,
  },
  {
    title: 'Finance and plan',
    description: 'Review billing records, payment flow, and the current freemium launch setup.',
    action: 'Open billing',
    view: '#dashboard/billing',
    icon: CreditCard,
  },
  {
    title: 'AI tools',
    description: 'Keep AI tools discoverable without cluttering the core workflow for the wider team.',
    action: 'Open AI hub',
    view: '#dashboard/ai-tools',
    icon: Bot,
  },
];

const statusLabel = (status: SupportThread['status']) => status.replace(/_/g, ' ');

export const SettingsPage = ({
  businessConfig,
  companyName,
  userName,
  supportThreads,
  onNavigate,
  onCreateSupportTicket,
  onSendSupportMessage,
}: SettingsPageProps) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [createSubject, setCreateSubject] = useState('Business support request');
  const [createMessage, setCreateMessage] = useState('');
  const [createCategory, setCreateCategory] = useState<SupportTicketCategory>('general');
  const [createPriority, setCreatePriority] = useState<SupportTicketPriority>('medium');
  const [replyMessage, setReplyMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    setSelectedTicketId((current) => {
      if (current && supportThreads.some((ticket) => ticket.id === current)) return current;
      return supportThreads[0]?.id || null;
    });
  }, [supportThreads]);

  const selectedTicket = useMemo(
    () => supportThreads.find((ticket) => ticket.id === selectedTicketId) || null,
    [selectedTicketId, supportThreads],
  );

  const openTickets = useMemo(
    () => supportThreads.filter((ticket) => ticket.status !== 'closed'),
    [supportThreads],
  );

  const closedTickets = useMemo(
    () => supportThreads.filter((ticket) => ticket.status === 'closed'),
    [supportThreads],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createMessage.trim()) return;
    setCreating(true);
    try {
      await onCreateSupportTicket({
        subject: createSubject,
        body: createMessage,
        category: createCategory,
        priority: createPriority,
      });
      setCreateMessage('');
      setCreateSubject('Business support request');
      setCreateCategory('general');
      setCreatePriority('medium');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await onSendSupportMessage({ ticketId: selectedTicket.id, body: replyMessage });
      setReplyMessage('');
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
          <Settings2 size={14} />
          Workspace settings
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
          Keep {companyName || businessConfig.label} launch-ready.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-dark/70 sm:text-base">
          This page pulls together the settings that matter most in MVP-1: company identity, launch configuration,
          billing visibility, AI access, and your direct support ticket desk. {userName ? `${userName},` : 'Your team'} can use this as the control
          room for workspace-level decisions.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
                    <Icon size={22} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(card.view)}
                    className="rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-10 hover:bg-white"
                  >
                    {card.action}
                  </button>
                </div>
                <h2 className="mt-5 text-xl font-semibold text-brand-dark">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-dark/70">{card.description}</p>
              </div>
            );
          })}
        </div>

        <aside className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
            <ShieldCheck size={14} />
            Launch status
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-brand-30 bg-brand-60/45 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Cloud configuration</div>
              <div className="mt-2 text-lg font-semibold text-brand-dark">
                {firebaseStatus.isConfigured ? 'Connected' : 'Setup required'}
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-dark/70">
                {firebaseStatus.isConfigured
                  ? 'Firebase environment variables are present, so auth and dashboard sync can run in this build.'
                  : firebaseStatus.setupMessage}
              </p>
            </div>

            <div className="rounded-[24px] border border-brand-30 bg-brand-60/45 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Workspace model</div>
              <div className="mt-2 text-lg font-semibold capitalize text-brand-dark">{businessConfig.label}</div>
              <p className="mt-2 text-sm leading-6 text-brand-dark/70">
                Customer, inventory, billing, and AI labels are already tuned for this business type.
              </p>
            </div>

            <div className="rounded-[24px] border border-brand-30 bg-brand-10 p-5 text-brand-60">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-60/75">
                <Sparkles size={14} />
                MVP-1 guidance
              </div>
              <p className="mt-3 text-sm leading-6 text-brand-60/90">
                Before release, verify one real signup, one login, one profile save, one customer create, one
                finance update, and one support ticket reply in the deployed environment.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Plus size={14} />
              Raise new ticket
            </div>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <label className="block text-sm text-brand-dark">
                <span className="mb-2 block font-medium">Ticket subject</span>
                <input
                  value={createSubject}
                  onChange={(event) => setCreateSubject(event.target.value)}
                  className="w-full rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                  placeholder="What do you need help with?"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-brand-dark">
                  <span className="mb-2 block font-medium">Category</span>
                  <select
                    value={createCategory}
                    onChange={(event) => setCreateCategory(event.target.value as SupportTicketCategory)}
                    className="w-full rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature request</option>
                    <option value="account">Account</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-dark">
                  <span className="mb-2 block font-medium">Priority</span>
                  <select
                    value={createPriority}
                    onChange={(event) => setCreatePriority(event.target.value as SupportTicketPriority)}
                    className="w-full rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm text-brand-dark">
                <span className="mb-2 block font-medium">Message</span>
                <textarea
                  value={createMessage}
                  onChange={(event) => setCreateMessage(event.target.value)}
                  rows={5}
                  className="w-full rounded-[24px] border border-brand-30 bg-brand-60/25 px-4 py-3 outline-none"
                  placeholder="Describe the issue, attach context, and explain what help you need from the AIvyapari platform team."
                />
              </label>
              <button
                type="submit"
                disabled={creating || !createMessage.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 disabled:opacity-60"
              >
                <Ticket size={15} />
                {creating ? 'Creating...' : 'Create ticket'}
              </button>
            </form>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                <LifeBuoy size={14} />
                Your tickets
              </div>
              <span className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-1 text-sm font-medium text-brand-dark">
                {supportThreads.length} total
              </span>
            </div>
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Open tickets</div>
                <div className="ui-scrollable max-h-[240px] space-y-3 pr-1">
                  {openTickets.length ? openTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedTicketId === ticket.id
                          ? 'border-brand-10 bg-brand-10 text-brand-60'
                          : 'border-brand-30 bg-brand-60/20 text-brand-dark hover:bg-brand-60/45'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{ticket.ticketNumber}</div>
                          <div className={`mt-1 text-sm ${selectedTicketId === ticket.id ? 'text-brand-60/76' : 'text-brand-dark/65'}`}>
                            {ticket.subject}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${selectedTicketId === ticket.id ? 'bg-white/10 text-brand-60' : 'bg-white text-brand-dark/70'}`}>
                          {statusLabel(ticket.status)}
                        </span>
                      </div>
                      <div className={`mt-3 text-xs uppercase tracking-[0.14em] ${selectedTicketId === ticket.id ? 'text-brand-60/62' : 'text-brand-dark/50'}`}>
                        {ticket.priority} priority • {ticket.category.replace(/_/g, ' ')} • updated {formatDateTime(ticket.updatedAt)}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-6 text-sm text-brand-dark/60">
                      No open tickets right now.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Closed tickets</div>
                <div className="ui-scrollable max-h-[180px] space-y-3 pr-1">
                  {closedTickets.length ? closedTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="w-full rounded-[24px] border border-brand-30 bg-white px-4 py-4 text-left transition hover:bg-brand-60/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{ticket.ticketNumber}</div>
                          <div className="mt-1 text-sm text-brand-dark/65">{ticket.subject}</div>
                        </div>
                        <span className="rounded-full bg-brand-60/40 px-3 py-1 text-xs font-semibold uppercase text-brand-dark/75">
                          Closed
                        </span>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/20 px-4 py-6 text-sm text-brand-dark/60">
                      No closed tickets yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                <Sparkles size={14} />
                Ticket thread
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-brand-dark">
                {selectedTicket ? `${selectedTicket.ticketNumber} • ${selectedTicket.subject}` : 'Select a ticket'}
              </h2>
              <p className="mt-2 text-sm text-brand-dark/70">
                {selectedTicket
                  ? `Opened ${formatDateTime(selectedTicket.createdAt)} • ${selectedTicket.category.replace(/_/g, ' ')} • ${selectedTicket.priority} priority`
                  : 'Choose one of your tickets to continue the support conversation.'}
              </p>
            </div>
            {selectedTicket ? (
              <span className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-2 text-sm font-medium text-brand-dark">
                {statusLabel(selectedTicket.status)}
              </span>
            ) : null}
          </div>

          <div className="ui-scrollable mt-5 max-h-[460px] space-y-3 rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
            {selectedTicket?.messages.length ? selectedTicket.messages.map((messageItem) => (
              <div
                key={messageItem.id}
                className={`max-w-[92%] rounded-[24px] px-4 py-3 ${
                  messageItem.senderType === 'business'
                    ? 'ml-auto bg-brand-10 text-brand-60'
                    : 'bg-white text-brand-dark shadow-sm'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                  messageItem.senderType === 'business' ? 'text-brand-60/70' : 'text-brand-dark/45'
                }`}>
                  {messageItem.senderName} • {messageItem.senderEmail || 'No email'} • {formatDateTime(messageItem.createdAt)}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{messageItem.body}</div>
              </div>
            )) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-brand-30 bg-white/55 px-6 text-center text-sm leading-6 text-brand-dark/60">
                Choose one of your tickets from the left to view the thread.
              </div>
            )}
          </div>

          {selectedTicket ? (
            <form onSubmit={handleReply} className="mt-5 space-y-4">
              <label className="block text-sm text-brand-dark">
                <span className="mb-2 block font-medium">Reply inside this ticket only</span>
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={5}
                  className="w-full rounded-[24px] border border-brand-30 bg-brand-60/25 px-4 py-3 outline-none"
                  placeholder="Reply to the super admin inside this ticket thread."
                />
              </label>
              <button
                type="submit"
                disabled={replying || !replyMessage.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 disabled:opacity-60"
              >
                <Send size={15} />
                {replying ? 'Sending...' : 'Send reply'}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
};
