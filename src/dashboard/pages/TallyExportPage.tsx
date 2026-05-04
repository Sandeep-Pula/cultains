import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Info, Landmark, ShieldCheck } from 'lucide-react';
import type { CustomerProject, FinanceEntry, InventoryItem, SalesInvoice, WorkspaceProfile } from '../types';
import {
  accountingMonthNames,
  buildAccountingFinanceJournalGroup,
  buildAccountingSalesSummaryJournalGroups,
  buildAccountingTrialBalance,
  isWithinAccountingMonth,
  type AccountingJournalGroup,
} from '../accountingReports';
import { formatCurrency, formatDate } from '../utils';
import { DevelopmentFlag } from '../components/DevelopmentFlag';

type TallyExportPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  financeEntries: FinanceEntry[];
  salesInvoices: SalesInvoice[];
  inventory: InventoryItem[];
  customers: CustomerProject[];
};

const xmlEscape = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const tallyDate = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const safeFilePart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pula-biz';

const ledgerParent = (account: string) => {
  if (['Cash in Hand', 'UPI Clearing', 'Bank Account', 'Card Settlement', 'Mixed Collections'].includes(account)) return 'Bank Accounts';
  if (account === 'Accounts Receivable') return 'Sundry Debtors';
  if (account === 'Accounts Payable') return 'Sundry Creditors';
  if (account === 'Sales Revenue' || account === 'Other Income') return 'Sales Accounts';
  if (account === 'Output Tax Payable') return 'Duties &amp; Taxes';
  if (account.includes('Expense') || account === 'Cost of Goods Sold') return 'Indirect Expenses';
  if (account === 'Inventory Asset') return 'Stock-in-Hand';
  return 'Current Assets';
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildTallyEnvelope = (reportName: 'Masters' | 'Vouchers', body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${reportName}</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY></SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${body}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

const buildLedgerMastersXml = (groups: AccountingJournalGroup[]) => {
  const accounts = Array.from(new Set(groups.flatMap((group) => group.lines.map((line) => line.account)))).sort();
  const messages = accounts.map((account) => `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${xmlEscape(account)}" RESERVEDNAME="">
            <NAME>${xmlEscape(account)}</NAME>
            <PARENT>${ledgerParent(account)}</PARENT>
            <ISBILLWISEON>No</ISBILLWISEON>
            <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <OPENINGBALANCE>0</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>`).join('\n');
  return buildTallyEnvelope('Masters', messages);
};

const buildVoucherXml = (groups: AccountingJournalGroup[], companyName: string) => {
  const vouchers = groups.map((group, index) => {
    const entries = group.lines.map((line) => {
      const isDebit = line.debit > 0;
      const amount = isDebit ? -Math.abs(line.debit) : Math.abs(line.credit);
      return `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${xmlEscape(line.account)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }).join('\n');

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${tallyDate(group.date)}</DATE>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${xmlEscape(group.reference || `PULA-${index + 1}`)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${xmlEscape(companyName || 'PULA Biz Export')}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <NARRATION>${xmlEscape(`${group.title}. ${group.narration}`)}</NARRATION>
${entries}
          </VOUCHER>
        </TALLYMESSAGE>`;
  }).join('\n');
  return buildTallyEnvelope('Vouchers', vouchers);
};

const buildJournalCsv = (groups: AccountingJournalGroup[]) => {
  const rows = [['Date', 'Voucher Number', 'Voucher Type', 'Narration', 'Ledger', 'Debit', 'Credit', 'Source']];
  groups.forEach((group) => {
    group.lines.forEach((line) => {
      rows.push([
        formatDate(group.date),
        group.reference,
        'Journal',
        `${group.title}. ${group.narration}`,
        line.account,
        line.debit ? line.debit.toFixed(2) : '',
        line.credit ? line.credit.toFixed(2) : '',
        group.sourceLabel,
      ]);
    });
  });
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
};

const buildTrialBalanceCsv = (groups: AccountingJournalGroup[], month: number, year: number) => {
  const rows = [['Ledger', 'Debit', 'Credit']];
  buildAccountingTrialBalance(groups, month, year).forEach((row) => {
    rows.push([row.account, row.debit ? row.debit.toFixed(2) : '', row.credit ? row.credit.toFixed(2) : '']);
  });
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
};

export const TallyExportPage = ({
  companyName,
  businessProfile,
  financeEntries,
  salesInvoices,
  inventory,
  customers,
}: TallyExportPageProps) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const monthLabel = `${accountingMonthNames[month - 1]} ${year}`;

  const allGroups = useMemo(() => {
    const financeGroups = financeEntries
      .map((entry) => buildAccountingFinanceJournalGroup(entry, customers))
      .filter((group): group is AccountingJournalGroup => Boolean(group));
    return [...financeGroups, ...buildAccountingSalesSummaryJournalGroups(salesInvoices, inventory)]
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  }, [customers, financeEntries, inventory, salesInvoices]);

  const monthGroups = useMemo(
    () => allGroups.filter((group) => isWithinAccountingMonth(group.date, month, year)),
    [allGroups, month, year],
  );
  const debitTotal = monthGroups.reduce((sum, group) => sum + group.lines.reduce((lineSum, line) => lineSum + line.debit, 0), 0);
  const creditTotal = monthGroups.reduce((sum, group) => sum + group.lines.reduce((lineSum, line) => lineSum + line.credit, 0), 0);
  const exportPrefix = `${safeFilePart(companyName || businessProfile.companyName)}-${year}-${String(month).padStart(2, '0')}`;

  const downloadVouchersXml = () =>
    downloadTextFile(`${exportPrefix}-tally-vouchers.xml`, buildVoucherXml(monthGroups, companyName || businessProfile.companyName), 'application/xml');
  const downloadMastersXml = () =>
    downloadTextFile(`${exportPrefix}-tally-ledger-masters.xml`, buildLedgerMastersXml(monthGroups), 'application/xml');
  const downloadJournal = () =>
    downloadTextFile(`${exportPrefix}-journal.csv`, buildJournalCsv(monthGroups), 'text/csv');
  const downloadTrialBalance = () =>
    downloadTextFile(`${exportPrefix}-trial-balance.csv`, buildTrialBalanceCsv(allGroups, month, year), 'text/csv');

  return (
    <div className="space-y-5">
      <DevelopmentFlag pageLabel="Tally Data Export" />
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
          <FileSpreadsheet size={14} />
          CA export
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Tally Data Export</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-dark/65">
              Give your CA Tally-ready XML and audit CSV files for the selected month. This keeps PULA Biz acceptable for bookkeeping review instead of trapping data inside the app.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm outline-none">
              {accountingMonthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <input value={year} onChange={(event) => setYear(Number(event.target.value || now.getFullYear()))} inputMode="numeric" className="rounded-2xl border border-brand-30 bg-brand-60/25 px-4 py-3 text-sm outline-none" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-sm text-brand-dark/55">Period</div>
          <div className="mt-2 text-2xl font-semibold text-brand-dark">{monthLabel}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-sm text-brand-dark/55">Vouchers</div>
          <div className="mt-2 text-2xl font-semibold text-brand-dark">{monthGroups.length}</div>
        </div>
        <div className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
          <div className="text-sm text-brand-dark/55">Debit / Credit</div>
          <div className="mt-2 text-lg font-semibold text-brand-dark">{formatCurrency(debitTotal)} / {formatCurrency(creditTotal)}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <button type="button" onClick={downloadMastersXml} disabled={!monthGroups.length} className="rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:border-brand-10 disabled:opacity-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Landmark size={22} className="text-brand-10" />
              <div>
                <div className="font-semibold text-brand-dark">Tally ledger masters XML</div>
                <p className="mt-1 text-sm text-brand-dark/60">Import ledgers first if the CA company does not already have matching masters.</p>
              </div>
            </div>
            <Download size={18} />
          </div>
        </button>
        <button type="button" onClick={downloadVouchersXml} disabled={!monthGroups.length} className="rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:border-brand-10 disabled:opacity-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="text-brand-10" />
              <div>
                <div className="font-semibold text-brand-dark">Tally vouchers XML</div>
                <p className="mt-1 text-sm text-brand-dark/60">Journal vouchers balanced with debit and credit ledger entries.</p>
              </div>
            </div>
            <Download size={18} />
          </div>
        </button>
        <button type="button" onClick={downloadJournal} disabled={!monthGroups.length} className="rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:border-brand-10 disabled:opacity-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-brand-dark">Journal audit CSV</div>
              <p className="mt-1 text-sm text-brand-dark/60">Readable voucher rows for CA review before Tally import.</p>
            </div>
            <Download size={18} />
          </div>
        </button>
        <button type="button" onClick={downloadTrialBalance} className="rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:border-brand-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-brand-dark">Trial balance CSV</div>
              <p className="mt-1 text-sm text-brand-dark/60">Debit and credit balances up to the selected month end.</p>
            </div>
            <Download size={18} />
          </div>
        </button>
      </section>

      <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <div className="flex gap-3">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">CA note</div>
            <p className="mt-1">
              Tally import is strict: ledgers must exist, voucher totals must match, and Tally expects dates in YYYYMMDD format. Import masters first, then vouchers. If your CA uses custom ledger names, they can use the CSV audit files to map ledgers before import.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-brand-30 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-dark">Voucher preview</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                {['Date', 'Reference', 'Title', 'Lines', 'Source'].map((label) => <th key={label} className="border-b border-brand-30 px-4 py-3">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {monthGroups.map((group) => (
                <tr key={group.id}>
                  <td className="border-b border-brand-30 px-4 py-3 text-sm">{formatDate(group.date)}</td>
                  <td className="border-b border-brand-30 px-4 py-3 text-sm font-semibold">{group.reference}</td>
                  <td className="border-b border-brand-30 px-4 py-3 text-sm">{group.title}</td>
                  <td className="border-b border-brand-30 px-4 py-3 text-sm">{group.lines.length}</td>
                  <td className="border-b border-brand-30 px-4 py-3 text-sm">{group.sourceLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!monthGroups.length ? <div className="py-8 text-center text-sm text-brand-dark/60">No exportable accounting vouchers for this period.</div> : null}
        </div>
      </section>
    </div>
  );
};
