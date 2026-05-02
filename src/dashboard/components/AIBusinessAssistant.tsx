import { useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Database, Loader2, Send, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import {
  buildBalanceSheet,
  buildCashFlow,
  buildChecklist,
  buildFinanceJournalGroup,
  buildLedgerSections,
  buildProfitAndLoss,
  buildSalesSummaryJournalGroups,
  buildTrialBalance,
  monthNames,
  type JournalGroup,
} from '../pages/AccountLedgerPage';
import { getInventoryMovement } from '../inventoryMovement';
import { printAccountingReport, printMonthEndClosePackage } from '../invoicePrint';
import type { DashboardData, InventoryItem, InventoryUnit } from '../types';
import { formatCurrency } from '../utils';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type InventoryCreatePayload = Pick<
  InventoryItem,
  | 'name'
  | 'sku'
  | 'itemCode'
  | 'category'
  | 'unit'
  | 'currentStock'
  | 'reservedStock'
  | 'minimumStock'
  | 'reorderQuantity'
  | 'costPerUnit'
  | 'sellingPrice'
  | 'barcodeValue'
  | 'storageLocation'
  | 'supplierName'
  | 'supplierPhone'
  | 'notes'
>;

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type PendingDelete = {
  itemId: string;
  itemName: string;
};

type AssistantIntent =
  | { action: 'stock_lookup'; productQuery: string }
  | { action: 'dashboard_summary' }
  | { action: 'update_inventory_stock'; productQuery: string; stock: number }
  | { action: 'delete_inventory_item'; productQuery: string }
  | { action: 'accounting_summary'; month?: number; year?: number }
  | { action: 'trial_balance'; month?: number; year?: number }
  | { action: 'general_ledger'; accountQuery?: string; month?: number; year?: number }
  | { action: 'export_accounting_pdf'; reportType: 'trial_balance' | 'general_ledger' | 'account_books'; month?: number; year?: number }
  | { action: 'general_answer'; answer: string };

type AIBusinessAssistantProps = {
  data: DashboardData;
  businessConfig: WorkspaceBusinessConfig;
  canWrite: boolean;
  onAddInventoryItem: (payload: InventoryCreatePayload) => Promise<void>;
  onUpdateInventoryItem: (itemId: string, patch: Partial<InventoryItem>) => Promise<void>;
  onDeleteInventoryItem: (itemId: string) => Promise<void>;
};

const unitOptions: InventoryUnit[] = ['pcs', 'rolls', 'boxes', 'sets', 'sqm', 'kg', 'litres'];

const currentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const monthPattern = monthNames.map((month) => month.slice(0, 3).toLowerCase()).join('|');

const parseMonthYear = (input: string) => {
  const current = currentMonthYear();
  const monthMatch = input.toLowerCase().match(new RegExp(`\\b(${monthPattern}|${monthNames.map((month) => month.toLowerCase()).join('|')})\\b`));
  const yearMatch = input.match(/\b(20\d{2}|19\d{2})\b/);
  const month = monthMatch
    ? monthNames.findIndex((name) => name.toLowerCase().startsWith(monthMatch[1].slice(0, 3))) + 1
    : current.month;
  const year = yearMatch ? Number(yearMatch[1]) : current.year;
  return { month: month || current.month, year };
};

const getMonthRange = (month: number, year: number) => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0),
  end: new Date(year, month, 0, 23, 59, 59, 999),
});

const withinMonth = (value: string, month: number, year: number) => {
  const { start, end } = getMonthRange(month, year);
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
};

const buildAccountingContext = (data: DashboardData, month: number, year: number) => {
  const financeGroups = data.financeEntries
    .map((entry) => buildFinanceJournalGroup(entry, data.customers))
    .filter((group): group is JournalGroup => Boolean(group));
  const salesGroups = buildSalesSummaryJournalGroups(data.salesInvoices, data.inventory);
  const journalGroups = [...financeGroups, ...salesGroups].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  const filteredJournalGroups = journalGroups.filter((group) => withinMonth(group.date, month, year));
  const ledgerSections = buildLedgerSections(journalGroups, month, year);
  const trialBalanceRows = buildTrialBalance(journalGroups, month, year);
  const profitAndLossRows = buildProfitAndLoss(filteredJournalGroups);
  const netProfit = profitAndLossRows.find((row) => row.label === 'Net Profit / Loss')?.amount || 0;
  const balanceSheet = buildBalanceSheet(trialBalanceRows, netProfit);
  const cashFlow = buildCashFlow(filteredJournalGroups);
  const monthLabel = `${monthNames[month - 1]} ${year}`;
  const checklist = buildChecklist(monthLabel, filteredJournalGroups, data.financeEntries, data.inventory, trialBalanceRows, month, year);
  const generalLedger = ledgerSections.map((section) => ({
    account: section.account,
    openingBalance: section.openingBalance,
    closingBalance: section.closingBalance,
    movements: section.rows.length,
  }));

  return {
    monthLabel,
    journalGroups,
    filteredJournalGroups,
    ledgerSections,
    trialBalanceRows,
    profitAndLossRows,
    balanceSheet,
    cashFlow,
    checklist,
    generalLedger,
    totalDebits: trialBalanceRows.reduce((sum, row) => sum + row.debit, 0),
    totalCredits: trialBalanceRows.reduce((sum, row) => sum + row.credit, 0),
    netProfit,
  };
};

const AivaAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const dimensions = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
  const textSize = size === 'lg' ? 'text-[15px]' : size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`relative inline-flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/35 bg-[linear-gradient(135deg,#D62828_0%,#D62828_38%,#12355B_39%,#12355B_100%)] text-white shadow-lg shadow-brand-10/25`}
      aria-hidden="true"
    >
      <span className="absolute -left-2 -top-3 h-9 w-9 rounded-full bg-white/24 blur-md" />
      <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-white/85 shadow-sm" />
      <span className={`relative font-black tracking-[0.08em] ${textSize}`}>AI</span>
    </span>
  );
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const numberFrom = (value: string | undefined, fallback = 0) => {
  if (!value) return fallback;
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const getCell = (row: Record<string, string>, names: string[]) => {
  for (const name of names) {
    const key = Object.keys(row).find((candidate) => normalize(candidate) === normalize(name));
    if (key && row[key]) return row[key];
  }
  return '';
};

const parseInventoryRows = (text: string): InventoryCreatePayload[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((current, header, index) => {
      current[header] = cells[index] ?? '';
      return current;
    }, {});

    const unitValue = getCell(row, ['unit']) as InventoryUnit;
    const name = getCell(row, ['name', 'item', 'product', 'product name', 'inventory item']);
    const sku = getCell(row, ['sku', 'stock keeping unit']);
    const itemCode = getCell(row, ['itemCode', 'item code', 'code']);

    return {
      name,
      sku: sku || itemCode || name.slice(0, 10).toUpperCase().replace(/\s+/g, '-'),
      itemCode: itemCode || sku || name.slice(0, 10).toUpperCase().replace(/\s+/g, '-'),
      category: getCell(row, ['category']) || 'General',
      unit: unitOptions.includes(unitValue) ? unitValue : 'pcs',
      currentStock: numberFrom(getCell(row, ['currentStock', 'current stock', 'stock', 'quantity', 'qty'])),
      reservedStock: numberFrom(getCell(row, ['reservedStock', 'reserved stock', 'reserved'])),
      minimumStock: numberFrom(getCell(row, ['minimumStock', 'minimum stock', 'min stock']), 5),
      reorderQuantity: numberFrom(getCell(row, ['reorderQuantity', 'reorder quantity', 'reorder qty']), 10),
      costPerUnit: numberFrom(getCell(row, ['costPerUnit', 'cost per unit', 'cost'])),
      sellingPrice: numberFrom(getCell(row, ['sellingPrice', 'selling price', 'price', 'mrp'])),
      barcodeValue: getCell(row, ['barcodeValue', 'barcode value', 'barcode']),
      storageLocation: getCell(row, ['storageLocation', 'storage location', 'location']),
      supplierName: getCell(row, ['supplierName', 'supplier name', 'supplier']),
      supplierPhone: getCell(row, ['supplierPhone', 'supplier phone']),
      notes: getCell(row, ['notes', 'note']),
    };
  }).filter((row) => row.name);
};

const findInventoryItem = (inventory: InventoryItem[], productQuery: string) => {
  const target = normalize(productQuery);
  if (!target) return null;

  return inventory.find((item) => {
    const candidates = [item.name, item.sku, item.itemCode, item.barcodeValue].map(normalize);
    return candidates.some((candidate) => candidate === target || candidate.includes(target) || target.includes(candidate));
  }) ?? null;
};

const findExistingInventoryItem = (inventory: InventoryItem[], row: InventoryCreatePayload) =>
  inventory.find((item) => {
    const skuMatch = row.sku && normalize(item.sku) === normalize(row.sku);
    const codeMatch = row.itemCode && normalize(item.itemCode) === normalize(row.itemCode);
    const nameMatch = normalize(item.name) === normalize(row.name);
    return skuMatch || codeMatch || nameMatch;
  }) ?? null;

const buildInventoryPatch = (existing: InventoryItem, row: InventoryCreatePayload): Partial<InventoryItem> => ({
  name: row.name || existing.name,
  sku: row.sku || existing.sku,
  itemCode: row.itemCode || existing.itemCode,
  category: row.category || existing.category,
  unit: row.unit || existing.unit,
  currentStock: row.currentStock,
  reservedStock: row.reservedStock,
  minimumStock: row.minimumStock,
  reorderQuantity: row.reorderQuantity,
  costPerUnit: row.costPerUnit,
  sellingPrice: row.sellingPrice,
  barcodeValue: row.barcodeValue || existing.barcodeValue,
  storageLocation: row.storageLocation,
  supplierName: row.supplierName,
  supplierPhone: row.supplierPhone,
  notes: row.notes,
});

const parseLocalIntent = (input: string): AssistantIntent | null => {
  const lowered = input.toLowerCase();
  const requestedMonth = parseMonthYear(input);

  if (/(download|export|pdf|print).*(trial|trail)\s*balance/i.test(input) || /(trial|trail)\s*balance.*(download|export|pdf|print)/i.test(input)) {
    return { action: 'export_accounting_pdf', reportType: 'trial_balance', ...requestedMonth };
  }

  if (/(download|export|pdf|print).*(general\s*ledger|ledger|account\s*books|books\s*report)/i.test(input) || /(general\s*ledger|account\s*books|books\s*report).*(download|export|pdf|print)/i.test(input)) {
    return {
      action: 'export_accounting_pdf',
      reportType: /trial|trail/i.test(input) ? 'trial_balance' : /account\s*books|books\s*report/i.test(input) ? 'account_books' : 'general_ledger',
      ...requestedMonth,
    };
  }

  if (/(trial|trail)\s*balance/i.test(input)) {
    return { action: 'trial_balance', ...requestedMonth };
  }

  if (/(general\s*ledger|ledger|account\s*book|account\s*books)/i.test(input)) {
    const accountMatch = input.match(/(?:for|of|account)\s+([a-z0-9\s-]+?)(?:\s+(?:in|for|during)\s+|$)/i);
    return { action: 'general_ledger', accountQuery: accountMatch?.[1]?.trim(), ...requestedMonth };
  }

  if (/(accounting|books|profit|loss|balance\s*sheet|cash\s*flow|ledger page)/i.test(input)) {
    return { action: 'accounting_summary', ...requestedMonth };
  }

  if (/(summary|overview|how is|business today|dashboard)/i.test(input)) {
    return { action: 'dashboard_summary' };
  }

  const updateMatch = input.match(/(?:update|set|change).{0,40}(?:stock|quantity|qty).{0,20}(?:of|for)?\s*([a-z0-9\s-]+?)\s*(?:to|=)\s*(\d+)/i)
    ?? input.match(/(?:update|set|change)\s+([a-z0-9\s-]+?)\s+(?:stock|quantity|qty)\s*(?:to|=)\s*(\d+)/i);
  if (updateMatch) {
    return {
      action: 'update_inventory_stock',
      productQuery: updateMatch[1].trim(),
      stock: Number(updateMatch[2]),
    };
  }

  const deleteMatch = input.match(/(?:delete|remove)\s+(?:inventory|item|product)?\s*([a-z0-9\s-]+)/i);
  if (deleteMatch) {
    return { action: 'delete_inventory_item', productQuery: deleteMatch[1].trim() };
  }

  if (/(stock|stocks|inventory|left|available|sold)/i.test(lowered)) {
    const productMatch = input.match(/(?:product|item|sku|for|of|is)\s+([a-z0-9\s-]+)$/i);
    return { action: 'stock_lookup', productQuery: productMatch?.[1]?.trim() || input };
  }

  return null;
};

const getGeminiIntent = async (input: string, data: DashboardData): Promise<AssistantIntent | null> => {
  if (!ai) return null;

  const inventoryNames = data.inventory.slice(0, 80).map((item) => ({
    name: item.name,
    sku: item.sku,
    itemCode: item.itemCode,
    stock: item.currentStock,
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          text: `You route dashboard requests into JSON only. Valid actions:
{"action":"stock_lookup","productQuery":"..."}
{"action":"dashboard_summary"}
{"action":"update_inventory_stock","productQuery":"...","stock":number}
{"action":"delete_inventory_item","productQuery":"..."}
{"action":"accounting_summary","month":number,"year":number}
{"action":"trial_balance","month":number,"year":number}
{"action":"general_ledger","accountQuery":"optional account name","month":number,"year":number}
{"action":"export_accounting_pdf","reportType":"trial_balance|general_ledger|account_books","month":number,"year":number}
{"action":"general_answer","answer":"..."}

Use write actions only when the user clearly asks to change data. Use accounting actions for account ledger, trial balance, books reports, profit and loss, balance sheet, cash flow, and PDF export. Inventory available: ${JSON.stringify(inventoryNames)}.
User request: ${input}`,
        },
      ],
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  const jsonText = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(jsonText) as AssistantIntent;
  } catch {
    return null;
  }
};

export const AIBusinessAssistant = ({
  data,
  businessConfig,
  canWrite,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
}: AIBusinessAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Hi, I’m AIVA. I can read your dashboard, answer stock and sales questions, and update inventory from chat or CSV exported from Excel.',
    },
  ]);

  const inventoryValue = useMemo(
    () => data.inventory.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0),
    [data.inventory],
  );

  const addMessage = (role: AssistantMessage['role'], content: string) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, content }]);
  };

  const answerStockLookup = (productQuery: string) => {
    const item = findInventoryItem(data.inventory, productQuery);
    if (!item) {
      addMessage('assistant', `I couldn’t find an inventory item matching “${productQuery}”. Try the item name, SKU, or item code.`);
      return;
    }

    const movement = getInventoryMovement(item, data.salesInvoices);
    addMessage(
      'assistant',
      `${item.name}: ${movement.stockLeft} ${item.unit} stock left, ${movement.availableStock} available after reserved stock. Sold since last inventory update: ${movement.soldSinceLastInventoryUpdate} ${item.unit} across ${movement.invoiceCountSinceLastInventoryUpdate} sale${movement.invoiceCountSinceLastInventoryUpdate === 1 ? '' : 's'} (${formatCurrency(movement.revenueSinceLastInventoryUpdate)}).`,
    );
  };

  const answerDashboardSummary = () => {
    const finalizedInvoices = data.salesInvoices.filter((invoice) => invoice.status === 'finalized');
    const totalSales = finalizedInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const lowStock = data.inventory.filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock');
    addMessage(
      'assistant',
      `Dashboard summary: ${data.customers.length} ${businessConfig.customerPlural.toLowerCase()}, ${data.inventory.length} inventory items, ${lowStock.length} low/out-of-stock items, ${finalizedInvoices.length} finalized invoices, ${formatCurrency(totalSales)} sales recorded, and ${formatCurrency(inventoryValue)} current inventory value.`,
    );
  };

  const answerAccountingSummary = (month = currentMonthYear().month, year = currentMonthYear().year) => {
    const context = buildAccountingContext(data, month, year);
    addMessage(
      'assistant',
      `${context.monthLabel} accounting summary: ${context.filteredJournalGroups.length} journal entries, ${context.ledgerSections.length} ledger accounts, trial balance debit ${formatCurrency(context.totalDebits)} and credit ${formatCurrency(context.totalCredits)}. Net profit/loss is ${formatCurrency(context.netProfit)}. Balance sheet has ${context.balanceSheet.assets.length} asset lines, ${context.balanceSheet.liabilities.length} liability lines, and ${context.balanceSheet.equity.length} equity lines.`,
    );
  };

  const answerTrialBalance = (month = currentMonthYear().month, year = currentMonthYear().year) => {
    const context = buildAccountingContext(data, month, year);
    if (!context.trialBalanceRows.length) {
      addMessage('assistant', `No trial balance rows are available for ${context.monthLabel}.`);
      return;
    }

    const topRows = context.trialBalanceRows
      .slice(0, 8)
      .map((row) => `${row.account}: Dr ${formatCurrency(row.debit)} / Cr ${formatCurrency(row.credit)}`)
      .join('\n');

    addMessage(
      'assistant',
      `Trial balance for ${context.monthLabel}\nTotal debit: ${formatCurrency(context.totalDebits)}\nTotal credit: ${formatCurrency(context.totalCredits)}\nDifference: ${formatCurrency(Math.abs(context.totalDebits - context.totalCredits))}\n\nTop rows:\n${topRows}`,
    );
  };

  const answerGeneralLedger = (accountQuery = '', month = currentMonthYear().month, year = currentMonthYear().year) => {
    const context = buildAccountingContext(data, month, year);
    const target = normalize(accountQuery);
    const sections = target
      ? context.ledgerSections.filter((section) => normalize(section.account).includes(target) || target.includes(normalize(section.account)))
      : context.ledgerSections;

    if (!sections.length) {
      addMessage('assistant', `No general ledger activity found for ${accountQuery ? `“${accountQuery}” in ` : ''}${context.monthLabel}.`);
      return;
    }

    const lines = sections.slice(0, 6).map((section) => {
      const debit = section.rows.reduce((sum, row) => sum + row.debit, 0);
      const credit = section.rows.reduce((sum, row) => sum + row.credit, 0);
      return `${section.account}: opening ${formatCurrency(section.openingBalance)}, debit ${formatCurrency(debit)}, credit ${formatCurrency(credit)}, closing ${formatCurrency(section.closingBalance)} (${section.rows.length} movement${section.rows.length === 1 ? '' : 's'})`;
    });

    addMessage('assistant', `General ledger for ${context.monthLabel}:\n${lines.join('\n')}`);
  };

  const exportAccountingPdf = (reportType: 'trial_balance' | 'general_ledger' | 'account_books', month = currentMonthYear().month, year = currentMonthYear().year) => {
    const context = buildAccountingContext(data, month, year);
    const commonPayload = {
      companyName: data.profile.companyName,
      monthLabel: context.monthLabel,
      businessAddress: data.profile.studioAddress || data.profile.city || 'Business address not set yet',
      businessPhone: data.profile.phone || undefined,
      gstNumber: data.profile.gstNumber || undefined,
      workspaceLogoUrl: data.profile.workspaceLogoUrl || undefined,
      poweredByText: 'Powered by PULA Biz',
    };

    if (reportType === 'account_books') {
      printMonthEndClosePackage(`Account Books Report - ${context.monthLabel}`, {
        ...commonPayload,
        checklist: context.checklist,
        profitAndLoss: context.profitAndLossRows,
        balanceSheet: context.balanceSheet,
        cashFlow: context.cashFlow,
        generalLedger: context.generalLedger,
      });
      addMessage('assistant', `Opened the ${context.monthLabel} account books PDF preview. Use “Print / Save as PDF” in the preview window to download it.`);
      return;
    }

    if (reportType === 'trial_balance') {
      printAccountingReport(`Trial Balance - ${context.monthLabel}`, {
        ...commonPayload,
        sections: [
          {
            title: 'Trial Balance',
            columns: ['Account', 'Debit', 'Credit'],
            rows: context.trialBalanceRows.map((row) => [row.account, formatCurrency(row.debit), formatCurrency(row.credit)]),
          },
          {
            title: 'Trial Balance Totals',
            columns: ['Total', 'Debit', 'Credit'],
            rows: [['Closing totals', formatCurrency(context.totalDebits), formatCurrency(context.totalCredits)]],
          },
        ],
      });
      addMessage('assistant', `Opened the ${context.monthLabel} trial balance PDF preview. Use “Print / Save as PDF” in the preview window to download it.`);
      return;
    }

    printAccountingReport(`General Ledger - ${context.monthLabel}`, {
      ...commonPayload,
      sections: context.ledgerSections.map((section) => ({
        title: section.account,
        columns: ['Date', 'Particulars', 'Debit', 'Credit', 'Closing'],
        rows: [
          ['Opening balance', '', '', '', formatCurrency(section.openingBalance)],
          ...section.rows.map((row) => [
            new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(row.date)),
            row.particulars,
            row.debit ? formatCurrency(row.debit) : '',
            row.credit ? formatCurrency(row.credit) : '',
            '',
          ]),
          ['Closing balance', '', '', '', formatCurrency(section.closingBalance)],
        ],
      })),
    });
    addMessage('assistant', `Opened the ${context.monthLabel} general ledger PDF preview. Use “Print / Save as PDF” in the preview window to download it.`);
  };

  const updateInventoryStock = async (productQuery: string, stock: number) => {
    if (!canWrite) {
      addMessage('assistant', 'Only a business owner can update inventory from the assistant.');
      return;
    }

    const item = findInventoryItem(data.inventory, productQuery);
    if (!item) {
      addMessage('assistant', `I couldn’t find an inventory item matching “${productQuery}”.`);
      return;
    }

    await onUpdateInventoryItem(item.id, { currentStock: stock });
    addMessage('assistant', `Updated ${item.name} stock to ${stock} ${item.unit}.`);
  };

  const prepareDeleteInventoryItem = (productQuery: string) => {
    if (!canWrite) {
      addMessage('assistant', 'Only a business owner can delete inventory from the assistant.');
      return;
    }

    const item = findInventoryItem(data.inventory, productQuery);
    if (!item) {
      addMessage('assistant', `I couldn’t find an inventory item matching “${productQuery}”.`);
      return;
    }

    setPendingDelete({ itemId: item.id, itemName: item.name });
    addMessage('assistant', `Deleting ${item.name} removes the cloud stock record. Confirm below only if you really want to delete it.`);
  };

  const handleIntent = async (intent: AssistantIntent) => {
    if (intent.action === 'stock_lookup') {
      answerStockLookup(intent.productQuery);
      return;
    }

    if (intent.action === 'dashboard_summary') {
      answerDashboardSummary();
      return;
    }

    if (intent.action === 'update_inventory_stock') {
      await updateInventoryStock(intent.productQuery, intent.stock);
      return;
    }

    if (intent.action === 'delete_inventory_item') {
      prepareDeleteInventoryItem(intent.productQuery);
      return;
    }

    if (intent.action === 'accounting_summary') {
      answerAccountingSummary(intent.month, intent.year);
      return;
    }

    if (intent.action === 'trial_balance') {
      answerTrialBalance(intent.month, intent.year);
      return;
    }

    if (intent.action === 'general_ledger') {
      answerGeneralLedger(intent.accountQuery, intent.month, intent.year);
      return;
    }

    if (intent.action === 'export_accounting_pdf') {
      exportAccountingPdf(intent.reportType, intent.month, intent.year);
      return;
    }

    addMessage('assistant', intent.answer);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    setInput('');
    addMessage('user', trimmed);
    setBusy(true);

    try {
      const intent = parseLocalIntent(trimmed) ?? await getGeminiIntent(trimmed, data);
      if (!intent) {
        addMessage('assistant', 'I can answer dashboard summary and inventory questions now. Try “how much stock is left for Sparks shoes?” or upload a CSV from Excel to update inventory.');
        return;
      }

      await handleIntent(intent);
    } catch (error) {
      console.error(error);
      addMessage('assistant', error instanceof Error ? error.message : 'I couldn’t complete that request.');
    } finally {
      setBusy(false);
    }
  };

  const handleInventoryFile = async (file: File) => {
    if (!canWrite) {
      addMessage('assistant', 'Only a business owner can upload inventory updates.');
      return;
    }

    if (file.name.toLowerCase().endsWith('.xlsx')) {
      addMessage('assistant', 'This version supports CSV/TSV exported from Excel. Please open the workbook in Excel and save/export it as CSV, then upload that file here.');
      return;
    }

    setBusy(true);
    addMessage('user', `Uploaded ${file.name}`);

    try {
      const text = await file.text();
      const rows = parseInventoryRows(text);
      if (!rows.length) {
        addMessage('assistant', 'I couldn’t read inventory rows from that file. Include a header row with columns like name, sku, currentStock, sellingPrice, supplierName.');
        return;
      }

      let updated = 0;
      let added = 0;

      for (const row of rows) {
        const existing = findExistingInventoryItem(data.inventory, row);
        if (existing) {
          await onUpdateInventoryItem(existing.id, buildInventoryPatch(existing, row));
          updated += 1;
        } else {
          await onAddInventoryItem(row);
          added += 1;
        }
      }

      addMessage('assistant', `Inventory import complete: ${updated} existing item${updated === 1 ? '' : 's'} updated and ${added} new item${added === 1 ? '' : 's'} added.`);
    } catch (error) {
      console.error(error);
      addMessage('assistant', error instanceof Error ? error.message : 'I couldn’t process that file.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[150] inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-white p-1 shadow-2xl shadow-brand-10/25 ring-1 ring-brand-30 transition hover:-translate-y-0.5"
        aria-label="Open AIVA assistant"
      >
        <AivaAvatar size="lg" />
      </button>

      {open ? (
        <div className="fixed bottom-5 right-5 z-[160] flex h-[min(720px,calc(100vh-2.5rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-brand-30 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-brand-30 bg-brand-60 px-4 py-4">
            <div className="flex items-start gap-3">
              <AivaAvatar />
              <div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-brand-dark/70">
                  <Sparkles size={16} />
                  AIVA
                </div>
                <p className="mt-1 text-xs text-brand-dark/60">
                  AI virtual assistant for PULA Biz operations.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-brand-30 bg-white p-2 text-brand-dark">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-brand-60/35 px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-brand-10 text-white'
                    : 'border border-brand-30 bg-white text-brand-dark'
                }`}
              >
                {message.content}
              </div>
            ))}

            {pendingDelete ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="font-semibold">Confirm delete: {pendingDelete.itemName}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const item = pendingDelete;
                      setPendingDelete(null);
                      await onDeleteInventoryItem(item.itemId);
                      addMessage('assistant', `${item.itemName} was deleted from inventory.`);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDelete(null);
                      addMessage('assistant', 'Delete cancelled.');
                    }}
                    className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-brand-30 bg-white p-3">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-xs font-semibold text-brand-dark"
              >
                <Upload size={15} />
                Upload stock CSV
              </button>
              <button
                type="button"
                onClick={answerDashboardSummary}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-3 py-2 text-xs font-semibold text-brand-dark"
              >
                <Database size={15} />
                Summary
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleInventoryFile(file);
                }}
              />
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask about stock, sales, customers, or tell me to update inventory..."
                className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-brand-30 bg-brand-60/45 px-3 py-3 text-sm text-brand-dark outline-none focus:border-brand-10/40 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={busy || !input.trim()}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-10 text-white transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-brand-dark/50">
              Write actions are limited to the current workspace and use Firebase dashboard services.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
};
