import { useMemo, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  CalendarSearch,
  CheckCircle2,
  ClipboardList,
  Coffee,
  CupSoda,
  Edit3,
  FileText,
  Info,
  History,
  IndianRupee,
  Plus,
  QrCode,
  ReceiptText,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Pizza,
  CakeSlice,
  Soup,
  IceCream,
  Apple,
  Utensils,
  Flame,
  Beef,
  Wine,
  Carrot,
  Fish,
  Drumstick,
} from 'lucide-react';
import type {
  CashRegisterMenuItem,
  CashRegisterMenuSize,
  CashRegisterCategorySuggestion,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  SalesInvoice,
  SalesInvoiceLineItem,
  WorkspaceProfile,
} from '../types';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { SalesInvoiceDetailModal } from '../components/SalesInvoiceDetailModal';
import { formatCurrency, formatDateTime } from '../utils';
import { printSalesInvoice } from '../invoicePrint';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type RegisterLine = {
  key: string;
  menuItemId: string;
  itemName: string;
  category: string;
  barcodeValue: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number;
};

type CashRegisterPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  billedBy: string;
  menuItems: CashRegisterMenuItem[];
  categorySuggestions: CashRegisterCategorySuggestion[];
  salesInvoices: SalesInvoice[];
  onSaveMenuItems: (
    items: Array<Omit<CashRegisterMenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }>,
  ) => Promise<void>;
  onUpdateMenuItem: (itemId: string, patch: Partial<CashRegisterMenuItem>) => Promise<void>;
  onDeleteMenuItem: (itemId: string) => Promise<void>;
  onFinalizeSale: (payload: {
    existingInvoiceId?: string;
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
    paymentMethod: InvoicePaymentMethod;
    taxRate: number;
    notes: string;
    billedBy: string;
    lineItems: SalesInvoiceLineItem[];
  }) => Promise<{
    invoiceId: string;
    invoiceNumber: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    lineItems: SalesInvoiceLineItem[];
    createdAt: string;
    updatedAt: string;
  }>;
  onSaveDraft: (payload: {
    draftId?: string;
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
    paymentMethod: InvoicePaymentMethod;
    taxRate: number;
    notes: string;
    billedBy: string;
    lineItems: SalesInvoiceLineItem[];
  }) => Promise<{
    invoiceId: string;
    invoiceNumber: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    lineItems: SalesInvoiceLineItem[];
    createdAt: string;
    updatedAt: string;
  }>;
  onDeleteDraft: (invoiceId: string) => Promise<void>;
  onSaveCategorySuggestion: (category: string) => Promise<void>;
};

type MenuItemInput = Omit<CashRegisterMenuItem, 'id' | 'createdAt' | 'updatedAt'>;

const categoryKeywords: Array<{ category: string; iconKey: string; words: string[] }> = [
  { category: 'Beverages', iconKey: 'cup', words: ['juice', 'drink', 'shake', 'smoothie', 'lassi', 'soda', 'water', 'tea', 'coffee', 'mosombi'] },
  { category: 'Food', iconKey: 'utensils', words: ['meal', 'rice', 'roti', 'dosa', 'idli', 'sandwich', 'burger', 'pizza', 'maggie', 'cake', 'biryani', 'biriyani', 'bowl'] },
  { category: 'Snacks', iconKey: 'pizza', words: ['snack', 'chips', 'fries', 'vada', 'samosa', 'toast', 'biscuit'] },
  { category: 'Services', iconKey: 'receipt', words: ['service', 'repair', 'cleaning', 'consultation', 'installation'] },
  { category: 'Personal Care', iconKey: 'shopping', words: ['soap', 'shampoo', 'cream', 'lotion', 'oil'] },
  { category: 'Electronics', iconKey: 'package', words: ['cable', 'charger', 'battery', 'phone', 'light'] },
];

const inferCategory = (name: string) => {
  const lowered = name.toLowerCase();
  return categoryKeywords.find((group) => group.words.some((word) => lowered.includes(word))) ?? {
    category: 'Other',
    iconKey: 'package',
  };
};

const inferIcon = (category: string, name: string) => {
  const c = category.toLowerCase();
  const n = name.toLowerCase();

  if (n.includes('cake') || c.includes('cake') || c.includes('bakery')) return CakeSlice;
  if (n.includes('soup') || c.includes('soup')) return Soup;
  if (n.includes('ice cream') || c.includes('ice cream') || c.includes('dessert')) return IceCream;
  if (n.includes('pizza') || c.includes('pizza')) return Pizza;
  if (n.includes('coffee') || n.includes('tea') || c.includes('coffee')) return Coffee;
  if (n.includes('juice') || n.includes('soda') || n.includes('drink') || c.includes('juice') || c.includes('beverage')) return CupSoda;
  if (n.includes('wine') || n.includes('beer') || n.includes('alcohol')) return Wine;
  
  if (n.includes('chicken') || n.includes('meat') || c.includes('meat') || n.includes('mutton') || c.includes('chicken')) return Drumstick;
  if (n.includes('beef') || n.includes('steak')) return Beef;
  if (n.includes('fish') || n.includes('seafood') || c.includes('seafood')) return Fish;
  if (n.includes('apple') || n.includes('fruit') || c.includes('fruit')) return Apple;
  if (n.includes('carrot') || n.includes('veg') || c.includes('vegetable')) return Carrot;
  if (n.includes('spicy') || n.includes('chilli')) return Flame;

  if (c.includes('rice') || n.includes('rice') || n.includes('biryani') || n.includes('biriyani') || n.includes('meal') || n.includes('bowl')) return Utensils;
  if (c.includes('food') || c.includes('menu')) return UtensilsCrossed;
  if (c.includes('service') || c.includes('billing')) return ReceiptText;
  if (c.includes('grocery') || c.includes('shopping')) return ShoppingBag;

  return Package;
};

const parsePrice = (value: string) => {
  const match = value.replace(/,/g, '').match(/(?:rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : 0;
};

const bytesToBinaryString = (bytes: Uint8Array) => {
  let output = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return output;
};

const decodePdfLiteral = (value: string) =>
  value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const replacements: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '(': '(',
        ')': ')',
        '\\': '\\',
      };
      return replacements[escaped] ?? escaped;
    })
    .replace(/\\\r?\n/g, '')
    .replace(/\\(\d{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));

const decodePdfHex = (value: string) => {
  const clean = value.replace(/\s+/g, '');
  if (!clean) return '';
  const bytes = clean.match(/.{1,2}/g)?.map((byte) => parseInt(byte.padEnd(2, '0'), 16)) ?? [];
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = '';
    for (let index = 2; index < bytes.length; index += 2) {
      output += String.fromCharCode(((bytes[index] ?? 0) << 8) + (bytes[index + 1] ?? 0));
    }
    return output;
  }
  return String.fromCharCode(...bytes);
};

const extractTextOperators = (content: string) => {
  const matches: string[] = [];
  const literalPattern = /\((?:\\.|[^\\)])*\)\s*T[jJ]/g;
  const arrayPattern = /\[((?:\s*(?:\((?:\\.|[^\\)])*\)|<[\da-fA-F\s]+>|-?\d+(?:\.\d+)?))+)\s*\]\s*TJ/g;
  const hexPattern = /<([\da-fA-F\s]+)>\s*T[jJ]/g;

  for (const match of content.matchAll(literalPattern)) {
    matches.push(decodePdfLiteral(match[0].replace(/\s*T[jJ]\s*$/, '').slice(1, -1)));
  }

  for (const match of content.matchAll(arrayPattern)) {
    const arrayContent = match[1] ?? '';
    const chunks: string[] = [];
    for (const part of arrayContent.matchAll(/\((?:\\.|[^\\)])*\)|<[\da-fA-F\s]+>/g)) {
      const token = part[0];
      chunks.push(token.startsWith('<') ? decodePdfHex(token.slice(1, -1)) : decodePdfLiteral(token.slice(1, -1)));
    }
    matches.push(chunks.join(''));
  }

  for (const match of content.matchAll(hexPattern)) {
    matches.push(decodePdfHex(match[1] ?? ''));
  }

  return matches
    .join('\n')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const inflatePdfStream = async (bytes: Uint8Array) => {
  if (!('DecompressionStream' in window)) return '';
  try {
    const streamBytes = bytes.slice();
    const stream = new Blob([streamBytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return await new Response(stream).text();
  } catch {
    return '';
  }
};

const extractPdfText = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const binary = bytesToBinaryString(bytes);
  const chunks = [extractTextOperators(binary)];
  const streamPattern = /<<[\s\S]*?\/FlateDecode[\s\S]*?>>\s*stream\r?\n/g;

  for (const match of binary.matchAll(streamPattern)) {
    const streamStart = (match.index ?? 0) + match[0].length;
    const streamEnd = binary.indexOf('endstream', streamStart);
    if (streamEnd <= streamStart) continue;
    const inflated = await inflatePdfStream(bytes.subarray(streamStart, streamEnd));
    if (inflated) chunks.push(extractTextOperators(inflated));
  }

  return chunks
    .filter(Boolean)
    .join('\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

const parseMenuText = (text: string, defaultTaxRate: number) => {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return rows
    .map((line, index) => {
      const parts = line
        .split(/[,|\t-]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      const pricePart = [...parts].reverse().find((part) => /\d/.test(part)) || line;
      const price = parsePrice(pricePart);
      const name = (parts.find((part) => part !== pricePart && !/small|medium|large|regular/i.test(part)) || line.replace(pricePart, '')).trim();
      if (!name || !price) return null;

      const inferred = inferCategory(name);
      const hasSizeWords = /small|medium|large|regular/i.test(line);
      const sizes: CashRegisterMenuSize[] = hasSizeWords
        ? [{ id: `size-${index}-regular`, label: parts.find((part) => /small|medium|large|regular/i.test(part)) || 'Regular', price }]
        : [];

      return {
        name,
        category: inferred.category,
        description: '',
        price,
        taxRate: defaultTaxRate,
        barcodeValue: '',
        iconKey: inferred.iconKey,
        active: true,
        sortHint: 0,
        sizes,
      };
    })
    .filter((item): item is Omit<CashRegisterMenuItem, 'id' | 'createdAt' | 'updatedAt'> => Boolean(item));
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const humanizeHeader = (value: string) =>
  value
    .replace(/^price_?/i, '')
    .replace(/_?(inr|usd|rs)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\boz\b/i, 'oz')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseCsvMenu = (text: string, defaultTaxRate: number): MenuItemInput[] => {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(parseCsvLine);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (candidates: string[]) => {
    const exactMatch = headers.findIndex((header) => candidates.includes(header));
    if (exactMatch >= 0) return exactMatch;
    return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
  };
  const nameIndex = findIndex(['item_name', 'name', 'item', 'product_name', 'product', 'service_name']);
  const categoryIndex = findIndex(['category', 'department', 'section', 'menu_type', 'type']);
  const descriptionIndex = findIndex(['description', 'ingredients', 'details', 'composition', 'made_of']);
  const brandIndex = findIndex(['brand', 'company']);
  const priceIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => /^price/.test(header) || /(^|_)mrp$/.test(header) || /(^|_)rate$/.test(header) || /(^|_)amount$/.test(header));

  if (nameIndex < 0 || !priceIndexes.length) return [];

  return rows.slice(1).map((row, rowIndex) => {
    const name = row[nameIndex]?.trim();
    if (!name) return null;
    const category = row[categoryIndex]?.trim() || row[findIndex(['menu_type'])]?.trim() || inferCategory(name).category;
    const brand = brandIndex >= 0 ? row[brandIndex]?.trim() : '';
    const description = [brand ? `Brand: ${brand}` : '', descriptionIndex >= 0 ? row[descriptionIndex]?.trim() : ''].filter(Boolean).join('\n');
    const prices = priceIndexes
      .map(({ header, index }) => {
        const rawPrice = parsePrice(row[index] || '');
        if (!rawPrice) return null;
        const multiplier = header.includes('usd') ? 83 : 1;
        return {
          header,
          label: humanizeHeader(header) || 'Regular',
          price: Math.round(rawPrice * multiplier),
        };
      })
      .filter((price): price is { header: string; label: string; price: number } => Boolean(price));
    if (!prices.length) return null;
    const inferred = inferCategory(name);
    return {
      name,
      category: category || inferred.category,
      description,
      price: prices[0].price,
      taxRate: defaultTaxRate,
      barcodeValue: '',
      iconKey: inferred.iconKey,
      active: true,
      sortHint: 0,
      sizes: prices.length > 1 ? prices.map((price, index) => ({ id: `csv-${rowIndex}-${index}`, label: price.label, price: price.price })) : [],
    };
  }).filter((item): item is MenuItemInput => Boolean(item));
};

const looksLikeCsvMenu = (text: string) => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine || !firstLine.includes(',')) return false;
  const headers = parseCsvLine(firstLine).map(normalizeHeader);
  const hasNameColumn = headers.some((header) => ['item_name', 'name', 'item', 'product_name', 'product', 'service_name'].includes(header));
  const hasPriceColumn = headers.some((header) => /^price/.test(header) || ['mrp', 'rate', 'amount'].includes(header));
  return hasNameColumn && hasPriceColumn;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const cleanJsonText = (value: string) =>
  value
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

const normalizeAiMenuItems = (value: unknown, defaultTaxRate: number): MenuItemInput[] => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'object' && value && Array.isArray((value as { items?: unknown[] }).items)
      ? (value as { items: unknown[] }).items
      : [];

  return source
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Partial<MenuItemInput> & { sizes?: unknown[] };
      const name = String(item.name || '').trim();
      const price = Number(item.price || 0);
      if (!name || !price) return null;
      const inferred = inferCategory(name);
      const sizes = Array.isArray(item.sizes)
        ? item.sizes
            .map((size, sizeIndex) => {
              if (!size || typeof size !== 'object') return null;
              const nextSize = size as Partial<CashRegisterMenuSize>;
              const label = String(nextSize.label || '').trim();
              const nextPrice = Number(nextSize.price || 0);
              if (!label || !nextPrice) return null;
              return {
                id: String(nextSize.id || `ai-size-${index}-${sizeIndex}`),
                label,
                price: nextPrice,
              };
            })
            .filter((size): size is CashRegisterMenuSize => Boolean(size))
        : [];

      return {
        name,
        category: String(item.category || inferred.category).trim() || inferred.category,
        description: String(item.description || '').trim(),
        price,
        taxRate: Number(item.taxRate ?? defaultTaxRate),
        barcodeValue: String(item.barcodeValue || '').trim(),
        iconKey: ['cup', 'coffee', 'receipt'].includes(String(item.iconKey)) ? String(item.iconKey) : inferred.iconKey,
        active: item.active ?? true,
        sortHint: Number(item.sortHint ?? 0),
        sizes,
      };
    })
    .filter((item): item is MenuItemInput => Boolean(item));
};

const generateMenuItemsWithAi = async ({
  file,
  text,
  defaultTaxRate,
}: {
  file: File | null;
  text: string;
  defaultTaxRate: number;
}) => {
  if (!ai) {
    throw new Error('Gemini API key is missing. Add VITE_GEMINI_API_KEY and restart the dev server.');
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    {
      text: `You are an AI product and menu extraction engine for PULA Biz cash register in the Indian market.

Read the uploaded price list, product catalogue, service menu, restaurant menu, retail bill sheet, or pasted text and return ONLY valid JSON. Do not include markdown.

Return this shape:
{"items":[{"name":"Example Item","category":"Beverages","description":"Ingredients or product details from the source file.","price":60,"taxRate":${defaultTaxRate},"barcodeValue":"","iconKey":"cup","active":true,"sortHint":0,"sizes":[{"id":"small","label":"Small","price":60},{"id":"large","label":"Large","price":90}]}]}

Rules:
- Extract every sellable product, service, or menu item with INR prices.
- If an item has sizes like Small, Medium, Large, keep one item and put prices in sizes.
- If there is only one price, use price and leave sizes empty.
- For CSV/table data, use item_name/name/product columns as item names. Never create items from brand, source_page, category header, or menu_type header values.
- Put ingredients, composition, service scope, material, model notes, or product explanation into description.
- If columns are named like price_16_oz_usd, price_20_oz_usd, or price_24_oz_usd, keep one item and convert those columns into size options.
- Group categories sensibly for any Indian business. Prefer broad reusable categories like Grocery, Food, Beverages, Snacks, Dairy, Bakery, Personal Care, Household, Electronics, Services, Add-ons, Combos, Other unless the document clearly has better category headings.
- Use iconKey only from: cup, coffee, receipt.
- barcodeValue should be empty unless a barcode is explicitly present.
- active must be true.
- taxRate should be ${defaultTaxRate} unless the menu clearly says otherwise.
- Ignore headings, addresses, taxes, phone numbers, page numbers, source pages, and decorative text.

Pasted/extracted text:
${text.trim() || '(No extracted text. Use the uploaded file content.)'}`,
    },
  ];

  if (file) {
    parts.push({
      inlineData: {
        data: await fileToBase64(file),
        mimeType: file.type || (file.name.match(/\.pdf$/i) ? 'application/pdf' : 'text/plain'),
      },
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
  });
  const responseText = response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  const parsed = JSON.parse(cleanJsonText(responseText));
  return normalizeAiMenuItems(parsed, defaultTaxRate);
};

const getSoldCount = (item: CashRegisterMenuItem, invoices: SalesInvoice[]) =>
  invoices
    .filter((invoice) => invoice.status === 'finalized')
    .reduce(
      (sum, invoice) =>
        sum +
        invoice.lineItems
          .filter((line) => line.inventoryItemId === `cash-${item.id}` || line.itemName.startsWith(item.name))
          .reduce((lineSum, line) => lineSum + line.quantity, 0),
      0,
    );

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const CashRegisterPage = ({
  companyName,
  businessProfile,
  billedBy,
  menuItems,
  categorySuggestions,
  salesInvoices,
  onSaveMenuItems,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onFinalizeSale,
  onSaveDraft,
  onDeleteDraft,
  onSaveCategorySuggestion,
}: CashRegisterPageProps) => {
  const [uploadText, setUploadText] = useState('');
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [readingMenuFile, setReadingMenuFile] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<CashRegisterMenuItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<RegisterLine[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in customer');
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>(businessProfile.billingDefaults.defaultPaymentMethod || 'upi');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>(businessProfile.billingDefaults.defaultPaymentStatus || 'paid');
  const [notes, setNotes] = useState('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [showQr, setShowQr] = useState(false);

  const activeItems = useMemo(
    () =>
      menuItems
        .filter((item) => item.active)
        .map((item) => ({ item, soldCount: getSoldCount(item, salesInvoices) }))
        .sort((left, right) => right.soldCount - left.soldCount || right.item.sortHint - left.item.sortHint || left.item.name.localeCompare(right.item.name)),
    [menuItems, salesInvoices],
  );

  const categories = useMemo(() => ['All', ...Array.from(new Set(activeItems.map(({ item }) => item.category)))], [activeItems]);
  const allCategorySuggestions = useMemo(
    () =>
      Array.from(
        new Set([
          ...categorySuggestions.map((category) => category.name),
          ...menuItems.map((item) => item.category),
        ].map((category) => category.trim()).filter(Boolean)),
      ),
    [categorySuggestions, menuItems],
  );
  const defaultTaxRate = businessProfile.billingDefaults.defaultTaxRate;
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const taxAmount = Number(((subtotal * defaultTaxRate) / 100).toFixed(2));
  const totalAmount = subtotal + taxAmount;
  const upiId = businessProfile.billingDefaults.defaultUpiId || '';
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent(companyName || businessProfile.companyName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Cash register sale')}`;
  const upiQrUrl = upiId.trim() && totalAmount > 0
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`
    : '';

  const filteredItems = activeItems.filter(({ item }) => {
    const lowered = query.trim().toLowerCase();
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesQuery = !lowered || item.name.toLowerCase().includes(lowered) || item.category.toLowerCase().includes(lowered) || item.barcodeValue.toLowerCase().includes(lowered);
    return matchesCategory && matchesQuery;
  });

  const registerInvoices = useMemo(
    () =>
      salesInvoices
        .filter((invoice) => invoice.status === 'finalized')
        .filter((invoice) => invoice.lineItems.some((line) => line.inventoryItemId.startsWith('cash-')))
        .filter((invoice) => {
          const created = new Date(invoice.createdAt).getTime();
          const now = new Date();
          if (historyFilter === 'today') return created >= startOfDay(now);
          if (historyFilter === 'week') return created >= Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (historyFilter === 'month') return created >= Date.now() - 30 * 24 * 60 * 60 * 1000;
          return true;
        })
        .filter((invoice) => {
          const lowered = historyQuery.trim().toLowerCase();
          return !lowered || invoice.invoiceNumber.toLowerCase().includes(lowered) || invoice.customerName.toLowerCase().includes(lowered);
        }),
    [historyFilter, historyQuery, salesInvoices],
  );
  const registerDrafts = useMemo(
    () =>
      salesInvoices
        .filter((invoice) => invoice.status === 'draft')
        .filter((invoice) => invoice.lineItems.some((line) => line.inventoryItemId.startsWith('cash-')))
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [salesInvoices],
  );

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setReadingMenuFile(true);
    try {
      setMenuFile(file);
      if (file.type === 'application/pdf' || file.name.match(/\.pdf$/i)) {
        const extractedText = await extractPdfText(file);
        setUploadText(extractedText);
        if (!extractedText.trim()) {
          setUploadError('No selectable text found locally. The AI will still try to read the uploaded PDF when you generate.');
        }
        return;
      }

      if (file.type.startsWith('image/')) {
        setUploadText('');
        setUploadError('Image menu uploaded. The AI will read it when you generate.');
        return;
      }

      if (!file.type.startsWith('text/') && !file.name.match(/\.(csv|txt)$/i)) {
        setUploadError('Upload a PDF, image, text, or CSV menu.');
        setMenuFile(null);
        return;
      }

      setUploadText(await file.text());
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to read this menu file.');
    } finally {
      setReadingMenuFile(false);
    }
  };

  const importMenu = async () => {
    const csvParsed = uploadText.trim() && (menuFile?.name.match(/\.csv$/i) || looksLikeCsvMenu(uploadText))
      ? parseCsvMenu(uploadText, defaultTaxRate)
      : [];
    if (csvParsed.length) {
      setSavingMenu(true);
      try {
        await onSaveMenuItems(csvParsed);
        setUploadText('');
        setMenuFile(null);
        setUploadError(null);
      } finally {
        setSavingMenu(false);
      }
      return;
    }

    if (!apiKey || !ai) {
      setUploadError('Gemini API key is missing. Add VITE_GEMINI_API_KEY, restart the dev server, and this upload will use real AI.');
      return;
    }

    let parsed: MenuItemInput[] = [];
    try {
      parsed = await generateMenuItemsWithAi({ file: menuFile, text: uploadText, defaultTaxRate });
    } catch (error) {
      console.error(error);
      parsed = parseMenuText(uploadText, defaultTaxRate);
      if (!parsed.length) {
        setUploadError(error instanceof Error ? error.message : 'AI could not read this menu.');
        return;
      }
    }

    if (!parsed.length) {
      setUploadError('AI could not find item names with prices. Try a clearer file or paste lines like "Mosambi Juice, Small, 60".');
      return;
    }
    setSavingMenu(true);
    try {
      await onSaveMenuItems(parsed);
      setUploadText('');
      setMenuFile(null);
      setUploadError(null);
    } finally {
      setSavingMenu(false);
    }
  };

  const addToCart = (item: CashRegisterMenuItem, size?: CashRegisterMenuSize) => {
    const sizeLabel = size?.label || '';
    const key = `${item.id}:${sizeLabel || 'regular'}`;
    const unitPrice = size?.price ?? item.price;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...current,
        {
          key,
          menuItemId: item.id,
          itemName: sizeLabel ? `${item.name} (${sizeLabel})` : item.name,
          category: item.category,
          barcodeValue: item.barcodeValue,
          sizeLabel,
          quantity: 1,
          unitPrice,
        },
      ];
    });
  };

  const updateQuantity = (key: string, quantity: number) => {
    setCart((current) => current.map((line) => (line.key === key ? { ...line, quantity } : line)).filter((line) => line.quantity > 0));
  };

  const buildLineItems = () =>
    cart.map((line) => ({
      inventoryItemId: `cash-${line.menuItemId}`,
      barcodeValue: line.barcodeValue,
      itemName: line.itemName,
      sku: line.category,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineSubtotal: line.unitPrice * line.quantity,
    }));

  const resetBill = () => {
    setActiveDraftId(null);
    setCart([]);
    setCustomerName('Walk-in customer');
    setNotes('');
    setInvoiceError(null);
  };

  const loadDraft = (invoice: SalesInvoice) => {
    setActiveDraftId(invoice.id);
    setCustomerName(invoice.customerName);
    setPaymentStatus(invoice.paymentStatus);
    setPaymentMethod(invoice.paymentMethod);
    setNotes(invoice.notes);
    setCart(invoice.lineItems.map((line, index) => {
      const menuItemId = line.inventoryItemId.replace(/^cash-/, '') || `draft-${index}`;
      return {
        key: `${menuItemId}:${index}`,
        menuItemId,
        itemName: line.itemName,
        category: line.sku || 'Other',
        barcodeValue: line.barcodeValue,
        sizeLabel: '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      };
    }));
    setHistoryOpen(false);
  };

  const saveDraft = async () => {
    if (!cart.length) {
      setInvoiceError('Add at least one item before saving a draft.');
      return;
    }
    setFinalizing(true);
    setInvoiceError(null);
    try {
      const result = await onSaveDraft({
        draftId: activeDraftId || undefined,
        customerName,
        paymentStatus,
        paymentMethod,
        taxRate: defaultTaxRate,
        notes,
        billedBy,
        lineItems: buildLineItems(),
      });
      setActiveDraftId(result.invoiceId);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Unable to save this draft.');
    } finally {
      setFinalizing(false);
    }
  };

  const finalizeSale = async () => {
    if (!cart.length) {
      setInvoiceError('Add at least one menu item before generating the invoice.');
      return;
    }
    setFinalizing(true);
    setInvoiceError(null);
    try {
      const result = await onFinalizeSale({
        existingInvoiceId: activeDraftId || undefined,
        customerName,
        paymentStatus,
        paymentMethod,
        taxRate: defaultTaxRate,
        notes,
        billedBy,
        lineItems: buildLineItems(),
      });

      if (businessProfile.billingDefaults.physicalInvoicePrintingEnabled) {
        printSalesInvoice(
          {
            id: result.invoiceId,
            invoiceNumber: result.invoiceNumber,
            status: 'finalized',
            businessBarcodeKey: '',
            customerName,
            paymentStatus,
            paymentMethod,
            lineItems: result.lineItems,
            subtotal: result.subtotal,
            taxRate: defaultTaxRate,
            taxAmount: result.taxAmount,
            totalAmount: result.totalAmount,
            notes,
            billedBy,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
          },
          companyName,
          businessProfile,
          {
            autoPrint: true,
            compactReceipt: true,
            paperWidth: businessProfile.billingDefaults.printerPaperWidth || '80mm',
          },
        );
      }

      resetBill();
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Unable to finalize this cash register sale.');
    } finally {
      setFinalizing(false);
    }
  };

  if (!menuItems.length) {
    return (
      <section className="min-h-[calc(100vh-8rem)] rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
            <Sparkles size={14} />
            AI cash register setup
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            Upload your menu to create the register buttons
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
            Paste a store menu, service list, catalogue, or upload a PDF, image, CSV, or text file. PULA Biz uses Gemini to read item names and prices, group them into sensible categories, and create tappable billing buttons.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-30 bg-brand-60/25 p-6 text-center">
              <Upload size={32} className="text-brand-10" />
              <span className="mt-3 text-sm font-semibold text-brand-dark">{readingMenuFile ? 'Reading menu...' : 'Upload menu PDF, image, text or CSV'}</span>
              <span className="mt-1 text-xs leading-5 text-brand-dark/55">Gemini reads PDFs and images, then creates register buttons.</span>
              {menuFile ? <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-dark">{menuFile.name}</span> : null}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,application/pdf,image/*,text/plain,text/csv" className="sr-only" onChange={(event) => event.target.files?.[0] && void handleFileUpload(event.target.files[0])} />
            </label>
            <div>
              <textarea
                value={uploadText}
                onChange={(event) => setUploadText(event.target.value)}
                placeholder={'Mosambi Juice, Small, 60\nMosambi Juice, Large, 90\nCold Coffee, Regular, 80\nVeg Sandwich, 70'}
                className="h-64 w-full rounded-[28px] border border-brand-30 bg-brand-60/20 px-5 py-4 text-sm leading-6 text-brand-dark outline-none"
              />
              {uploadError ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{uploadError}</div> : null}
              <button
                type="button"
                onClick={() => void importMenu()}
                disabled={savingMenu || readingMenuFile || (!uploadText.trim() && !menuFile)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-10/20 disabled:opacity-60"
              >
                <Sparkles size={16} />
                {savingMenu ? 'Asking AI...' : 'Generate cash register with AI'}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-[28px] border border-brand-30 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-dark">
                <ReceiptText size={14} />
                Digital cash register
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">Tap items, collect payment, generate invoice.</h1>
              <p className="mt-1 text-sm leading-6 text-brand-dark/65">
                Fast counter billing with AI-sorted buttons, size choices, UPI support, drafts, and invoice history.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCustomizeOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
                <Edit3 size={16} />
                Customize items
              </button>
              <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-10 px-3 py-2 text-sm font-semibold text-white">
                <History size={16} />
                Invoice history
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu item or barcode" className="w-full rounded-xl border border-brand-30 bg-brand-60/25 py-2.5 pl-11 pr-4 text-sm text-brand-dark outline-none" />
            </label>
            <div className="flex shrink-0 items-center">
              <select 
                value={activeCategory} 
                onChange={(event) => setActiveCategory(event.target.value)} 
                className="w-full lg:w-auto min-w-[140px] rounded-xl border border-brand-30 bg-white px-3 py-2.5 text-sm font-semibold text-brand-dark outline-none"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
            {filteredItems.map(({ item }) => {
              const Icon = inferIcon(item.category, item.name);
              const sizeOptions = item.sizes.length ? item.sizes : [{ id: 'regular', label: '', price: item.price }];
              return (
                <article key={item.id} className="rounded-2xl border border-brand-30 bg-brand-60/20 p-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => addToCart(item, item.sizes[0])} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-brand-10">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-semibold text-brand-dark">{item.name}</h3>
                          <p className="truncate text-[10px] uppercase tracking-[0.05em] text-brand-dark/45">{item.category}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand-dark pr-1">
                          <IndianRupee size={12} />
                          {formatCurrency(item.price)}
                        </div>
                      </div>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedMenuItem(item)}
                        className="rounded-full border border-brand-30 bg-white p-1.5 text-brand-dark"
                        aria-label={`View details for ${item.name}`}
                      >
                        <Info size={12} />
                      </button>
                    </div>
                  </div>
                  {sizeOptions.length > 1 || item.sizes.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sizeOptions.map((size) => (
                        <button key={size.id} type="button" onClick={() => addToCart(item, size)} className="rounded-full border border-brand-30 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-dark">
                          {size.label || 'Regular'} - {formatCurrency(size.price)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="flex w-full min-w-0 flex-col rounded-[28px] border border-brand-30 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">Current bill</h2>
              <p className="mt-0.5 text-xs text-brand-dark/55">Preview, payment and invoice generation.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowQr(true)} className="rounded-full p-2 text-brand-dark/60 transition-colors hover:bg-brand-60" aria-label="Show QR Code">
                <QrCode size={18} />
              </button>
              <button type="button" onClick={resetBill} className="rounded-full p-2 text-rose-600 transition-colors hover:bg-rose-50" aria-label="Clear bill">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          {activeDraftId ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Editing saved draft. Finalizing will convert this draft into an invoice.
            </div>
          ) : null}
          {registerDrafts.length ? (
            <button type="button" onClick={() => setHistoryOpen(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-brand-60/30 px-4 py-3 text-sm font-semibold text-brand-dark">
              <ClipboardList size={16} />
              Review {registerDrafts.length} draft{registerDrafts.length === 1 ? '' : 's'}
            </button>
          ) : null}

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {cart.length ? (
              cart.map((line) => (
                <div key={line.key} className="flex items-center justify-between gap-2 rounded-xl border border-brand-30 bg-brand-60/20 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-brand-dark">{line.itemName}</div>
                    <div className="text-[10px] text-brand-dark/50">{formatCurrency(line.unitPrice)} each</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-30 bg-white p-0.5">
                      <button type="button" onClick={() => updateQuantity(line.key, line.quantity - 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-60 text-xs font-bold">-</button>
                      <span className="min-w-4 text-center text-xs font-semibold">{line.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(line.key, line.quantity + 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-60 text-xs font-bold">+</button>
                    </div>
                    <div className="w-10 text-right text-xs font-bold text-brand-dark">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </div>
                    <button type="button" onClick={() => updateQuantity(line.key, 0)} className="text-rose-600">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-30 bg-brand-60/15 px-4 py-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-10">
                  <ClipboardList size={18} />
                </div>
                <div className="mt-2 text-sm font-semibold text-brand-dark">No items selected</div>
                <p className="mt-1 text-xs leading-5 text-brand-dark/60">Tap a menu button to add it here.</p>
              </div>
            )}
          </div>

          <div className="mt-3 shrink-0 rounded-2xl border border-brand-30 bg-brand-10 p-3 text-white">
            <div className="flex justify-between text-xs"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <div className="mt-1.5 flex justify-between text-xs"><span>GST estimate ({defaultTaxRate}%)</span><strong>{formatCurrency(taxAmount)}</strong></div>
            <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-lg font-semibold"><span>Total</span><strong>{formatCurrency(totalAmount)}</strong></div>
          </div>

          <div className="mt-3 shrink-0">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Invoice note" className="min-h-12 w-full rounded-xl border border-brand-30 bg-brand-60/25 px-3 py-2.5 text-sm outline-none" />
          </div>

          {paymentMethod === 'upi' && upiId.trim() ? (
            <div className="mt-3 shrink-0 rounded-2xl border border-brand-30 bg-brand-60/25 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-dark"><QrCode size={15} /> Scan to Pay</div>
              <div className="mt-2 rounded-xl bg-white p-2 shadow-sm inline-block">
                {upiQrUrl ? (
                  <img src={upiQrUrl} alt="UPI payment QR code" className="h-28 w-28 object-contain" />
                ) : null}
              </div>
            </div>
          ) : null}

          {invoiceError ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{invoiceError}</div> : null}

          <div className="sticky bottom-0 mt-3 grid shrink-0 gap-2 bg-white/95 pt-2 backdrop-blur grid-cols-2">
            <button type="button" onClick={() => void saveDraft()} disabled={finalizing || !cart.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-30 bg-[#DFE7F0] px-3 py-3.5 text-sm font-semibold text-brand-dark shadow-sm hover:bg-[#cdd8e6] disabled:bg-slate-50 disabled:text-brand-dark/45 disabled:opacity-100">
              <Save size={16} />
              {activeDraftId ? 'Update draft' : 'Save draft'}
            </button>
            <button type="button" onClick={() => void finalizeSale()} disabled={finalizing || !cart.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-10 px-3 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-10/25 hover:bg-brand-10/90 disabled:bg-brand-dark/25 disabled:text-white disabled:opacity-100">
              <CheckCircle2 size={16} />
              {finalizing ? 'Working...' : activeDraftId ? 'Finalize draft' : 'Generate invoice'}
            </button>
          </div>
        </aside>
      </div>

      {customizeOpen ? (
        <CustomizeMenuModal
          items={menuItems}
          categorySuggestions={allCategorySuggestions}
          defaultTaxRate={defaultTaxRate}
          onClose={() => setCustomizeOpen(false)}
          onSave={onSaveMenuItems}
          onUpdate={onUpdateMenuItem}
          onDelete={onDeleteMenuItem}
          onSaveCategorySuggestion={onSaveCategorySuggestion}
        />
      ) : null}

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
          <div className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4">
              <div>
                <h2 className="text-2xl font-semibold text-brand-dark">Cash register invoices</h2>
                <p className="mt-1 text-sm text-brand-dark/60">Filter invoices, review drafts, and continue saved bills.</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <label className="relative flex-1">
                  <CalendarSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" />
                  <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search invoice or customer" className="w-full rounded-2xl border border-brand-30 bg-brand-60/25 py-3 pl-11 pr-4 text-sm outline-none" />
                </label>
                <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm outline-none">
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="mt-4 overflow-x-auto">
                {registerDrafts.length ? (
                  <div className="mb-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-amber-900">Draft invoices</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {registerDrafts.map((invoice) => (
                        <div key={invoice.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                          <button type="button" onClick={() => loadDraft(invoice)} className="w-full text-left">
                            <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                            <div className="mt-1 text-sm text-brand-dark/65">{invoice.customerName} - {formatCurrency(invoice.totalAmount)}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-brand-dark/45">Updated {formatDateTime(invoice.updatedAt)}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete draft ${invoice.invoiceNumber}?`)) void onDeleteDraft(invoice.id);
                            }}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                          >
                            <Trash2 size={14} />
                            Delete draft
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                      {['Invoice', 'Date', 'Customer', 'Payment', 'Total'].map((label) => <th key={label} className="border-b border-brand-30 px-4 py-3">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {registerInvoices.map((invoice) => (
                      <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer hover:bg-brand-60/25">
                        <td className="border-b border-brand-30 px-4 py-3 font-semibold text-brand-dark">{invoice.invoiceNumber}</td>
                        <td className="border-b border-brand-30 px-4 py-3 text-sm">{formatDateTime(invoice.createdAt)}</td>
                        <td className="border-b border-brand-30 px-4 py-3 text-sm">{invoice.customerName}</td>
                        <td className="border-b border-brand-30 px-4 py-3 text-sm capitalize">{invoice.paymentMethod.replace('_', ' ')}</td>
                        <td className="border-b border-brand-30 px-4 py-3 text-sm font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!registerInvoices.length ? <EmptyStatePanel icon={FileText} title="No invoices found" description="Try another filter or generate the first cash register invoice." /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMenuItem ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-xl rounded-[28px] border border-brand-30 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark/45">{selectedMenuItem.category}</p>
                <h2 className="mt-1 text-2xl font-semibold text-brand-dark">{selectedMenuItem.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedMenuItem(null)} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-4 text-sm text-brand-dark">
              <div className="rounded-2xl border border-brand-30 bg-brand-60/20 p-4">
                <div className="font-semibold">What it is made of / details</div>
                <p className="mt-2 whitespace-pre-line leading-6 text-brand-dark/70">
                  {selectedMenuItem.description.trim() || 'No details added yet. Add ingredients, materials, service scope, or product notes from Customize items.'}
                </p>
              </div>
              <div className="rounded-2xl border border-brand-30 bg-white p-4">
                <div className="font-semibold">Prices</div>
                <div className="mt-3 grid gap-2">
                  {(selectedMenuItem.sizes.length ? selectedMenuItem.sizes : [{ id: 'regular', label: 'Regular', price: selectedMenuItem.price }]).map((size) => (
                    <div key={size.id} className="flex justify-between rounded-xl bg-brand-60/25 px-3 py-2">
                      <span>{size.label || 'Regular'}</span>
                      <strong>{formatCurrency(size.price)}</strong>
                    </div>
                  ))}
                </div>
              </div>
              {selectedMenuItem.barcodeValue ? (
                <div className="rounded-2xl border border-brand-30 bg-brand-60/20 p-4">
                  <div className="font-semibold">Barcode</div>
                  <p className="mt-2 break-all text-brand-dark/70">{selectedMenuItem.barcodeValue}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/45 p-4 sm:p-6" onClick={() => setShowQr(false)}>
          <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-brand-30 px-5 py-4">
              <h2 className="text-xl font-semibold text-brand-dark">Pay with UPI</h2>
              <button type="button" onClick={() => setShowQr(false)} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark hover:bg-brand-60">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              {businessProfile.billingDefaults.defaultUpiId ? (
                <>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${businessProfile.billingDefaults.defaultUpiId}&pn=${encodeURIComponent(companyName)}`} alt="UPI QR" className="h-48 w-48 rounded-xl mix-blend-multiply" />
                  <p className="mt-5 text-sm font-semibold tracking-wide text-brand-dark">{businessProfile.billingDefaults.defaultUpiId}</p>
                  <p className="mt-1 text-xs text-brand-dark/60 text-center">Scan to pay with any UPI app</p>
                </>
              ) : (
                <div className="text-center text-sm text-brand-dark/60">
                  <QrCode size={48} className="mx-auto mb-4 text-brand-dark/30" />
                  Set UPI ID in your business settings to display a QR code here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SalesInvoiceDetailModal open={!!selectedInvoice} invoice={selectedInvoice} companyName={companyName} businessProfile={businessProfile} onClose={() => setSelectedInvoice(null)} />
    </>
  );
};

const CategoryPicker = ({
  value,
  onChange,
  onCommit,
  suggestions,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onCommit?: (val: string) => void;
  suggestions: string[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const normalizedValue = value.trim().toLowerCase();
  
  const options = Array.from(new Set(suggestions)).filter(Boolean);
  const filtered = options.filter((s) => s.toLowerCase().includes(normalizedValue));
  const displayOptions = normalizedValue ? filtered : options;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Delay closing so click events on suggestions can fire
          setTimeout(() => {
            setOpen(false);
            if (e.target.value.trim()) {
              onCommit?.(e.target.value);
            }
          }, 150);
        }}
        placeholder="Type or select category..."
        className={className}
      />
      {open && displayOptions.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-brand-30 bg-white py-1 shadow-xl">
          {displayOptions.map((opt) => (
            <li
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                onChange(opt);
                onCommit?.(opt);
                setOpen(false);
              }}
              className="cursor-pointer px-4 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-60"
            >
              {opt}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const ExistingCategoryPicker = ({
  item,
  suggestions,
  onUpdate,
  onSaveCategorySuggestion,
}: {
  item: CashRegisterMenuItem;
  suggestions: string[];
  onUpdate: (id: string, patch: Partial<CashRegisterMenuItem>) => void;
  onSaveCategorySuggestion: (category: string) => void;
}) => {
  const [val, setVal] = useState(item.category);
  return (
    <CategoryPicker
      value={val}
      onChange={setVal}
      onCommit={(newCat) => {
        const category = newCat.trim();
        if (!category) return;
        void onUpdate(item.id, { category });
        void onSaveCategorySuggestion(category);
      }}
      suggestions={suggestions}
      className="w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-sm outline-none"
    />
  );
};

const CustomizeMenuModal = ({
  items,
  categorySuggestions,
  defaultTaxRate,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onSaveCategorySuggestion,
}: {
  items: CashRegisterMenuItem[];
  categorySuggestions: string[];
  defaultTaxRate: number;
  onClose: () => void;
  onSave: CashRegisterPageProps['onSaveMenuItems'];
  onUpdate: CashRegisterPageProps['onUpdateMenuItem'];
  onDelete: CashRegisterPageProps['onDeleteMenuItem'];
  onSaveCategorySuggestion: CashRegisterPageProps['onSaveCategorySuggestion'];
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const addItem = async () => {
    const price = Number(newItemPrice);
    if (!newItemName.trim() || !price) return;
    const inferred = inferCategory(newItemName);
    setSaving(true);
    try {
      await onSave([{
        name: newItemName.trim(),
        category: newItemCategory.trim() || inferred.category,
        description: '',
        price,
        taxRate: defaultTaxRate,
        barcodeValue: '',
        iconKey: inferred.iconKey,
        active: true,
        sortHint: 0,
        sizes: [],
      }]);
      await onSaveCategorySuggestion(newItemCategory.trim() || inferred.category);
      setNewItemName('');
      setNewItemPrice('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">Customize cash register items</h2>
            <p className="mt-1 text-sm text-brand-dark/60">Edit prices, categories, barcodes, sizes and visibility.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-[24px] border border-brand-30 bg-brand-60/20 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto]">
              <input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder="New item name" className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm outline-none" />
              <input value={newItemPrice} onChange={(event) => setNewItemPrice(event.target.value)} placeholder="Price" inputMode="decimal" className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm outline-none" />
              <CategoryPicker value={newItemCategory} onChange={setNewItemCategory} suggestions={categorySuggestions} className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm outline-none" />
              <button type="button" disabled={saving} onClick={() => void addItem()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-brand-30 bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_110px_auto]">
                  <input defaultValue={item.name} onBlur={(event) => void onUpdate(item.id, { name: event.target.value })} className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-sm outline-none" />
                  <ExistingCategoryPicker item={item} suggestions={categorySuggestions} onUpdate={onUpdate} onSaveCategorySuggestion={onSaveCategorySuggestion} />
                  <input defaultValue={item.price} inputMode="decimal" onBlur={(event) => void onUpdate(item.id, { price: Number(event.target.value || 0) })} className="rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-sm outline-none" />
                  <button type="button" onClick={() => void onUpdate(item.id, { active: !item.active })} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${item.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-brand-30 bg-brand-60 text-brand-dark/60'}`}>
                    {item.active ? 'Active' : 'Hidden'}
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void onUpdate(item.id, { sortHint: item.sortHint + 1 })} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark">
                      Boost
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete ${item.name} from cash register?`)) void onDelete(item.id);
                      }}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <textarea
                  defaultValue={item.description}
                  onBlur={(event) => void onUpdate(item.id, { description: event.target.value })}
                  placeholder="Item details, ingredients, materials, service scope, or composition"
                  className="mt-3 min-h-20 w-full rounded-2xl border border-brand-30 bg-brand-60/20 px-4 py-3 text-sm leading-6 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
