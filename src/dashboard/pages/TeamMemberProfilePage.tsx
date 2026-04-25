import { BadgeCheck, Building2, CircleDollarSign, FileText, IdCard, Mail, Phone, ShieldCheck, Store, UserCircle2 } from 'lucide-react';
import type { FinanceEntry, SalesInvoice, TeamMember, WorkspaceProfile } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { printSalaryPaycheck } from '../invoicePrint';
import { formatCurrency, formatDateTime } from '../utils';

type TeamMemberProfilePageProps = {
  profile: WorkspaceProfile;
  member: TeamMember | null;
  businessConfig: WorkspaceBusinessConfig;
  salesInvoices: SalesInvoice[];
  financeEntries: FinanceEntry[];
};

export const TeamMemberProfilePage = ({
  profile,
  member,
  businessConfig,
  salesInvoices,
  financeEntries,
}: TeamMemberProfilePageProps) => {
  if (!member) {
    return (
      <div className="rounded-[32px] border border-brand-30 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-dark">Profile unavailable</h1>
        <p className="mt-3 text-sm text-brand-dark/70">
          We could not find the linked team-member profile for this login.
        </p>
      </div>
    );
  }

  const memberName = member.name.trim().toLowerCase();
  const memberInvoices = salesInvoices.filter((invoice) => invoice.billedBy.trim().toLowerCase() === memberName);
  const invoiceRevenue = memberInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const salaryPaychecks = financeEntries.filter((entry) => {
    if (entry.category !== 'salary') return false;
    if (entry.employeeMemberId === member.id) return true;
    const haystack = `${entry.title} ${entry.notes} ${entry.projectTitle || ''}`.toLowerCase();
    return haystack.includes(memberName);
  });
  const paidSalary = salaryPaychecks.filter((entry) => entry.status === 'paid').reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-brand-30 bg-white shadow-sm">
        <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(80,80,129,0.08),rgba(255,255,255,0.96))] p-6 sm:p-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <UserCircle2 size={14} />
              Team member profile
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              {member.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-dark/70 sm:text-base">
              Your staff profile inside the {businessConfig.label.toLowerCase()} workspace. This page keeps your role, contact details, and assigned access visible in one place.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Role</div>
                <div className="mt-2 text-xl font-semibold text-brand-dark">{member.role}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Access tools</div>
                <div className="mt-2 text-xl font-semibold text-brand-dark">{member.allowedViews.length}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Status</div>
                <div className="mt-2 text-xl font-semibold capitalize text-brand-dark">{member.status}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Invoices created</div>
                <div className="mt-2 text-xl font-semibold text-brand-dark">{memberInvoices.length}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Billing handled</div>
                <div className="mt-2 text-xl font-semibold text-brand-dark">{formatCurrency(invoiceRevenue)}</div>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-brand-dark/50">Salary received</div>
                <div className="mt-2 text-xl font-semibold text-brand-dark">{formatCurrency(paidSalary)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-brand-10 p-6 text-brand-60 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Store size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-brand-60/70">Business workspace</div>
                <div className="mt-1 text-2xl font-semibold">{profile.companyName}</div>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck size={17} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Access mode</div>
                  <div className="text-brand-60/72">This is a staff login controlled by the business owner, not a separate business account.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BadgeCheck size={17} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Current login email</div>
                  <div className="text-brand-60/72">{member.loginEmail || member.email || 'Not assigned yet'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Your identity in this workspace</h2>
          <p className="mt-2 text-sm text-brand-dark/65">
            Business owners manage the company profile. Team members can still review their own login and staff details here.
          </p>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Full name</span>
              <input
                value={member.name}
                onChange={() => undefined}
                readOnly
                className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-brand-dark/75 outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Phone</span>
              <input
                value={member.phone}
                onChange={() => undefined}
                readOnly
                className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-brand-dark/75 outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-brand-dark/75">
              <span>Login email</span>
              <input
                value={member.loginEmail || member.email}
                onChange={() => undefined}
                readOnly
                className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-brand-dark/75 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Workspace details</h2>
          <div className="mt-6 space-y-4 text-sm text-brand-dark/80">
            <div className="flex items-start gap-3 rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
              <Building2 size={18} className="mt-0.5 shrink-0 text-brand-dark/65" />
              <div>
                <div className="font-semibold text-brand-dark">Business name</div>
                <div className="mt-1">{profile.companyName}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
              <IdCard size={18} className="mt-0.5 shrink-0 text-brand-dark/65" />
              <div>
                <div className="font-semibold text-brand-dark">GST / tax identity</div>
                <div className="mt-1">{profile.gstNumber || 'Not added by business owner yet'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
              <Mail size={18} className="mt-0.5 shrink-0 text-brand-dark/65" />
              <div>
                <div className="font-semibold text-brand-dark">Business email</div>
                <div className="mt-1">{profile.email || 'Not added yet'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
              <Phone size={18} className="mt-0.5 shrink-0 text-brand-dark/65" />
              <div>
                <div className="font-semibold text-brand-dark">Business phone</div>
                <div className="mt-1">{profile.phone || 'Not added yet'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-brand-dark/70" />
            <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Your invoice activity</h2>
          </div>
          <div className="mt-6 space-y-3">
            {memberInvoices.length ? (
              memberInvoices.slice(0, 8).map((invoice) => (
                <div key={invoice.id} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                      <div className="mt-1 text-sm text-brand-dark/65">{invoice.customerName} • {formatDateTime(invoice.createdAt)}</div>
                    </div>
                    <div className="text-right font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/25 p-6 text-sm text-brand-dark/60">
                No invoices have been created from this staff account yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <CircleDollarSign size={18} className="text-brand-dark/70" />
            <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Salary and paycheck history</h2>
          </div>
          <div className="mt-6 space-y-3">
            {salaryPaychecks.length ? (
              salaryPaychecks.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-brand-dark">{entry.title}</div>
                      <div className="mt-1 text-sm text-brand-dark/65">{formatDateTime(entry.dueAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark">{formatCurrency(entry.amount)}</div>
                      <div className="mt-1 text-xs uppercase tracking-wider text-brand-dark/50">{entry.status}</div>
                      <button
                        type="button"
                        onClick={() => printSalaryPaycheck(entry, profile.companyName, profile)}
                        className="mt-3 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs font-medium text-brand-dark"
                      >
                        Print PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-brand-30 bg-brand-60/25 p-6 text-sm text-brand-dark/60">
                No salary or paycheck entries are linked to your name yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
