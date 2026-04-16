import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageSquareMore,
  Plus,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { CustomerProject, TaskItem } from '../types';
import { formatDateTime, relativeDate } from '../utils';

type InteractiveCalendarProps = {
  tasks: TaskItem[];
  customers: CustomerProject[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, date: string) => void;
  onOpenCustomer: (customerId: string) => void;
};

type CalendarEntry = {
  id: string;
  kind: 'task' | 'follow_up' | 'site_visit' | 'approval';
  title: string;
  at: string;
  customerId?: string;
  customerName?: string;
  done?: boolean;
  priorityTone: 'warm' | 'sky' | 'emerald' | 'rose';
};

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const InteractiveCalendar = ({
  tasks,
  customers,
  onToggleTask,
  onAddTask,
  onOpenCustomer,
}: InteractiveCalendarProps) => {
  const today = startOfDay(new Date());
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [draftTask, setDraftTask] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const entries = useMemo<CalendarEntry[]>(() => {
    const taskEntries: CalendarEntry[] = tasks.map((task) => ({
      id: task.id,
      kind: 'task',
      title: task.title,
      at: task.dueAt,
      customerId: task.customerId || undefined,
      customerName: customers.find((customer) => customer.id === task.customerId)?.customerName,
      done: task.done,
      priorityTone: task.done ? 'emerald' : task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'warm' : 'sky',
    }));

    const customerEntries: CalendarEntry[] = customers.flatMap((customer) => {
      const items: CalendarEntry[] = [
        {
          id: `${customer.id}-follow-up`,
          kind: 'follow_up',
          title: `Follow up with ${customer.customerName}`,
          at: customer.nextFollowUpAt,
          customerId: customer.id,
          customerName: customer.customerName,
          priorityTone: customer.needsFollowUp ? 'rose' : 'warm',
        },
      ];

      if (customer.siteVisitScheduledAt) {
        items.push({
          id: `${customer.id}-site-visit`,
          kind: 'site_visit',
          title: `${customer.customerName} site visit`,
          at: customer.siteVisitScheduledAt,
          customerId: customer.id,
          customerName: customer.customerName,
          priorityTone: 'sky',
        });
      }

      if (customer.stage === 'render_shared' || customer.stage === 'customer_approved') {
        items.push({
          id: `${customer.id}-approval`,
          kind: 'approval',
          title: `${customer.customerName} approval window`,
          at: customer.lastUpdated,
          customerId: customer.id,
          customerName: customer.customerName,
          priorityTone: 'warm',
        });
      }

      return items;
    });

    return [...taskEntries, ...customerEntries].sort(
      (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime(),
    );
  }, [customers, tasks]);

  const selectedEntries = useMemo(
    () =>
      entries.filter((entry) => sameDay(new Date(entry.at), selectedDate)),
    [entries, selectedDate],
  );

  const upcomingEntries = useMemo(
    () =>
      entries
        .filter((entry) => new Date(entry.at).getTime() >= today.getTime())
        .slice(0, 5),
    [entries, today],
  );

  const monthStats = useMemo(() => {
    const thisMonthEntries = entries.filter((entry) => {
      const date = new Date(entry.at);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    return {
      total: thisMonthEntries.length,
      followUps: thisMonthEntries.filter((entry) => entry.kind === 'follow_up').length,
      siteVisits: thisMonthEntries.filter((entry) => entry.kind === 'site_visit').length,
      approvals: thisMonthEntries.filter((entry) => entry.kind === 'approval').length,
    };
  }, [entries, month, year]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleQuickAdd = () => {
    if (!draftTask.trim()) return;
    const at = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      11,
      0,
      0,
    ).toISOString();
    onAddTask(draftTask.trim(), at);
    setDraftTask('');
  };

  const toneClasses: Record<CalendarEntry['priorityTone'], string> = {
    warm: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    rose: 'bg-rose-100 text-rose-800',
  };

  const kindLabels: Record<CalendarEntry['kind'], string> = {
    task: 'Task',
    follow_up: 'Follow-up',
    site_visit: 'Site visit',
    approval: 'Approval',
  };

  const renderCells = () => {
    const cells: JSX.Element[] = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push(<div key={`empty-${i}`} className="min-h-[108px] border border-[#f4ebdd] bg-[#fffaf4]/50" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);
      const dayEntries = entries.filter((entry) => sameDay(new Date(entry.at), cellDate));
      const isToday = sameDay(cellDate, today);
      const isSelected = sameDay(cellDate, selectedDate);

      cells.push(
        <button
          key={day}
          onClick={() => setSelectedDate(startOfDay(cellDate))}
          className={clsx(
            'group relative flex min-h-[118px] flex-col gap-2 border border-[#f4ebdd] p-2 text-left transition',
            isSelected ? 'bg-[#f6ede1] shadow-inner' : isToday ? 'bg-[#faf4eb]' : 'bg-white hover:bg-[#fffaf4]',
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                isSelected || isToday ? 'bg-[#6f5438] text-white' : 'text-[#201812]',
              )}
            >
              {day}
            </span>
            {dayEntries.length ? (
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#6f604f] shadow-sm">
                {dayEntries.length}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1">
            {dayEntries.slice(0, 3).map((entry) => (
              <span key={entry.id} className={clsx('rounded-full px-2 py-1 text-[10px] font-medium', toneClasses[entry.priorityTone])}>
                {kindLabels[entry.kind]}
              </span>
            ))}
            {dayEntries.length > 3 ? (
              <span className="rounded-full bg-[#efe5d7] px-2 py-1 text-[10px] font-medium text-[#6f604f]">
                +{dayEntries.length - 3} more
              </span>
            ) : null}
          </div>

          <div className="mt-auto space-y-1">
            {dayEntries.slice(0, 2).map((entry) => (
              <div key={entry.id} className="truncate text-xs text-[#6f604f]">
                {entry.title}
              </div>
            ))}
          </div>
        </button>,
      );
    }

    return cells;
  };

  return (
    <div className="rounded-[32px] border border-[#eadfd2] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f7efe3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b8570]">
            <CalendarClock size={14} />
            Operational calendar
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#201812]">Workday planner</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#6f604f]">
            See follow-ups, site visits, approvals, and team tasks in one place so decorators always know what needs action next.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Month items', value: monthStats.total },
            { label: 'Follow-ups', value: monthStats.followUps },
            { label: 'Site visits', value: monthStats.siteVisits },
            { label: 'Approvals', value: monthStats.approvals },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#faf4eb] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-[#9b8570]">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-[#201812]">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1.45fr_0.9fr]">
        <div>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="text-lg font-medium text-[#6f604f]">{monthName}</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfd2] text-[#6f604f] transition hover:bg-[#fcf8f2] hover:text-[#201812]"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfd2] text-[#6f604f] transition hover:bg-[#fcf8f2] hover:text-[#201812]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2">
              <input
                value={draftTask}
                onChange={(event) => setDraftTask(event.target.value)}
                placeholder={`Add task for ${selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#b19d88]"
              />
              <button
                onClick={handleQuickAdd}
                className="inline-flex items-center gap-1 rounded-xl bg-[#6f5438] px-3 py-2 text-xs font-medium text-white"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eadfd2]">
            <div className="grid grid-cols-7 border-b border-[#eadfd2] bg-[#faf4eb]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#9b8570] border-[#eadfd2] [&:not(:last-child)]:border-r"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-[#eadfd2] [&>button:not(:nth-child(7n))]:border-r [&>div:not(:nth-child(7n))]:border-r">
              {renderCells()}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-[#eadfd2] bg-[#fcf8f2] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b8570]">Selected day</div>
                <h3 className="mt-2 text-xl font-semibold text-[#201812]">
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <div className="rounded-2xl bg-white px-3 py-2 text-sm text-[#6f604f]">
                {selectedEntries.length} planned
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedEntries.length ? (
                selectedEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-medium', toneClasses[entry.priorityTone])}>
                            {kindLabels[entry.kind]}
                          </span>
                          <span className="text-xs text-[#9b8570]">{formatDateTime(entry.at)}</span>
                        </div>
                        <div className="mt-2 font-medium text-[#201812]">{entry.title}</div>
                        {entry.customerName ? (
                          <button
                            onClick={() => entry.customerId && onOpenCustomer(entry.customerId)}
                            className="mt-1 text-sm text-[#6f5438] underline-offset-4 hover:underline"
                          >
                            {entry.customerName}
                          </button>
                        ) : null}
                      </div>
                      {entry.kind === 'task' ? (
                        <button
                          onClick={() => onToggleTask(entry.id)}
                          className={clsx(
                            'flex h-8 w-8 items-center justify-center rounded-full border',
                            entry.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[#d7c7b4] text-[#6f604f]',
                          )}
                        >
                          <Check size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#eadfd2] bg-white p-5 text-sm text-[#9b8570]">
                  Nothing planned here yet. Add a task above or use customer follow-up dates to bring activity into this day.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#201812]">
              <Sparkles size={18} />
              <h3 className="text-lg font-semibold">Upcoming agenda</h3>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-[#fcf8f2] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-medium', toneClasses[entry.priorityTone])}>
                      {kindLabels[entry.kind]}
                    </span>
                    <span className="text-xs text-[#9b8570]">{relativeDate(entry.at)}</span>
                  </div>
                  <div className="mt-2 font-medium text-[#201812]">{entry.title}</div>
                  {entry.customerName ? (
                    <button
                      onClick={() => entry.customerId && onOpenCustomer(entry.customerId)}
                      className="mt-1 text-sm text-[#6f5438] underline-offset-4 hover:underline"
                    >
                      {entry.customerName}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#201812]">
              <MessageSquareMore size={18} />
              <h3 className="text-lg font-semibold">Planner hints</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#6f604f]">
              <div className="rounded-2xl bg-[#fcf8f2] p-4">
                Follow-up dates, site visits, and approval windows are pulled into the calendar automatically from customer records.
              </div>
              <div className="rounded-2xl bg-[#fcf8f2] p-4">
                Click a day to review the agenda, then open a customer directly from the side panel when action is needed.
              </div>
              <div className="rounded-2xl bg-[#fcf8f2] p-4">
                Use quick add for personal team tasks that are not tied to a customer yet.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
