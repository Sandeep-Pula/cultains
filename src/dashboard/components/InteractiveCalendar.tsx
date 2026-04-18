import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import type { CustomerProject, TaskItem } from '../types';

type InteractiveCalendarProps = {
  tasks: TaskItem[];
  customers: CustomerProject[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, date: string) => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenSmartTask: (date: Date) => void;
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
  onOpenSmartTask,
}: InteractiveCalendarProps) => {
  const today = startOfDay(new Date());
  const [currentDate, setCurrentDate] = useState(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(currentDate);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value, 10);
    if (!isNaN(newYear) && newYear > 1900 && newYear < 2100) {
      setCurrentDate(new Date(newYear, month, 1));
    }
  };

  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(currentDate);

  const renderCells = () => {
    const cells: JSX.Element[] = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push(<div key={`empty-${i}`} className="min-h-[60px] border border-brand-30 bg-brand-60/20" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);
      const isToday = sameDay(cellDate, today);
      const dayTasks = tasks.filter(t => sameDay(new Date(t.dueAt), cellDate));

      cells.push(
        <div
          key={day}
          className={clsx(
            'group relative flex min-h-[60px] flex-col p-2 text-left border border-brand-30 transition',
            isToday ? 'bg-brand-60/80 shadow-inner' : 'bg-white hover:bg-brand-60/50',
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isToday ? 'bg-brand-10 text-brand-60' : 'text-brand-dark/70',
              )}
            >
              {day}
            </span>
            {dayTasks.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-30/80 text-[10px] font-bold text-brand-dark">
                {dayTasks.length}
              </span>
            )}
          </div>

          <button
            onClick={() => onOpenSmartTask(cellDate)}
            className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-10 text-brand-60 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:scale-110"
            title="Add task for this day"
          >
            <Plus size={14} />
          </button>

          {/* Hover Popover */}
          {dayTasks.length > 0 && (
            <div className="absolute top-full left-1/2 z-[100] mt-2 hidden w-48 -translate-x-1/2 flex-col rounded-xl bg-brand-dark p-3 text-white opacity-0 shadow-xl transition-all duration-200 group-hover:flex group-hover:opacity-100 pointer-events-none">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Tasks for {cellDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
              <div className="flex flex-col gap-2">
                {dayTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-brand-10 mr-2" />
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[11px] text-white/80 italic mt-1 pb-1">
                    +{dayTasks.length - 3} more task(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>,
      );
    }

    return cells;
  };

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between pl-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-dark">
          <CalendarDays size={18} className="text-brand-10" />
          Operations Calendar
        </h2>
        <div className="flex items-center gap-4 text-brand-dark">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold tracking-wide uppercase">{monthLabel}</span>
            <input 
              type="number" 
              value={year} 
              onChange={handleYearChange} 
              className="w-12 bg-transparent text-[13px] font-semibold tracking-wide uppercase border-b border-brand-30 outline-none text-center focus:border-brand-dark transition [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-30 text-brand-dark/80 transition hover:bg-brand-30 hover:text-brand-dark"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-30 text-brand-dark/80 transition hover:bg-brand-30 hover:text-brand-dark"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-brand-30 flex flex-col">
        <div className="grid grid-cols-7 border-b border-brand-30 bg-brand-30/40">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-brand-dark/70 border-brand-30 [&:not(:last-child)]:border-r"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 border-brand-30 [&>div:not(:nth-child(7n))]:border-r">
          {renderCells()}
        </div>
      </div>
    </div>
  );
};
