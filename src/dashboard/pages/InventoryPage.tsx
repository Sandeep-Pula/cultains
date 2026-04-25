import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import {
  AlertTriangle,
  Boxes,
  Camera,
  CameraOff,
  Package,
  Plus,
  ScanLine,
  ShieldAlert,
  Warehouse,
  X,
} from 'lucide-react';
import type { CustomerProject, InventoryItem } from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { AddInventoryItemModal } from '../components/AddInventoryItemModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, getInventoryFlags, relativeDate } from '../utils';

type InventoryPageProps = {
  inventory: InventoryItem[];
  customers: CustomerProject[];
  businessConfig: WorkspaceBusinessConfig;
  onAddItem: (payload: Pick<
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
  >) => Promise<void>;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
};

type InventoryFilter = 'all' | 'purchase' | 'clearance' | 'assigned' | 'healthy';
type InventoryInsightKey = 'active' | 'purchase' | 'clearance' | 'value';

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const getBarcodeDetectorCtor = () =>
  (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;

const filterOptions: { key: InventoryFilter; label: string }[] = [
  { key: 'all', label: 'All stock' },
  { key: 'purchase', label: 'Needs purchase' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'healthy', label: 'Healthy' },
];

const statusStyles = {
  'in-stock': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'low-stock': 'bg-amber-50 text-amber-800 border-amber-200',
  'out-of-stock': 'bg-rose-50 text-rose-700 border-rose-200',
  clearance: 'bg-violet-50 text-violet-700 border-violet-200',
};

const procurementLabels = {
  none: 'Stable',
  to_order: 'To order',
  ordered: 'Ordered',
  received: 'Received',
};

const procurementStyles = {
  none: 'bg-white text-brand-dark border-brand-30',
  to_order: 'bg-amber-50 text-amber-800 border-amber-200',
  ordered: 'bg-sky-50 text-sky-800 border-sky-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const flagLabels = {
  needs_purchase: 'Needs purchase',
  clearance_watch: 'Clearance',
  over_reserved: 'Over reserved',
  audit_due: 'Audit due',
};

const flagStyles = {
  needs_purchase: 'bg-amber-50 text-amber-800 border-amber-200',
  clearance_watch: 'bg-violet-50 text-violet-700 border-violet-200',
  over_reserved: 'bg-rose-50 text-rose-700 border-rose-200',
  audit_due: 'bg-sky-50 text-sky-700 border-sky-200',
};

const InsightModal = ({
  title,
  subtitle,
  items,
  onClose,
  onOpenItem,
}: {
  title: string;
  subtitle: string;
  items: InventoryItem[];
  onClose: () => void;
  onOpenItem: (item: InventoryItem) => void;
}) => (
  <div className="fixed inset-0 z-[135] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-3 backdrop-blur-sm sm:items-center">
    <div className="flex h-[min(90vh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-2xl font-semibold text-brand-dark">{title}</h3>
          <p className="mt-1 text-sm text-brand-dark/70">{subtitle}</p>
        </div>
        <button onClick={onClose} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item)}
                className="w-full rounded-[24px] border border-brand-30 bg-brand-60/20 p-4 text-left transition hover:border-brand-10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-brand-dark">{item.name}</div>
                    <div className="mt-1 truncate text-sm text-brand-dark/60">
                      {item.sku} • {item.category} • {item.barcodeValue}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-brand-dark">{item.currentStock} {item.unit}</div>
                    <div className="mt-1 text-xs text-brand-dark/55">{formatCurrency(item.sellingPrice)}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-30 bg-brand-60/15 px-4 py-10 text-center text-sm text-brand-dark/60">
              Nothing to show here yet.
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const InventoryScanModal = ({
  items,
  onClose,
  onMatch,
  onCreateNew,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onMatch: (item: InventoryItem) => void;
  onCreateNew: (barcodeValue: string) => void;
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Scanner idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const cooldownRef = useRef('');

  const inventoryRef = useRef<InventoryItem[]>(items);
  inventoryRef.current = items;

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

  const handleBarcode = useCallback((barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed || trimmed === cooldownRef.current) return;
    cooldownRef.current = trimmed;
    window.setTimeout(() => {
      if (cooldownRef.current === trimmed) cooldownRef.current = '';
    }, 1200);
    setScannerStatus(`Barcode detected: ${trimmed}`);
    const matched = inventoryRef.current.find((item) => item.barcodeValue === trimmed);
    stopScanner();
    if (matched) {
      onMatch(matched);
      return;
    }
    onCreateNew(trimmed);
  }, [onCreateNew, onMatch, stopScanner]);

  const startScanner = useCallback(async () => {
    stopScanner();
    setScannerError(null);
    setScannerStatus('Starting camera...');
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setScannerError('Camera access is not available in this browser.');
      return;
    }
    try {
      const constraints: MediaTrackConstraints = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };
      const nativeDetectorCtor = getBarcodeDetectorCtor();
      if (nativeDetectorCtor) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
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
                handleBarcode(matched.rawValue);
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
        setScannerStatus('Camera live. Align barcode with the green line.');
        scanFrameRef.current = window.requestAnimationFrame(() => void tick());
        return;
      }
      const devices = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
      const preferredDevice = devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId || devices[0]?.deviceId;
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
          video: preferredDevice ? { deviceId: { ideal: preferredDevice }, ...constraints } : constraints,
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            handleBarcode(result.getText());
            return;
          }
          if (error && !(error instanceof NotFoundException)) {
            setScannerError(error instanceof Error ? error.message : 'Unable to read barcode from camera.');
          }
        },
      );
      scannerControlsRef.current = controls;
      setScannerRunning(true);
      setScannerStatus('Camera live. Align barcode with the green line.');
    } catch (error) {
      console.error(error);
      setScannerError(error instanceof Error ? error.message : 'Unable to access camera.');
      stopScanner();
    }
  }, [handleBarcode, stopScanner]);

  useEffect(() => {
    void startScanner();
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-brand-dark/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-2xl font-semibold text-brand-dark">Scan inventory barcode</h3>
            <p className="mt-1 text-sm text-brand-dark/70">
              Scan an existing item to edit stock. If it does not exist yet, you can add it as a new inventory item.
            </p>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="rounded-2xl border border-brand-30 bg-brand-60/40 p-2 text-brand-dark">
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
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/60">Manual barcode fallback</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value)}
                placeholder="Paste or type a barcode"
                className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark outline-none"
              />
              <button
                type="button"
                onClick={() => handleBarcode(manualBarcode)}
                className="rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
              >
                Use barcode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InventoryPage = ({
  inventory,
  customers,
  businessConfig,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InventoryPageProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPresetValues, setAddPresetValues] = useState<Partial<InventoryItem> | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [insightModal, setInsightModal] = useState<InventoryInsightKey | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const filteredInventory = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return inventory
      .filter((item) => {
        const matchesQuery =
          !lowered ||
          item.name.toLowerCase().includes(lowered) ||
          item.sku.toLowerCase().includes(lowered) ||
          item.itemCode.toLowerCase().includes(lowered) ||
          item.barcodeValue.toLowerCase().includes(lowered) ||
          item.storageLocation.toLowerCase().includes(lowered) ||
          item.supplierName.toLowerCase().includes(lowered);

        const matchesFilter =
          filter === 'all' ||
          (filter === 'purchase' &&
            (item.status === 'out-of-stock' ||
              item.status === 'low-stock' ||
              item.procurementStatus === 'to_order' ||
              item.procurementStatus === 'ordered')) ||
          (filter === 'clearance' && item.status === 'clearance') ||
          (filter === 'assigned' && (item.assignedTeamIds.length > 0 || item.assignedProjectIds.length > 0)) ||
          (filter === 'healthy' && item.status === 'in-stock' && item.procurementStatus === 'none');

        return matchesQuery && matchesFilter;
      })
      .sort((left, right) => new Date(right.lastRestockedAt).getTime() - new Date(left.lastRestockedAt).getTime());
  }, [filter, inventory, query]);

  const totalValue = inventory.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0);
  const purchaseNeeded = inventory.filter(
    (item) =>
      item.status === 'out-of-stock' ||
      item.status === 'low-stock' ||
      item.procurementStatus === 'to_order' ||
      item.procurementStatus === 'ordered',
  );
  const clearanceItems = inventory.filter((item) => item.status === 'clearance');
  const stockValueItems = inventory
    .slice()
    .sort((left, right) => right.currentStock * right.costPerUnit - left.currentStock * left.costPerUnit);

  const insightConfig = useMemo(() => {
    if (insightModal === 'active') {
      return {
        title: 'Active SKUs',
        subtitle: 'Every tracked inventory item in your workspace.',
        items: inventory,
      };
    }
    if (insightModal === 'purchase') {
      return {
        title: 'Purchase Queue',
        subtitle: 'Items that need purchase attention or are already in procurement.',
        items: purchaseNeeded,
      };
    }
    if (insightModal === 'clearance') {
      return {
        title: 'Clearance Desk',
        subtitle: 'Items that are in clearance or marked as aging or damaged.',
        items: clearanceItems,
      };
    }
    if (insightModal === 'value') {
      return {
        title: 'Stock Value',
        subtitle: 'Inventory sorted by stock value so you can focus on the biggest holdings first.',
        items: stockValueItems,
      };
    }
    return null;
  }, [clearanceItems, insightModal, inventory, purchaseNeeded, stockValueItems]);

  return (
    <div className="flex min-h-[760px] flex-col gap-5 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Inventory workspace</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-brand-dark/80">{businessConfig.inventoryIntro}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setScanModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-5 py-2.5 text-[15px] font-semibold text-brand-dark shadow-sm transition hover:border-brand-10"
          >
            <ScanLine size={18} />
            Scan inventory barcode
          </button>
          <button
            onClick={() => {
              setAddPresetValues(null);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-5 py-2.5 text-[15px] font-semibold text-brand-60 shadow-sm transition hover:bg-brand-dark"
          >
            <Plus size={18} />
            Add inventory item
          </button>
        </div>
      </div>

      <div className="shrink-0 grid gap-4 md:grid-cols-4">
        {[
          {
            key: 'active' as const,
            icon: Boxes,
            label: 'Active SKUs',
            value: String(inventory.length),
            tone: 'text-brand-dark/50',
          },
          {
            key: 'purchase' as const,
            icon: AlertTriangle,
            label: 'Purchase queue',
            value: String(purchaseNeeded.length),
            tone: 'text-amber-700/70',
          },
          {
            key: 'clearance' as const,
            icon: ShieldAlert,
            label: 'Clearance desk',
            value: String(clearanceItems.length),
            tone: 'text-violet-700/70',
          },
          {
            key: 'value' as const,
            icon: Warehouse,
            label: 'Stock value',
            value: formatCurrency(totalValue),
            tone: 'text-brand-dark/50',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setInsightModal(card.key)}
              className="rounded-[24px] border border-brand-30 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-10"
            >
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${card.tone}`}>
                <Icon size={14} />
                {card.label}
              </div>
              <div className="mt-2 text-3xl font-semibold text-brand-dark">{card.value}</div>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
        {!inventory.length ? (
          <div className="flex h-full items-center justify-center bg-brand-60/35">
            <EmptyStatePanel
              icon={Package}
              title="Inventory is empty"
              description={`Create your first stock record to track current units, reorder thresholds, supplier details, and ${businessConfig.workLabel.toLowerCase()} usage in one table.`}
              actions={[
                { label: 'Create first item', onClick: () => setAddModalOpen(true), emphasis: 'primary' },
                { label: 'Open customers', onClick: () => (window.location.hash = '#dashboard/customers') },
              ]}
            />
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-brand-30 bg-brand-60/35 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Inventory table</h2>
                  <p className="mt-0.5 text-xs text-brand-dark/60">
                    Scroll through your full inventory and click any row to edit the record.
                  </p>
                </div>
                <div className="rounded-full bg-brand-30/60 px-3 py-1 text-xs font-semibold text-brand-dark">
                  {filteredInventory.length} visible
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by item name, SKU, code, supplier, or storage location"
                  className="w-full rounded-2xl border border-brand-30 bg-white px-4 py-2.5 text-sm text-brand-dark outline-none lg:max-w-md"
                />
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setFilter(option.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        filter === option.key
                          ? 'bg-brand-10 text-brand-60'
                          : 'border border-brand-30 bg-white text-brand-dark/70 hover:text-brand-dark'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="max-h-[calc(100vh-21rem)] min-h-[24rem] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                      {['Item', 'Code', 'Price', 'Category', 'Stock', 'Reserved', 'Reorder', 'Supplier', 'Flags', 'Status', 'Updated'].map((label) => (
                        <th key={label} className="border-b border-brand-30 px-5 py-4">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length ? (
                      filteredInventory.map((item) => {
                        const available = Math.max(item.currentStock - item.reservedStock, 0);
                        const linkedProject = customers.find((customer) => item.assignedProjectIds.includes(customer.id));
                        const assignedCount = item.assignedTeamIds.length + item.assignedProjectIds.length;
                        const autoFlags = getInventoryFlags(item);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setEditingItem(item)}
                            className="cursor-pointer transition hover:bg-brand-60/35"
                          >
                            <td className="border-b border-brand-30/70 px-5 py-4">
                              <div className="font-semibold text-brand-dark">{item.name}</div>
                              <div className="mt-1 text-sm text-brand-dark/60">
                                {item.storageLocation}
                                {linkedProject ? ` • Linked to ${linkedProject.customerName}` : ''}
                              </div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                              <div>{item.sku}</div>
                              <div className="mt-1 text-xs text-brand-dark/50">{item.itemCode}</div>
                              <div className="mt-1 text-[11px] text-brand-dark/40">{item.barcodeValue}</div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                              <div className="font-semibold text-brand-dark">{formatCurrency(item.sellingPrice)}</div>
                              <div className="mt-1 text-xs text-brand-dark/50">Cost {formatCurrency(item.costPerUnit)}</div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">{item.category}</td>
                            <td className="border-b border-brand-30/70 px-5 py-4">
                              <div className="font-semibold text-brand-dark">{item.currentStock} {item.unit}</div>
                              <div className="mt-1 text-xs text-brand-dark/50">{available} available</div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                              {item.reservedStock} {item.unit}
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                              {item.reorderQuantity} {item.unit}
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/75">
                              <div>{item.supplierName || 'No supplier set'}</div>
                              <div className="mt-1 text-xs text-brand-dark/50">
                                {assignedCount ? `${assignedCount} linked allocation${assignedCount > 1 ? 's' : ''}` : 'No allocations'}
                              </div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4">
                              <div className="flex max-w-44 flex-wrap gap-1.5">
                                {autoFlags.length ? (
                                  autoFlags.map((flag) => (
                                    <span key={flag} className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${flagStyles[flag]}`}>
                                      {flagLabels[flag]}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-brand-dark/45">No flags</span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4">
                              <div className="flex flex-col gap-2">
                                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[item.status]}`}>
                                  {item.status.replace('-', ' ')}
                                </span>
                                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${procurementStyles[item.procurementStatus]}`}>
                                  {procurementLabels[item.procurementStatus]}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark/60">
                              {relativeDate(item.lastRestockedAt)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-5 py-16 text-center text-sm text-brand-dark/55">
                          No inventory items match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AddInventoryItemModal
        open={addModalOpen}
        presetValues={addPresetValues}
        onClose={() => {
          setAddModalOpen(false);
          setAddPresetValues(null);
        }}
        onSubmit={onAddItem}
      />

      <AddInventoryItemModal
        open={!!editingItem}
        initialValues={editingItem}
        title="Edit inventory record"
        subtitle="Update stock, supplier information, reorder rules, and storage details in one form."
        submitLabel="Save changes"
        onClose={() => setEditingItem(null)}
        onSubmit={async (payload) => {
          if (!editingItem) return;
          await onUpdateItem(editingItem.id, payload);
        }}
        onDelete={editingItem ? async () => setDeleteCandidateId(editingItem.id) : null}
      />

      <ConfirmDialog
        open={!!deleteCandidateId}
        title="Delete this inventory item?"
        description="This removes the stock record from your inventory workspace. Use this only when the item should no longer be tracked."
        confirmLabel="Delete item"
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          if (!deleteCandidateId) return;
          await onDeleteItem(deleteCandidateId);
          setDeleteCandidateId(null);
          setEditingItem(null);
        }}
      />

      {insightConfig ? (
        <InsightModal
          title={insightConfig.title}
          subtitle={insightConfig.subtitle}
          items={insightConfig.items}
          onClose={() => setInsightModal(null)}
          onOpenItem={(item) => {
            setInsightModal(null);
            setEditingItem(item);
          }}
        />
      ) : null}

      {scanModalOpen ? (
        <InventoryScanModal
          items={inventory}
          onClose={() => setScanModalOpen(false)}
          onMatch={(item) => {
            setScanModalOpen(false);
            setEditingItem(item);
          }}
          onCreateNew={(barcodeValue) => {
            setScanModalOpen(false);
            setAddPresetValues({ barcodeValue });
            setAddModalOpen(true);
          }}
        />
      ) : null}
    </div>
  );
};
