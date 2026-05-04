import React, { useMemo, useState } from 'react';
import { Clock, Calendar, Check, X, LogIn, LogOut, UserSquare2 } from 'lucide-react';
import type { TimesheetEntry, LeaveRequest, LeaveStatus, TeamMember } from '../types';
import { formatDateTime, formatDate } from '../utils';

type TimesheetPageProps = {
  timesheets: TimesheetEntry[];
  leaveRequests: LeaveRequest[];
  team: TeamMember[];
  isOwner: boolean;
  viewerId: string;
  onClockIn: (userId: string) => Promise<void>;
  onClockOut: (entryId: string, totalMinutes: number) => Promise<void>;
  onRequestLeave: (payload: Partial<LeaveRequest>) => Promise<void>;
  onUpdateLeaveStatus: (leaveId: string, status: LeaveStatus) => Promise<void>;
};

export const TimesheetPage = ({
  timesheets,
  leaveRequests,
  team,
  isOwner,
  viewerId,
  onClockIn,
  onClockOut,
  onRequestLeave,
  onUpdateLeaveStatus,
}: TimesheetPageProps) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance');
  const [loading, setLoading] = useState(false);

  // Leave Request Form State
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'unpaid' | 'other'>('casual');
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Derived Attendance Data
  const todayDate = new Date().toISOString().split('T')[0];
  const activeEntry = useMemo(() => {
    return timesheets.find((t) => t.userId === viewerId && t.date === todayDate && !t.clockOutTime);
  }, [timesheets, viewerId, todayDate]);

  const myTimesheets = useMemo(() => timesheets.filter((t) => t.userId === viewerId), [timesheets, viewerId]);
  const myLeaveRequests = useMemo(() => leaveRequests.filter((l) => l.userId === viewerId), [leaveRequests, viewerId]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      await onClockIn(viewerId);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setLoading(true);
    try {
      const start = new Date(activeEntry.clockInTime).getTime();
      const end = Date.now();
      const totalMinutes = Math.round((end - start) / 60000);
      await onClockOut(activeEntry.id, totalMinutes);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;
    setLoading(true);
    try {
      await onRequestLeave({
        userId: viewerId,
        startDate: leaveStart,
        endDate: leaveEnd,
        type: leaveType,
        reason: leaveReason,
      });
      setShowLeaveModal(false);
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (minutes?: number) => {
    if (minutes === undefined) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const getMemberName = (id: string) => team.find((m) => m.id === id)?.name || 'Unknown User';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Timesheet & Leave</h1>
          <p className="mt-1 text-sm text-brand-dark/70">Manage your daily attendance and time off requests.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-brand-30 pb-4">
        <button
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === 'attendance' ? 'bg-brand-10 text-brand-60' : 'bg-brand-60/50 text-brand-dark hover:bg-brand-60'
          }`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === 'leave' ? 'bg-brand-10 text-brand-60' : 'bg-brand-60/50 text-brand-dark hover:bg-brand-60'
          }`}
          onClick={() => setActiveTab('leave')}
        >
          Leave Management
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="rounded-[32px] border border-brand-30 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-60/80 px-4 py-2 text-sm font-semibold text-brand-dark">
                <Clock size={16} className="text-brand-10" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <h2 className="mb-6 text-2xl font-semibold text-brand-dark">
                {activeEntry ? 'You are clocked in.' : 'Ready to start your day?'}
              </h2>
              {activeEntry ? (
                <button
                  onClick={() => void handleClockOut()}
                  disabled={loading}
                  className="inline-flex items-center gap-3 rounded-2xl bg-rose-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:opacity-60"
                >
                  <LogOut size={22} />
                  {loading ? 'Processing...' : 'Clock Out'}
                </button>
              ) : (
                <button
                  onClick={() => void handleClockIn()}
                  disabled={loading}
                  className="inline-flex items-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <LogIn size={22} />
                  {loading ? 'Processing...' : 'Clock In'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-brand-dark">{isOwner ? 'All Team Activity' : 'My Recent Activity'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-30 text-brand-dark/60">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    {isOwner && <th className="pb-3 pr-4 font-medium">Team Member</th>}
                    <th className="pb-3 pr-4 font-medium">Clock In</th>
                    <th className="pb-3 pr-4 font-medium">Clock Out</th>
                    <th className="pb-3 font-medium">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-30/50">
                  {(isOwner ? timesheets : myTimesheets).map((entry) => (
                    <tr key={entry.id} className="text-brand-dark">
                      <td className="py-4 pr-4">{formatDate(entry.date)}</td>
                      {isOwner && (
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <UserSquare2 size={16} className="text-brand-dark/40" />
                            {getMemberName(entry.userId)}
                          </div>
                        </td>
                      )}
                      <td className="py-4 pr-4">{formatDateTime(entry.clockInTime).split(',')[1]}</td>
                      <td className="py-4 pr-4">{entry.clockOutTime ? formatDateTime(entry.clockOutTime).split(',')[1] : <span className="text-emerald-600 font-medium">Active</span>}</td>
                      <td className="py-4 font-medium">{formatHours(entry.totalMinutes)}</td>
                    </tr>
                  ))}
                  {(isOwner ? timesheets : myTimesheets).length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 5 : 4} className="py-8 text-center text-brand-dark/50">
                        No recent attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-brand-dark">Leave Requests</h3>
            {!isOwner && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-10 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-10/20"
              >
                <Calendar size={16} />
                Request Leave
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {(isOwner ? leaveRequests : myLeaveRequests).map((leave) => (
              <div key={leave.id} className="flex flex-col gap-4 rounded-[24px] border border-brand-30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {isOwner && <div className="mb-1 text-sm font-semibold text-brand-dark">{getMemberName(leave.userId)}</div>}
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold capitalize text-brand-dark">
                      {leave.type} leave
                    </span>
                    <span className="text-sm font-medium text-brand-dark">
                      {formatDate(leave.startDate)} &rarr; {formatDate(leave.endDate)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-brand-dark/70">{leave.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  {leave.status === 'pending' && isOwner ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void onUpdateLeaveStatus(leave.id, 'approved')}
                        disabled={loading}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void onUpdateLeaveStatus(leave.id, 'rejected')}
                        disabled={loading}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        leave.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : leave.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {leave.status === 'approved' && <Check size={14} />}
                      {leave.status === 'rejected' && <X size={14} />}
                      {leave.status === 'pending' && <Clock size={14} />}
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(isOwner ? leaveRequests : myLeaveRequests).length === 0 && (
              <div className="rounded-[24px] border border-dashed border-brand-30 bg-white py-12 text-center text-sm text-brand-dark/50">
                No leave requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-dark/40 p-4">
          <div className="w-full max-w-md rounded-[32px] border border-brand-30 bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-brand-dark">Request Leave</h3>
            <form onSubmit={handleRequestLeave} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-brand-dark">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-2.5 text-sm text-brand-dark outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-brand-dark">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-2.5 text-sm text-brand-dark outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-dark">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLeaveType(e.target.value as 'sick' | 'casual' | 'unpaid' | 'other')}
                  className="w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-2.5 text-sm text-brand-dark outline-none"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-dark">Reason</label>
                <textarea
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="h-24 w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-sm text-brand-dark outline-none"
                  placeholder="Reason for taking leave..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-xl border border-brand-30 px-4 py-2 text-sm font-medium text-brand-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-brand-10 px-4 py-2 text-sm font-medium text-white shadow-md disabled:opacity-60"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
