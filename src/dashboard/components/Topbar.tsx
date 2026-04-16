import { Bell, Menu, Search } from 'lucide-react';
import type { CustomerProject, DashboardView, TeamMember } from '../types';
import { viewTitles } from '../utils';

type TopbarProps = {
  activeView: DashboardView;
  userName: string;
  companyName: string;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  recentlyViewed: CustomerProject[];
  team: TeamMember[];
  onOpenCustomer: (customerId: string) => void;
};

export const Topbar = ({
  activeView,
  userName,
  companyName,
  search,
  onSearchChange,
  onOpenSidebar,
  recentlyViewed,
  team,
  onOpenCustomer,
}: TopbarProps) => {
  const activeCount = team.filter((member) => member.status !== 'offline').length;

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfd2] bg-[#fcf8f2]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="rounded-2xl border border-[#eadfd2] bg-white p-2 text-[#6f5438] lg:hidden">
              <Menu size={18} />
            </button>
            <div>
              <div className="text-sm text-[#9b8570]">{companyName}</div>
              <div className="text-2xl font-semibold tracking-tight text-[#201812]">
                {viewTitles[activeView]} <span className="text-base font-normal text-[#6f604f]">for {userName}</span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-2xl border border-[#eadfd2] bg-white px-3 py-2 text-sm text-[#6f604f]">
              {activeCount} team members active
            </div>
            <button className="rounded-2xl border border-[#eadfd2] bg-white p-2 text-[#6f5438]">
              <Bell size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <label className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-[#eadfd2] bg-white px-4 py-3 text-[#6f604f]">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search customers, project names, or locations"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#b19d88]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b8570]">Recently viewed</span>
            {recentlyViewed.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onOpenCustomer(customer.id)}
                className="rounded-full border border-[#eadfd2] bg-white px-3 py-1.5 text-sm text-[#5f5042]"
              >
                {customer.customerName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
