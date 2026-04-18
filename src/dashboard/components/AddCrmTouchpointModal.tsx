import { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import type { CommunicationChannel, CustomerProject } from '../types';

type CrmTouchpointPayload = {
  type: CommunicationChannel;
  summary: string;
  outcome: string;
  nextFollowUpAt: string;
  dealProbability: number;
  needsFollowUp: boolean;
  renderPending: boolean;
};

type AddCrmTouchpointModalProps = {
  open: boolean;
  customer: CustomerProject | null;
  onClose: () => void;
  onSubmit: (payload: CrmTouchpointPayload) => void | Promise<void>;
};

const channelOptions: CommunicationChannel[] = ['call', 'whatsapp', 'meeting', 'share_link', 'comment'];

const Hint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex">
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-30 bg-white text-brand-dark/60">
      <Info size={12} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs leading-5 text-brand-dark shadow-lg group-hover:block">
      {text}
    </span>
  </span>
);

export const AddCrmTouchpointModal = ({
  open,
  customer,
  onClose,
  onSubmit,
}: AddCrmTouchpointModalProps) => {
  const [form, setForm] = useState<CrmTouchpointPayload>({
    type: 'call',
    summary: '',
    outcome: '',
    nextFollowUpAt: '',
    dealProbability: 25,
    needsFollowUp: true,
    renderPending: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const initialDate = useMemo(() => {
    if (!customer?.nextFollowUpAt) return '';
    return customer.nextFollowUpAt.slice(0, 16);
  }, [customer?.nextFollowUpAt]);

  useEffect(() => {
    if (!open || !customer) return;
    setForm({
      type: customer.communicationLog[0]?.type ?? 'call',
      summary: '',
      outcome: '',
      nextFollowUpAt: initialDate,
      dealProbability: customer.dealProbability,
      needsFollowUp: customer.needsFollowUp,
      renderPending: customer.renderPending,
    });
    setSubmitting(false);
  }, [customer, initialDate, open]);

  if (!open || !customer) return null;

  const setField = <K extends keyof CrmTouchpointPayload>(field: K, value: CrmTouchpointPayload[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : customer.nextFollowUpAt,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[min(86vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/65">
              CRM touchpoint
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">Log customer interaction</h3>
            <p className="mt-1 text-sm text-brand-dark/80">
              Update the latest interaction, follow-up timing, and sales confidence for {customer.customerName}.
            </p>
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark shadow-sm">
            <X size={16} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Channel</span>
                <select
                  value={form.type}
                  onChange={(event) => setField('type', event.target.value as CommunicationChannel)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {channelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">
                  Deal probability
                  <Hint text="Use this as a rough sales confidence score for the project. Higher means closer to conversion or approval." />
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.dealProbability}
                  onChange={(event) => setField('dealProbability', Number(event.target.value))}
                />
                <div className="text-sm font-semibold text-brand-dark">{form.dealProbability}% likely</div>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
                <span className="font-medium text-brand-dark">What happened?</span>
                <input
                  value={form.summary}
                  onChange={(event) => setField('summary', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                  placeholder="Example: Shared revised living room concept over WhatsApp"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
                <span className="font-medium text-brand-dark">Outcome / notes</span>
                <textarea
                  value={form.outcome}
                  onChange={(event) => setField('outcome', event.target.value)}
                  className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                  placeholder="Example: Client liked the concept, requested a softer curtain fabric and a final quote on Monday."
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Next follow-up</span>
                <input
                  type="datetime-local"
                  value={form.nextFollowUpAt}
                  onChange={(event) => setField('nextFollowUpAt', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <div className="grid gap-3 text-sm text-brand-dark/80">
                <label className="flex items-center justify-between rounded-2xl border border-brand-30 bg-white px-4 py-3">
                  <span className="font-medium text-brand-dark">Needs follow-up</span>
                  <input
                    type="checkbox"
                    checked={form.needsFollowUp}
                    onChange={(event) => setField('needsFollowUp', event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-brand-30 bg-white px-4 py-3">
                  <span className="font-medium text-brand-dark">Render pending</span>
                  <input
                    type="checkbox"
                    checked={form.renderPending}
                    onChange={(event) => setField('renderPending', event.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save touchpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
