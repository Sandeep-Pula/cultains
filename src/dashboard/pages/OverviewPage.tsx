import { useState } from 'react';
import { Smile, FolderKanban, CheckCircle2, Clock } from 'lucide-react';
import type { DashboardData } from '../types';
import { InteractiveCalendar } from '../components/InteractiveCalendar';
import { SmartTaskModal } from '../components/SmartTaskModal';
import { stageLabels, relativeDate } from '../utils';

type OverviewPageProps = {
  data: DashboardData;
  onOpenCustomer: (id: string) => void;
  onNavigate: (view: string) => void;
  onSaveSmartTask: (
    title: string,
    dueAt: string,
    customerOption: { id?: string; isNew?: boolean; name?: string; phone?: string; address?: string }
  ) => Promise<void>;
  onAddCustomer: () => void;
  onAddProject: () => void;
  onAddTeamMember: () => void;
};

export const OverviewPage = ({
  data,
  onOpenCustomer,
  onSaveSmartTask,
}: OverviewPageProps) => {
  const [followupFilter, setFollowupFilter] = useState<'day' | 'week' | 'month'>('week');
  const [smartTaskDate, setSmartTaskDate] = useState<Date | null>(null);

  return (
    <div className="flex xl:h-[calc(100vh-8rem)] min-h-[700px] flex-col gap-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left Pane - Calendar */}
        <div className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm min-h-[400px]">
          <div className="flex-1 overflow-y-auto mix-blend-multiply hide-scrollbar">
            <InteractiveCalendar
              tasks={data.tasks}
              onOpenSmartTask={(date) => setSmartTaskDate(date)}
            />
          </div>
        </div>

        {/* Right Pane - Follow-up Center */}
        <div className="flex flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between border-b border-brand-30 bg-brand-60/40 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">Follow-up Center</h2>
              <p className="text-xs text-brand-dark/60 mt-0.5">Projects expecting engagement</p>
            </div>
            <div className="flex bg-brand-30/50 rounded-full p-1 border border-brand-30/50">
              {(['day', 'week', 'month'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFollowupFilter(f)}
                  className={`w-16 rounded-full py-1 text-xs font-bold capitalize transition-all duration-300 ${
                    followupFilter === f
                      ? 'bg-white text-brand-dark shadow-sm'
                      : 'text-brand-dark/60 hover:text-brand-dark'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
            {data.customers.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-brand-dark/50 border-2 border-dashed border-brand-30 rounded-2xl">
                No active projects to follow up with.
              </div>
            ) : null}
            {data.customers.map((customer) => (
              <div
                key={customer.id}
                className="group flex flex-col justify-between rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm transition hover:border-brand-10 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-brand-dark text-[15px]">{customer.customerName}</div>
                    <div className="mt-1 text-sm text-brand-dark/70 font-medium">{customer.title}</div>
                  </div>
                  <span className="inline-flex rounded-full bg-brand-30/50 px-2.5 py-1 text-[11px] font-medium text-brand-dark">
                    {stageLabels[customer.stage] || customer.stage}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-brand-30 pt-3">
                  <div className="text-xs font-medium text-brand-dark/60">
                    Last contact: {relativeDate(customer.lastContactedAt)}
                  </div>
                  <button
                    onClick={() => onOpenCustomer(customer.id)}
                    className="text-sm font-semibold text-brand-10 hover:underline underline-offset-4"
                  >
                    View workspace
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Pane - Analytics Overview Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 lg:gap-6 shrink-0 h-auto sm:h-36">
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <Smile size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Total Happy Customers</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{data.customers.length * 4}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <FolderKanban size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Active Projects</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{data.customers.filter((c) => c.stage !== 'completed').length}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <CheckCircle2 size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Completed Jobs</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{data.customers.filter((c) => c.stage === 'completed').length}</div>
        </div>
        <div className="group flex flex-col items-center justify-center rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm hover:shadow transition">
          <Clock size={24} className="mb-2 text-brand-10 transition-transform group-hover:scale-110" />
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-brand-dark/70 text-center">Pending Jobs</div>
          <div className="mt-1 text-3xl font-semibold text-brand-dark">{data.tasks.filter((t) => !t.done).length}</div>
        </div>
      </div>

      <SmartTaskModal
        open={!!smartTaskDate}
        onClose={() => setSmartTaskDate(null)}
        initialDate={smartTaskDate}
        customers={data.customers}
        onSave={onSaveSmartTask}
      />
    </div>
  );
};
