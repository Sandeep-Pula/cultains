import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { Camera, CameraOff, Info, ScanLine, X } from 'lucide-react';
import type { InventoryCategory, InventoryItem, InventoryUnit } from '../types';

type InventoryFormPayload = Pick<
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

type AddInventoryItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: InventoryFormPayload) => void | Promise<void>;
  initialValues?: InventoryItem | null;
  presetValues?: Partial<InventoryItem> | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onDelete?: (() => void | Promise<void>) | null;
};

const categoryOptions: InventoryCategory[] = [
  'Hardware & Tools',
  'Office & Tech',
  'Decor & Lighting',
  'Raw Material',
  'Vehicle',
];

const unitOptions: InventoryUnit[] = ['pcs', 'rolls', 'boxes', 'sets', 'sqm', 'kg', 'litres'];

const initialState = {
  name: '',
  sku: '',
  itemCode: '',
  category: 'Raw Material' as InventoryCategory,
  unit: 'pcs' as InventoryUnit,
  currentStock: '0',
  reservedStock: '0',
  minimumStock: '10',
  reorderQuantity: '20',
  costPerUnit: '0',
  sellingPrice: '0',
  barcodeValue: '',
  storageLocation: '',
  supplierName: '',
  supplierPhone: '',
  notes: '',
};

const toFormState = (item?: Partial<InventoryItem> | null) => ({
  name: item?.name ?? initialState.name,
  sku: item?.sku ?? initialState.sku,
  itemCode: item?.itemCode ?? initialState.itemCode,
  category: item?.category ?? initialState.category,
  unit: item?.unit ?? initialState.unit,
  currentStock: String(item?.currentStock ?? initialState.currentStock),
  reservedStock: String(item?.reservedStock ?? initialState.reservedStock),
  minimumStock: String(item?.minimumStock ?? initialState.minimumStock),
  reorderQuantity: String(item?.reorderQuantity ?? initialState.reorderQuantity),
  costPerUnit: String(item?.costPerUnit ?? initialState.costPerUnit),
  sellingPrice: String(item?.sellingPrice ?? item?.costPerUnit ?? initialState.sellingPrice),
  barcodeValue: item?.barcodeValue ?? initialState.barcodeValue,
  storageLocation: item?.storageLocation ?? initialState.storageLocation,
  supplierName: item?.supplierName ?? initialState.supplierName,
  supplierPhone: item?.supplierPhone ?? initialState.supplierPhone,
  notes: item?.notes ?? initialState.notes,
});

const helpText: Record<string, string> = {
  sku: 'SKU means Stock Keeping Unit. It is the seller or warehouse code used to identify this item quickly.',
  itemCode: 'Use your own internal nomenclature or material code here so your team can match stock to purchase records and project usage.',
  currentStock: 'How many units you physically have right now.',
  reservedStock: 'Units already blocked for active projects or staff requests.',
  minimumStock: 'When stock drops to this level, the item should enter the purchase watch list.',
  reorderQuantity: 'Suggested quantity to buy when you restock this item.',
  costPerUnit: 'Purchase cost for one unit. This helps estimate total stock value.',
  sellingPrice: 'Selling price used when this item is scanned at the billing counter.',
  barcodeValue: 'Scan the manufacturer barcode already printed on the product pack, or leave blank to generate one automatically.',
};

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const getBarcodeDetectorCtor = () =>
  (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;

const Hint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex">
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-30 bg-white text-brand-dark/60 transition hover:text-brand-dark">
      <Info size={12} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-xs leading-5 text-brand-dark shadow-lg group-hover:block">
      {text}
    </span>
  </span>
);

export const AddInventoryItemModal = ({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  presetValues = null,
  title,
  subtitle,
  submitLabel,
  onDelete = null,
}: AddInventoryItemModalProps) => {
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Scanner idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState(initialValues?.category ?? presetValues?.category ?? initialState.category);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const cooldownRef = useRef('');

  const isEditMode = useMemo(() => !!initialValues, [initialValues]);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(initialValues ?? presetValues));
    setCategoryQuery(initialValues?.category ?? presetValues?.category ?? initialState.category);
    setSubmitting(false);
    setScannerOpen(false);
    setScannerError(null);
  }, [initialValues, open, presetValues]);

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const filteredCategories = useMemo(() => {
    const lowered = categoryQuery.trim().toLowerCase();
    if (!lowered) return categoryOptions;
    return categoryOptions.filter((option) => option.toLowerCase().includes(lowered));
  }, [categoryQuery]);

  const setNumberField = (
    field: 'currentStock' | 'reservedStock' | 'minimumStock' | 'reorderQuantity' | 'costPerUnit' | 'sellingPrice',
    value: string,
  ) => {
    if (!/^\d*$/.test(value)) return;
    setField(field, value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...form,
      category: categoryQuery.trim() || initialState.category,
      currentStock: Number(form.currentStock || '0'),
      reservedStock: Number(form.reservedStock || '0'),
      minimumStock: Number(form.minimumStock || '0'),
      reorderQuantity: Number(form.reorderQuantity || '0'),
      costPerUnit: Number(form.costPerUnit || '0'),
      sellingPrice: Number(form.sellingPrice || '0'),
      barcodeValue: form.barcodeValue.trim(),
      itemCode: form.itemCode.trim() || form.sku.trim(),
      storageLocation: form.storageLocation.trim() || 'Main warehouse',
    });
    setForm(initialState);
    setSubmitting(false);
    onClose();
  };

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

  const handleBarcodeMatch = useCallback((barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed || trimmed === cooldownRef.current) return;
    cooldownRef.current = trimmed;
    window.setTimeout(() => {
      if (cooldownRef.current === trimmed) {
        cooldownRef.current = '';
      }
    }, 1200);
    setForm((current) => ({ ...current, barcodeValue: trimmed }));
    setScannerStatus(`Barcode detected: ${trimmed}`);
    setScannerError(null);
    stopScanner();
    setScannerOpen(false);
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    stopScanner();
    setScannerError(null);
    setScannerStatus('Starting camera...');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setScannerError('Camera scanning needs HTTPS on mobile browsers.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setScannerError('Camera access is not available in this browser right now.');
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
                handleBarcodeMatch(matched.rawValue);
                return;
              }
            } catch (error) {
              console.error(error);
            } finally {
              scanBusyRef.current = false;
            }
          }
          scanFrameRef.current = window.requestAnimationFrame(() => void tick());
        };

        setScannerRunning(true);
        setScannerStatus('Camera live. Align the product barcode with the green line.');
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
          video: preferredDevice
            ? { deviceId: { ideal: preferredDevice }, ...videoConstraints }
            : videoConstraints,
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            handleBarcodeMatch(result.getText());
            return;
          }
          if (error && !(error instanceof NotFoundException)) {
            setScannerError(error instanceof Error ? error.message : 'Unable to read barcode from camera.');
          }
        },
      );
      scannerControlsRef.current = controls;
      setScannerRunning(true);
      setScannerStatus('Camera live. Align the product barcode with the green line.');
    } catch (error) {
      console.error(error);
      setScannerError(error instanceof Error ? error.message : 'Unable to access the camera.');
      stopScanner();
    }
  }, [handleBarcodeMatch, stopScanner]);

  useEffect(() => {
    if (scannerOpen) {
      void startScanner();
    } else {
      stopScanner();
      setScannerError(null);
    }
  }, [scannerOpen, startScanner, stopScanner]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-brand-dark/25 p-3 sm:items-center sm:p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,980px)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-brand-60 shadow-2xl">
        <div className="flex items-start justify-between border-b border-brand-30 px-5 py-4 sm:px-6 sticky top-0 z-10 bg-brand-60">
          <div>
            <div className="inline-flex rounded-full bg-brand-30/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/65">
              {isEditMode ? 'Inventory editor' : 'Inventory intake'}
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-brand-dark">
              {title ?? (isEditMode ? 'Edit inventory record' : 'Create a new inventory record')}
            </h3>
            <p className="mt-1 text-sm text-brand-dark/80">
              {subtitle ?? 'Add stock, reorder thresholds, supplier details, and storage info in one place.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-brand-30 bg-white px-3 py-2 text-sm font-medium text-brand-dark shadow-sm"
          >
            <X size={16} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Item name', 'name'],
              ['SKU', 'sku'],
              ['Internal code', 'itemCode'],
              ['Barcode value', 'barcodeValue'],
              ['Storage location', 'storageLocation'],
              ['Supplier name', 'supplierName'],
              ['Supplier phone', 'supplierPhone'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">
                  {label}
                  {helpText[key] ? <Hint text={helpText[key]} /> : null}
                </span>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) => setField(key as keyof typeof form, event.target.value as never)}
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                  required={['name', 'sku'].includes(key)}
                />
                {key === 'barcodeValue' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-brand-60/35 px-3 py-2 text-xs font-semibold text-brand-dark"
                    >
                      <ScanLine size={14} />
                      Scan existing barcode
                    </button>
                    <span className="text-xs text-brand-dark/60">
                      Leave blank if you want the system to generate a new barcode after save.
                    </span>
                  </div>
                ) : null}
              </label>
            ))}

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Category</span>
              <div className="space-y-2">
                <input
                  value={categoryQuery}
                  onChange={(event) => {
                    setCategoryQuery(event.target.value);
                    setField('category', event.target.value as InventoryCategory);
                  }}
                  placeholder="Type a category"
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                />
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.length ? (
                    filteredCategories.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCategoryQuery(option);
                          setField('category', option as InventoryCategory);
                        }}
                        className="rounded-full border border-brand-30 bg-brand-60/30 px-3 py-1.5 text-xs font-semibold text-brand-dark"
                      >
                        {option}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-brand-dark/55">No suggestion found. Your typed category will be used as-is.</div>
                  )}
                </div>
              </div>
            </label>

            <label className="grid gap-2 text-sm text-brand-dark/80">
              <span className="font-medium text-brand-dark">Unit</span>
              <select
                value={form.unit}
                onChange={(event) => setField('unit', event.target.value as InventoryUnit)}
                className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 text-brand-dark"
              >
                {unitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {[
              ['Current stock', 'currentStock'],
              ['Reserved stock', 'reservedStock'],
              ['Minimum stock', 'minimumStock'],
              ['Reorder quantity', 'reorderQuantity'],
              ['Cost per unit', 'costPerUnit'],
              ['Selling price', 'sellingPrice'],
            ].map(([label, key]) => (
              <label key={key} className="grid gap-2 text-sm text-brand-dark/80">
                <span className="flex items-center gap-2 font-medium text-brand-dark">
                  {label}
                  {helpText[key] ? <Hint text={helpText[key]} /> : null}
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) =>
                    setNumberField(
                      key as 'currentStock' | 'reservedStock' | 'minimumStock' | 'reorderQuantity' | 'costPerUnit' | 'sellingPrice',
                      event.target.value,
                    )
                  }
                  className="rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm text-brand-dark/80 md:col-span-2">
              <span className="font-medium text-brand-dark">Operational notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                className="min-h-28 rounded-2xl border border-brand-30 bg-white px-3 py-2.5 outline-none text-brand-dark"
                placeholder="Vendor notes, usage rules, storage cautions, or damage remarks"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-brand-30 bg-gradient-to-br from-white to-brand-30/30 p-5 h-fit">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/65">Inventory logic</div>
            <div className="mt-4 space-y-4">
              {[
                'Items automatically move into purchase alerts when stock falls to the minimum.',
                'You can assign stock to team members and link it to work records later.',
                'Aging or damaged stock can be pushed to clearance without leaving the page.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/85 px-4 py-3 text-sm text-brand-dark/85 shadow-sm">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-10 px-4 py-4 text-sm text-brand-60">
              You can either scan the manufacturer barcode already on the item or let the system generate a business-specific barcode after save.
            </div>
          </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-30 bg-brand-60 px-5 py-4 sm:px-6">
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  setSubmitting(true);
                  await onDelete();
                  setSubmitting(false);
                }}
                className="mr-auto rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700"
              >
                Delete item
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-medium text-brand-60 shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Saving...' : submitLabel ?? (isEditMode ? 'Save changes' : 'Create item')}
            </button>
          </div>
        </form>
      </div>

      {scannerOpen ? (
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-3 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
              <div>
                <div className="inline-flex rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
                  Inventory barcode scan
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-brand-dark">Scan existing product barcode</h3>
                <p className="mt-1 text-sm text-brand-dark/70">
                  Use the barcode already printed on the product so it can be billed directly later.
                </p>
              </div>
              <button onClick={() => setScannerOpen(false)} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="overflow-hidden rounded-[28px] border border-brand-30 bg-brand-60/25">
                <div className="relative aspect-[4/3] bg-brand-dark/95">
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-[10%] top-1/2 -translate-y-1/2">
                      <div className="h-0.5 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_18px_rgba(16,185,129,0.85)]" />
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

              <div className="rounded-[28px] border border-brand-30 bg-brand-60/20 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Manual fallback</div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={form.barcodeValue}
                    onChange={(event) => setField('barcodeValue', event.target.value)}
                    placeholder="Type or paste the item barcode"
                    className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setScannerOpen(false)}
                    className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                  >
                    Use this code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
