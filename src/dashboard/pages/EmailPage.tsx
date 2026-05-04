import { useEffect, useMemo, useState } from 'react';
import { Archive, Inbox, Mail, MailPlus, MailWarning, RefreshCw, Search, Send, ShieldAlert, Star, Trash2 } from 'lucide-react';
import type { WorkspaceProfile } from '../types';
import { gmailService, type GmailMailboxKey, type GmailMessageDetail, type GmailMessageSummary } from '../../lib/gmailService';
import { DevelopmentFlag } from '../components/DevelopmentFlag';

type EmailPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
};

const mailboxItems: Array<{ key: GmailMailboxKey; label: string; icon: typeof Inbox }> = [
  { key: 'INBOX', label: 'Inbox', icon: Inbox },
  { key: 'SENT', label: 'Sent', icon: Send },
  { key: 'DRAFT', label: 'Drafts', icon: MailPlus },
  { key: 'SPAM', label: 'Spam', icon: ShieldAlert },
  { key: 'TRASH', label: 'Trash', icon: Trash2 },
  { key: 'STARRED', label: 'Starred', icon: Star },
  { key: 'ALL', label: 'All mail', icon: Archive },
];

const tokenStorageKey = 'pula-biz-gmail-token';

const formatEmailDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

export const EmailPage = ({ companyName, businessProfile }: EmailPageProps) => {
  const [accessToken, setAccessToken] = useState(() => window.sessionStorage.getItem(tokenStorageKey) || '');
  const [gmailAddress, setGmailAddress] = useState('');
  const [activeMailbox, setActiveMailbox] = useState<GmailMailboxKey>('INBOX');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [query, setQuery] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(accessToken);
  const unreadCount = useMemo(() => messages.filter((message) => message.labelIds.includes('UNREAD')).length, [messages]);
  const oauthOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const connectGmail = async () => {
    setError(null);
    try {
      const token = await gmailService.connect('consent');
      window.sessionStorage.setItem(tokenStorageKey, token);
      setAccessToken(token);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to connect Gmail.');
    }
  };

  const disconnectGmail = () => {
    window.sessionStorage.removeItem(tokenStorageKey);
    setAccessToken('');
    setGmailAddress('');
    setMessages([]);
    setSelectedMessage(null);
  };

  const refreshMessages = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [profile, nextMessages] = await Promise.all([
        gmailService.getProfile(accessToken),
        gmailService.listMessages(accessToken, activeMailbox, query),
      ]);
      setGmailAddress(profile.emailAddress);
      setMessages(nextMessages);
      if (selectedMessage && !nextMessages.some((message) => message.id === selectedMessage.id)) {
        setSelectedMessage(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load Gmail messages. Reconnect Gmail and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeMailbox]);

  const openMessage = async (message: GmailMessageSummary) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await gmailService.getMessage(accessToken, message.id);
      setSelectedMessage(detail);
      if (detail.labelIds.includes('UNREAD')) {
        await gmailService.markRead(accessToken, detail.id);
        setMessages((current) => current.map((item) => item.id === detail.id ? { ...item, labelIds: item.labelIds.filter((label) => label !== 'UNREAD') } : item));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to open this email.');
    } finally {
      setLoading(false);
    }
  };

  const runMessageAction = async (action: 'read' | 'unread' | 'archive' | 'spam' | 'trash') => {
    if (!accessToken || !selectedMessage) return;
    setLoading(true);
    setError(null);
    try {
      if (action === 'read') await gmailService.markRead(accessToken, selectedMessage.id);
      if (action === 'unread') await gmailService.markUnread(accessToken, selectedMessage.id);
      if (action === 'archive') await gmailService.archive(accessToken, selectedMessage.id);
      if (action === 'spam') await gmailService.moveToSpam(accessToken, selectedMessage.id);
      if (action === 'trash') await gmailService.trash(accessToken, selectedMessage.id);
      await refreshMessages();
      if (action === 'archive' || action === 'spam' || action === 'trash') setSelectedMessage(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update this email.');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!accessToken || !to.trim()) return;
    setSending(true);
    setError(null);
    try {
      await gmailService.sendMessage(accessToken, { to: to.trim(), subject: subject.trim(), body });
      setTo('');
      setSubject('');
      setBody('');
      setActiveMailbox('SENT');
      await refreshMessages();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to send this email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <DevelopmentFlag pageLabel="Email" />
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
          <Mail size={14} />
          Gmail API workspace
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Business email center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-dark/65">
              Read Gmail, search mail, send emails, archive, spam, trash, and manage read status from inside {companyName || 'your workspace'}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <>
                <button type="button" onClick={() => void refreshMessages()} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark disabled:opacity-60">
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button type="button" onClick={disconnectGmail} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  Disconnect
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void connectGmail()} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-white">
                <MailPlus size={16} />
                Connect Gmail
              </button>
            )}
          </div>
        </div>
      </section>

      {!gmailService.isConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Add `VITE_GOOGLE_CLIENT_ID` from a Google Cloud OAuth web client, enable Gmail API, and restart the dev server.
        </div>
      ) : null}
      <div className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm leading-6 text-brand-dark/70">
        Gmail OAuth must allow this browser origin: <code className="rounded bg-brand-60 px-2 py-1 font-semibold text-brand-dark">{oauthOrigin}</code>. Add it in Google Cloud under OAuth client Authorized JavaScript origins.
      </div>
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-brand-30 bg-white p-4 shadow-sm">
          <div className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm text-brand-dark">
            <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/45">Connected account</div>
            <div className="mt-1 truncate font-semibold">{gmailAddress || businessProfile.email || 'Not connected'}</div>
            {connected ? <div className="mt-1 text-xs text-brand-dark/55">{unreadCount} unread in current view</div> : null}
          </div>

          <div className="mt-4 grid gap-2">
            {mailboxItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveMailbox(item.key)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    activeMailbox === item.key ? 'bg-brand-10 text-white' : 'border border-brand-30 bg-white text-brand-dark'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-brand-dark">{mailboxItems.find((item) => item.key === activeMailbox)?.label}</h2>
                <p className="mt-1 text-sm text-brand-dark/60">{connected ? `${messages.length} emails loaded from Gmail API.` : 'Connect Gmail to load live email.'}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 sm:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Gmail" className="w-full rounded-2xl border border-brand-30 bg-brand-60/25 py-3 pl-11 pr-4 text-sm outline-none" />
                </label>
                <button type="button" onClick={() => void refreshMessages()} disabled={!connected || loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  Search
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-brand-30">
                {messages.map((message) => (
                  <button key={message.id} type="button" onClick={() => void openMessage(message)} className={`block w-full border-b border-brand-30 px-4 py-3 text-left last:border-b-0 hover:bg-brand-60/25 ${selectedMessage?.id === message.id ? 'bg-brand-60/35' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`truncate text-sm ${message.labelIds.includes('UNREAD') ? 'font-bold text-brand-dark' : 'font-semibold text-brand-dark/75'}`}>{message.from || '(Unknown sender)'}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-brand-dark">{message.subject}</div>
                      </div>
                      <div className="shrink-0 text-xs text-brand-dark/45">{formatEmailDate(message.date)}</div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-brand-dark/55">{message.snippet}</p>
                  </button>
                ))}
                {!messages.length ? (
                  <div className="p-8 text-center text-sm text-brand-dark/60">
                    {connected ? 'No emails found in this view.' : 'Connect Gmail to display emails here.'}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-brand-30 bg-brand-60/15 p-4">
                {selectedMessage ? (
                  <>
                    <div className="flex flex-col gap-3 border-b border-brand-30 pb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-brand-dark">{selectedMessage.subject}</h3>
                        <p className="mt-1 text-sm text-brand-dark/60">From: {selectedMessage.from}</p>
                        <p className="mt-1 text-sm text-brand-dark/60">To: {selectedMessage.to || gmailAddress}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void runMessageAction('unread')} className="rounded-full border border-brand-30 bg-white px-3 py-2 text-xs font-semibold text-brand-dark">Mark unread</button>
                        <button type="button" onClick={() => void runMessageAction('archive')} className="rounded-full border border-brand-30 bg-white px-3 py-2 text-xs font-semibold text-brand-dark">Archive</button>
                        <button type="button" onClick={() => void runMessageAction('spam')} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Spam</button>
                        <button type="button" onClick={() => void runMessageAction('trash')} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Trash</button>
                      </div>
                    </div>
                    <pre className="mt-4 max-h-[420px] whitespace-pre-wrap overflow-y-auto rounded-2xl bg-white p-4 text-sm leading-6 text-brand-dark/75">{selectedMessage.bodyText || selectedMessage.snippet || 'No readable body returned for this email.'}</pre>
                  </>
                ) : (
                  <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-brand-dark/60">
                    <Mail size={42} className="mb-4 text-brand-dark/25" />
                    Select an email to read it.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-brand-30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MailWarning size={18} className="text-brand-10" />
              <h2 className="text-2xl font-semibold text-brand-dark">Compose with Gmail API</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="To" className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm outline-none" />
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm outline-none" />
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write email..." rows={7} className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm leading-6 outline-none" />
              <div className="flex justify-end">
                <button type="button" onClick={() => void sendEmail()} disabled={!connected || sending || !to.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  <Send size={16} />
                  {sending ? 'Sending...' : 'Send email'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
