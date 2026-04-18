import type { LucideIcon } from 'lucide-react';

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  emphasis?: 'primary' | 'secondary';
};

type EmptyStatePanelProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  compact?: boolean;
};

export const EmptyStatePanel = ({
  icon: Icon,
  title,
  description,
  actions = [],
  compact = false,
}: EmptyStatePanelProps) => (
  <div
    className={`rounded-3xl border border-dashed border-brand-30 bg-white/80 text-center ${
      compact ? 'p-5' : 'p-8'
    }`}
  >
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-60 text-brand-10">
      <Icon size={22} />
    </div>
    <h3 className="mt-4 text-xl font-semibold text-brand-dark">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-dark/75">{description}</p>
    {actions.length ? (
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={
              action.emphasis === 'primary'
                ? 'rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60'
                : 'rounded-2xl border border-brand-30 bg-brand-60 px-4 py-2.5 text-sm font-medium text-brand-dark'
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    ) : null}
  </div>
);
