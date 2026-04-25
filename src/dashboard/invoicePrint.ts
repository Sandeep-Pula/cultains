import type { FinanceEntry, SalesInvoice, WorkspaceProfile } from './types';
import { formatCurrency } from './utils';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatInvoiceDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const paymentMethodLabels: Record<SalesInvoice['paymentMethod'], string> = {
  cash: 'Cash',
  upi: 'UPI',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  bank_transfer: 'Bank transfer',
  mixed: 'Mixed',
};

const financePaymentMethodLabels: Record<NonNullable<FinanceEntry['paymentMethod']>, string> = {
  cash: 'Cash',
  upi: 'UPI',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  bank_transfer: 'Bank transfer',
  mixed: 'Mixed',
};

const printHtml = (title: string, body: string) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1080,height=900');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print invoices.');
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #000; }
          .india-invoice { max-width: 820px; margin: 0 auto; color: #000; }
          .invoice-brand { text-align: center; padding-bottom: 12px; border-bottom: 1px dashed #000; }
          .invoice-logo { display: block; max-width: 72px; max-height: 72px; margin: 0 auto 10px; object-fit: contain; filter: grayscale(1); }
          .invoice-company { font-size: 34px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
          .invoice-address { margin-top: 8px; font-size: 16px; line-height: 1.35; }
          .invoice-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; padding: 14px 0; border-bottom: 1px dashed #000; font-size: 15px; }
          .invoice-meta-cell.right { text-align: right; }
          .invoice-meta-label { font-weight: 700; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .invoice-table thead th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; color: #000; font-size: 15px; letter-spacing: 0; text-transform: none; padding: 10px 6px; text-align: left; }
          .invoice-table tbody td { border-bottom: none; font-size: 15px; padding: 10px 6px; vertical-align: top; }
          .invoice-table .num { text-align: center; width: 58px; }
          .invoice-table .qty, .invoice-table .rate, .invoice-table .amt { text-align: right; white-space: nowrap; }
          .invoice-item-name { font-weight: 700; }
          .invoice-item-sub { margin-top: 3px; font-size: 12px; color: #333; }
          .invoice-summary { margin-top: 10px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .invoice-summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; font-size: 15px; }
          .invoice-summary-row.total { font-weight: 700; font-size: 18px; padding-top: 10px; margin-top: 8px; border-top: 1px dashed #000; }
          .invoice-footer { text-align: center; padding-top: 18px; font-size: 16px; }
          .invoice-footer-note { margin-top: 8px; font-size: 13px; line-height: 1.45; }
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

export const printSalesInvoice = (
  invoice: SalesInvoice,
  companyName: string,
  businessProfile: WorkspaceProfile,
) => {
  const refundPolicy = invoice.notes.trim() || 'Goods once sold will be exchanged or refunded only as per store policy with valid invoice.';
  const totalQuantity = invoice.lineItems.reduce((sum, line) => sum + line.quantity, 0);
  const companyLabel = companyName || businessProfile.companyName || 'Business';
  const escapedCompanyName = escapeHtml(companyLabel);
  const escapedAddress = escapeHtml(businessProfile.studioAddress || businessProfile.city || 'Business address not set yet');
  const escapedPhone = businessProfile.phone ? escapeHtml(businessProfile.phone) : '';
  const escapedGstin = businessProfile.gstNumber ? escapeHtml(businessProfile.gstNumber) : '';
  const escapedCustomerName = escapeHtml(invoice.customerName);
  const escapedBilledBy = escapeHtml(invoice.billedBy);
  const escapedPaymentMethod = escapeHtml(paymentMethodLabels[invoice.paymentMethod]);
  const escapedRefundPolicy = escapeHtml(refundPolicy);
  const escapedLogoUrl = businessProfile.workspaceLogoUrl ? escapeHtml(businessProfile.workspaceLogoUrl) : '';
  const taxLabel = invoice.taxRate > 0 ? `IGST @ ${invoice.taxRate}%` : 'IGST @ 0%';

  const body = `
    <div class="india-invoice">
      <div class="invoice-brand">
        ${escapedLogoUrl ? `<img src="${escapedLogoUrl}" alt="${escapedCompanyName} logo" class="invoice-logo" />` : ''}
        <div class="invoice-company">${escapedCompanyName}</div>
        <div class="invoice-address">${escapedAddress}</div>
        ${escapedPhone ? `<div class="invoice-address">PHONE : ${escapedPhone}</div>` : ''}
        ${escapedGstin ? `<div class="invoice-address">GSTIN : ${escapedGstin}</div>` : ''}
      </div>
      <div class="invoice-meta-grid">
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Bill No:</span> ${escapeHtml(invoice.invoiceNumber)}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Date:</span> ${formatInvoiceDate(invoice.createdAt)}</div>
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Customer:</span> ${escapedCustomerName}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Payment:</span> ${escapedPaymentMethod}</div>
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Billed By:</span> ${escapedBilledBy}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Status:</span> ${escapeHtml(invoice.paymentStatus)}</div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th class="num">SN</th>
            <th>Item</th>
            <th class="qty">Qty</th>
            <th class="rate">Price</th>
            <th class="amt">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.lineItems.map((line, index) => `
            <tr>
              <td class="num">${index + 1}</td>
              <td>
                <div class="invoice-item-name">${escapeHtml(line.itemName)}</div>
                <div class="invoice-item-sub">SKU: ${escapeHtml(line.sku)} | Barcode: ${escapeHtml(line.barcodeValue)}</div>
              </td>
              <td class="qty">${line.quantity}</td>
              <td class="rate">${formatCurrency(line.unitPrice)}</td>
              <td class="amt">${formatCurrency(line.lineSubtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="invoice-summary">
        <div class="invoice-summary-row">
          <span>Subtotal</span>
          <span>${totalQuantity} item(s)</span>
          <strong>${formatCurrency(invoice.subtotal)}</strong>
        </div>
        <div class="invoice-summary-row">
          <span>${taxLabel}</span>
          <span></span>
          <strong>${formatCurrency(invoice.taxAmount)}</strong>
        </div>
        <div class="invoice-summary-row total">
          <span>TOTAL</span>
          <span></span>
          <strong>${formatCurrency(invoice.totalAmount)}</strong>
        </div>
      </div>
      <div class="invoice-footer">
        <div>Thank You</div>
        <div class="invoice-footer-note">${escapedRefundPolicy}</div>
      </div>
    </div>
  `;

  printHtml(invoice.invoiceNumber, body);
};

export const printSalaryPaycheck = (
  paycheck: FinanceEntry,
  companyName: string,
  businessProfile: WorkspaceProfile,
) => {
  const companyLabel = companyName || businessProfile.companyName || 'Business';
  const escapedCompanyName = escapeHtml(companyLabel);
  const escapedAddress = escapeHtml(businessProfile.studioAddress || businessProfile.city || 'Business address not set yet');
  const escapedPhone = businessProfile.phone ? escapeHtml(businessProfile.phone) : '';
  const escapedGstin = businessProfile.gstNumber ? escapeHtml(businessProfile.gstNumber) : '';
  const escapedLogoUrl = businessProfile.workspaceLogoUrl ? escapeHtml(businessProfile.workspaceLogoUrl) : '';
  const employeeName = escapeHtml(paycheck.employeeName || 'Team member');
  const paycheckNumber = escapeHtml(paycheck.paycheckNumber || paycheck.title);
  const paymentMethod = paycheck.paymentMethod ? financePaymentMethodLabels[paycheck.paymentMethod] : 'Cash';
  const payPeriodLabel = escapeHtml(paycheck.payPeriodLabel || 'Current period');
  const issuedBy = escapeHtml(paycheck.issuedBy || businessProfile.userName || 'Business owner');
  const notes = escapeHtml(paycheck.notes || 'This is a salary paycheck generated from the business workspace.');

  const body = `
    <div class="india-invoice">
      <div class="invoice-brand">
        ${escapedLogoUrl ? `<img src="${escapedLogoUrl}" alt="${escapedCompanyName} logo" class="invoice-logo" />` : ''}
        <div class="invoice-company">${escapedCompanyName}</div>
        <div class="invoice-address">${escapedAddress}</div>
        ${escapedPhone ? `<div class="invoice-address">PHONE : ${escapedPhone}</div>` : ''}
        ${escapedGstin ? `<div class="invoice-address">GSTIN : ${escapedGstin}</div>` : ''}
      </div>
      <div class="invoice-meta-grid">
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Paycheck No:</span> ${paycheckNumber}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Date:</span> ${formatInvoiceDate(paycheck.dueAt)}</div>
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Employee:</span> ${employeeName}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Method:</span> ${escapeHtml(paymentMethod)}</div>
        <div class="invoice-meta-cell"><span class="invoice-meta-label">Pay Period:</span> ${payPeriodLabel}</div>
        <div class="invoice-meta-cell right"><span class="invoice-meta-label">Issued By:</span> ${issuedBy}</div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th class="num">SN</th>
            <th>Description</th>
            <th class="amt">Amt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="num">1</td>
            <td>
              <div class="invoice-item-name">Salary paycheck</div>
              <div class="invoice-item-sub">${notes}</div>
            </td>
            <td class="amt">${formatCurrency(paycheck.amount)}</td>
          </tr>
        </tbody>
      </table>
      <div class="invoice-summary">
        <div class="invoice-summary-row">
          <span>Status</span>
          <span></span>
          <strong>${escapeHtml(paycheck.status)}</strong>
        </div>
        <div class="invoice-summary-row total">
          <span>NET PAY</span>
          <span></span>
          <strong>${formatCurrency(paycheck.amount)}</strong>
        </div>
      </div>
      <div class="invoice-footer">
        <div>Salary Paycheck</div>
        <div class="invoice-footer-note">This document is generated by ${escapedCompanyName} and can be used as salary payment proof.</div>
      </div>
    </div>
  `;

  printHtml(paycheckNumber, body);
};
