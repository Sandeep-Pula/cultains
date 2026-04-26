import { Printer, X } from 'lucide-react';
import type { FinanceEntry, WorkspaceProfile } from '../types';
import { formatCurrency, formatDateTime } from '../utils';
import { printSalaryPaycheck } from '../invoicePrint';

type SalaryPaycheckDetailModalProps = {
  paycheck: FinanceEntry | null;
  open: boolean;
  companyName: string;
  businessProfile: WorkspaceProfile;
  onClose: () => void;
};

export const SalaryPaycheckDetailModal = ({
  paycheck,
  open,
  companyName,
  businessProfile,
  onClose,
}: SalaryPaycheckDetailModalProps) => {
  if (!open || !paycheck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">
              {paycheck.paycheckNumber || paycheck.title}
            </h2>
            <p className="mt-1 text-sm text-brand-dark/65">
              Salary preview for {paycheck.employeeName || 'Team member'} • {formatDateTime(paycheck.dueAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark"
            aria-label="Close paycheck preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ui-scrollable min-h-0 flex-1 px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-brand-30 bg-white p-5 sm:p-6">
              <div className="border-b border-dashed border-brand-dark/35 pb-4 text-center">
                {businessProfile.workspaceLogoUrl ? (
                  <img
                    src={businessProfile.workspaceLogoUrl}
                    alt={`${companyName || businessProfile.companyName || 'Business'} logo`}
                    className="mx-auto mb-3 h-16 w-16 object-contain grayscale"
                  />
                ) : null}
                <div className="text-3xl font-semibold uppercase tracking-[0.08em] text-black">
                  {companyName || businessProfile.companyName || 'Business'}
                </div>
                <div className="mt-2 text-sm leading-6 text-black">
                  {businessProfile.studioAddress || businessProfile.city || 'Business address not set yet'}
                </div>
                {businessProfile.phone ? <div className="text-sm text-black">PHONE : {businessProfile.phone}</div> : null}
                {businessProfile.gstNumber ? <div className="text-sm text-black">GSTIN : {businessProfile.gstNumber}</div> : null}
              </div>

              <div className="grid gap-3 border-b border-dashed border-brand-dark/35 py-4 text-sm text-black sm:grid-cols-2">
                <div><span className="font-semibold">Paycheck No:</span> {paycheck.paycheckNumber || paycheck.title}</div>
                <div className="sm:text-right"><span className="font-semibold">Date:</span> {new Date(paycheck.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><span className="font-semibold">Employee:</span> {paycheck.employeeName || 'Team member'}</div>
                <div className="sm:text-right"><span className="font-semibold">Method:</span> {(paycheck.paymentMethod || 'bank_transfer').replace('_', ' ')}</div>
                <div><span className="font-semibold">Pay period:</span> {paycheck.payPeriodLabel || 'Current period'}</div>
                <div className="sm:text-right"><span className="font-semibold">Issued by:</span> {paycheck.issuedBy || businessProfile.userName}</div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm text-black">
                  <thead>
                    <tr className="border-y border-dashed border-brand-dark/35">
                      <th className="px-2 py-3 text-left font-semibold">SN</th>
                      <th className="px-2 py-3 text-left font-semibold">Description</th>
                      <th className="px-2 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-3">1</td>
                      <td className="px-2 py-3">
                        <div className="font-semibold">Salary paycheck</div>
                        <div className="mt-1 text-xs text-black/70">
                          {paycheck.notes || 'Salary paycheck generated from the business workspace.'}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">{formatCurrency(paycheck.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-white p-5">
              <div className="space-y-3 text-sm text-black">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <strong>{paycheck.status}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-brand-dark/35 pt-3 text-xl font-semibold">
                  <span>NET PAY</span>
                  <strong>{formatCurrency(paycheck.amount)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Actions</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => printSalaryPaycheck(paycheck, companyName, businessProfile)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                >
                  <Printer size={16} />
                  Print paycheck
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                >
                  Close preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
