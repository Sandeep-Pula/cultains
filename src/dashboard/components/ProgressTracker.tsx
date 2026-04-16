import clsx from 'clsx';
import { stageLabels, stageOrder } from '../utils';
import type { ProjectStage } from '../types';

type ProgressTrackerProps = {
  stage: ProjectStage;
  progress: number;
  compact?: boolean;
};

export const ProgressTracker = ({ stage, progress, compact = false }: ProgressTrackerProps) => {
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-[#6f604f]">
        <span>{stageLabels[stage]}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#efe5d7]">
        <div className="h-2 rounded-full bg-[#6f5438]" style={{ width: `${progress}%` }} />
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
                  active ? 'bg-[#f6ede1] text-[#6f5438]' : 'bg-[#faf5ef] text-[#b6a08c]',
                )}
              >
                {stageLabels[step]}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
