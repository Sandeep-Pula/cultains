import { stageBadgeClass, stageLabels } from '../utils';
import type { ProjectStage } from '../types';

type StatusBadgeProps = {
  stage: ProjectStage;
};

export const StatusBadge = ({ stage }: StatusBadgeProps) => {
  return <span className={stageBadgeClass(stage)}>{stageLabels[stage]}</span>;
};
