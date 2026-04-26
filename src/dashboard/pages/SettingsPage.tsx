import { useEffect, useState } from 'react';
import { CreditCard, Save, Settings2 } from 'lucide-react';
import type { WorkspaceProfile } from '../types';

type SettingsPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  onSaveBillingDefaults: (profile: Pick<
    WorkspaceProfile,
    'companyName' | 'userName' | 'businessType' | 'workspaceLogoUrl' | 'email' | 'phone' | 'city' | 'studioAddress' | 'gstNumber' | 'teamSize' | 'website' | 'sidebarViews' | 'billingDefaults'
  >) => Promise<void>;
};

export const SettingsPage = ({
  companyName,
  businessProfile,
  onSaveBillingDefaults,
}: SettingsPageProps) => {
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [billingDefaults, setBillingDefaults] = useState(businessProfile.billingDefaults);

  useEffect(() => {
    setBillingDefaults(businessProfile.billingDefaults);
  }, [businessProfile.billingDefaults]);

  const handleSaveDefaults = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingDefaults(true);
    try {
      await onSaveBillingDefaults({
        companyName: businessProfile.companyName,
        userName: businessProfile.userName,
        businessType: businessProfile.businessType,
        workspaceLogoUrl: businessProfile.workspaceLogoUrl,
        email: businessProfile.email,
        phone: businessProfile.phone,
        city: businessProfile.city,
        studioAddress: businessProfile.studioAddress,
        gstNumber: businessProfile.gstNumber,
        teamSize: businessProfile.teamSize,
        website: businessProfile.website,
        sidebarViews: businessProfile.sidebarViews,
        billingDefaults,
      });
    } finally {
      setSavingDefaults(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
          <Settings2 size={14} />
          Settings
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
          Keep {companyName || 'your workspace'} standardized.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-dark/70 sm:text-base">
          Centralize the defaults your business uses every day so billing starts with the right values automatically.
        </p>
      </section>

      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <CreditCard size={14} />
              Centralized defaults
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-brand-dark">Control business-wide billing defaults</h2>
            <p className="mt-2 text-sm text-brand-dark/65">
              Set the default tax, payment mode, payment status, and invoice note once so every fresh bill starts from your business rules.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveDefaults} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default tax rate (%)</span>
            <input
              inputMode="decimal"
              value={String(billingDefaults.defaultTaxRate)}
              onChange={(event) => /^(\d+(\.\d{0,2})?)?$/.test(event.target.value) && setBillingDefaults((current) => ({
                ...current,
                defaultTaxRate: Number(event.target.value || '0'),
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default payment status</span>
            <select
              value={billingDefaults.defaultPaymentStatus}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultPaymentStatus: event.target.value as typeof current.defaultPaymentStatus,
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default payment method</span>
            <select
              value={billingDefaults.defaultPaymentMethod}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultPaymentMethod: event.target.value as typeof current.defaultPaymentMethod,
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Credit card</option>
              <option value="debit_card">Debit card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
            <span>Default invoice note / policy</span>
            <textarea
              value={billingDefaults.defaultInvoiceNotes}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultInvoiceNotes: event.target.value,
              }))}
              rows={4}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
              placeholder="Store policy, returns, refund terms, or any default invoice footer note"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingDefaults}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 disabled:opacity-60"
            >
              <Save size={15} />
              {savingDefaults ? 'Saving defaults...' : 'Save centralized defaults'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
