import { Bot, ShieldCheck } from 'lucide-react';
import { DevelopmentFlag } from '../components/DevelopmentFlag';
import type { WorkspaceProfile } from '../types';

type CopilotPageProps = {
  profile: WorkspaceProfile;
};

export const CopilotPage = ({ profile }: CopilotPageProps) => (
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

      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-30 bg-brand-60/35 px-3 py-2 text-sm font-medium text-brand-dark">
        <ShieldCheck size={15} aria-hidden="true" />
        Owner only
      </span>
    </section>

    <DevelopmentFlag pageLabel="Business Copilot" />

    <section className="flex min-h-[460px] flex-1 items-center justify-center rounded-[28px] border border-dashed border-brand-30 bg-white p-8 text-center shadow-sm">
      <div className="max-w-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
          <Bot size={26} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-brand-dark">
          Business Copilot is being prepared
        </h2>
        <p className="mt-3 text-sm leading-6 text-brand-dark/70">
          This owner-only analytics assistant is currently under development and will be enabled after final security,
          domain, and workflow checks are complete.
        </p>
      </div>
    </section>
  </div>
);
