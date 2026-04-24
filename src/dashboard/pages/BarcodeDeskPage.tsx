import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { jsPDF } from 'jspdf';
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  Expand,
  PackageSearch,
  Plus,
  Printer,
  ScanLine,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { renderBarcodeDataUrl, renderBarcodeSvgMarkup } from '../barcodeUtils';
import type {
  InventoryItem,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  SalesInvoice,
  SalesInvoiceLineItem,
  WorkspaceProfile,
} from '../types';
import { formatCurrency, formatDateTime } from '../utils';

type BarcodeDeskPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  billedBy: string;
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
  onFinalizeSale: (payload: {
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

type ScanTarget = 'bill' | 'lookup';
type WorkspaceTab = 'studio' | 'bill';
type ActiveModal = 'studio' | 'bill' | 'scanner' | 'invoices' | 'invoice-detail' | null;

type ProductStats = {
  soldUnits: number;
  invoiceCount: number;
  salesRevenue: number;
};

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const paymentMethodLabels: Record<InvoicePaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  bank_transfer: 'Bank transfer',
  mixed: 'Mixed',
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

const ModalShell = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/45 p-3 sm:p-6">
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-brand-dark/65">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark"
          aria-label="Close popup"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
    </div>
  </div>
);

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-dark/50">{label}</div>
    <div className="mt-2 text-lg font-semibold text-brand-dark">{value}</div>
  </div>
);

export const BarcodeDeskPage = ({
  companyName,
  businessProfile,
  billedBy,
  inventory,
  salesInvoices,
  onFinalizeSale,
}: BarcodeDeskPageProps) => {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('studio');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [query, setQuery] = useState('');
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in customer');
  const [taxRate, setTaxRate] = useState('5');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [scanTarget, setScanTarget] = useState<ScanTarget>('bill');
  const [lastScanned, setLastScanned] = useState<InventoryItem | null>(null);
  const [lookupItem, setLookupItem] = useState<InventoryItem | null>(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Scanner idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState<SalesInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [printQueue, setPrintQueue] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const cooldownRef = useRef<string>('');

  const inventoryIndex = useMemo(() => {
    const nextMap = new Map<string, InventoryItem>();
    inventory.forEach((item) => {
      nextMap.set(item.barcodeValue, item);
    });
    return nextMap;
  }, [inventory]);

  const recentInvoices = useMemo(() => {
    const merged = latestInvoice
      ? [latestInvoice, ...salesInvoices.filter((invoice) => invoice.id !== latestInvoice.id)]
      : salesInvoices;
    return merged
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [latestInvoice, salesInvoices]);

  const salesStats = useMemo(() => {
    const nextMap = new Map<string, ProductStats>();
    recentInvoices.forEach((invoice) => {
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
  }, [recentInvoices]);

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
  const lookupStats = lookupItem ? salesStats.get(lookupItem.id) : null;

  const closeModal = () => setActiveModal(null);

  const stopScanner = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    scannerReaderRef.current = null;
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
    setScannerStatus('Scanner idle');
  };

  useEffect(() => () => stopScanner(), []);

  useEffect(() => {
    if (activeModal !== 'scanner') {
      stopScanner();
      setScannerError(null);
    }
  }, [activeModal]);

  const togglePrintQueue = (itemId: string) => {
    setPrintQueue((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const addItemToDraft = useCallback((item: InventoryItem) => {
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
  }, []);

  const lookupInventoryItem = useCallback((barcodeValue: string) => {
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
  }, [inventoryIndex]);

  const handleBarcodeMatch = useCallback((barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;
    if (trimmed === cooldownRef.current) return;

    cooldownRef.current = trimmed;
    window.setTimeout(() => {
      if (cooldownRef.current === trimmed) {
        cooldownRef.current = '';
      }
    }, 1200);

    if (scanTarget === 'lookup') {
      lookupInventoryItem(trimmed);
      stopScanner();
      setActiveModal('studio');
      return;
    }

    const matchedItem = inventoryIndex.get(trimmed);
    if (!matchedItem) {
      setScannerError(`No product found for barcode ${trimmed}.`);
      return;
    }

    addItemToDraft(matchedItem);
    setActiveModal('bill');
  }, [addItemToDraft, inventoryIndex, lookupInventoryItem, scanTarget]);

  const startScanner = useCallback(async () => {
    stopScanner();
    setScannerError(null);
    setScannerStatus('Starting camera...');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setScannerError('Camera scanning needs HTTPS on mobile browsers. Open the deployed HTTPS site and allow camera access.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('This browser does not expose camera access. Open the page in Chrome or Safari on your phone.');
      return;
    }

    if (!videoRef.current) {
      setScannerError('Scanner preview is not ready yet. Close and reopen the scanner popup.');
      return;
    }

    try {
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

      const nativeDetectorCtor = getBarcodeDetectorCtor();
      if (nativeDetectorCtor && videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new nativeDetectorCtor({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'itf'],
        });

        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return;

          if (videoRef.current.readyState < 2) {
            scanFrameRef.current = window.requestAnimationFrame(() => {
              void tick();
            });
            return;
          }

          if (!scanBusyRef.current) {
            try {
              scanBusyRef.current = true;
              const barcodes = await detector.detect(videoRef.current);
              const matched = barcodes.find((barcode) => barcode.rawValue?.trim());
              if (matched?.rawValue) {
                setScannerStatus(`Barcode detected: ${matched.rawValue}`);
                handleBarcodeMatch(matched.rawValue);
                return;
              }
            } catch (error) {
              console.error(error);
            } finally {
              scanBusyRef.current = false;
            }
          }

          scanFrameRef.current = window.requestAnimationFrame(() => {
            void tick();
          });
        };

        setScannerRunning(true);
        setScannerStatus('Camera live. Native barcode detection is active. Hold the barcode closer and keep only the bars in frame.');
        scanFrameRef.current = window.requestAnimationFrame(() => {
          void tick();
        });
        return;
      }

      const devices = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
      const preferredDevice =
        devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId || devices[0]?.deviceId;

      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      scannerReaderRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: preferredDevice
            ? {
                deviceId: { ideal: preferredDevice },
                ...videoConstraints,
              }
            : videoConstraints,
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            setScannerStatus(`Barcode detected: ${result.getText()}`);
            handleBarcodeMatch(result.getText());
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            const message = error instanceof Error ? error.message : 'Unable to read the barcode from the camera.';
            setScannerError(message);
            setScannerStatus('Scanner needs attention');
          }
        },
      );

      scannerControlsRef.current = controls;
      setScannerRunning(true);
      setScannerStatus(
        preferredDevice
          ? 'Camera live. Rear camera selected. Move closer until the bars fill most of the preview width.'
          : 'Camera live. Move closer until the barcode fills most of the preview width.',
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to access the camera. Check permission settings and try again.';
      setScannerError(message);
      setScannerStatus('Scanner failed to start');
      stopScanner();
    }
  }, [handleBarcodeMatch]);

  const openScannerFor = (target: ScanTarget) => {
    setScanTarget(target);
    setScannerError(null);
    setActiveModal('scanner');
  };

  useEffect(() => {
    if (activeModal === 'scanner') {
      void startScanner();
    }
  }, [activeModal, scanTarget, startScanner]);

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
    setCustomerName('Walk-in customer');
    setPaymentStatus('paid');
    setPaymentMethod('cash');
    setTaxRate('5');
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
        paymentMethod,
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
        paymentMethod,
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
      setSelectedInvoice(invoiceRecord);
      printInvoice(invoiceRecord);
      resetDraft();
      setActiveModal('invoice-detail');
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
    const refundPolicy = 'Goods once sold will be exchanged or refunded only as per store policy with valid invoice and barcode sticker.';
    const businessContact = [businessProfile.phone, businessProfile.email, businessProfile.website]
      .filter(Boolean)
      .join(' • ');
    const body = `
      <div class="invoice-shell">
        <div class="invoice-head">
          <div>
            <h1>${companyName || 'Business'}</h1>
            <p class="muted">${businessProfile.studioAddress || 'Business address not set yet'}</p>
            ${businessProfile.gstNumber ? `<p class="muted">GSTIN: ${businessProfile.gstNumber}</p>` : ''}
            ${businessContact ? `<p class="muted">${businessContact}</p>` : ''}
          </div>
          <div>
            <p class="muted"><strong>Retail Invoice</strong></p>
            <p class="muted">Invoice ${invoice.invoiceNumber}</p>
            <p class="muted">Created ${formatDateTime(invoice.createdAt)}</p>
            <p class="muted">Customer ${invoice.customerName}</p>
            <p class="muted">Billed by ${invoice.billedBy}</p>
            <p class="muted">Status ${invoice.paymentStatus}</p>
            <p class="muted">Method ${paymentMethodLabels[invoice.paymentMethod]}</p>
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
        <div style="margin-top:24px;">
          ${invoice.notes ? `<p class="muted"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          <p class="muted" style="margin-top:10px;">${refundPolicy}</p>
        </div>
      </div>
    `;

    printHtml(`${invoice.invoiceNumber}`, body);
  };

  const compactInvoiceList = recentInvoices.slice(0, 5);
  return (
    <>
      <div className="space-y-5">
        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                <Barcode size={14} />
                Barcode Desk
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                Compact sticker printing and barcode billing for mobile-first checkout.
              </h1>
              <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
                Keep the main page light, open only what you need in a popup, and route scans to either product lookup or the live bill based on where you start scanning.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Queued labels" value={queueItems.length} />
              <MetricCard label="Bill items" value={draftItems.length} />
              <MetricCard label="Recent invoices" value={recentInvoices.length} />
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid w-full max-w-[30rem] grid-cols-2 gap-2 rounded-[24px] border border-brand-30 bg-brand-60/50 p-2">
            {([
              { id: 'studio', label: 'Sticker Studio' },
              { id: 'bill', label: 'Live Bill Builder' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspaceTab(tab.id)}
                className={`min-w-0 rounded-2xl border px-4 py-3 text-center text-sm font-medium transition ${
                  workspaceTab === tab.id
                    ? 'border-brand-10 bg-brand-10 text-brand-60 shadow-sm'
                    : 'border-transparent bg-white text-brand-dark/75 hover:border-brand-30 hover:text-brand-dark'
                }`}
              >
                <span className="block whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5">
              {workspaceTab === 'studio' ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-brand-dark">Sticker Studio</h2>
                      <p className="mt-1 text-sm text-brand-dark/65">
                        Queue multiple labels, print one A4 sheet, and inspect scanned product stats.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal('studio')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                    >
                      <Expand size={16} />
                      Launch studio
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Labels queued" value={queueItems.length} />
                    <MetricCard label="Products" value={inventory.length} />
                    <MetricCard
                      label="Lookup focus"
                      value={lookupItem ? `${lookupItem.name.slice(0, 14)}${lookupItem.name.length > 14 ? '...' : ''}` : 'None'}
                    />
                  </div>
                  <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1">
                    {queueItems.length ? (
                      queueItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-brand-dark">{item.name}</div>
                              <div className="truncate text-xs text-brand-dark/55">{item.barcodeValue}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => togglePrintQueue(item.id)}
                              className="rounded-full p-2 text-brand-dark/65 hover:bg-brand-60"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyStatePanel
                        compact
                        icon={Barcode}
                        title="Queue is empty"
                        description="Add barcode stickers to the queue, then open Sticker Studio for A4 PDF export."
                      />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-brand-dark">Live Bill Builder</h2>
                      <p className="mt-1 text-sm text-brand-dark/65">
                        Scan from the bill popup and each barcode drops straight into the draft invoice.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal('bill')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                    >
                      <Expand size={16} />
                      Launch billing
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Items in bill" value={draftItems.length} />
                    <MetricCard label="Subtotal" value={formatCurrency(subtotal)} />
                    <MetricCard label="Total" value={formatCurrency(totalAmount)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                    >
                      <Plus size={16} />
                      New invoice
                    </button>
                  </div>
                  <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1">
                    {draftItems.length ? (
                      draftItems.map((line) => (
                        <div key={line.inventoryItemId} className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-brand-dark">{line.itemName}</div>
                              <div className="text-xs text-brand-dark/55">
                                {line.quantity} x {formatCurrency(line.unitPrice)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-brand-dark">
                              {formatCurrency(line.quantity * line.unitPrice)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyStatePanel
                        compact
                        icon={ClipboardList}
                        title="Bill is empty"
                        description="Open Live Bill Builder and scan products from there to add them instantly."
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-brand-dark">Recent Barcode Invoices</h2>
                  <p className="mt-1 text-sm text-brand-dark/65">
                    Click an invoice to open full details in a popup and reprint it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal('invoices')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                >
                  <Expand size={16} />
                  View invoices
                </button>
              </div>
              <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
                {compactInvoiceList.length ? (
                  compactInvoiceList.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setActiveModal('invoice-detail');
                      }}
                      className="w-full rounded-[24px] border border-brand-30 bg-white p-4 text-left transition hover:border-brand-10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                          <div className="mt-1 truncate text-sm text-brand-dark/60">{invoice.customerName}</div>
                        </div>
                        <div className="text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</div>
                      </div>
                      <div className="mt-3 text-xs text-brand-dark/50">{formatDateTime(invoice.createdAt)}</div>
                    </button>
                  ))
                ) : (
                  <EmptyStatePanel
                    compact
                    icon={Printer}
                    title="No barcode invoices yet"
                    description="Finalize a barcode bill once and it will show here for popup viewing and reprints."
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {activeModal === 'studio' ? (
        <ModalShell
          title="Sticker Studio"
          subtitle="Search products, inspect barcode stats, and build a scrollable multi-label print queue."
          onClose={closeModal}
        >
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by item, SKU, code, or barcode"
                  className="w-full rounded-2xl border border-brand-30 bg-brand-60/30 px-4 py-3 text-sm text-brand-dark outline-none lg:max-w-md"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openScannerFor('lookup')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                  >
                    <Camera size={16} />
                    Scan in studio
                  </button>
                  <button
                    type="button"
                    onClick={downloadA4Pdf}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                  >
                    <Printer size={16} />
                    Download A4 PDF
                  </button>
                </div>
              </div>

              <div className="max-h-[58vh] overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredInventory.length ? (
                    filteredInventory.map((item) => (
                      <div key={item.id} className="space-y-3 rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                        <BarcodeLabel
                          compact
                          value={item.barcodeValue}
                          title={item.name}
                          subtitle={`${item.sku} • ${formatCurrency(item.sellingPrice)}`}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <MetricCard label="Sold" value={salesStats.get(item.id)?.soldUnits ?? 0} />
                          <MetricCard label="Stock left" value={item.currentStock} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => printStickerSheet([item])}
                            className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark"
                          >
                            <Printer size={15} />
                            Print one
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePrintQueue(item.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark"
                          >
                            <Plus size={15} />
                            {printQueue.includes(item.id) ? 'Remove from queue' : 'Add to queue'}
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

            <div className="space-y-5">
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Print Queue</div>
                    <p className="mt-1 text-sm text-brand-dark/65">Scrollable multi-sticker queue for your A4 sheet.</p>
                  </div>
                  <div className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark">
                    {queueItems.length} labels
                  </div>
                </div>
                <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                  {queueItems.length ? (
                    queueItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-brand-dark">{item.name}</div>
                            <div className="truncate text-xs text-brand-dark/55">{item.barcodeValue}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePrintQueue(item.id)}
                            className="rounded-full p-2 text-brand-dark/60 hover:bg-brand-60"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyStatePanel
                      compact
                      icon={Barcode}
                      title="No labels queued"
                      description="Add multiple products from the left and download one A4 barcode sheet."
                    />
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
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Barcode Lookup</div>
                <p className="mt-1 text-sm text-brand-dark/65">
                  Scan here to see sold units, invoices count, stock left, and revenue for the product.
                </p>
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
                      <MetricCard label="Units sold" value={lookupStats?.soldUnits ?? 0} />
                      <MetricCard label="Stock left" value={lookupItem.currentStock} />
                      <MetricCard label="Times billed" value={lookupStats?.invoiceCount ?? 0} />
                      <MetricCard label="Sales revenue" value={formatCurrency(lookupStats?.salesRevenue ?? 0)} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyStatePanel
                      compact
                      icon={PackageSearch}
                      title="No product looked up yet"
                      description="Use the studio scan button or paste a barcode here to inspect item stats."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'bill' ? (
        <ModalShell
          title="Live Bill Builder"
          subtitle="Scan products here to add them directly into the bill, then finalize and print."
          onClose={closeModal}
        >
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <span>Payment method</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as InvoicePaymentMethod)}
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

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Live invoice builder</div>
                    <p className="mt-1 text-sm text-brand-dark/65">Barcode scans started here always add items into the bill.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                    >
                      <Plus size={16} />
                      New invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => openScannerFor('bill')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                    >
                      <Camera size={16} />
                      Scan into bill
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
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
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-brand-30 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Invoice preview</div>
                    <p className="mt-1 text-sm text-brand-dark/65">
                      {companyName} {businessProfile.gstNumber ? `• GSTIN ${businessProfile.gstNumber}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm text-brand-dark/65">
                    <div>{businessProfile.studioAddress || 'Business address not set yet'}</div>
                    <div>{paymentMethodLabels[paymentMethod]} • {paymentStatus}</div>
                  </div>
                </div>
              </div>

              {invoiceError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {invoiceError}
                </div>
              ) : null}

              <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                {draftItems.length ? (
                  draftItems.map((line) => (
                    <div key={line.inventoryItemId} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
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
                    description="Scan products from this popup and they will land here instantly."
                  />
                )}
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-brand-10 p-5 text-brand-60">
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

              <div className="flex flex-wrap gap-3">
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
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'scanner' ? (
        <ModalShell
          title={scanTarget === 'bill' ? 'Scan Into Bill' : 'Scan Product In Studio'}
          subtitle={
            scanTarget === 'bill'
              ? 'Scans from this popup add straight into the bill builder.'
              : 'Scans from this popup show product details and sales stats inside Sticker Studio.'
          }
          onClose={closeModal}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="overflow-hidden rounded-[28px] border border-brand-30 bg-brand-60/25">
              <div className="relative aspect-[4/3] bg-brand-dark/95">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-[10%] top-1/2 -translate-y-1/2">
                    <div className="relative h-0.5 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_18px_rgba(16,185,129,0.85)]" />
                    <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 drop-shadow">
                      Align barcode with green line
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-brand-30 px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={scannerRunning ? stopScanner : () => void startScanner()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                  >
                    {scannerRunning ? <CameraOff size={16} /> : <Camera size={16} />}
                    {scannerRunning ? 'Stop scanner' : 'Start scanner'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(scanTarget === 'bill' ? 'bill' : 'studio');
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                  >
                    Back to {scanTarget === 'bill' ? 'bill' : 'studio'}
                  </button>
                </div>
                <div className="mt-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark/70">
                  {scannerStatus}
                </div>
                {scannerError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {scannerError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Manual barcode fallback</div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={manualBarcode}
                    onChange={(event) => setManualBarcode(event.target.value)}
                    placeholder="Paste or type a barcode"
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
                    Submit
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Last scanned product</div>
                {lastScanned ? (
                  <div className="mt-4 space-y-3">
                    <BarcodeLabel compact value={lastScanned.barcodeValue} title={lastScanned.name} subtitle={lastScanned.sku} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricCard label="Selling price" value={formatCurrency(lastScanned.sellingPrice)} />
                      <MetricCard label="Stock left" value={lastScanned.currentStock} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyStatePanel
                      compact
                      icon={ScanLine}
                      title="Nothing scanned yet"
                      description="Point the camera at a barcode sticker or use manual entry as a fallback."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'invoices' ? (
        <ModalShell
          title="Recent Barcode Invoices"
          subtitle="Open any invoice in a popup window to inspect full details and print it again."
          onClose={closeModal}
        >
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {recentInvoices.length ? (
              recentInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setActiveModal('invoice-detail');
                  }}
                  className="w-full rounded-[24px] border border-brand-30 bg-brand-60/25 p-4 text-left transition hover:border-brand-10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                      <div className="mt-1 text-sm text-brand-dark/60">{invoice.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</div>
                      <div className="mt-1 text-xs text-brand-dark/50">{formatDateTime(invoice.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <EmptyStatePanel
                icon={Printer}
                title="No barcode invoices yet"
                description="Finalize a bill first and it will show up here in a clean popup list."
              />
            )}
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'invoice-detail' && selectedInvoice ? (
        <ModalShell
          title={selectedInvoice.invoiceNumber}
          subtitle={`Created ${formatDateTime(selectedInvoice.createdAt)} for ${selectedInvoice.customerName}`}
          onClose={() => {
            setActiveModal('invoices');
          }}
        >
          <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Customer" value={selectedInvoice.customerName} />
                <MetricCard label="Payment" value={selectedInvoice.paymentStatus} />
                <MetricCard label="Method" value={paymentMethodLabels[selectedInvoice.paymentMethod]} />
                <MetricCard label="Subtotal" value={formatCurrency(selectedInvoice.subtotal)} />
                <MetricCard label="Total" value={formatCurrency(selectedInvoice.totalAmount)} />
              </div>
              <div className="rounded-[28px] border border-brand-30 bg-white p-5">
                <div className="flex flex-col gap-3 border-b border-brand-30 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-2xl font-semibold text-brand-dark">{companyName}</div>
                    <div className="mt-1 text-sm text-brand-dark/65">{businessProfile.studioAddress || 'Business address not set yet'}</div>
                    {businessProfile.gstNumber ? (
                      <div className="mt-1 text-sm text-brand-dark/65">GSTIN: {businessProfile.gstNumber}</div>
                    ) : null}
                  </div>
                  <div className="text-sm text-brand-dark/65">
                    {businessProfile.phone ? <div>{businessProfile.phone}</div> : null}
                    {businessProfile.email ? <div>{businessProfile.email}</div> : null}
                    {businessProfile.website ? <div>{businessProfile.website}</div> : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Invoice no." value={selectedInvoice.invoiceNumber} />
                  <MetricCard label="Created" value={formatDateTime(selectedInvoice.createdAt)} />
                </div>
              </div>
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Line items</div>
                <div className="mt-4 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                  {selectedInvoice.lineItems.map((line, index) => (
                    <div key={`${selectedInvoice.id}-${line.inventoryItemId}-${index}`} className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-brand-dark">{line.itemName}</div>
                          <div className="mt-1 text-xs text-brand-dark/55">{line.sku} • {line.barcodeValue}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-brand-dark/55">{line.quantity} x {formatCurrency(line.unitPrice)}</div>
                          <div className="mt-1 font-semibold text-brand-dark">{formatCurrency(line.lineSubtotal)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-brand-30 bg-brand-10 p-5 text-brand-60">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal</span>
                    <strong>{formatCurrency(selectedInvoice.subtotal)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Tax ({selectedInvoice.taxRate}%)</span>
                    <strong>{formatCurrency(selectedInvoice.taxAmount)}</strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/15 pt-3 text-xl font-semibold">
                    <span>Total</span>
                    <strong>{formatCurrency(selectedInvoice.totalAmount)}</strong>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-brand-30 bg-white p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Store policy</div>
                <p className="mt-3 text-sm leading-6 text-brand-dark/70">
                  Goods once sold will be exchanged or refunded only as per store policy with valid invoice and barcode sticker.
                </p>
                {selectedInvoice.notes ? (
                  <p className="mt-3 text-sm leading-6 text-brand-dark/70">
                    <strong>Invoice note:</strong> {selectedInvoice.notes}
                  </p>
                ) : null}
              </div>
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Actions</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => printInvoice(selectedInvoice)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                  >
                    <Printer size={16} />
                    Reprint invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('invoices')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                  >
                    Back to invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
};
