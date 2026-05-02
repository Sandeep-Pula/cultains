import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileBarChart2, Plus, Printer, Trash2, X } from 'lucide-react';
import type {
  CustomerProject,
  FinanceCategory,
  FinanceEntry,
  FinanceKind,
  FinanceStatus,
  InventoryItem,
  InvoicePaymentMethod,
  SalesInvoice,
  TransactionFlow,
  WeeklyMiscRecord,
  WorkspaceProfile,
} from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { printMonthEndClosePackage } from '../invoicePrint';
import { formatCurrency } from '../utils';

type AccountLedgerPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  financeEntries: FinanceEntry[];
  weeklyMiscRecords: WeeklyMiscRecord[];
  salesInvoices: SalesInvoice[];
  inventory: InventoryItem[];
  customers: CustomerProject[];
  actorName: string;
  onAddEntry: (
    payload: Pick<
      FinanceEntry,
      'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'linkedCustomerName' | 'projectTitle' | 'notes' | 'paymentMethod' | 'issuedBy' | 'referenceDate' | 'transactionFlow'
    >,
  ) => Promise<void> | void;
  onAddWeeklyMiscRecord: (payload: Pick<WeeklyMiscRecord, 'title' | 'amount' | 'spentAt' | 'notes' | 'weekKey'>) => Promise<void> | void;
  onDeleteWeeklyMiscRecord: (recordId: string) => Promise<void> | void;
  onCloseWeeklyMiscRecords: (payload: {
    title: string;
    amount: number;
    dueAt: string;
    referenceDate: string;
    notes: string;
    autoGroupKey: string;
    recordIds: string[];
  }) => Promise<void> | void;
  onDeleteEntry: (entryId: string) => Promise<void>;
};

type BookView = 'journal' | 'ledger' | 'trial-balance';

type JournalLine = {
  account: string;
  debit: number;
  credit: number;
};

type JournalGroup = {
  id: string;
  financeEntryId?: string;
  date: string;
  title: string;
  reference: string;
  sourceLabel: string;
  narration: string;
  lines: JournalLine[];
  deletable: boolean;
};

type LedgerRow = {
  entryId: string;
  financeEntryId?: string;
  date: string;
  particulars: string;
  reference: string;
  sourceLabel: string;
  debit: number;
  credit: number;
  deletable: boolean;
};

type LedgerSection = {
  account: string;
  openingBalance: number;
  rows: LedgerRow[];
  closingBalance: number;
};

type TrialBalanceRow = {
  account: string;
  debit: number;
  credit: number;
};

type BookInsight =
  | { type: 'journal'; title: string; subtitle: string; lines: JournalLine[]; detail: string; deletable: boolean; financeEntryId?: string }
  | { type: 'ledger'; title: string; subtitle: string; lines: JournalLine[]; detail: string; deletable: boolean; financeEntryId?: string }
  | { type: 'trial-balance'; title: string; subtitle: string; lines: JournalLine[]; detail: string; account: string; deletable?: false; financeEntryId?: undefined };

type StatementRow = {
  label: string;
  amount: number;
};

type CloseReportView = 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'general-ledger';
type ChecklistAction = 'export';

type ManualEntryForm = {
  title: string;
  kind: FinanceKind;
  category: string;
  amount: string;
  status: FinanceStatus;
  dueAt: string;
  linkedCustomerName: string;
  projectTitle: string;
  paymentMethod: InvoicePaymentMethod;
  transactionFlow: string;
  notes: string;
};

type WeeklyMiscForm = {
  title: string;
  amount: string;
  spentAt: string;
  notes: string;
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const moneyAccountLabel: Record<InvoicePaymentMethod, string> = {
  cash: 'Cash in Hand',
  upi: 'UPI Clearing',
  bank_transfer: 'Bank Account',
  credit_card: 'Card Settlement',
  debit_card: 'Card Settlement',
  mixed: 'Mixed Collections',
};

const financeCategoryOptions: FinanceCategory[] = ['client_payment', 'project_material', 'labour', 'salary', 'vendor', 'operations'];
const financeStatusOptions: FinanceStatus[] = ['pending', 'paid', 'overdue'];
const financeKindOptions: FinanceKind[] = ['income', 'expense'];
const paymentMethodOptions: InvoicePaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'credit_card', 'debit_card', 'mixed'];
const transactionFlowOptions: TransactionFlow[] = ['business_to_business', 'person_to_person', 'business_to_person', 'person_to_business'];

const initialManualEntryState = (): ManualEntryForm => ({
  title: '',
  kind: 'expense',
  category: 'operations',
  amount: '',
  status: 'paid',
  dueAt: new Date().toISOString().slice(0, 10),
  linkedCustomerName: '',
  projectTitle: '',
  paymentMethod: 'cash',
  transactionFlow: 'business_to_business',
  notes: '',
});

const initialWeeklyMiscState = (): WeeklyMiscForm => ({
  title: '',
  amount: '',
  spentAt: new Date().toISOString().slice(0, 10),
  notes: '',
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const toDateKey = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekWindow = (value: string | Date) => {
  const date = new Date(value);
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = midnight.getDay();
  const shiftToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(midnight);
  start.setDate(midnight.getDate() + shiftToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getWeekKey = (value: string | Date) => toDateKey(getWeekWindow(value).start.toISOString());

const getMonthRange = (month: number, year: number) => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0),
  end: new Date(year, month, 0, 23, 59, 59, 999),
});

const withinRange = (value: string, month: number, year: number) => {
  const { start, end } = getMonthRange(month, year);
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
};

const buildBalanceLabel = (amount: number) => {
  if (amount === 0) return 'Nil';
  return `${formatCurrency(Math.abs(amount))} ${amount >= 0 ? 'Dr' : 'Cr'}`;
};

const prettifyOption = (value: string) => value.replace(/_/g, ' ');
const slugifyAccountingValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

const getCashOrReceivableAccount = (status: FinanceStatus, paymentMethod?: InvoicePaymentMethod) =>
  status === 'paid' ? moneyAccountLabel[paymentMethod || 'cash'] : 'Accounts Receivable';

const getCashOrPayableAccount = (status: FinanceStatus, paymentMethod?: InvoicePaymentMethod) =>
  status === 'paid' ? moneyAccountLabel[paymentMethod || 'cash'] : 'Accounts Payable';

const getIncomeAccount = (entry: FinanceEntry) => {
  if (entry.category === 'client_payment') return 'Sales Revenue';
  return 'Other Income';
};

const getExpenseAccount = (entry: FinanceEntry) => {
  if (entry.category === 'project_material') return 'Inventory Asset';
  if (entry.category === 'labour') return 'Labour Expense';
  if (entry.category === 'salary') return 'Salary Expense';
  if (entry.category === 'vendor') return 'Vendor Expense';
  return 'Operating Expense';
};

const buildFinanceJournalGroup = (entry: FinanceEntry, customers: CustomerProject[]): JournalGroup | null => {
  if (entry.sourceInvoiceId) {
    return null;
  }

  const customer = entry.customerId ? customers.find((item) => item.id === entry.customerId) : null;
  const debitAccount = entry.kind === 'income'
    ? getCashOrReceivableAccount(entry.status, entry.paymentMethod)
    : getExpenseAccount(entry);
  const creditAccount = entry.kind === 'income'
    ? getIncomeAccount(entry)
    : getCashOrPayableAccount(entry.status, entry.paymentMethod);

  const detailParts = [
    entry.linkedCustomerName || customer?.customerName,
    entry.projectTitle,
    entry.transactionFlow ? `Flow: ${prettifyOption(entry.transactionFlow)}` : '',
    entry.notes,
  ].filter(Boolean);

  return {
    id: `finance-${entry.id}`,
    financeEntryId: entry.id,
    date: entry.referenceDate || entry.dueAt || entry.createdAt,
    title: entry.title,
    reference: entry.paycheckNumber || `BOOK-${entry.id.slice(0, 6).toUpperCase()}`,
    sourceLabel:
      entry.accountingSource === 'weekly_misc_summary'
        ? 'Automated weekly misc close'
        : entry.accountingSource === 'salary' || entry.category === 'salary' || entry.paycheckNumber
          ? 'Salary record'
          : 'Manual entry',
    narration: detailParts.join(' • ') || 'Manually posted transaction.',
    deletable: !(entry.autoGenerated || entry.accountingSource === 'weekly_misc_summary'),
    lines: [
      { account: debitAccount, debit: entry.amount, credit: 0 },
      { account: creditAccount, debit: 0, credit: entry.amount },
    ],
  };
};

const buildSalesSummaryJournalGroups = (salesInvoices: SalesInvoice[], inventory: InventoryItem[]) => {
  const inventoryIndex = new Map(inventory.map((item) => [item.id, item]));
  const grouped = new Map<string, SalesInvoice[]>();
  const now = new Date();
  const todayKey = toDateKey(now.toISOString());
  const closingHourReached = now.getHours() >= 22;

  salesInvoices
    .filter((invoice) => invoice.status === 'finalized')
    .forEach((invoice) => {
      const key = toDateKey(invoice.createdAt);
      if (key === todayKey && !closingHourReached) return;

      const current = grouped.get(key) || [];
      current.push(invoice);
      grouped.set(key, current);
    });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, invoices]) => {
      let cashPaid = 0;
      let upiPaid = 0;
      let bankPaid = 0;
      let receivable = 0;
      let subtotal = 0;
      let taxAmount = 0;
      let costOfGoodsSold = 0;

      invoices.forEach((invoice) => {
        subtotal += invoice.subtotal;
        taxAmount += invoice.taxAmount;

        if (invoice.paymentStatus === 'paid') {
          if (invoice.paymentMethod === 'cash') cashPaid += invoice.totalAmount;
          else if (invoice.paymentMethod === 'upi') upiPaid += invoice.totalAmount;
          else bankPaid += invoice.totalAmount;
        } else {
          receivable += invoice.totalAmount;
        }

        invoice.lineItems.forEach((line) => {
          const costPerUnit = inventoryIndex.get(line.inventoryItemId)?.costPerUnit ?? 0;
          costOfGoodsSold += costPerUnit * line.quantity;
        });
      });

      const lines: JournalLine[] = [];
      if (cashPaid > 0) lines.push({ account: 'Cash in Hand', debit: cashPaid, credit: 0 });
      if (upiPaid > 0) lines.push({ account: 'UPI Clearing', debit: upiPaid, credit: 0 });
      if (bankPaid > 0) lines.push({ account: 'Bank Account', debit: bankPaid, credit: 0 });
      if (receivable > 0) lines.push({ account: 'Accounts Receivable', debit: receivable, credit: 0 });
      if (costOfGoodsSold > 0) lines.push({ account: 'Cost of Goods Sold', debit: costOfGoodsSold, credit: 0 });
      if (subtotal > 0) lines.push({ account: 'Sales Revenue', debit: 0, credit: subtotal });
      if (taxAmount > 0) lines.push({ account: 'Output Tax Payable', debit: 0, credit: taxAmount });
      if (costOfGoodsSold > 0) lines.push({ account: 'Inventory Asset', debit: 0, credit: costOfGoodsSold });

      return {
        id: `sales-close-${dateKey}`,
        date: `${dateKey}T22:00:00`,
        title: 'Daily sales close',
        reference: `CLOSE-${dateKey.replace(/-/g, '')}`,
        sourceLabel: 'Automated 10 PM close',
        narration: `${invoices.length} invoice${invoices.length > 1 ? 's' : ''} summarized into one sales book entry.`,
        deletable: false,
        lines,
      } satisfies JournalGroup;
    })
    .filter((group) => group.lines.length > 0);
};

const buildLedgerSections = (groups: JournalGroup[], month: number, year: number) => {
  const accountRows = new Map<string, LedgerRow[]>();

  groups
    .slice()
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .forEach((group) => {
      group.lines.forEach((line) => {
        const contraAccounts = group.lines
          .filter((item) => item.account !== line.account)
          .map((item) => item.account)
          .join(', ');

        const bucket = accountRows.get(line.account) || [];
        bucket.push({
          entryId: group.id,
          financeEntryId: group.financeEntryId,
          date: group.date,
          particulars: `${group.title}${contraAccounts ? ` • Against ${contraAccounts}` : ''}`,
          reference: group.reference,
          sourceLabel: group.sourceLabel,
          debit: line.debit,
          credit: line.credit,
          deletable: group.deletable,
        });
        accountRows.set(line.account, bucket);
      });
    });

  return Array.from(accountRows.entries())
    .map(([account, rows]) => {
      const orderedRows = rows.slice().sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
      const openingBalance = orderedRows
        .filter((row) => !withinRange(row.date, month, year) && new Date(row.date).getTime() < getMonthRange(month, year).start.getTime())
        .reduce((sum, row) => sum + row.debit - row.credit, 0);
      const visibleRows = orderedRows.filter((row) => withinRange(row.date, month, year));
      const closingBalance = openingBalance + visibleRows.reduce((sum, row) => sum + row.debit - row.credit, 0);

      return {
        account,
        openingBalance,
        rows: visibleRows,
        closingBalance,
      } satisfies LedgerSection;
    })
    .filter((section) => section.rows.length || section.openingBalance !== 0 || section.closingBalance !== 0)
    .sort((left, right) => left.account.localeCompare(right.account));
};

const buildTrialBalance = (groups: JournalGroup[], month: number, year: number) => {
  const { end } = getMonthRange(month, year);
  const totals = new Map<string, number>();

  groups.forEach((group) => {
    if (new Date(group.date).getTime() > end.getTime()) return;

    group.lines.forEach((line) => {
      totals.set(line.account, (totals.get(line.account) || 0) + line.debit - line.credit);
    });
  });

  return Array.from(totals.entries())
    .map(([account, balance]) => ({
      account,
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
    }))
    .filter((row) => row.debit > 0 || row.credit > 0)
    .sort((left, right) => left.account.localeCompare(right.account));
};

const cashAccounts = new Set(['Cash in Hand', 'UPI Clearing', 'Bank Account', 'Card Settlement', 'Mixed Collections']);
const revenueAccounts = new Set(['Sales Revenue', 'Other Income']);
const expenseAccounts = new Set(['Cost of Goods Sold', 'Labour Expense', 'Salary Expense', 'Vendor Expense', 'Operating Expense']);
const assetAccounts = new Set(['Cash in Hand', 'UPI Clearing', 'Bank Account', 'Card Settlement', 'Mixed Collections', 'Accounts Receivable', 'Inventory Asset', 'Petty Cash', 'Prepaid Expense', 'Fixed Assets']);
const liabilityAccounts = new Set(['Accounts Payable', 'Output Tax Payable', 'Bank Loan', 'Loan Payable']);

const sumRows = (rows: StatementRow[]) => rows.reduce((sum, row) => sum + row.amount, 0);

const buildProfitAndLoss = (groups: JournalGroup[]) => {
  const revenues = new Map<string, number>();
  const expenses = new Map<string, number>();

  groups.forEach((group) => {
    group.lines.forEach((line) => {
      if (revenueAccounts.has(line.account)) {
        revenues.set(line.account, (revenues.get(line.account) || 0) + line.credit - line.debit);
      }
      if (expenseAccounts.has(line.account)) {
        expenses.set(line.account, (expenses.get(line.account) || 0) + line.debit - line.credit);
      }
    });
  });

  const revenueRows = Array.from(revenues.entries()).map(([label, amount]) => ({ label, amount }));
  const expenseRows = Array.from(expenses.entries()).map(([label, amount]) => ({ label, amount }));
  const totalRevenue = sumRows(revenueRows);
  const totalExpenses = sumRows(expenseRows);

  return [
    ...revenueRows,
    { label: 'Total Revenue', amount: totalRevenue },
    ...expenseRows,
    { label: 'Total Expenses', amount: totalExpenses },
    { label: 'Net Profit / Loss', amount: totalRevenue - totalExpenses },
  ];
};

const buildBalanceSheet = (rows: TrialBalanceRow[], netProfit: number) => {
  const assets: StatementRow[] = [];
  const liabilities: StatementRow[] = [];
  const equity: StatementRow[] = [];

  rows.forEach((row) => {
    const net = row.debit - row.credit;
    if (assetAccounts.has(row.account)) {
      assets.push({ label: row.account, amount: net });
      return;
    }
    if (liabilityAccounts.has(row.account)) {
      liabilities.push({ label: row.account, amount: row.credit - row.debit });
      return;
    }
    if (!revenueAccounts.has(row.account) && !expenseAccounts.has(row.account)) {
      equity.push({ label: row.account, amount: row.credit - row.debit });
    }
  });
  equity.push({ label: 'Current Period Earnings', amount: netProfit });

  return {
    assets,
    liabilities,
    equity,
  };
};

const buildCashFlow = (groups: JournalGroup[]) => {
  const operating = new Map<string, number>();
  const investing = new Map<string, number>();
  const financing = new Map<string, number>();

  groups.forEach((group) => {
    const cashMovement = group.lines.reduce((sum, line) => {
      if (!cashAccounts.has(line.account)) return sum;
      return sum + line.debit - line.credit;
    }, 0);
    if (cashMovement === 0) return;

    const target =
      group.lines.some((line) => line.account === 'Fixed Assets') ? investing :
      group.lines.some((line) => line.account === 'Bank Loan' || line.account === 'Loan Payable') ? financing :
      operating;

    const label = group.title;
    target.set(label, (target.get(label) || 0) + cashMovement);
  });

  const toRows = (map: Map<string, number>) => {
    const rows = Array.from(map.entries()).map(([label, amount]) => ({ label, amount }));
    rows.push({ label: 'Net Cash Movement', amount: sumRows(rows) });
    return rows;
  };

  return {
    operating: toRows(operating),
    investing: toRows(investing),
    financing: toRows(financing),
  };
};

const buildChecklist = (
  monthLabel: string,
  groups: JournalGroup[],
  financeEntries: FinanceEntry[],
  inventory: InventoryItem[],
  trialBalanceRows: TrialBalanceRow[],
  month: number,
  year: number,
) => {
  const totalDebits = trialBalanceRows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredits = trialBalanceRows.reduce((sum, row) => sum + row.credit, 0);
  const payableAttention = financeEntries.filter((entry) => entry.kind === 'expense' && entry.status !== 'paid' && withinRange(entry.referenceDate || entry.dueAt || entry.createdAt, month, year)).length;

  return [
    {
      title: 'Record incoming cash',
      status: groups.some((group) => group.title === 'Daily sales close') ? 'Ready' : 'Attention',
      detail: 'Revenue, invoice payments, and other cash receipts are posted into the monthly books.',
    },
    {
      title: 'Update accounts payable',
      status: payableAttention ? 'Attention' : 'Ready',
      detail: payableAttention ? `${payableAttention} unpaid expense entries still need review.` : 'No unpaid expense entries are pending for the period.',
    },
    {
      title: 'Reconcile accounts',
      status: Math.abs(totalDebits - totalCredits) < 0.5 ? 'Ready' : 'Attention',
      detail: `Trial balance totals for ${monthLabel} are ${formatCurrency(totalDebits)} debit and ${formatCurrency(totalCredits)} credit.`,
    },
    {
      title: 'Review petty cash and bank movement',
      status: 'Review',
      detail: 'Use the cash flow statement and cash-ledger accounts to verify petty cash, bank, and digital settlement movement.',
    },
    {
      title: 'Count inventory',
      status: inventory.length ? 'Ready' : 'Attention',
      detail: `${inventory.length} inventory records are available for monthly stock review and valuation checks.`,
    },
    {
      title: 'Organize financial statements',
      status: 'Ready',
      detail: 'Profit and loss, balance sheet, cash flow, and general ledger are available for this month-end close package.',
    },
    {
      title: 'Check revenue and expense accounts',
      status: 'Review',
      detail: 'Use the profit and loss statement below to verify revenue and expense classification before close.',
    },
    {
      title: 'Review information before closing',
      status: 'Review',
      detail: 'A final manual review is still recommended before considering the month formally closed.',
    },
    {
      title: 'Prepare for next month',
      status: 'Ready',
      detail: 'Export the month-end package PDF after review so the closed month is archived cleanly.',
      action: 'export',
    },
  ];
};

const BookButton = ({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-[28px] border-2 border-brand-30 bg-brand-60/35 px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10 hover:bg-brand-60/55 hover:shadow-md"
  >
    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-10">{label}</div>
    <p className="mt-3 text-sm leading-6 text-brand-dark/80">{description}</p>
  </button>
);

const BookInsightModal = ({
  insight,
  onClose,
  onDeleteEntry,
  deletingEntryId,
}: {
  insight: BookInsight | null;
  onClose: () => void;
  onDeleteEntry: (entryId: string, entryTitle: string) => void;
  deletingEntryId: string | null;
}) => {
  if (!insight) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-brand-dark/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 bg-brand-60/20 px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/55">{insight.subtitle}</div>
            <h3 className="mt-2 text-2xl font-semibold text-brand-dark">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-brand-dark/70">{insight.detail}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto px-5 py-5 sm:px-6">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-white">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                <th className="border-b border-brand-30 px-4 py-3">Account</th>
                <th className="border-b border-brand-30 px-4 py-3 text-right">Debit</th>
                <th className="border-b border-brand-30 px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {insight.lines.map((line, index) => (
                <tr key={`${insight.title}-${line.account}-${index}`} className="transition hover:bg-brand-60/20">
                  <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{line.account}</td>
                  <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                    {line.debit ? formatCurrency(line.debit) : '—'}
                  </td>
                  <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                    {line.credit ? formatCurrency(line.credit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 border-t border-brand-30 bg-brand-60/15 px-5 py-4 sm:px-6">
          {insight.deletable && insight.financeEntryId ? (
            <button
              type="button"
              onClick={() => onDeleteEntry(insight.financeEntryId!, insight.title)}
              disabled={deletingEntryId === insight.financeEntryId}
              className="mr-auto rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 disabled:opacity-60"
            >
              Delete entry
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const MonthEndReportModal = ({
  view,
  monthLabel,
  profitAndLoss,
  balanceSheet,
  cashFlow,
  generalLedger,
  onClose,
}: {
  view: CloseReportView | null;
  monthLabel: string;
  profitAndLoss: StatementRow[];
  balanceSheet: { assets: StatementRow[]; liabilities: StatementRow[]; equity: StatementRow[] };
  cashFlow: { operating: StatementRow[]; investing: StatementRow[]; financing: StatementRow[] };
  generalLedger: Array<{ account: string; openingBalance: number; closingBalance: number; movements: number }>;
  onClose: () => void;
}) => {
  if (!view) return null;

  const titleMap: Record<CloseReportView, string> = {
    'profit-loss': 'Profit and Loss Statement',
    'balance-sheet': 'Balance Sheet',
    'cash-flow': 'Cash Flow Statement',
    'general-ledger': 'General Ledger',
  };

  return (
    <div className="fixed inset-0 z-[155] flex items-center justify-center bg-brand-dark/45 p-3 backdrop-blur-sm">
      <div className="flex h-[min(92vh,980px)] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 bg-brand-60/20 px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/55">{monthLabel}</div>
            <h3 className="mt-2 text-2xl font-semibold text-brand-dark">{titleMap[view]}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6">
          {view === 'profit-loss' ? (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-white">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                  <th className="border-b border-brand-30 px-4 py-3">Line Item</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {profitAndLoss.map((row) => (
                  <tr key={row.label}>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.label}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : view === 'balance-sheet' ? (
            <div className="grid gap-5 xl:grid-cols-3">
              {([
                ['Assets', balanceSheet.assets],
                ['Liabilities', balanceSheet.liabilities],
                ['Equity', balanceSheet.equity],
              ] as const).map(([label, rows]) => (
                <div key={label} className="overflow-hidden rounded-[28px] border border-brand-30 bg-white">
                  <div className="border-b border-brand-30 bg-brand-60/20 px-4 py-4 text-lg font-semibold text-brand-dark">{label}</div>
                  <table className="min-w-full border-separate border-spacing-0">
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${label}-${row.label}`}>
                          <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.label}</td>
                          <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : view === 'cash-flow' ? (
            <div className="grid gap-5 xl:grid-cols-3">
              {([
                ['Operating Activities', cashFlow.operating],
                ['Investing Activities', cashFlow.investing],
                ['Financing Activities', cashFlow.financing],
              ] as const).map(([label, rows]) => (
                <div key={label} className="overflow-hidden rounded-[28px] border border-brand-30 bg-white">
                  <div className="border-b border-brand-30 bg-brand-60/20 px-4 py-4 text-lg font-semibold text-brand-dark">{label}</div>
                  <table className="min-w-full border-separate border-spacing-0">
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${label}-${row.label}`}>
                          <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.label}</td>
                          <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-white">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                  <th className="border-b border-brand-30 px-4 py-3">Account</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Opening</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Movements</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {generalLedger.map((row) => (
                  <tr key={row.account}>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.account}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(row.openingBalance)}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{row.movements}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const AddLedgerEntryModal = ({
  open,
  customers,
  actorName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  customers: CustomerProject[];
  actorName: string;
  onClose: () => void;
  onSubmit: (
    payload: Pick<
      FinanceEntry,
      'title' | 'kind' | 'category' | 'amount' | 'status' | 'dueAt' | 'customerId' | 'linkedCustomerName' | 'projectTitle' | 'notes' | 'paymentMethod' | 'issuedBy' | 'referenceDate' | 'transactionFlow'
    >,
  ) => Promise<void>;
}) => {
  const [form, setForm] = useState<ManualEntryForm>(() => initialManualEntryState());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialManualEntryState());
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const setField = <K extends keyof ManualEntryForm>(field: K, value: ManualEntryForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const referenceDate = new Date(form.dueAt).toISOString();
      const matchedCustomer = customers.find((item) => item.customerName.trim().toLowerCase() === form.linkedCustomerName.trim().toLowerCase());
      const normalizedCategory = slugifyAccountingValue(form.category);
      const normalizedTransactionFlow = slugifyAccountingValue(form.transactionFlow);
      await onSubmit({
        title: form.title.trim(),
        kind: form.kind,
        category: (financeCategoryOptions.includes(normalizedCategory as FinanceCategory) ? normalizedCategory : 'operations') as FinanceCategory,
        amount: Number(form.amount || '0'),
        status: form.status,
        dueAt: referenceDate,
        customerId: matchedCustomer?.id,
        linkedCustomerName: form.linkedCustomerName.trim() || undefined,
        projectTitle: form.projectTitle.trim() || undefined,
        notes: form.notes.trim(),
        paymentMethod: form.paymentMethod,
        issuedBy: actorName,
        referenceDate,
        transactionFlow: (transactionFlowOptions.includes(normalizedTransactionFlow as TransactionFlow) ? normalizedTransactionFlow : 'business_to_business') as TransactionFlow,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/35 p-3 backdrop-blur-sm">
      <div className="flex h-[min(92vh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-start justify-between border-b border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/65">
              Manual books entry
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-brand-dark">Post one transaction into all books</h2>
            <p className="mt-1 text-sm text-brand-dark/75">
              This single form feeds the journal, posts to the ledger, and updates the trial balance immediately.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Entry title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Amount</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => setField('amount', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Kind</span>
                <select
                  value={form.kind}
                  onChange={(event) => setField('kind', event.target.value as FinanceKind)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {financeKindOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Category</span>
                <input
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                  list="ledger-category-options"
                  placeholder="client_payment"
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
                <datalist id="ledger-category-options">
                  {financeCategoryOptions.map((option) => (
                    <option key={option} value={option}>{prettifyOption(option)}</option>
                  ))}
                </datalist>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setField('status', event.target.value as FinanceStatus)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {financeStatusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Payment method</span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) => setField('paymentMethod', event.target.value as InvoicePaymentMethod)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Entry date</span>
                <input
                  type="date"
                  value={form.dueAt}
                  onChange={(event) => setField('dueAt', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Linked customer</span>
                <input
                  value={form.linkedCustomerName}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    const customer = customers.find((item) => item.customerName.trim().toLowerCase() === nextName.trim().toLowerCase());
                    setForm((current) => ({
                      ...current,
                      linkedCustomerName: nextName,
                      projectTitle: current.projectTitle || customer?.title || '',
                    }));
                  }}
                  list="ledger-customer-options"
                  placeholder="Type customer, company, or person name"
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
                <datalist id="ledger-customer-options">
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.customerName}>
                      {customer.title}
                    </option>
                  ))}
                </datalist>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Transaction relationship</span>
                <select
                  value={form.transactionFlow}
                  onChange={(event) => setField('transactionFlow', event.target.value as TransactionFlow)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
                >
                  {transactionFlowOptions.map((option) => (
                    <option key={option} value={option}>{prettifyOption(option)}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80">
                <span className="font-medium text-brand-dark">Project title</span>
                <input
                  value={form.projectTitle}
                  onChange={(event) => setField('projectTitle', event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
                <span className="font-medium text-brand-dark">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark outline-none"
                  placeholder="Capture vendor details, stock purchase notes, salary month, or receipt references here"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 disabled:opacity-60"
            >
              {submitting ? 'Posting...' : 'Add to books'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BooksModal = ({
  activeBook,
  onClose,
  onSwitchBook,
  month,
  year,
  monthOptions,
  yearOptions,
  onChangeMonth,
  onChangeYear,
  journalGroups,
  ledgerSections,
  trialBalanceRows,
  onDeleteEntry,
  deletingEntryId,
  onOpenInsight,
}: {
  activeBook: BookView;
  onClose: () => void;
  onSwitchBook: (view: BookView) => void;
  month: number;
  year: number;
  monthOptions: typeof monthNames;
  yearOptions: number[];
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  journalGroups: JournalGroup[];
  ledgerSections: LedgerSection[];
  trialBalanceRows: TrialBalanceRow[];
  onDeleteEntry: (entryId: string, entryTitle: string) => void;
  deletingEntryId: string | null;
  onOpenInsight: (insight: BookInsight) => void;
}) => {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-brand-dark/35 p-3 backdrop-blur-sm">
      <div className="flex h-[min(94vh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[36px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
          <div>
            <div className="inline-flex rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/65">
              Accounting books
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-brand-dark">Journal, ledger, and trial balance</h2>
            <p className="mt-1 text-sm text-brand-dark/70">
              Choose a month and year, then move between synchronized books without leaving this window.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/30 px-3 py-2 text-sm font-medium text-brand-dark">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-brand-30 bg-brand-60/25 px-5 py-4 sm:px-6">
          {([
            ['journal', 'Journal'],
            ['ledger', 'Ledger'],
            ['trial-balance', 'Trial Balance'],
          ] as Array<[BookView, string]>).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => onSwitchBook(view)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeBook === view ? 'bg-brand-10 text-white' : 'border border-brand-30 bg-white text-brand-dark'}`}
            >
              {label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-3">
            <select
              value={month}
              onChange={(event) => onChangeMonth(Number(event.target.value))}
              className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark"
            >
              {monthOptions.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => onChangeYear(Number(event.target.value))}
              className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-6">
          {activeBook === 'journal' ? (
            journalGroups.length ? (
              <div className="space-y-5">
                {journalGroups.map((group) => (
                  <div key={group.id} className="overflow-hidden rounded-[28px] border border-brand-30 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-30 bg-brand-60/20 px-4 py-4">
                      <div>
                        <div className="text-sm font-semibold text-brand-dark">{group.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-brand-dark/55">
                          {formatDate(group.date)} • {group.reference} • {group.sourceLabel}
                        </div>
                        <p className="mt-2 text-sm text-brand-dark/70">{group.narration}</p>
                      </div>
                      {group.deletable && group.financeEntryId ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteEntry(group.financeEntryId!, group.title);
                          }}
                          disabled={deletingEntryId === group.financeEntryId}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div className="rounded-full border border-brand-30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/50">
                          Auto
                        </div>
                      )}
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead className="bg-white">
                          <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                            <th className="border-b border-brand-30 px-4 py-3">Particulars</th>
                            <th className="border-b border-brand-30 px-4 py-3 text-right">Debit</th>
                            <th className="border-b border-brand-30 px-4 py-3 text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.lines.map((line, index) => (
                            <tr
                              key={`${group.id}-${line.account}-${index}`}
                              className="cursor-pointer transition hover:bg-brand-60/20"
                              onClick={() =>
                                onOpenInsight({
                                  type: 'journal',
                                  title: group.title,
                                  subtitle: `${formatDate(group.date)} • ${group.reference}`,
                                  lines: group.lines,
                                  detail: `${group.sourceLabel} • ${group.narration}`,
                                  deletable: group.deletable,
                                  financeEntryId: group.financeEntryId,
                                })
                              }
                            >
                              <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{line.account}</td>
                              <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                                {line.debit ? formatCurrency(line.debit) : '—'}
                              </td>
                              <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                                {line.credit ? formatCurrency(line.credit) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                icon={BookOpen}
                title="No journal entries found for this month"
                description="Try another month or add a manual transaction into the books."
              />
            )
          ) : activeBook === 'ledger' ? (
            ledgerSections.length ? (
              <div className="space-y-5">
                {ledgerSections.map((section) => (
                  <div key={section.account} className="overflow-hidden rounded-[28px] border border-brand-30 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-30 bg-brand-60/20 px-4 py-4">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-dark">{section.account}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-brand-dark/55">
                          Opening {buildBalanceLabel(section.openingBalance)} • Closing {buildBalanceLabel(section.closingBalance)}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead className="bg-white">
                          <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                            <th className="border-b border-brand-30 px-4 py-3">Date</th>
                            <th className="border-b border-brand-30 px-4 py-3">Particulars</th>
                            <th className="border-b border-brand-30 px-4 py-3">Reference</th>
                            <th className="border-b border-brand-30 px-4 py-3">Source</th>
                            <th className="border-b border-brand-30 px-4 py-3 text-right">Debit</th>
                            <th className="border-b border-brand-30 px-4 py-3 text-right">Credit</th>
                            <th className="border-b border-brand-30 px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.length ? (
                            section.rows.map((row) => (
                              <tr
                                key={`${section.account}-${row.entryId}-${row.date}`}
                                className="cursor-pointer transition hover:bg-brand-60/20"
                                onClick={() =>
                                  onOpenInsight({
                                    type: 'ledger',
                                    title: section.account,
                                    subtitle: `${formatDate(row.date)} • ${row.reference}`,
                                    lines: [
                                      { account: row.particulars, debit: row.debit, credit: row.credit },
                                    ],
                                    detail: `${row.sourceLabel} • ${row.particulars}`,
                                    deletable: row.deletable,
                                    financeEntryId: row.financeEntryId,
                                  })
                                }
                              >
                                <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{formatDate(row.date)}</td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.particulars}</td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.reference}</td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.sourceLabel}</td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                                  {row.debit ? formatCurrency(row.debit) : '—'}
                                </td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                                  {row.credit ? formatCurrency(row.credit) : '—'}
                                </td>
                                <td className="border-b border-brand-30/60 px-4 py-3 text-right">
                                  {row.deletable && row.financeEntryId ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onDeleteEntry(row.financeEntryId!, row.particulars);
                                      }}
                                      disabled={deletingEntryId === row.financeEntryId}
                                      className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-700 disabled:opacity-60"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : (
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/45">Auto</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-6 text-center text-sm text-brand-dark/60">
                                No movements posted in this account for the selected month.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                icon={BookOpen}
                title="No ledger activity found"
                description="This month has no account movements yet. Add a transaction or choose another period."
              />
            )
          ) : trialBalanceRows.length ? (
            <div className="overflow-hidden rounded-[28px] border border-brand-30 bg-white">
              <div className="border-b border-brand-30 bg-brand-60/20 px-4 py-4">
                <h3 className="text-lg font-semibold text-brand-dark">Trial balance as of month close</h3>
                <p className="mt-1 text-sm text-brand-dark/65">
                  Debit and credit totals stay aligned here because the journal postings feed this report directly.
                </p>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="bg-white">
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                      <th className="border-b border-brand-30 px-4 py-3">Account</th>
                      <th className="border-b border-brand-30 px-4 py-3 text-right">Debit</th>
                      <th className="border-b border-brand-30 px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalanceRows.map((row) => (
                      <tr
                        key={row.account}
                        className="cursor-pointer transition hover:bg-brand-60/20"
                        onClick={() =>
                          onOpenInsight({
                            type: 'trial-balance',
                            title: row.account,
                            subtitle: `Trial balance • ${monthOptions[month - 1]} ${year}`,
                            lines: [{ account: row.account, debit: row.debit, credit: row.credit }],
                            detail: 'This balance is derived from all posted journal lines up to the selected month close.',
                            account: row.account,
                          })
                        }
                      >
                        <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{row.account}</td>
                        <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                          {row.debit ? formatCurrency(row.debit) : '—'}
                        </td>
                        <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">
                          {row.credit ? formatCurrency(row.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-brand-60/15">
                      <td className="px-4 py-3 text-sm font-semibold text-brand-dark">Totals</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-brand-dark">
                        {formatCurrency(trialBalanceRows.reduce((sum, row) => sum + row.debit, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-brand-dark">
                        {formatCurrency(trialBalanceRows.reduce((sum, row) => sum + row.credit, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyStatePanel
              icon={BookOpen}
              title="No trial balance available"
              description="This period has no posted balances yet. Add an entry or wait for the daily sales close."
            />
          )}
        </div>
      </div>
    </div>
  );
};

const WeeklyMiscPanel = ({
  records,
  onAddRecord,
  onDeleteRecord,
}: {
  records: WeeklyMiscRecord[];
  onAddRecord: (payload: Pick<WeeklyMiscRecord, 'title' | 'amount' | 'spentAt' | 'notes' | 'weekKey'>) => Promise<void> | void;
  onDeleteRecord: (recordId: string) => Promise<void> | void;
}) => {
  const [form, setForm] = useState<WeeklyMiscForm>(() => initialWeeklyMiscState());
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const total = records.reduce((sum, record) => sum + record.amount, 0);

  const setField = <K extends keyof WeeklyMiscForm>(field: K, value: WeeklyMiscForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const spentAtIso = new Date(form.spentAt).toISOString();
      await onAddRecord({
        title: form.title.trim() || 'Tea / coffee',
        amount: Number(form.amount || '0'),
        spentAt: spentAtIso,
        notes: form.notes.trim(),
        weekKey: getWeekKey(spentAtIso),
      });
      setForm(initialWeeklyMiscState());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Weekly miscellaneous stack</h2>
          <p className="mt-1 text-sm text-brand-dark/65">
            Log tea, coffee, snacks, and other tiny staff spends here during the week. They stay out of the books daily and roll into one combined Sunday 10 PM close entry automatically.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Current stack</div>
          <div className="mt-1 text-lg font-semibold text-brand-dark">{formatCurrency(total)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 xl:grid-cols-[1.2fr,0.7fr,0.8fr,1.2fr,auto]">
        <input
          required
          value={form.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder="Tea, coffee, snacks, quick staff support"
          className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-sm text-brand-dark outline-none"
        />
        <input
          required
          inputMode="decimal"
          value={form.amount}
          onChange={(event) => setField('amount', event.target.value)}
          placeholder="Amount"
          className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-sm text-brand-dark outline-none"
        />
        <input
          type="date"
          required
          value={form.spentAt}
          onChange={(event) => setField('spentAt', event.target.value)}
          className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-sm text-brand-dark outline-none"
        />
        <input
          value={form.notes}
          onChange={(event) => setField('notes', event.target.value)}
          placeholder="Optional note"
          className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-sm text-brand-dark outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Save item'}
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-brand-30 bg-white">
        <div className="border-b border-brand-30 bg-brand-60/15 px-4 py-4">
          <h3 className="text-base font-semibold text-brand-dark">This week’s short-term memory</h3>
          <p className="mt-1 text-sm text-brand-dark/65">
            After the Sunday close is posted into the books, this stack resets fresh for the next week.
          </p>
        </div>
        {records.length ? (
          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-white">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-brand-dark/55">
                  <th className="border-b border-brand-30 px-4 py-3">Item</th>
                  <th className="border-b border-brand-30 px-4 py-3">Date</th>
                  <th className="border-b border-brand-30 px-4 py-3">Note</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Amount</th>
                  <th className="border-b border-brand-30 px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="transition hover:bg-brand-60/20">
                    <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{record.title}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark">{formatDate(record.spentAt)}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-sm text-brand-dark/70">{record.notes || '—'}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right text-sm font-medium text-brand-dark">{formatCurrency(record.amount)}</td>
                    <td className="border-b border-brand-30/60 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          setDeletingId(record.id);
                          try {
                            await onDeleteRecord(record.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === record.id}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-700 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-brand-dark/60">
            No weekly miscellaneous items saved yet. Add the tiny tea or coffee spends here and let the weekend close post one combined book entry.
          </div>
        )}
      </div>
    </section>
  );
};

export const AccountLedgerPage = ({
  companyName,
  businessProfile,
  financeEntries,
  weeklyMiscRecords,
  salesInvoices,
  inventory,
  customers,
  actorName,
  onAddEntry,
  onAddWeeklyMiscRecord,
  onDeleteWeeklyMiscRecord,
  onCloseWeeklyMiscRecords,
  onDeleteEntry,
}: AccountLedgerPageProps) => {
  const today = new Date();
  const [activeBook, setActiveBook] = useState<BookView | null>(null);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [activeInsight, setActiveInsight] = useState<BookInsight | null>(null);
  const [activeReport, setActiveReport] = useState<CloseReportView | null>(null);
  const [closingWeeklyWeekKey, setClosingWeeklyWeekKey] = useState<string | null>(null);

  const journalGroups = useMemo(() => {
    const financeGroups = financeEntries
      .map((entry) => buildFinanceJournalGroup(entry, customers))
      .filter((entry): entry is JournalGroup => Boolean(entry));
    const salesGroups = buildSalesSummaryJournalGroups(salesInvoices, inventory);

    return [...financeGroups, ...salesGroups].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [customers, financeEntries, inventory, salesInvoices]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear]);
    journalGroups.forEach((group) => years.add(new Date(group.date).getFullYear()));
    return Array.from(years).sort((left, right) => right - left);
  }, [journalGroups]);

  useEffect(() => {
    if (!availableYears.includes(year)) {
      setYear(availableYears[0] || new Date().getFullYear());
    }
  }, [availableYears, year]);

  const filteredJournalGroups = useMemo(
    () => journalGroups.filter((group) => withinRange(group.date, month, year)),
    [journalGroups, month, year],
  );

  const ledgerSections = useMemo(() => buildLedgerSections(journalGroups, month, year), [journalGroups, month, year]);
  const trialBalanceRows = useMemo(() => buildTrialBalance(journalGroups, month, year), [journalGroups, month, year]);
  const monthLabel = `${monthNames[month - 1]} ${year}`;
  const isSelectedCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
  const isLastDayOfCurrentMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const canPrepareNextMonth = isSelectedCurrentMonth && isLastDayOfCurrentMonth;
  const profitAndLossRows = useMemo(() => buildProfitAndLoss(filteredJournalGroups), [filteredJournalGroups]);
  const netProfit = profitAndLossRows.find((item) => item.label === 'Net Profit / Loss')?.amount || 0;
  const balanceSheet = useMemo(() => buildBalanceSheet(trialBalanceRows, netProfit), [trialBalanceRows, netProfit]);
  const cashFlow = useMemo(() => buildCashFlow(filteredJournalGroups), [filteredJournalGroups]);
  const checklist = useMemo(
    () => buildChecklist(monthLabel, filteredJournalGroups, financeEntries, inventory, trialBalanceRows, month, year),
    [monthLabel, filteredJournalGroups, financeEntries, inventory, trialBalanceRows, month, year],
  );
  const generalLedgerSnapshot = useMemo(
    () =>
      ledgerSections.map((section) => ({
        account: section.account,
        openingBalance: section.openingBalance,
        closingBalance: section.closingBalance,
        movements: section.rows.length,
      })),
    [ledgerSections],
  );
  const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
  const currentWeekMiscRecords = useMemo(
    () => weeklyMiscRecords.filter((record) => record.weekKey === currentWeekKey),
    [weeklyMiscRecords, currentWeekKey],
  );
  const pendingWeeklyClose = useMemo(() => {
    const grouped = new Map<string, WeeklyMiscRecord[]>();
    weeklyMiscRecords.forEach((record) => {
      const bucket = grouped.get(record.weekKey) || [];
      bucket.push(record);
      grouped.set(record.weekKey, bucket);
    });

    return Array.from(grouped.entries())
      .map(([weekKey, records]) => {
        const orderedRecords = records.slice().sort((left, right) => new Date(left.spentAt).getTime() - new Date(right.spentAt).getTime());
        const weekEnd = getWeekWindow(orderedRecords[0]?.spentAt || today).end;
        weekEnd.setHours(22, 0, 0, 0);
        const closeKey = `weekly-misc-${weekKey}`;
        return { weekKey, records: orderedRecords, closeKey, weekEnd };
      })
      .filter(({ records, closeKey, weekEnd }) => {
        if (!records.length) return false;
        if (new Date().getTime() < weekEnd.getTime()) return false;
        return !financeEntries.some((entry) => entry.accountingSource === 'weekly_misc_summary' && entry.autoGroupKey === closeKey);
      })
      .sort((left, right) => left.weekEnd.getTime() - right.weekEnd.getTime())[0];
  }, [financeEntries, today, weeklyMiscRecords]);

  useEffect(() => {
    if (!pendingWeeklyClose) {
      if (closingWeeklyWeekKey) {
        setClosingWeeklyWeekKey(null);
      }
      return;
    }
    if (closingWeeklyWeekKey === pendingWeeklyClose.weekKey) return;

    const totalAmount = pendingWeeklyClose.records.reduce((sum, record) => sum + record.amount, 0);
    const notePreview = pendingWeeklyClose.records
      .slice(0, 4)
      .map((record) => record.title)
      .join(', ');
    const weekLabel = `${formatDate(pendingWeeklyClose.records[0].spentAt)} to ${formatDate(pendingWeeklyClose.records[pendingWeeklyClose.records.length - 1].spentAt)}`;

    setClosingWeeklyWeekKey(pendingWeeklyClose.weekKey);
    Promise.resolve(
      onCloseWeeklyMiscRecords({
        title: 'Weekly miscellaneous close',
        amount: totalAmount,
        dueAt: pendingWeeklyClose.weekEnd.toISOString(),
        referenceDate: pendingWeeklyClose.weekEnd.toISOString(),
        notes: `${pendingWeeklyClose.records.length} small welfare spend item(s) summarized for ${weekLabel}.${notePreview ? ` Includes: ${notePreview}.` : ''}`,
        autoGroupKey: pendingWeeklyClose.closeKey,
        recordIds: pendingWeeklyClose.records.map((record) => record.id),
      }),
    ).catch(() => {
      setClosingWeeklyWeekKey(null);
    });
  }, [closingWeeklyWeekKey, onCloseWeeklyMiscRecords, pendingWeeklyClose]);

  const handleDelete = async (entryId: string, entryTitle: string) => {
    if (!window.confirm(`Delete "${entryTitle}" from the books?`)) return;

    setDeletingEntryId(entryId);
    try {
      await onDeleteEntry(entryId);
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handlePrintMonthEnd = () => {
    printMonthEndClosePackage(`Month End Close - ${monthLabel}`, {
      companyName,
      monthLabel,
      businessAddress: businessProfile.studioAddress || businessProfile.city || 'Business address not set yet',
      businessPhone: businessProfile.phone || undefined,
      gstNumber: businessProfile.gstNumber || undefined,
      workspaceLogoUrl: businessProfile.workspaceLogoUrl || undefined,
      poweredByText: 'Powered by PULA Biz',
      checklist,
      profitAndLoss: profitAndLossRows,
      balanceSheet,
      cashFlow,
      generalLedger: generalLedgerSnapshot,
    });
  };

  const handleChecklistAction = (action: ChecklistAction) => {
    if (action === 'export') {
      if (!canPrepareNextMonth) return;
      handlePrintMonthEnd();
    }
  };

  return (
    <>
      <div className="flex min-h-[700px] flex-col gap-5">
        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <BookOpen size={14} />
              Account Ledger
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              Simple books for monthly closing
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-dark/70 sm:text-base">
              Journal, ledger, and trial balance stay connected here. Manual entries update instantly, while billing invoices are grouped into one automated sales close at 10 PM each day so your books stay clean.
            </p>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Open any book</h2>
              <p className="mt-1 text-sm text-brand-dark/65">
                Pick the view you need, then use the popup filters for month and year.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEntryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60"
            >
              <Plus size={16} />
              Add entry
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <BookButton
              label="Journal"
              description="View date-wise postings with debit and credit lines exactly as they enter the books."
              onClick={() => setActiveBook('journal')}
            />
            <BookButton
              label="Ledger"
              description="View account-wise posting movement, opening balance, and closing balance for the selected month."
              onClick={() => setActiveBook('ledger')}
            />
            <BookButton
              label="Trial Balance"
              description="Check debit and credit balances at month close to confirm the books stay aligned."
              onClick={() => setActiveBook('trial-balance')}
            />
          </div>

          <div className="mt-5 rounded-[28px] border border-brand-30 bg-brand-60/20 px-5 py-4 text-sm leading-6 text-brand-dark/70">
            Use <span className="font-semibold text-brand-dark">Add entry</span> for manual purchases, expenses, salaries, and other adjustments. Finalized invoices do not flood the books one by one; they are grouped into a single sales close entry after 10 PM.
          </div>
        </section>

        <WeeklyMiscPanel
          records={currentWeekMiscRecords}
          onAddRecord={onAddWeeklyMiscRecord}
          onDeleteRecord={onDeleteWeeklyMiscRecord}
        />

        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Month-end close package</h2>
              <p className="mt-1 text-sm text-brand-dark/65">
                Follow the monthly close flow for {monthLabel}, review the statements, then export the month-end PDF package.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark"
              >
                {monthNames.map((label, index) => (
                  <option key={label} value={index + 1}>{label}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm text-brand-dark"
              >
                {availableYears.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePrintMonthEnd}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60"
              >
                <Printer size={16} />
                Export month-end PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {checklist
              .filter((item) => item.title === 'Prepare for next month')
              .map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => handleChecklistAction(item.action as ChecklistAction)}
                disabled={!canPrepareNextMonth}
                className="rounded-[28px] border border-brand-30 bg-brand-60/15 px-4 py-4 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-brand-10 enabled:hover:bg-brand-60/25 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-brand-dark">{item.title}</div>
                  <div className="rounded-full border border-brand-30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/65">
                    {canPrepareNextMonth ? item.status : 'Locked'}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-dark/70">
                  {canPrepareNextMonth
                    ? item.detail
                    : `This action is available only on the last day of the currently selected month. Switch to the current month and use it on ${new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] border border-brand-30 bg-brand-60/20 px-5 py-4 text-sm leading-6 text-brand-dark/70">
            You can preview and export the selected month-end PDF anytime. Prepare-next-month close remains limited to the last day of the selected live month so the final close represents the true month-end position.
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {([
              ['profit-loss', 'Profit and Loss', 'Review operating performance, revenue, expenses, and net profit for the month.'],
              ['balance-sheet', 'Balance Sheet', 'Review assets, liabilities, and current period earnings at month close.'],
              ['cash-flow', 'Cash Flow Statement', 'Track operating, investing, and financing cash movement for the period.'],
              ['general-ledger', 'General Ledger', 'Review account-wise monthly opening, movements, and closing balances in one place.'],
            ] as Array<[CloseReportView, string, string]>).map(([view, label, description]) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveReport(view)}
                className="rounded-[28px] border border-brand-30 bg-white px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10 hover:shadow-md"
              >
                <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/60">
                  <FileBarChart2 size={15} />
                  {label}
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-dark/75">{description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <AddLedgerEntryModal
        open={entryModalOpen}
        customers={customers}
        actorName={actorName}
        onClose={() => setEntryModalOpen(false)}
        onSubmit={async (payload) => {
          await onAddEntry(payload);
        }}
      />

      {activeBook ? (
        <BooksModal
          activeBook={activeBook}
          onClose={() => setActiveBook(null)}
          onSwitchBook={setActiveBook}
          month={month}
          year={year}
          monthOptions={monthNames}
          yearOptions={availableYears}
          onChangeMonth={setMonth}
          onChangeYear={setYear}
          journalGroups={filteredJournalGroups}
          ledgerSections={ledgerSections}
          trialBalanceRows={trialBalanceRows}
          onDeleteEntry={handleDelete}
          deletingEntryId={deletingEntryId}
          onOpenInsight={setActiveInsight}
        />
      ) : null}

      <BookInsightModal
        insight={activeInsight}
        onClose={() => setActiveInsight(null)}
        onDeleteEntry={handleDelete}
        deletingEntryId={deletingEntryId}
      />

      <MonthEndReportModal
        view={activeReport}
        monthLabel={monthLabel}
        profitAndLoss={profitAndLossRows}
        balanceSheet={balanceSheet}
        cashFlow={cashFlow}
        generalLedger={generalLedgerSnapshot}
        onClose={() => setActiveReport(null)}
      />
    </>
  );
};
