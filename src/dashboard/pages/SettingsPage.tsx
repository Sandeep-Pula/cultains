import { Bot, CreditCard, Settings2, ShieldCheck, Sparkles, UserCircle2 } from 'lucide-react';
import { firebaseStatus } from '../../lib/firebase';
import type { WorkspaceBusinessConfig } from '../businessConfig';

type SettingsPageProps = {
  businessConfig: WorkspaceBusinessConfig;
  companyName: string;
  userName: string;
  onNavigate: (hash: string) => void;
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

export const SettingsPage = ({ businessConfig, companyName, userName, onNavigate }: SettingsPageProps) => {
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
          billing visibility, and AI access. {userName ? `${userName},` : 'Your team'} can use this as the control
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
                Before release, verify one real signup, one login, one profile save, one customer create, and one
                finance update in the deployed environment.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
