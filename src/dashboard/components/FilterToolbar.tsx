import type { CustomerFilters, TeamMember } from '../types';
import { stageLabels } from '../utils';

type FilterToolbarProps = {
  filters: CustomerFilters;
  team: TeamMember[];
  onChange: (next: Partial<CustomerFilters>) => void;
};

export const FilterToolbar = ({ filters, team, onChange }: FilterToolbarProps) => (
  <div className="flex flex-col gap-3 rounded-3xl border border-brand-30 bg-white/90 p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
    <div className="grid gap-3 md:grid-cols-4 xl:flex">
      <select
        value={filters.stage}
        onChange={(event) => onChange({ stage: event.target.value as CustomerFilters['stage'] })}
        className="rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-sm text-brand-dark"
      >
        <option value="all">All stages</option>
        {Object.entries(stageLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={filters.ownerId}
        onChange={(event) => onChange({ ownerId: event.target.value })}
        className="rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-sm text-brand-dark"
      >
        <option value="all">All owners</option>
        {team.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <select
        value={filters.completion}
        onChange={(event) => onChange({ completion: event.target.value as CustomerFilters['completion'] })}
        className="rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-sm text-brand-dark"
      >
        <option value="all">All states</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending action</option>
      </select>

      <select
        value={filters.sortBy}
        onChange={(event) => onChange({ sortBy: event.target.value as CustomerFilters['sortBy'] })}
        className="rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-sm text-brand-dark"
      >
        <option value="latest">Latest updated</option>
        <option value="activity">Highest activity</option>
        <option value="pending">Pending work</option>
      </select>
    </div>
  </div>
);
