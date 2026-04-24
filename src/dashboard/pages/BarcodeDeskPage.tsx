import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  Plus,
  Printer,
  ScanLine,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { renderBarcodeDataUrl, renderBarcodeSvgMarkup } from '../barcodeUtils';
import type { InventoryItem, InvoicePaymentStatus, SalesInvoice, SalesInvoiceLineItem } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

type BarcodeDeskPageProps = {
  companyName: string;
  billedBy: string;
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
  onFinalizeSale: (payload: {
    customerName: string;
    paymentStatus: InvoicePaymentStatus;
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
  }>;
};

type DraftLineItem = {
  inventoryItemId: string;
  barcodeValue: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
};

type DetectedBarcode = {
  rawValue?: string;
};

type ScanTarget = 'bill' | 'lookup';

type ProductStats = {
  soldUnits: number;
  invoiceCount: number;
  salesRevenue: number;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const getBarcodeDetectorCtor = () =>
  (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;

const printHtml = (title: string, body: string) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1080,height=900');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print from the barcode desk.');
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          h1, h2, h3, p { margin: 0; }
          .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
          .label { border: 1px solid #d7d5e6; border-radius: 18px; padding: 14px; page-break-inside: avoid; }
          .muted { color: #6b7280; font-size: 12px; margin-top: 4px; }
          .barcode { margin-top: 14px; padding: 12px; border-radius: 14px; background: #f8f7fc; border: 1px solid #e7e3f5; }
          .invoice-shell { max-width: 920px; margin: 0 auto; }
          .invoice-head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; font-size: 14px; }
          th { text-transform: uppercase; font-size: 12px; color: #6b7280; letter-spacing: 0.08em; }
          .totals { margin-top: 20px; width: 320px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { font-weight: 700; font-size: 18px; border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 12px; }
          @media print { body { margin: 12px; } }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export const BarcodeDeskPage = ({
  companyName,
  billedBy,
  inventory,
  salesInvoices,
  onFinalizeSale,
}: BarcodeDeskPageProps) => {
  const [query, setQuery] = useState('');
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in customer');
  const [taxRate, setTaxRate] = useState('5');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [scanTarget, setScanTarget] = useState<ScanTarget>('bill');
  const [lastScanned, setLastScanned] = useState<InventoryItem | null>(null);
  const [lookupItem, setLookupItem] = useState<InventoryItem | null>(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState<SalesInvoice | null>(null);
  const [printQueue, setPrintQueue] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const cooldownRef = useRef<string>('');
  const lastDetectedAtRef = useRef(0);
  const isDetectingRef = useRef(false);

  const inventoryIndex = useMemo(() => {
    const nextMap = new Map<string, InventoryItem>();
    inventory.forEach((item) => {
      nextMap.set(item.barcodeValue, item);
    });
    return nextMap;
  }, [inventory]);

  const salesStats = useMemo(() => {
    const nextMap = new Map<string, ProductStats>();
    salesInvoices.forEach((invoice) => {
      invoice.lineItems.forEach((line) => {
        const existing = nextMap.get(line.inventoryItemId) ?? {
          soldUnits: 0,
          invoiceCount: 0,
          salesRevenue: 0,
        };

        nextMap.set(line.inventoryItemId, {
          soldUnits: existing.soldUnits + line.quantity,
          invoiceCount: existing.invoiceCount + 1,
          salesRevenue: existing.salesRevenue + line.lineSubtotal,
        });
      });
    });
    return nextMap;
  }, [salesInvoices]);

  const filteredInventory = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return inventory;

    return inventory.filter((item) => {
      const haystack = `${item.name} ${item.sku} ${item.itemCode} ${item.barcodeValue}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [inventory, query]);

  const queueItems = useMemo(
    () => printQueue.map((id) => inventory.find((item) => item.id === id)).filter(Boolean) as InventoryItem[],
    [inventory, printQueue],
  );

  const subtotal = draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const parsedTaxRate = Number(taxRate || '0');
  const taxAmount = Number(((subtotal * parsedTaxRate) / 100).toFixed(2));
  const totalAmount = subtotal + taxAmount;

  const stopScanner = () => {
    if (scanFrameRef.current) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerRunning(false);
  };

  useEffect(() => () => stopScanner(), []);

  const togglePrintQueue = (itemId: string) => {
    setPrintQueue((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const addItemToDraft = (item: InventoryItem) => {
    setInvoiceError(null);
    setScannerError(null);
    setLastScanned(item);

    setDraftItems((current) => {
      const existing = current.find((line) => line.inventoryItemId === item.id);
      if (existing) {
        if (existing.quantity >= item.currentStock) {
          setInvoiceError(`Only ${item.currentStock} unit(s) of ${item.name} are currently available.`);
          return current;
        }

        return current.map((line) =>
          line.inventoryItemId === item.id
            ? { ...line, quantity: line.quantity + 1, availableStock: item.currentStock }
            : line,
        );
      }

      if (item.currentStock <= 0) {
        setInvoiceError(`${item.name} is out of stock and cannot be billed right now.`);
        return current;
      }

      return [
        {
          inventoryItemId: item.id,
          barcodeValue: item.barcodeValue,
          itemName: item.name,
          sku: item.sku,
          quantity: 1,
          unitPrice: item.sellingPrice,
          availableStock: item.currentStock,
        },
        ...current,
      ];
    });
  };

  const lookupInventoryItem = (barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;

    const matchedItem = inventoryIndex.get(trimmed);
    if (!matchedItem) {
      setScannerError(`No product found for barcode ${trimmed}.`);
      setLookupItem(null);
      return;
    }

    setScannerError(null);
    setLookupItem(matchedItem);
    setLastScanned(matchedItem);
  };

  const handleBarcodeMatch = (barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;

    if (scanTarget === 'lookup') {
      lookupInventoryItem(trimmed);
      return;
    }

    const matchedItem = inventoryIndex.get(trimmed);
    if (!matchedItem) {
      setScannerError(`No product found for barcode ${trimmed}.`);
      return;
    }

    addItemToDraft(matchedItem);
  };

  const runDetectionLoop = async () => {
    const Detector = getBarcodeDetectorCtor();
    if (!Detector || !videoRef.current) return;

    const detector = new Detector({ formats: ['code_128'] });

    const tick = async () => {
      if (!videoRef.current || !streamRef.current) return;

      if (videoRef.current.readyState < 2) {
        scanFrameRef.current = window.requestAnimationFrame(() => {
          void tick();
        });
        return;
      }

      const now = Date.now();
      if (!isDetectingRef.current && now - lastDetectedAtRef.current > 300) {
        try {
          isDetectingRef.current = true;
          const barcodes = await detector.detect(videoRef.current);
          const match = barcodes.find((barcode) => barcode.rawValue);

          if (match?.rawValue && match.rawValue !== cooldownRef.current) {
            cooldownRef.current = match.rawValue;
            lastDetectedAtRef.current = now;
            handleBarcodeMatch(match.rawValue);
            window.setTimeout(() => {
              cooldownRef.current = '';
            }, 1400);
          }
        } catch (error) {
          console.error(error);
        } finally {
          isDetectingRef.current = false;
        }
      }

      scanFrameRef.current = window.requestAnimationFrame(() => {
        void tick();
      });
    };

    scanFrameRef.current = window.requestAnimationFrame(() => {
      void tick();
    });
  };

  const startScanner = async () => {
    setScannerError(null);
    const Detector = getBarcodeDetectorCtor();
    if (!Detector) {
      setScannerError('Live barcode scanning is not supported in this browser. Use manual barcode entry or open this page in Chrome on Android.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerRunning(true);
      await runDetectionLoop();
    } catch (error) {
      console.error(error);
      setScannerError('Unable to access the camera. Check camera permissions and try again.');
      stopScanner();
    }
  };

  const updateDraftQuantity = (inventoryItemId: string, nextQuantity: number) => {
    setDraftItems((current) =>
      current
        .map((line) => {
          if (line.inventoryItemId !== inventoryItemId) return line;
          if (nextQuantity > line.availableStock) {
            setInvoiceError(`Only ${line.availableStock} unit(s) of ${line.itemName} are available.`);
            return line;
          }
          return { ...line, quantity: nextQuantity };
        })
        .filter((line) => line.quantity > 0),
    );
  };

  const resetDraft = () => {
    setDraftItems([]);
    setNotes('');
    setInvoiceError(null);
  };

  const handleFinalizeSale = async () => {
    if (!draftItems.length) {
      setInvoiceError('Scan at least one product before finalizing the bill.');
      return;
    }

    setIsSavingInvoice(true);
    setInvoiceError(null);
    try {
      const result = await onFinalizeSale({
        customerName,
        paymentStatus,
        taxRate: parsedTaxRate,
        notes,
        billedBy,
        lineItems: draftItems.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          barcodeValue: line.barcodeValue,
          itemName: line.itemName,
          sku: line.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineSubtotal: line.unitPrice * line.quantity,
        })),
      });

      const invoiceRecord: SalesInvoice = {
        id: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        businessBarcodeKey: inventory[0]?.barcodeBusinessKey || '',
        customerName,
        paymentStatus,
        lineItems: result.lineItems,
        subtotal: result.subtotal,
        taxRate: parsedTaxRate,
        taxAmount: result.taxAmount,
        totalAmount: result.totalAmount,
        notes,
        billedBy,
        createdAt: result.createdAt,
      };
      setLatestInvoice(invoiceRecord);
      printInvoice(invoiceRecord);
      resetDraft();
    } catch (error) {
      console.error(error);
      setInvoiceError(error instanceof Error ? error.message : 'Unable to finalize the bill right now.');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const downloadA4Pdf = async () => {
    if (!queueItems.length) {
      setScannerError('Add at least one barcode to the print queue before downloading the A4 sheet.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const margin = 10;
    const columns = 3;
    const gap = 4;
    const labelWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
    const labelHeight = 36;

    queueItems.forEach((item, index) => {
      const itemsPerPage = columns * 7;
      if (index > 0 && index % itemsPerPage === 0) {
        doc.addPage();
      }

      const pageIndex = index % itemsPerPage;
      const column = pageIndex % columns;
      const row = Math.floor(pageIndex / columns);
      const x = margin + column * (labelWidth + gap);
      const y = margin + row * (labelHeight + gap);

      doc.setDrawColor(215, 213, 230);
      doc.roundedRect(x, y, labelWidth, labelHeight, 3, 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.name.slice(0, 28), x + 3, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${item.sku} • ${formatCurrency(item.sellingPrice)}`, x + 3, y + 11);

      const barcodeImage = renderBarcodeDataUrl(item.barcodeValue, 1.4, 36);
      doc.addImage(barcodeImage, 'PNG', x + 3, y + 13, labelWidth - 6, 12);
      doc.setFontSize(7);
      doc.text(item.barcodeValue, x + 3, y + 31);
    });

    doc.save(`${(companyName || 'business').replace(/\s+/g, '-').toLowerCase()}-barcode-sheet.pdf`);
  };

  const printStickerSheet = (items: InventoryItem[]) => {
    const body = `
      <h1>${companyName || 'Business'} barcode stickers</h1>
      <p class="muted">Generated from Barcode Desk</p>
      <div class="sheet">
        ${items
          .map(
            (item) => `
              <div class="label">
                <h3>${item.name}</h3>
                <div class="muted">${item.sku} • Price ${formatCurrency(item.sellingPrice)}</div>
                <div class="barcode">${renderBarcodeSvgMarkup(item.barcodeValue, 1.6, 48)}</div>
              </div>
            `,
          )
          .join('')}
      </div>
    `;

    printHtml(`${companyName} barcode stickers`, body);
  };

  const printInvoice = (invoice: SalesInvoice) => {
    const body = `
      <div class="invoice-shell">
        <div class="invoice-head">
          <div>
            <h1>${companyName || 'Business'} Invoice</h1>
            <p class="muted">Invoice ${invoice.invoiceNumber}</p>
            <p class="muted">Billed to ${invoice.customerName}</p>
          </div>
          <div>
            <p class="muted">Created ${formatDateTime(invoice.createdAt)}</p>
            <p class="muted">Billed by ${invoice.billedBy}</p>
            <p class="muted">Status ${invoice.paymentStatus}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems
              .map(
                (line) => `
                  <tr>
                    <td>${line.itemName}</td>
                    <td>${line.sku}</td>
                    <td>${line.quantity}</td>
                    <td>${formatCurrency(line.unitPrice)}</td>
                    <td>${formatCurrency(line.lineSubtotal)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><strong>${formatCurrency(invoice.subtotal)}</strong></div>
          <div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><strong>${formatCurrency(invoice.taxAmount)}</strong></div>
          <div class="totals-row total"><span>Total</span><strong>${formatCurrency(invoice.totalAmount)}</strong></div>
        </div>
      </div>
    `;

    printHtml(`${invoice.invoiceNumber}`, body);
  };

  const lookupStats = lookupItem ? salesStats.get(lookupItem.id) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <Barcode size={14} />
              Barcode Desk
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              Print product stickers and bill customers by scanning with a phone.
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
              Use one workspace for sticker generation, product lookup, live barcode billing, tax totals, and printable invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-2xl border border-brand-30 bg-brand-60/50 p-1">
              {(['bill', 'lookup'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScanTarget(mode)}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    scanTarget === mode ? 'bg-brand-10 text-brand-60' : 'text-brand-dark/70'
                  }`}
                >
                  {mode === 'bill' ? 'Scanner adds to bill' : 'Scanner looks up product'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={scannerRunning ? stopScanner : () => void startScanner()}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark"
            >
              {scannerRunning ? <CameraOff size={16} /> : <Camera size={16} />}
              {scannerRunning ? 'Stop live scanner' : 'Start live scanner'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Sticker Studio</h2>
                <p className="mt-1 text-sm text-brand-dark/65">Keep this area compact, scroll products, and queue multiple barcodes for one A4 PDF sheet.</p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by item, SKU, code, or barcode"
                className="w-full rounded-2xl border border-brand-30 bg-brand-60/40 px-4 py-3 text-sm text-brand-dark outline-none lg:max-w-sm"
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Queued for A4 PDF</div>
                  <div className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark">
                    {queueItems.length} labels
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {queueItems.length ? (
                    queueItems.map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-brand-30 bg-white px-3 py-2 text-xs font-medium text-brand-dark">
                        {item.name}
                        <button type="button" onClick={() => togglePrintQueue(item.id)} className="text-brand-dark/55">
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <div className="text-sm text-brand-dark/55">Add barcode cards to the print queue to generate one downloadable A4 sheet.</div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadA4Pdf}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                  >
                    <Printer size={16} />
                    Download A4 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => printStickerSheet(queueItems)}
                    disabled={!queueItems.length}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60"
                  >
                    Print queue
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Product lookup</div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={lookupBarcode}
                    onChange={(event) => setLookupBarcode(event.target.value)}
                    placeholder="Scan or paste barcode"
                    className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      lookupInventoryItem(lookupBarcode);
                      setLookupBarcode('');
                    }}
                    disabled={!lookupBarcode.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60"
                  >
                    <ScanLine size={16} />
                    Lookup
                  </button>
                </div>

                {lookupItem ? (
                  <div className="mt-4 space-y-3">
                    <BarcodeLabel compact value={lookupItem.barcodeValue} title={lookupItem.name} subtitle={lookupItem.sku} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Units sold</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{lookupStats?.soldUnits ?? 0}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Stock left</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{lookupItem.currentStock}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Times billed</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{lookupStats?.invoiceCount ?? 0}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Sales revenue</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{formatCurrency(lookupStats?.salesRevenue ?? 0)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyStatePanel
                      compact
                      icon={PackageSearch}
                      title="No product looked up yet"
                      description="Switch scanner target to product lookup or paste a barcode here to inspect item stats."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 max-h-[720px] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredInventory.length ? (
                  filteredInventory.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-[28px] border border-brand-30 bg-brand-60/30 p-4">
                      <BarcodeLabel
                        compact
                        value={item.barcodeValue}
                        title={item.name}
                        subtitle={`${item.sku} • ${formatCurrency(item.sellingPrice)}`}
                      />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Sold</div>
                          <div className="mt-1 font-semibold text-brand-dark">{salesStats.get(item.id)?.soldUnits ?? 0}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">In stock</div>
                          <div className="mt-1 font-semibold text-brand-dark">{item.currentStock}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => printStickerSheet([item])}
                          className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark"
                        >
                          <Printer size={15} />
                          Print sticker
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePrintQueue(item.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark"
                        >
                          <Plus size={15} />
                          {printQueue.includes(item.id) ? 'Remove from sheet' : 'Add to sheet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => addItemToDraft(item)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-3 py-2 text-sm font-medium text-brand-60"
                        >
                          <ShoppingCart size={15} />
                          Add to bill
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2">
                    <EmptyStatePanel
                      icon={PackageSearch}
                      title="No products found"
                      description="Try another search term or add more items in inventory first."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Live Scanner</h2>
                <p className="mt-1 text-sm text-brand-dark/65">Target is currently set to {scanTarget === 'bill' ? 'add scanned products to the bill' : 'look up product analytics'}.</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${scannerRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-60 text-brand-dark/70'}`}>
                {scannerRunning ? 'Scanner live' : 'Scanner idle'}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="overflow-hidden rounded-[28px] border border-brand-30 bg-brand-60/30">
                <div className="aspect-[4/3] bg-brand-dark/95">
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                </div>
                <div className="border-t border-brand-30 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={manualBarcode}
                      onChange={(event) => setManualBarcode(event.target.value)}
                      placeholder="Manual barcode input"
                      className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleBarcodeMatch(manualBarcode);
                        setManualBarcode('');
                      }}
                      disabled={!manualBarcode.trim()}
                      className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60"
                    >
                      Add barcode
                    </button>
                  </div>
                  {scannerError ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {scannerError}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Last scanned product</div>
                {lastScanned ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-2xl font-semibold text-brand-dark">{lastScanned.name}</div>
                    <div className="text-sm text-brand-dark/70">{lastScanned.sku} • {lastScanned.barcodeValue}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Selling price</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{formatCurrency(lastScanned.sellingPrice)}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-brand-dark/50">Stock left</div>
                        <div className="mt-2 text-xl font-semibold text-brand-dark">{lastScanned.currentStock}</div>
                      </div>
                    </div>
                    <BarcodeLabel compact value={lastScanned.barcodeValue} title={lastScanned.name} subtitle={lastScanned.sku} />
                  </div>
                ) : (
                  <EmptyStatePanel
                    compact
                    icon={ScanLine}
                    title="Nothing scanned yet"
                    description="Start the live scanner and scan any product sticker."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Live Bill Builder</h2>
                <p className="mt-1 text-sm text-brand-dark/65">When scanner target is set to bill, scanned items appear here automatically and are ready for print.</p>
              </div>
              <div className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark">
                {draftItems.length} item{draftItems.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Customer name</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Tax rate (%)</span>
                <input
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(event) => /^(\d+(\.\d{0,2})?)?$/.test(event.target.value) && setTaxRate(event.target.value)}
                  className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Payment status</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as InvoicePaymentStatus)}
                  className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Invoice notes</span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes for the bill"
                  className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
                />
              </label>
            </div>

            {invoiceError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {invoiceError}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {draftItems.length ? (
                draftItems.map((line) => (
                  <div key={line.inventoryItemId} className="rounded-[24px] border border-brand-30 bg-brand-60/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-brand-dark">{line.itemName}</div>
                        <div className="mt-1 text-xs text-brand-dark/55">{line.sku} • {line.barcodeValue}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDraftQuantity(line.inventoryItemId, 0)}
                        className="rounded-full p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-3 rounded-full border border-brand-30 bg-white px-2 py-2">
                        <button
                          type="button"
                          onClick={() => updateDraftQuantity(line.inventoryItemId, line.quantity - 1)}
                          className="h-8 w-8 rounded-full bg-brand-60 text-sm font-bold text-brand-dark"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-brand-dark">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateDraftQuantity(line.inventoryItemId, line.quantity + 1)}
                          className="h-8 w-8 rounded-full bg-brand-60 text-sm font-bold text-brand-dark"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-brand-dark/60">{formatCurrency(line.unitPrice)} each</div>
                        <div className="mt-1 text-lg font-semibold text-brand-dark">{formatCurrency(line.unitPrice * line.quantity)}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyStatePanel
                  icon={ClipboardList}
                  title="Bill is empty"
                  description="Scan products with scanner target set to bill, or add them from the sticker list."
                />
              )}
            </div>

            <div className="mt-6 rounded-[28px] border border-brand-30 bg-brand-10 p-5 text-brand-60">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tax ({parsedTaxRate}%)</span>
                  <strong>{formatCurrency(taxAmount)}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-white/15 pt-3 text-xl font-semibold">
                  <span>Total</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isSavingInvoice || !draftItems.length}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {isSavingInvoice ? 'Finalizing...' : 'Finalize sale and print'}
              </button>
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
              >
                Clear bill
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Recent barcode invoices</h2>
                <p className="mt-1 text-sm text-brand-dark/65">Fast reprints for the latest scanned-and-billed sales.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(latestInvoice ? [latestInvoice, ...salesInvoices.filter((invoice) => invoice.id !== latestInvoice.id)] : salesInvoices)
                .slice(0, 6)
                .map((invoice) => (
                  <div key={invoice.id} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                        <div className="mt-1 text-sm text-brand-dark/60">{invoice.customerName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => printInvoice(invoice)}
                        className="rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark"
                      >
                        Reprint
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-brand-dark/70">
                      <span>{formatDateTime(invoice.createdAt)}</span>
                      <strong className="text-brand-dark">{formatCurrency(invoice.totalAmount)}</strong>
                    </div>
                  </div>
                ))}
              {!salesInvoices.length && !latestInvoice ? (
                <EmptyStatePanel
                  compact
                  icon={Printer}
                  title="No barcode invoices yet"
                  description="Finalize a scanned bill once and it will show up here for quick reprints."
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
