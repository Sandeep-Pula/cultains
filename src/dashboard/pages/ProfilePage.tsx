import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Crown,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import type { FinanceEntry, InvoicePaymentMethod, TeamMember, WorkspaceProfile } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { printSalaryPaycheck } from '../invoicePrint';
import { formatCurrency, formatDate, formatDateTime } from '../utils';

type ProfilePageProps = {
  profile: WorkspaceProfile;
  businessConfig: WorkspaceBusinessConfig;
  totalCustomers: number;
  totalTeamMembers: number;
  totalInventoryItems: number;
  team: TeamMember[];
  financeEntries: FinanceEntry[];
  onSaveProfile: (profile: Pick<
    WorkspaceProfile,
    'companyName' | 'userName' | 'businessType' | 'workspaceLogoUrl' | 'email' | 'phone' | 'city' | 'studioAddress' | 'gstNumber' | 'teamSize' | 'website' | 'sidebarViews'
  >) => Promise<void>;
  onCreatePaycheck: (payload: {
    employeeMemberId: string;
    employeeName: string;
    amount: number;
    dueAt: string;
    notes: string;
    payPeriodLabel: string;
    paymentMethod: InvoicePaymentMethod;
    status: FinanceEntry['status'];
    issuedBy: string;
  }) => Promise<void>;
};

export const ProfilePage = ({
  profile,
  businessConfig,
  totalCustomers,
  totalTeamMembers,
  totalInventoryItems,
  team,
  financeEntries,
  onSaveProfile,
  onCreatePaycheck,
}: ProfilePageProps) => {
  const [form, setForm] = useState({
    companyName: profile.companyName,
    userName: profile.userName,
    businessType: profile.businessType,
    workspaceLogoUrl: profile.workspaceLogoUrl,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    studioAddress: profile.studioAddress,
    gstNumber: profile.gstNumber,
    teamSize: profile.teamSize,
    website: profile.website,
    sidebarViews: profile.sidebarViews,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [paycheckOpen, setPaycheckOpen] = useState(false);
  const [paycheckSubmitting, setPaycheckSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paycheckForm, setPaycheckForm] = useState({
    employeeMemberId: '',
    amount: '',
    dueAt: new Date().toISOString().slice(0, 10),
    notes: '',
    payPeriodLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    paymentMethod: 'bank_transfer' as InvoicePaymentMethod,
    status: 'paid' as FinanceEntry['status'],
  });

  useEffect(() => {
    setForm({
      companyName: profile.companyName,
      userName: profile.userName,
      businessType: profile.businessType,
      workspaceLogoUrl: profile.workspaceLogoUrl,
      email: profile.email,
      phone: profile.phone,
      city: profile.city,
      studioAddress: profile.studioAddress,
      gstNumber: profile.gstNumber,
      teamSize: profile.teamSize,
      website: profile.website,
      sidebarViews: profile.sidebarViews,
    });
  }, [profile]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const paycheckEntries = useMemo(
    () =>
      financeEntries
        .filter((entry) => entry.category === 'salary')
        .slice()
        .sort((left, right) => new Date(right.dueAt).getTime() - new Date(left.dueAt).getTime()),
    [financeEntries],
  );

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setForm((current) => ({ ...current, workspaceLogoUrl: dataUrl }));
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile(form);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePaycheck = async (event: React.FormEvent) => {
    event.preventDefault();
    const employee = team.find((member) => member.id === paycheckForm.employeeMemberId);
    if (!employee) return;

    setPaycheckSubmitting(true);
    try {
      await onCreatePaycheck({
        employeeMemberId: employee.id,
        employeeName: employee.name,
        amount: Number(paycheckForm.amount || '0'),
        dueAt: new Date(paycheckForm.dueAt).toISOString(),
        notes: paycheckForm.notes.trim(),
        payPeriodLabel: paycheckForm.payPeriodLabel.trim(),
        paymentMethod: paycheckForm.paymentMethod,
        status: paycheckForm.status,
        issuedBy: profile.userName,
      });
      setPaycheckOpen(false);
      setPaycheckForm({
        employeeMemberId: '',
        amount: '',
        dueAt: new Date().toISOString().slice(0, 10),
        notes: '',
        payPeriodLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        paymentMethod: 'bank_transfer',
        status: 'paid',
      });
    } finally {
      setPaycheckSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-brand-30 bg-white shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(80,80,129,0.08),rgba(255,255,255,0.96))] p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Building2 size={14} />
              Profile workspace
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              {profile.companyName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-dark/70 sm:text-base">
              A clean place to maintain company identity, workspace details, and the current subscription state for your dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">{businessConfig.customerPlural}</div>
                <div className="mt-2 text-3xl font-semibold text-brand-dark">{totalCustomers}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Team members</div>
                <div className="mt-2 text-3xl font-semibold text-brand-dark">{totalTeamMembers}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Inventory items</div>
                <div className="mt-2 text-3xl font-semibold text-brand-dark">{totalInventoryItems}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-brand-10 p-6 text-brand-60 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Crown size={20} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-brand-60/70">Subscription</div>
                  <div className="mt-1 text-2xl font-semibold">Freemium</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200">
                Active
              </span>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <BadgeCheck size={17} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Current plan</div>
                  <div className="text-brand-60/72">Freemium is the default plan for now. Paid plan pricing can be added later.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={17} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Included workspace</div>
                  <div className="text-brand-60/72">Access your CRM, inventory, billing, operations, and AI tools from the same account.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm">
              <div className="text-brand-60/68">Renewal checkpoint</div>
              <div className="mt-1 font-medium text-white">{formatDate(profile.renewalDate)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Company and account details</h2>
              <p className="mt-2 text-sm text-brand-dark/65">These fields are stored in your workspace profile so the dashboard can adapt to your business type and identity.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Company name</span>
              <input value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Owner / admin name</span>
              <input value={form.userName} onChange={(event) => updateField('userName', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Business type</span>
              <select value={form.businessType} onChange={(event) => updateField('businessType', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white">
                <option value="general_business">General business</option>
                <option value="interior_decorator">Interior decorator</option>
                <option value="shoe_shop">Shoe shop</option>
                <option value="sports_shop">Sports shop</option>
                <option value="retail_store">Retail store</option>
                <option value="service_business">Service business</option>
              </select>
            </label>
            <div className="grid gap-2 text-sm text-brand-dark/75">
              <span>Workspace logo</span>
              <div className="rounded-[24px] border border-brand-30 bg-brand-60/35 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-brand-30 bg-white shadow-sm">
                    {form.workspaceLogoUrl ? (
                      <img src={form.workspaceLogoUrl} alt="Workspace logo preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold uppercase text-brand-dark/45">No logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-brand-60 transition hover:bg-brand-dark"
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                    </button>
                    {form.workspaceLogoUrl ? (
                      <button
                        type="button"
                        onClick={() => updateField('workspaceLogoUrl', '')}
                        className="block text-xs font-semibold text-rose-600"
                      >
                        Remove logo
                      </button>
                    ) : null}
                    <p className="text-xs text-brand-dark/55">This image is saved in the user&apos;s Firestore profile and reused across the dashboard.</p>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            </div>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Phone</span>
              <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>City</span>
              <input value={form.city} onChange={(event) => updateField('city', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Team size</span>
              <input value={form.teamSize} onChange={(event) => updateField('teamSize', event.target.value)} placeholder="e.g. 12 people" className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
              <span>Business address</span>
              <textarea value={form.studioAddress} onChange={(event) => updateField('studioAddress', event.target.value)} rows={4} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>GST number</span>
              <input value={form.gstNumber} onChange={(event) => updateField('gstNumber', event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Website</span>
              <input value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://yourstudio.com" className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none transition focus:border-brand-10 focus:bg-white" />
            </label>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-brand-dark">Quick contact card</h3>
            <div className="mt-5 space-y-4 text-sm text-brand-dark/75">
              <div className="flex items-start gap-3">
                <Mail size={17} className="mt-0.5 shrink-0 text-brand-10" />
                <div>
                  <div className="font-medium text-brand-dark">Email</div>
                  <div>{profile.email || 'Add your business email in the profile form.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={17} className="mt-0.5 shrink-0 text-brand-10" />
                <div>
                  <div className="font-medium text-brand-dark">Phone</div>
                  <div>{profile.phone || 'Add a phone number for the workspace.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-brand-10" />
                <div>
                  <div className="font-medium text-brand-dark">City</div>
                  <div>{profile.city || 'Add your primary operating city.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe size={17} className="mt-0.5 shrink-0 text-brand-10" />
                <div>
                  <div className="font-medium text-brand-dark">Website</div>
                  <div>{profile.website || 'Add your website or business link.'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-brand-dark">Workspace snapshot</h3>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-brand-60/35 px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-brand-dark">
                  <UsersRound size={16} className="text-brand-10" />
                  Saved team size
                </div>
                <span className="font-medium text-brand-dark">{profile.teamSize || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-brand-60/35 px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-brand-dark">
                  <Building2 size={16} className="text-brand-10" />
                  Business type
                </div>
                <span className="font-medium capitalize text-brand-dark">{profile.businessType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-brand-60/35 px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-brand-dark">
                  <Crown size={16} className="text-brand-10" />
                  Subscription plan
                </div>
                <span className="font-medium text-brand-dark">Freemium</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <CircleDollarSign size={14} />
              Payroll
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-brand-dark">Salary and paycheck history</h2>
            <p className="mt-2 text-sm text-brand-dark/65">Generate salary paychecks for team members, print them as PDF, and keep the same records visible in their profile too.</p>
          </div>
          <button
            type="button"
            onClick={() => setPaycheckOpen(true)}
            className="rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark"
          >
            Generate paycheck
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {paycheckEntries.length ? (
            paycheckEntries.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-brand-dark">{entry.paycheckNumber || entry.title}</div>
                    <div className="mt-1 text-sm text-brand-dark/70">
                      {entry.employeeName || 'Team member'} • {entry.payPeriodLabel || 'Pay period not set'} • {formatDateTime(entry.dueAt)}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-brand-dark/45">
                      {entry.paymentMethod ? entry.paymentMethod.replace('_', ' ') : 'bank transfer'} • {entry.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark">{formatCurrency(entry.amount)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => printSalaryPaycheck(entry, profile.companyName, profile)}
                      className="rounded-2xl border border-brand-30 bg-white px-4 py-2 text-sm font-medium text-brand-dark"
                    >
                      Print PDF
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/25 p-8 text-center text-brand-dark/55">
              No salary paychecks have been created yet.
            </div>
          )}
        </div>
      </section>

      {paycheckOpen ? (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-4 pt-6 backdrop-blur-sm sm:items-center sm:pt-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-brand-30 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-brand-30 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-brand-dark">Generate paycheck</h3>
                <p className="mt-1 text-sm text-brand-dark/70">Create a salary paycheck that can be printed by the business owner and viewed by the team member.</p>
              </div>
              <button type="button" onClick={() => setPaycheckOpen(false)} className="rounded-2xl border border-brand-30 bg-brand-60/30 p-2 text-brand-dark">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePaycheck} className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Team member</span>
                <select
                  value={paycheckForm.employeeMemberId}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, employeeMemberId: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  required
                >
                  <option value="">Select a team member</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>{member.name} • {member.role}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Amount</span>
                <input
                  inputMode="numeric"
                  value={paycheckForm.amount}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, '') }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="25000"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Pay date</span>
                <input
                  type="date"
                  value={paycheckForm.dueAt}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, dueAt: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Pay period</span>
                <input
                  value={paycheckForm.payPeriodLabel}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, payPeriodLabel: event.target.value }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="April 2026"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Payment method</span>
                <select
                  value={paycheckForm.paymentMethod}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, paymentMethod: event.target.value as InvoicePaymentMethod }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit_card">Credit card</option>
                  <option value="debit_card">Debit card</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Status</span>
                <select
                  value={paycheckForm.status}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, status: event.target.value as FinanceEntry['status'] }))}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
                <span>Notes</span>
                <textarea
                  value={paycheckForm.notes}
                  onChange={(event) => setPaycheckForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 outline-none"
                  placeholder="Optional note for the paycheck"
                />
              </label>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" onClick={() => setPaycheckOpen(false)} className="rounded-2xl border border-brand-30 px-4 py-2.5 text-sm font-medium text-brand-dark">
                  Cancel
                </button>
                <button type="submit" disabled={paycheckSubmitting} className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 disabled:opacity-60">
                  {paycheckSubmitting ? 'Creating...' : 'Create paycheck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
