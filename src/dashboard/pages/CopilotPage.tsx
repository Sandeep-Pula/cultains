import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { AlertTriangle, Bot, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import type { WorkspaceProfile } from '../types';

type CopilotPageProps = {
  user: User;
  profile: WorkspaceProfile;
};

const apiBaseUrl = import.meta.env.VITE_COPILOT_API_BASE_URL?.replace(/\/$/, '') || '';

const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

const normalizeAnalyticsScope = (value: unknown) => {
  const scope = typeof value === 'string' ? value : 'snapshot';
  return ['snapshot', 'inventory', 'sales', 'customers', 'finance', 'team', 'operations', 'timesheets'].includes(scope)
    ? scope
    : 'snapshot';
};

const normalizeDateParam = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeYearParam = (value: unknown) => {
  if (typeof value !== 'number') return undefined;
  return value > 0 ? value : undefined;
};

export const CopilotPage = ({ user, profile }: CopilotPageProps) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const starterPrompts = useMemo(
    () => [
      {
        label: 'Today sales',
        prompt: 'What is my sales report for today?',
        icon: 'analytics' as const,
      },
      {
        label: 'Low stock',
        prompt: 'Which inventory items are low stock or out of stock?',
        icon: 'cube' as const,
      },
      {
        label: 'Year report',
        prompt: `Give me the sales report for ${new Date().getFullYear()}.`,
        icon: 'chart' as const,
      },
      {
        label: 'Business health',
        prompt: 'Summarize my business health across sales, inventory, customers, finance, and operations.',
        icon: 'sparkle' as const,
      },
    ],
    [],
  );

  const { control } = useChatKit({
    api: {
      async getClientSecret(existingClientSecret) {
        if (existingClientSecret) return existingClientSecret;

        setStatus('connecting');
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(apiUrl('/api/chatkit/session'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.client_secret) {
          const message =
            typeof payload.error === 'string'
              ? payload.error
              : 'Unable to connect the business copilot.';
          setStatus('error');
          setError(message);
          throw new Error(message);
        }

        setStatus('ready');
        return payload.client_secret as string;
      },
    },
    theme: {
      colorScheme: 'light',
      radius: 'round',
      density: 'normal',
      color: {
        accent: {
          primary: '#12355B',
          level: 2,
        },
      },
    },
    header: {
      enabled: true,
      title: {
        text: 'Business Copilot',
      },
    },
    history: {
      enabled: true,
      showDelete: false,
      showRename: true,
    },
    startScreen: {
      greeting: `Ask about ${profile.companyName || 'your business'}`,
      prompts: starterPrompts,
    },
    composer: {
      placeholder: 'Ask about sales, stock, customers, payments, tasks...',
      attachments: {
        enabled: false,
      },
    },
    async onClientTool(toolCall) {
      const token = await user.getIdToken();
      const params = toolCall.params || {};
      const scope =
        toolCall.name === 'get_today_sales' || toolCall.name === 'get_year_sales_report'
          ? 'sales'
          : toolCall.name === 'get_inventory_summary'
            ? 'inventory'
            : normalizeAnalyticsScope(params.scope);

      const response = await fetch(apiUrl('/api/copilot/analytics'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          startDate: normalizeDateParam(params.startDate),
          endDate: normalizeDateParam(params.endDate),
          year: normalizeYearParam(params.year),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: typeof payload.error === 'string' ? payload.error : 'Unable to read business analytics.',
        };
      }

      return {
        ok: true,
        data: payload,
      };
    },
    disclaimer: {
      text: 'Read-only analytics for the signed-in business owner.',
    },
    onReady() {
      setStatus('ready');
      setError(null);
    },
    onError(nextError) {
      setStatus('error');
      setError(nextError?.error?.message || 'The copilot connection failed.');
    },
  });

  return (
    <div className="flex min-h-[calc(100vh-112px)] flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-[28px] border border-brand-30 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-10 text-white">
            <Bot size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-brand-dark sm:text-2xl">
              Business Copilot
            </h1>
            <p className="mt-1 truncate text-sm text-brand-dark/65">
              {profile.companyName || 'Owner workspace'} · {profile.userName || 'Business owner'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-30 bg-brand-60/35 px-3 py-2 font-medium text-brand-dark">
            <ShieldCheck size={15} aria-hidden="true" />
            Owner only
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-30 bg-brand-60/35 px-3 py-2 font-medium text-brand-dark">
            {status === 'connecting' ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : status === 'error' ? (
              <AlertTriangle size={15} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={15} aria-hidden="true" />
            )}
            {status === 'connecting' ? 'Connecting' : status === 'error' ? 'Setup needed' : 'Read-only'}
          </span>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Copilot is not ready yet</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <section className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-brand-30 bg-white shadow-sm">
        <ChatKit control={control} className="block h-[calc(100vh-246px)] min-h-[620px] w-full" />
      </section>
    </div>
  );
};
