import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { Camera, CameraOff, CheckCircle2, ClipboardList, Plus, ScanLine, Trash2, X } from 'lucide-react';
import type {
  BillingDefaults,
  InventoryItem,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  SalesInvoice,
  SalesInvoiceLineItem,
  WorkspaceProfile,
} from '../types';
import { BarcodeLabel } from './BarcodeLabel';
import { EmptyStatePanel } from './EmptyStatePanel';
import { SalesInvoiceDetailModal } from './SalesInvoiceDetailModal';
import { printSalesInvoice } from '../invoicePrint';
import { formatCurrency, formatDateTime } from '../utils';

type DraftLineItem = {
  inventoryItemId: string;
  barcodeValue: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
};

type LiveBillBuilderPanelProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  billedBy: string;
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
  billingDefaults: BillingDefaults;
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
};

const toDraftLineItems = (lineItems: SalesInvoiceLineItem[], inventory: InventoryItem[]): DraftLineItem[] =>
  lineItems.map((line) => {
    const matchedItem = inventory.find((item) => item.id === line.inventoryItemId || item.barcodeValue === line.barcodeValue);
    return {
      inventoryItemId: line.inventoryItemId,
      barcodeValue: line.barcodeValue,
      itemName: line.itemName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      availableStock: matchedItem?.currentStock ?? line.quantity,
    };
  });

type DetectedBarcode = { rawValue?: string };
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

export const LiveBillBuilderPanel = ({
  companyName,
  businessProfile,
  billedBy,
  inventory,
  salesInvoices,
  billingDefaults,
  onFinalizeSale,
  onSaveDraft,
  onDeleteDraft,
}: LiveBillBuilderPanelProps) => {
  const [customerName, setCustomerName] = useState('Walk-in customer');
  const [taxRate, setTaxRate] = useState('5');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<InventoryItem | null>(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Scanner idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const cooldownRef = useRef('');

  const inventoryIndex = useMemo(() => {
    const nextMap = new Map<string, InventoryItem>();
    inventory.forEach((item) => nextMap.set(item.barcodeValue, item));
    return nextMap;
  }, [inventory]);

  const savedDrafts = useMemo(
    () =>
      salesInvoices
        .filter((invoice) => invoice.status === 'draft')
        .slice()
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [salesInvoices],
  );

  useEffect(() => {
    setCustomerName('Walk-in customer');
    setPaymentStatus(billingDefaults.defaultPaymentStatus);
    setPaymentMethod(billingDefaults.defaultPaymentMethod);
    setTaxRate(String(billingDefaults.defaultTaxRate));
    setNotes(billingDefaults.defaultInvoiceNotes);
  }, [billingDefaults]);

  const subtotal = draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const parsedTaxRate = Number(taxRate || '0');
  const taxAmount = Number(((subtotal * parsedTaxRate) / 100).toFixed(2));
  const totalAmount = subtotal + taxAmount;

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
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
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);
  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      setScannerError(null);
    }
  }, [scannerOpen, stopScanner]);

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

  const handleBarcodeMatch = useCallback((barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;
    if (trimmed === cooldownRef.current) return;

    cooldownRef.current = trimmed;
    window.setTimeout(() => {
      if (cooldownRef.current === trimmed) cooldownRef.current = '';
    }, 1200);

    const matchedItem = inventoryIndex.get(trimmed);
    if (!matchedItem) {
      setScannerError(`No product found for barcode ${trimmed}.`);
      return;
    }

    addItemToDraft(matchedItem);
    setScannerOpen(false);
  }, [addItemToDraft, inventoryIndex]);

  const startScanner = useCallback(async () => {
    stopScanner();
    setScannerError(null);
    setScannerStatus('Starting camera...');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setScannerError('Camera scanning needs HTTPS on mobile browsers.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setScannerError('Camera access is not available on this browser.');
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new nativeDetectorCtor({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'itf'],
        });

        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return;
          if (videoRef.current.readyState < 2) {
            scanFrameRef.current = window.requestAnimationFrame(() => void tick());
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
            } finally {
              scanBusyRef.current = false;
            }
          }
          scanFrameRef.current = window.requestAnimationFrame(() => void tick());
        };

        setScannerRunning(true);
        setScannerStatus('Camera live. Hold the barcode close and align it with the green line.');
        scanFrameRef.current = window.requestAnimationFrame(() => void tick());
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

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: preferredDevice ? { deviceId: { ideal: preferredDevice }, ...videoConstraints } : videoConstraints,
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            setScannerStatus(`Barcode detected: ${result.getText()}`);
            handleBarcodeMatch(result.getText());
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            setScannerError(error instanceof Error ? error.message : 'Unable to read the barcode from camera.');
          }
        },
      );

      scannerControlsRef.current = controls;
      setScannerRunning(true);
      setScannerStatus('Camera live. Move closer until the barcode fills most of the preview.');
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : 'Unable to access camera.');
      setScannerStatus('Scanner failed to start');
      stopScanner();
    }
  }, [handleBarcodeMatch, stopScanner]);

  useEffect(() => {
    if (scannerOpen) void startScanner();
  }, [scannerOpen, startScanner]);

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
    setActiveDraftId(null);
    setDraftItems([]);
    setCustomerName('Walk-in customer');
    setPaymentStatus(billingDefaults.defaultPaymentStatus);
    setPaymentMethod(billingDefaults.defaultPaymentMethod);
    setTaxRate(String(billingDefaults.defaultTaxRate));
    setNotes(billingDefaults.defaultInvoiceNotes);
    setInvoiceError(null);
  };

  const loadDraft = (invoice: SalesInvoice) => {
    setActiveDraftId(invoice.id);
    setCustomerName(invoice.customerName);
    setPaymentStatus(invoice.paymentStatus);
    setPaymentMethod(invoice.paymentMethod);
    setTaxRate(String(invoice.taxRate));
    setNotes(invoice.notes);
    setDraftItems(toDraftLineItems(invoice.lineItems, inventory));
    setInvoiceError(null);
  };

  const handleFinalize = async () => {
    if (!draftItems.length) {
      setInvoiceError('Add at least one product before finalizing the bill.');
      return;
    }

    setIsSavingInvoice(true);
    setInvoiceError(null);
    try {
      const result = await onFinalizeSale({
        existingInvoiceId: activeDraftId || undefined,
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

      const nextInvoice: SalesInvoice = {
        id: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        status: 'finalized',
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
        updatedAt: result.updatedAt,
      };

      setSelectedInvoice(nextInvoice);
      if (window.confirm(`Invoice ${result.invoiceNumber} created. Do you want to print it now?`)) {
        printSalesInvoice(nextInvoice, companyName, businessProfile);
      }
      resetDraft();
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Unable to finalize the bill right now.');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftItems.length) {
      setInvoiceError('Add at least one item before saving a draft.');
      return;
    }

    setSavingDraft(true);
    setInvoiceError(null);
    try {
      const result = await onSaveDraft({
        draftId: activeDraftId || undefined,
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
      setActiveDraftId(result.invoiceId);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Unable to save the invoice draft right now.');
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
      <section className="rounded-[32px] border border-brand-30 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Live bill builder</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-dark">Raise a new invoice anytime</h2>
            <p className="mt-1 text-sm text-brand-dark/65">
              Scan or enter a barcode, build the bill, and print the invoice without leaving the overview page.
            </p>
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
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-brand-10 bg-brand-10 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-10/20 transition hover:-translate-y-0.5 hover:bg-brand-10/95"
            >
              <Camera size={16} />
              Scan into bill
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={savingDraft || !draftItems.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-brand-60 px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60"
            >
              <ClipboardList size={16} />
              {savingDraft ? 'Saving draft...' : activeDraftId ? 'Update draft' : 'Save as draft'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {savedDrafts.length ? (
              <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Invoice drafts</div>
                  <span className="rounded-full border border-brand-30 bg-white px-3 py-1 text-xs font-semibold text-brand-dark">
                    {savedDrafts.length} saved
                  </span>
                </div>
                <div className="mt-4 ui-scrollable max-h-[220px] space-y-3 pr-1">
                  {savedDrafts.map((invoice) => (
                    <div key={invoice.id} className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => loadDraft(invoice)} className="min-w-0 flex-1 text-left">
                          <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                          <div className="mt-1 text-sm text-brand-dark/65">{invoice.customerName} • {formatCurrency(invoice.totalAmount)}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-brand-dark/45">
                            Updated {formatDateTime(invoice.updatedAt)}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeDraftId === invoice.id) {
                              resetDraft();
                            }
                            void onDeleteDraft(invoice.id);
                          }}
                          className="rounded-full p-2 text-rose-600 hover:bg-rose-50"
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Customer name</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Tax rate (%)</span>
                <input inputMode="decimal" value={taxRate} onChange={(event) => /^(\d+(\.\d{0,2})?)?$/.test(event.target.value) && setTaxRate(event.target.value)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Payment status</span>
                <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as InvoicePaymentStatus)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none">
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Payment method</span>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as InvoicePaymentMethod)} className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none">
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
                <span>Invoice note / policy</span>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note for this invoice" className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none" />
              </label>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
              <div className="flex gap-2">
                <input
                  value={manualBarcode}
                  onChange={(event) => setManualBarcode(event.target.value)}
                  placeholder="Scan or type barcode"
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

          <div className="space-y-4">
            {invoiceError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{invoiceError}</div>
            ) : null}

            <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
              {draftItems.length ? (
                draftItems.map((line) => (
                  <div key={line.inventoryItemId} className="rounded-[24px] border border-brand-30 bg-brand-60/25 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-brand-dark">{line.itemName}</div>
                        <div className="mt-1 text-xs text-brand-dark/55">{line.sku} • {line.barcodeValue}</div>
                      </div>
                      <button type="button" onClick={() => updateDraftQuantity(line.inventoryItemId, 0)} className="rounded-full p-2 text-rose-600 hover:bg-rose-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-3 rounded-full border border-brand-30 bg-white px-2 py-2">
                        <button type="button" onClick={() => updateDraftQuantity(line.inventoryItemId, line.quantity - 1)} className="h-8 w-8 rounded-full bg-brand-60 text-sm font-bold text-brand-dark">-</button>
                        <span className="min-w-8 text-center text-sm font-semibold text-brand-dark">{line.quantity}</span>
                        <button type="button" onClick={() => updateDraftQuantity(line.inventoryItemId, line.quantity + 1)} className="h-8 w-8 rounded-full bg-brand-60 text-sm font-bold text-brand-dark">+</button>
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
                  description="Scan a product or type its barcode here to start the invoice."
                />
              )}
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-10 p-5 text-brand-60">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
                <div className="flex items-center justify-between text-sm"><span>Tax ({parsedTaxRate}%)</span><strong>{formatCurrency(taxAmount)}</strong></div>
                <div className="flex items-center justify-between border-t border-white/15 pt-3 text-xl font-semibold"><span>Total</span><strong>{formatCurrency(totalAmount)}</strong></div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSavingInvoice || !draftItems.length}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 transition hover:bg-brand-dark disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {isSavingInvoice ? 'Finalizing...' : activeDraftId ? 'Finalize draft and print' : 'Finalize sale and print'}
            </button>
          </div>
        </div>
      </section>

      {scannerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">Scan Into Bill</h2>
                <p className="mt-1 text-sm text-brand-dark/65">Scans from this popup add straight into the invoice builder.</p>
              </div>
              <button type="button" onClick={() => setScannerOpen(false)} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
                      <button type="button" onClick={scannerRunning ? stopScanner : () => void startScanner()} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60">
                        {scannerRunning ? <CameraOff size={16} /> : <Camera size={16} />}
                        {scannerRunning ? 'Stop scanner' : 'Start scanner'}
                      </button>
                      <button type="button" onClick={() => setScannerOpen(false)} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark">
                        Back to bill
                      </button>
                    </div>
                    <div className="mt-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark/70">{scannerStatus}</div>
                    {scannerError ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{scannerError}</div> : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Manual barcode fallback</div>
                    <div className="mt-3 flex gap-2">
                      <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} placeholder="Paste or type a barcode" className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none" />
                      <button type="button" onClick={() => { handleBarcodeMatch(manualBarcode); setManualBarcode(''); }} disabled={!manualBarcode.trim()} className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60">
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
                          <div className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-dark/50">Selling price</div>
                            <div className="mt-2 text-lg font-semibold text-brand-dark">{formatCurrency(lastScanned.sellingPrice)}</div>
                          </div>
                          <div className="rounded-2xl border border-brand-30 bg-white px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-dark/50">Stock left</div>
                            <div className="mt-2 text-lg font-semibold text-brand-dark">{lastScanned.currentStock}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <EmptyStatePanel compact icon={ScanLine} title="Nothing scanned yet" description="Point the camera at a barcode sticker or use manual entry as fallback." />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SalesInvoiceDetailModal
        open={!!selectedInvoice}
        invoice={selectedInvoice}
        companyName={companyName}
        businessProfile={businessProfile}
        onClose={() => setSelectedInvoice(null)}
      />
    </>
  );
};
