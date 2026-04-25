import { Printer, X } from 'lucide-react';
import type { SalesInvoice, WorkspaceProfile } from '../types';
import { formatCurrency, formatDateTime } from '../utils';
import { printSalesInvoice } from '../invoicePrint';

type SalesInvoiceDetailModalProps = {
  invoice: SalesInvoice | null;
  open: boolean;
  companyName: string;
  businessProfile: WorkspaceProfile;
  onClose: () => void;
};

export const SalesInvoiceDetailModal = ({
  invoice,
  open,
  companyName,
  businessProfile,
  onClose,
}: SalesInvoiceDetailModalProps) => {
  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/45 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-30 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">{invoice.invoiceNumber}</h2>
            <p className="mt-1 text-sm text-brand-dark/65">
              Created {formatDateTime(invoice.createdAt)} for {invoice.customerName}
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-brand-30 bg-white p-5 sm:p-6">
              <div className="border-b border-dashed border-brand-dark/35 pb-4 text-center">
                {businessProfile.workspaceLogoUrl ? (
                  <img
                    src={businessProfile.workspaceLogoUrl}
                    alt={`${companyName || businessProfile.companyName || 'Business'} logo`}
                    className="mx-auto mb-3 h-16 w-16 object-contain grayscale"
                  />
                ) : null}
                <div className="text-3xl font-semibold uppercase tracking-[0.08em] text-black">
                  {companyName || businessProfile.companyName || 'Business'}
                </div>
                <div className="mt-2 text-sm leading-6 text-black">
                  {businessProfile.studioAddress || businessProfile.city || 'Business address not set yet'}
                </div>
                {businessProfile.phone ? <div className="text-sm text-black">PHONE : {businessProfile.phone}</div> : null}
                {businessProfile.gstNumber ? <div className="text-sm text-black">GSTIN : {businessProfile.gstNumber}</div> : null}
              </div>

              <div className="grid gap-3 border-b border-dashed border-brand-dark/35 py-4 text-sm text-black sm:grid-cols-2">
                <div><span className="font-semibold">Bill No:</span> {invoice.invoiceNumber}</div>
                <div className="sm:text-right"><span className="font-semibold">Date:</span> {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><span className="font-semibold">Customer:</span> {invoice.customerName}</div>
                <div className="sm:text-right"><span className="font-semibold">Payment:</span> {invoice.paymentMethod.replace('_', ' ')}</div>
                <div><span className="font-semibold">Billed By:</span> {invoice.billedBy}</div>
                <div className="sm:text-right"><span className="font-semibold">Status:</span> {invoice.paymentStatus}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="mt-4 w-full min-w-[620px] border-collapse text-sm text-black">
                  <thead>
                    <tr className="border-y border-dashed border-brand-dark/35">
                      <th className="px-2 py-3 text-left font-semibold">SN</th>
                      <th className="px-2 py-3 text-left font-semibold">Item</th>
                      <th className="px-2 py-3 text-right font-semibold">Qty</th>
                      <th className="px-2 py-3 text-right font-semibold">Price</th>
                      <th className="px-2 py-3 text-right font-semibold">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((line, index) => (
                      <tr key={`${invoice.id}-${line.inventoryItemId}-${index}`} className="align-top">
                        <td className="px-2 py-3">{index + 1}</td>
                        <td className="px-2 py-3">
                          <div className="font-semibold">{line.itemName}</div>
                          <div className="mt-1 text-xs text-black/70">SKU: {line.sku} | Barcode: {line.barcodeValue}</div>
                        </td>
                        <td className="px-2 py-3 text-right">{line.quantity}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(line.lineSubtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-white p-5">
              <div className="space-y-3 text-sm text-black">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(invoice.subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>IGST @ {invoice.taxRate}%</span>
                  <strong>{formatCurrency(invoice.taxAmount)}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-brand-dark/35 pt-3 text-xl font-semibold">
                  <span>TOTAL</span>
                  <strong>{formatCurrency(invoice.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-white p-5 text-center text-black">
              <div className="text-xl font-semibold">Thank You</div>
              <p className="mt-3 text-sm leading-6 text-black/75">
                {invoice.notes.trim()
                  ? invoice.notes
                  : 'Goods once sold will be exchanged or refunded only as per store policy with valid invoice.'}
              </p>
            </div>

            <div className="rounded-[28px] border border-brand-30 bg-brand-60/25 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark/55">Actions</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => printSalesInvoice(invoice, companyName, businessProfile)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-10 px-4 py-3 text-sm font-medium text-brand-60"
                >
                  <Printer size={16} />
                  Reprint invoice
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand-30 bg-white px-4 py-3 text-sm font-medium text-brand-dark"
                >
                  Close invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
