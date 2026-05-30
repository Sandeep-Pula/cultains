import { useEffect, useState } from 'react';
import { Bluetooth, Cable, CreditCard, Printer, Save, ScanBarcode, Settings2, ToggleLeft, Usb } from 'lucide-react';
import type { WorkspaceProfile } from '../types';

type SettingsPageProps = {
  companyName: string;
  businessProfile: WorkspaceProfile;
  onSaveBillingDefaults: (profile: Pick<
    WorkspaceProfile,
    'companyName' | 'userName' | 'businessType' | 'workspaceLogoUrl' | 'email' | 'phone' | 'city' | 'studioAddress' | 'gstNumber' | 'teamSize' | 'website' | 'sidebarViews' | 'billingDefaults'
  >) => Promise<void>;
};

export const SettingsPage = ({
  companyName,
  businessProfile,
  onSaveBillingDefaults,
}: SettingsPageProps) => {
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [billingDefaults, setBillingDefaults] = useState(businessProfile.billingDefaults);
  const [deviceMessage, setDeviceMessage] = useState('');

  useEffect(() => {
    setBillingDefaults(businessProfile.billingDefaults);
  }, [businessProfile.billingDefaults]);

  const saveConnectedDevice = (connectionType: NonNullable<typeof billingDefaults.printerConnectionType>, deviceName: string) => {
    const nextDefaults = {
      ...billingDefaults,
      printerConnectionType: connectionType,
      printerDeviceName: deviceName,
    };
    setBillingDefaults(nextDefaults);
    window.localStorage.setItem('pula-biz-printer-device', JSON.stringify({
      connectionType,
      deviceName,
      savedAt: new Date().toISOString(),
    }));
    setDeviceMessage(`${deviceName} is selected for physical invoices.`);
  };

  const connectSystemPrinter = () => {
    saveConnectedDevice('system', 'System print dialog / default printer');
  };

  const connectUsbDevice = async () => {
    const usb = (navigator as Navigator & { usb?: { requestDevice: (options: { filters: unknown[] }) => Promise<{ productName?: string; manufacturerName?: string }> } }).usb;
    if (!usb) {
      setDeviceMessage('This browser does not support WebUSB. Use Chrome/Edge or choose system print.');
      return;
    }
    try {
      const device = await usb.requestDevice({ filters: [] });
      saveConnectedDevice('usb', [device.manufacturerName, device.productName].filter(Boolean).join(' ') || 'USB printer or scanner');
    } catch (error) {
      setDeviceMessage(error instanceof Error ? error.message : 'USB device connection was cancelled.');
    }
  };

  const connectBluetoothDevice = async () => {
    const bluetooth = (navigator as Navigator & { bluetooth?: { requestDevice: (options: { acceptAllDevices: boolean; optionalServices: string[] }) => Promise<{ name?: string }> } }).bluetooth;
    if (!bluetooth) {
      setDeviceMessage('This browser does not support Web Bluetooth. Use Chrome/Edge on a supported device or choose system print.');
      return;
    }
    try {
      const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      saveConnectedDevice('bluetooth', device.name || 'Bluetooth printer or scanner');
    } catch (error) {
      setDeviceMessage(error instanceof Error ? error.message : 'Bluetooth device connection was cancelled.');
    }
  };

  const connectSerialDevice = async () => {
    const serial = (navigator as Navigator & { serial?: { requestPort: () => Promise<{ getInfo?: () => { usbVendorId?: number; usbProductId?: number } }> } }).serial;
    if (!serial) {
      setDeviceMessage('This browser does not support Web Serial. Use Chrome/Edge or choose system print.');
      return;
    }
    try {
      const port = await serial.requestPort();
      const info = port.getInfo?.();
      const label = info?.usbVendorId || info?.usbProductId
        ? `Serial device ${info.usbVendorId || ''}${info.usbProductId ? `:${info.usbProductId}` : ''}`
        : 'Serial printer or barcode scanner';
      saveConnectedDevice('serial', label);
    } catch (error) {
      setDeviceMessage(error instanceof Error ? error.message : 'Serial device connection was cancelled.');
    }
  };

  const handleSaveDefaults = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingDefaults(true);
    try {
      await onSaveBillingDefaults({
        companyName: businessProfile.companyName,
        userName: businessProfile.userName,
        businessType: businessProfile.businessType,
        workspaceLogoUrl: businessProfile.workspaceLogoUrl,
        email: businessProfile.email,
        phone: businessProfile.phone,
        city: businessProfile.city,
        studioAddress: businessProfile.studioAddress,
        gstNumber: businessProfile.gstNumber,
        teamSize: businessProfile.teamSize,
        website: businessProfile.website,
        sidebarViews: businessProfile.sidebarViews,
        billingDefaults,
      });
    } finally {
      setSavingDefaults(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
          <Settings2 size={14} />
          Settings
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
          Keep {companyName || 'your workspace'} standardized.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-dark/70 sm:text-base">
          Centralize the defaults your business uses every day so billing starts with the right values automatically.
        </p>
      </section>

      <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <CreditCard size={14} />
              Centralized defaults
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-brand-dark">Control business-wide billing defaults</h2>
            <p className="mt-2 text-sm text-brand-dark/65">
              Set the default tax, payment mode, payment status, and invoice note once so every fresh bill starts from your business rules.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveDefaults} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default tax rate (%)</span>
            <input
              inputMode="decimal"
              value={String(billingDefaults.defaultTaxRate)}
              onChange={(event) => /^(\d+(\.\d{0,2})?)?$/.test(event.target.value) && setBillingDefaults((current) => ({
                ...current,
                defaultTaxRate: Number(event.target.value || '0'),
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default payment status</span>
            <select
              value={billingDefaults.defaultPaymentStatus}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultPaymentStatus: event.target.value as typeof current.defaultPaymentStatus,
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default GST mode</span>
            <select
              value={billingDefaults.defaultTaxMode || 'intra_state'}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultTaxMode: event.target.value as NonNullable<typeof current.defaultTaxMode>,
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            >
              <option value="intra_state">CGST + SGST (intra-state)</option>
              <option value="inter_state">IGST (inter-state)</option>
              <option value="no_gst">No GST</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default place of supply</span>
            <input
              value={billingDefaults.defaultPlaceOfSupply || ''}
              onChange={(event) => setBillingDefaults((current) => ({ ...current, defaultPlaceOfSupply: event.target.value }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
              placeholder="Telangana"
            />
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Invoice number prefix</span>
            <input
              value={billingDefaults.invoicePrefix || 'INV'}
              onChange={(event) => setBillingDefaults((current) => ({ ...current, invoicePrefix: event.target.value.toUpperCase() }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Quotation number prefix</span>
            <input
              value={billingDefaults.quotationPrefix || 'QUO'}
              onChange={(event) => setBillingDefaults((current) => ({ ...current, quotationPrefix: event.target.value.toUpperCase() }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-brand-dark/75">
            <span>Default payment method</span>
            <select
              value={billingDefaults.defaultPaymentMethod}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultPaymentMethod: event.target.value as typeof current.defaultPaymentMethod,
              }))}
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
            <span>Default UPI ID</span>
            <input
              type="text"
              value={billingDefaults.defaultUpiId || ''}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultUpiId: event.target.value,
              }))}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
              placeholder="store@upi"
            />
          </label>
          <div className="rounded-[24px] border border-brand-30 bg-brand-60/20 p-4 md:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
                  <Printer size={14} />
                  Physical invoice printing
                </div>
                <h3 className="mt-3 text-xl font-semibold text-brand-dark">Thermal printer and scanner setup</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-dark/65">
                  Connect a thermal printer, barcode scanner, or keep system print as fallback. Browsers ask permission before showing Bluetooth, USB, or serial devices.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark">
                <input
                  type="checkbox"
                  checked={Boolean(billingDefaults.physicalInvoicePrintingEnabled)}
                  onChange={(event) => setBillingDefaults((current) => ({
                    ...current,
                    physicalInvoicePrintingEnabled: event.target.checked,
                  }))}
                  className="h-5 w-5 accent-brand-10"
                />
                Print physical invoice
              </label>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Printer mode</span>
                <select
                  value={billingDefaults.printerConnectionType || 'system'}
                  onChange={(event) => setBillingDefaults((current) => ({
                    ...current,
                    printerConnectionType: event.target.value as NonNullable<typeof current.printerConnectionType>,
                  }))}
                  className="rounded-2xl border border-brand-30 bg-white px-4 py-3 outline-none"
                >
                  <option value="system">System print</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="usb">USB</option>
                  <option value="serial">Serial / USB scanner</option>
                  <option value="wifi">WiFi / network</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>Paper width</span>
                <select
                  value={billingDefaults.printerPaperWidth || '80mm'}
                  onChange={(event) => setBillingDefaults((current) => ({
                    ...current,
                    printerPaperWidth: event.target.value as NonNullable<typeof current.printerPaperWidth>,
                  }))}
                  className="rounded-2xl border border-brand-30 bg-white px-4 py-3 outline-none"
                >
                  <option value="80mm">80 mm receipt</option>
                  <option value="58mm">58 mm receipt</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-brand-dark/75">
                <span>WiFi printer address</span>
                <input
                  value={billingDefaults.networkPrinterAddress || ''}
                  onChange={(event) => setBillingDefaults((current) => ({
                    ...current,
                    networkPrinterAddress: event.target.value,
                    printerConnectionType: event.target.value.trim() ? 'wifi' : current.printerConnectionType,
                  }))}
                  className="rounded-2xl border border-brand-30 bg-white px-4 py-3 outline-none"
                  placeholder="192.168.1.55 or printer.local"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={connectSystemPrinter} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark">
                <Printer size={16} />
                System print
              </button>
              <button type="button" onClick={() => void connectBluetoothDevice()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark">
                <Bluetooth size={16} />
                Bluetooth
              </button>
              <button type="button" onClick={() => void connectUsbDevice()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark">
                <Usb size={16} />
                USB
              </button>
              <button type="button" onClick={() => void connectSerialDevice()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-semibold text-brand-dark">
                <Cable size={16} />
                Serial
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-brand-30 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                  <ScanBarcode size={16} />
                  Selected device
                </div>
                <p className="mt-2 text-sm text-brand-dark/65">
                  {billingDefaults.printerDeviceName || 'No printer or scanner selected yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-brand-30 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                  <ToggleLeft size={16} />
                  Invoice behavior
                </div>
                <p className="mt-2 text-sm text-brand-dark/65">
                  {billingDefaults.physicalInvoicePrintingEnabled
                    ? 'Invoices will be saved, then the physical print flow will start automatically.'
                    : 'Invoices will only be saved in the system. No physical invoice will print.'}
                </p>
              </div>
            </div>

            {deviceMessage ? (
              <div className="mt-4 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm text-brand-dark/70">
                {deviceMessage}
              </div>
            ) : null}
          </div>
          <label className="grid gap-2 text-sm text-brand-dark/75 md:col-span-2">
            <span>Default invoice note / policy</span>
            <textarea
              value={billingDefaults.defaultInvoiceNotes}
              onChange={(event) => setBillingDefaults((current) => ({
                ...current,
                defaultInvoiceNotes: event.target.value,
              }))}
              rows={4}
              className="rounded-2xl border border-brand-30 bg-brand-60/35 px-4 py-3 outline-none"
              placeholder="Store policy, returns, refund terms, or any default invoice footer note"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingDefaults}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60 disabled:opacity-60"
            >
              <Save size={15} />
              {savingDefaults ? 'Saving defaults...' : 'Save centralized defaults'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
