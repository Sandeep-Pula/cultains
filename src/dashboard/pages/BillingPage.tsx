import { useMemo, useState } from 'react';
import { Camera, CreditCard } from 'lucide-react';
import type {
  InventoryItem,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  SalesInvoice,
  SalesInvoiceLineItem,
  WorkspaceProfile,
} from '../types';
import { LiveBillBuilderPanel } from '../components/LiveBillBuilderPanel';
import { SalesInvoiceDetailModal } from '../components/SalesInvoiceDetailModal';
import { EmptyStatePanel } from '../components/EmptyStatePanel';
import { formatCurrency, formatDateTime } from '../utils';

type BillingPageProps = {
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

export const BillingPage = ({
  companyName,
  businessProfile,
  billedBy,
  inventory,
  salesInvoices,
  onFinalizeSale,
}: BillingPageProps) => {
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  const todayInvoices = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return salesInvoices
      .filter((invoice) => {
        const createdAt = new Date(invoice.createdAt).getTime();
        return createdAt >= start && createdAt <= end;
      })
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [salesInvoices]);

  return (
    <>
      <div className="flex min-h-[700px] flex-col gap-5 xl:h-[calc(100vh-8rem)]">
        <section className="rounded-[32px] border border-brand-30 bg-white p-6 shadow-sm">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-dark">
              <CreditCard size={14} />
              Billing
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              Invoice generation desk
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-dark/70 sm:text-base">
              This page is dedicated only to creating invoices, scanning items into bills, and checking today’s invoices.
            </p>
          </div>
        </section>

        <LiveBillBuilderPanel
          companyName={companyName}
          businessProfile={businessProfile}
          billedBy={billedBy}
          inventory={inventory}
          onFinalizeSale={onFinalizeSale}
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-brand-30 bg-white shadow-sm">
          <div className="border-b border-brand-30 bg-brand-60/35 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Today’s invoices</h2>
            <p className="mt-1 text-xs text-brand-dark/60">Today’s generated invoices stay visible here. Click any invoice to open preview and reprint it.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {todayInvoices.length ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-brand-dark/55">
                    {['Invoice', 'Date', 'Customer', 'Method', 'Status', 'Total'].map((label) => (
                      <th key={label} className="border-b border-brand-30 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayInvoices.map((invoice) => (
                    <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer transition hover:bg-brand-60/35">
                      <td className="border-b border-brand-30/70 px-5 py-4">
                        <div className="font-semibold text-brand-dark">{invoice.invoiceNumber}</div>
                        <div className="mt-1 text-xs text-brand-dark/55">Tap to preview</div>
                      </td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{formatDateTime(invoice.createdAt)}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark">{invoice.customerName}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark capitalize">{invoice.paymentMethod.replace('_', ' ')}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm text-brand-dark capitalize">{invoice.paymentStatus}</td>
                      <td className="border-b border-brand-30/70 px-5 py-4 text-sm font-semibold text-brand-dark">{formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyStatePanel
                  icon={Camera}
                  title="No invoices created today"
                  description="Use the invoice builder above to scan products and generate the first invoice for today."
                  actions={[{ label: 'Start billing', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), emphasis: 'primary' }]}
                />
              </div>
            )}
          </div>
        </section>
      </div>

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
