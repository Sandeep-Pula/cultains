import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { jsPDF } from 'jspdf';
import { Barcode, Camera, CameraOff, Expand, PackageSearch, Plus, Printer, ScanLine, Trash2, X } from 'lucide-react';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { renderBarcodeDataUrl, renderBarcodeSvgMarkup } from '../barcodeUtils';
import type { InventoryItem, SalesInvoice, WorkspaceProfile } from '../types';
import { formatCurrency } from '../utils';

type BarcodeDeskPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
};

type ActiveModal = 'studio' | 'scanner' | null;

type ProductStats = {
  soldUnits: number;
  invoiceCount: number;
  salesRevenue: number;
};

type DetectedBarcode = { rawValue?: string };
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
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-brand-dark/65">{subtitle}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark" aria-label="Close popup">
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
  inventory,
  salesInvoices,
}: BarcodeDeskPageProps) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [query, setQuery] = useState('');
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [lookupItem, setLookupItem] = useState<InventoryItem | null>(null);
  const [lastScanned, setLastScanned] = useState<InventoryItem | null>(null);
  const [printQueue, setPrintQueue] = useState<string[]>([]);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Scanner idle');
  const [scannerError, setScannerError] = useState<string | null>(null);

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

  const recentInvoices = useMemo(
    () => salesInvoices.filter((invoice) => invoice.status !== 'draft').slice().sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [salesInvoices],
  );

  const salesStats = useMemo(() => {
    const nextMap = new Map<string, ProductStats>();
    recentInvoices.forEach((invoice) => {
      invoice.lineItems.forEach((line) => {
        const existing = nextMap.get(line.inventoryItemId) ?? { soldUnits: 0, invoiceCount: 0, salesRevenue: 0 };
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
    return inventory.filter((item) => `${item.name} ${item.sku} ${item.itemCode} ${item.barcodeValue}`.toLowerCase().includes(lowered));
  }, [inventory, query]);

  const queueItems = useMemo(
    () => printQueue.map((id) => inventory.find((item) => item.id === id)).filter(Boolean) as InventoryItem[],
    [inventory, printQueue],
  );

  const lookupStats = lookupItem ? salesStats.get(lookupItem.id) : null;

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
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerRunning(false);
    setScannerStatus('Scanner idle');
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);
  useEffect(() => {
    if (activeModal !== 'scanner') {
      stopScanner();
      setScannerError(null);
    }
  }, [activeModal, stopScanner]);

  const togglePrintQueue = (itemId: string) => {
    setPrintQueue((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  };

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
    if (!trimmed || trimmed === cooldownRef.current) return;

    cooldownRef.current = trimmed;
    window.setTimeout(() => {
      if (cooldownRef.current === trimmed) cooldownRef.current = '';
    }, 1200);

    lookupInventoryItem(trimmed);
    setActiveModal('studio');
  }, [lookupInventoryItem]);

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
      if (nativeDetectorCtor) {
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
        setScannerStatus('Camera live. Align the barcode with the green line.');
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
      setScannerError(error instanceof Error ? error.message : 'Unable to access the camera.');
      setScannerStatus('Scanner failed to start');
      stopScanner();
    }
  }, [handleBarcodeMatch, stopScanner]);

  useEffect(() => {
    if (activeModal === 'scanner') void startScanner();
  }, [activeModal, startScanner]);

  const downloadA4Pdf = () => {
    if (!queueItems.length) {
      setScannerError('Add at least one barcode to the print queue before downloading the A4 sheet.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 10;
    const columns = 3;
    const gap = 4;
    const labelWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
    const labelHeight = 36;

    queueItems.forEach((item, index) => {
      const itemsPerPage = columns * 7;
      if (index > 0 && index % itemsPerPage === 0) doc.addPage();

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
        ${items.map((item) => `
          <div class="label">
            <h3>${item.name}</h3>
            <div class="muted">${item.sku} • Price ${formatCurrency(item.sellingPrice)}</div>
            <div class="barcode">${renderBarcodeSvgMarkup(item.barcodeValue, 1.6, 48)}</div>
          </div>
        `).join('')}
      </div>
    `;

    printHtml(`${companyName} barcode stickers`, body);
  };

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
                Dedicated barcode sticker studio for fast printing and lookup.
              </h1>
              <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
                Build sticker sheets, scan products for stock and sales lookup, and keep the live invoicing workflow in the Billing tab.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Queued labels" value={queueItems.length} />
              <MetricCard label="Products" value={inventory.length} />
              <MetricCard label="Company" value={companyName || businessProfile.companyName || 'Business'} />
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-30 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand-dark">Sticker Studio</h2>
                  <p className="mt-1 text-sm text-brand-dark/65">Queue multiple labels, print one A4 sheet, and inspect scanned product stats.</p>
                </div>
                <button type="button" onClick={() => setActiveModal('studio')} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark">
                  <Expand size={16} />
                  Launch studio
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricCard label="Labels queued" value={queueItems.length} />
                <MetricCard label="Products" value={inventory.length} />
                <MetricCard label="Lookup focus" value={lookupItem ? lookupItem.name : 'None'} />
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
                        <button type="button" onClick={() => togglePrintQueue(item.id)} className="rounded-full p-2 text-brand-dark/65 hover:bg-brand-60">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyStatePanel compact icon={Barcode} title="Queue is empty" description="Add barcode stickers to the queue, then open Sticker Studio for A4 PDF export." />
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-5">
              <div>
                <h2 className="text-xl font-semibold text-brand-dark">Barcode Lookup</h2>
                <p className="mt-1 text-sm text-brand-dark/65">Scan a product here to see sold units, invoice count, stock left, and revenue.</p>
              </div>
              <div className="mt-4 flex gap-2">
                <input value={lookupBarcode} onChange={(event) => setLookupBarcode(event.target.value)} placeholder="Scan or paste barcode" className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none" />
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
                  <EmptyStatePanel compact icon={PackageSearch} title="No product looked up yet" description="Use the studio scan button or paste a barcode here to inspect item stats." />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {activeModal === 'studio' ? (
        <ModalShell title="Sticker Studio" subtitle="Search products, inspect barcode stats, and build a scrollable multi-label print queue." onClose={() => setActiveModal(null)}>
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by item, SKU, code, or barcode" className="w-full rounded-2xl border border-brand-30 bg-brand-60/30 px-4 py-3 text-sm text-brand-dark outline-none lg:max-w-md" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setActiveModal('scanner')} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60">
                    <Camera size={16} />
                    Scan in studio
                  </button>
                  <button type="button" onClick={downloadA4Pdf} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark">
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
                        <BarcodeLabel compact value={item.barcodeValue} title={item.name} subtitle={`${item.sku} • ${formatCurrency(item.sellingPrice)}`} />
                        <div className="grid grid-cols-2 gap-3">
                          <MetricCard label="Sold" value={salesStats.get(item.id)?.soldUnits ?? 0} />
                          <MetricCard label="Stock left" value={item.currentStock} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => printStickerSheet([item])} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
                            <Printer size={15} />
                            Print one
                          </button>
                          <button type="button" onClick={() => togglePrintQueue(item.id)} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark">
                            <Plus size={15} />
                            {printQueue.includes(item.id) ? 'Remove from queue' : 'Add to queue'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="md:col-span-2">
                      <EmptyStatePanel icon={PackageSearch} title="No products found" description="Try another search term or add more items in inventory first." />
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
                  <div className="rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold text-brand-dark">{queueItems.length} labels</div>
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
                          <button type="button" onClick={() => togglePrintQueue(item.id)} className="rounded-full p-2 text-brand-dark/60 hover:bg-brand-60">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyStatePanel compact icon={Barcode} title="No labels queued" description="Add multiple products from the left and download one A4 barcode sheet." />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={downloadA4Pdf} className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60">
                    <Printer size={16} />
                    Download A4 PDF
                  </button>
                  <button type="button" onClick={() => printStickerSheet(queueItems)} disabled={!queueItems.length} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark disabled:opacity-60">
                    Print queue
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Barcode Lookup</div>
                <p className="mt-1 text-sm text-brand-dark/65">Scan here to see sold units, invoices count, stock left, and revenue for the product.</p>
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
                    <EmptyStatePanel compact icon={PackageSearch} title="No product looked up yet" description="Use the studio scan button or paste a barcode here to inspect item stats." />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'scanner' ? (
        <ModalShell title="Scan Product In Studio" subtitle="Scans from this popup show product details and sales stats inside Sticker Studio." onClose={() => setActiveModal(null)}>
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
                  <button type="button" onClick={() => setActiveModal('studio')} className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark">
                    Back to studio
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
                  <input value={lookupBarcode} onChange={(event) => setLookupBarcode(event.target.value)} placeholder="Paste or type a barcode" className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none" />
                  <button
                    type="button"
                    onClick={() => {
                      handleBarcodeMatch(lookupBarcode);
                      setLookupBarcode('');
                    }}
                    disabled={!lookupBarcode.trim()}
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
                    <EmptyStatePanel compact icon={ScanLine} title="Nothing scanned yet" description="Point the camera at a barcode sticker or use manual entry as fallback." />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
};
