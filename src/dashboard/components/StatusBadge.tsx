import { stageBadgeClass, stageLabels as defaultStageLabels } from '../utils';
import type { ProjectStage } from '../types';

type StatusBadgeProps = {
  stage: ProjectStage;
  labels?: Record<ProjectStage, string>;
};

export const StatusBadge = ({ stage, labels = defaultStageLabels }: StatusBadgeProps) => {
  return <span className={stageBadgeClass(stage)}>{labels[stage]}</span>;
};
