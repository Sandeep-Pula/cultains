import clsx from 'clsx';
import { stageLabels as defaultStageLabels, stageOrder } from '../utils';
import type { ProjectStage } from '../types';

type ProgressTrackerProps = {
  stage: ProjectStage;
  progress: number;
  compact?: boolean;
  labels?: Record<ProjectStage, string>;
};

export const ProgressTracker = ({ stage, progress, compact = false, labels = defaultStageLabels }: ProgressTrackerProps) => {
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-brand-dark/75">
        <span>{labels[stage]}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-brand-30/40">
        <div className="h-2 rounded-full bg-brand-10" style={{ width: `${progress}%` }} />
      </div>
      {!compact ? (
        <div className="grid gap-2 md:grid-cols-7">
          {stageOrder.map((step, index) => {
            const active = currentIndex >= index;
            return (
              <div
                key={step}
                className={clsx(
                  'rounded-2xl px-3 py-2 text-center text-xs font-medium',
                  active ? 'bg-brand-30 text-brand-dark' : 'bg-brand-60 text-brand-dark/45',
                )}
              >
                {labels[step]}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
