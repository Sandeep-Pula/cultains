import type { FinanceEntry, SalesInvoice, WorkspaceProfile } from './types';
import { formatCurrency } from './utils';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
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

const buildPrintDocument = (title: string, body: string) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Verdana, Arial, Helvetica, sans-serif; margin: 0; color: #000; background: #eef1ff; }
        .preview-shell { min-height: 100vh; padding: 24px; }
        .preview-actions { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; padding: 14px 18px; border-bottom: 1px solid #d7dcff; background: rgba(255,255,255,0.96); backdrop-filter: blur(10px); }
        .preview-title { font-size: 15px; font-weight: 700; color: #1f2559; letter-spacing: 0.04em; text-transform: uppercase; }
        .preview-buttons { display: flex; gap: 10px; }
        .preview-btn { border: 1px solid #d7dcff; background: #fff; color: #1f2559; border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .preview-btn.primary { background: #1f2559; color: #fff; border-color: #1f2559; }
        .preview-card { max-width: 920px; margin: 0 auto; border-radius: 28px; border: 1px solid #d7dcff; background: #fff; box-shadow: 0 24px 60px rgba(31, 37, 89, 0.08); padding: 24px; }
        .india-invoice { max-width: 794px; margin: 0 auto; color: #000; }
        .invoice-brand { text-align: center; padding-bottom: 14px; border-bottom: 1px dashed #000; }
        .invoice-logo { display: block; max-width: 96px; max-height: 96px; margin: 0 auto 14px; object-fit: contain; }
        .invoice-company { font-size: 34px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .invoice-address { margin-top: 8px; font-size: 16px; line-height: 1.35; }
        .invoice-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; padding: 14px 0; border-bottom: 1px dashed #000; font-size: 15px; }
        .invoice-meta-cell.right { text-align: right; }
        .invoice-meta-label { font-weight: 700; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .invoice-table thead th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; color: #000; font-size: 15px; letter-spacing: 0; text-transform: none; padding: 10px 6px; text-align: left; }
        .invoice-table tbody td { font-size: 15px; padding: 10px 6px; vertical-align: top; }
        .invoice-table .num { text-align: center; width: 58px; }
        .invoice-table .qty, .invoice-table .rate, .invoice-table .amt { text-align: right; white-space: nowrap; }
        .invoice-item-name { font-weight: 700; }
        .invoice-item-sub { margin-top: 3px; font-size: 12px; color: #333; }
        .invoice-summary { margin-top: 10px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
        .invoice-summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; font-size: 15px; }
        .invoice-summary-row.total { font-weight: 700; font-size: 18px; padding-top: 10px; margin-top: 8px; border-top: 1px dashed #000; }
        .invoice-footer { text-align: center; padding-top: 18px; font-size: 16px; }
        .invoice-footer-note { margin-top: 8px; font-size: 13px; line-height: 1.45; }
        .month-end-section { margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
        .month-end-page { min-height: calc(297mm - 28mm); padding-bottom: 18mm; break-after: page; page-break-after: always; }
        .month-end-page:last-child { break-after: auto; page-break-after: auto; }
        .month-end-footer { margin-top: 24px; font-size: 12px; color: #1f2559; font-weight: 700; letter-spacing: 0.04em; }
        .print-error { max-width: 860px; margin: 48px auto; border-radius: 28px; background: #fff; border: 1px solid #d7dcff; box-shadow: 0 24px 60px rgba(31, 37, 89, 0.08); padding: 28px; color: #1f2559; }
        .print-error h1 { margin: 0 0 12px; font-size: 28px; }
        .print-error p { margin: 8px 0; font-size: 16px; line-height: 1.6; }
        .print-error code { display: block; margin-top: 12px; padding: 12px; background: #f6f7ff; border-radius: 16px; white-space: pre-wrap; word-break: break-word; }
        @page { size: A4; margin: 14mm 12mm 18mm 12mm; }
        @media print {
          body { margin: 0; background: #fff; }
          .preview-actions { display: none; }
          .preview-shell { padding: 0; }
          .preview-card { max-width: none; box-shadow: none; border: none; border-radius: 0; padding: 0; }
          .month-end-footer {
            position: fixed;
            left: 0;
            bottom: 0;
            width: 100%;
            margin: 0;
            padding: 0 0 4mm 2mm;
            font-size: 11px;
          }
        }
      </style>
    </head>
    <body>
      <div class="preview-shell">
        <div class="preview-actions">
          <div class="preview-title">${escapeHtml(title)}</div>
          <div class="preview-buttons">
            <button class="preview-btn" onclick="window.close()">Close</button>
            <button class="preview-btn primary" onclick="window.print()">Print / Save as PDF</button>
          </div>
        </div>
        <div class="preview-card">${body}</div>
      </div>
    </body>
  </html>
`;

const printHtml = (title: string, body: string) => {
  const printWindow = window.open('', '_blank', 'width=1080,height=900');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to preview and print documents.');
  }

  try {
    const html = buildPrintDocument(title, body);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown print rendering error';
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(
      title,
      `
        <div class="print-error">
          <h1>Preview could not be prepared</h1>
          <p>The month-end document hit a rendering problem before the preview finished loading.</p>
          <p>Refresh the app and try again. If the problem continues, check whether one of the report fields contains invalid data.</p>
          <code>${escapeHtml(message)}</code>
        </div>
      `,
    ));
    printWindow.document.close();
  }
  printWindow.focus();
};

export const printMonthEndClosePackage = (
  title: string,
  payload: {
    companyName: string;
    monthLabel: string;
    businessAddress: string;
    businessPhone?: string;
    gstNumber?: string;
    workspaceLogoUrl?: string;
    poweredByText: string;
    checklist: Array<{ title: string; detail: string; status: string }>;
    profitAndLoss: Array<{ label: string; amount: number }>;
    balanceSheet: {
      assets: Array<{ label: string; amount: number }>;
      liabilities: Array<{ label: string; amount: number }>;
      equity: Array<{ label: string; amount: number }>;
    };
    cashFlow: {
      operating: Array<{ label: string; amount: number }>;
      investing: Array<{ label: string; amount: number }>;
      financing: Array<{ label: string; amount: number }>;
    };
    generalLedger: Array<{
      account: string;
      openingBalance: number;
      closingBalance: number;
      movements: number;
    }>;
  },
) => {
  const checklist = payload.checklist ?? [];
  const profitAndLoss = payload.profitAndLoss ?? [];
  const balanceSheetAssets = payload.balanceSheet?.assets ?? [];
  const balanceSheetLiabilities = payload.balanceSheet?.liabilities ?? [];
  const balanceSheetEquity = payload.balanceSheet?.equity ?? [];
  const cashFlowOperating = payload.cashFlow?.operating ?? [];
  const cashFlowInvesting = payload.cashFlow?.investing ?? [];
  const cashFlowFinancing = payload.cashFlow?.financing ?? [];
  const generalLedger = payload.generalLedger ?? [];

  const sectionRows = (rows: Array<{ label: string; amount: number }>) =>
    rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td style="text-align:right;">${formatCurrency(row.amount)}</td>
          </tr>
        `,
      )
      .join('');

  const generalLedgerRows = generalLedger
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.account)}</td>
          <td style="text-align:right;">${formatCurrency(row.openingBalance)}</td>
          <td style="text-align:right;">${row.movements}</td>
          <td style="text-align:right;">${formatCurrency(row.closingBalance)}</td>
        </tr>
      `,
    )
    .join('');

  const checklistRows = checklist
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.detail)}</td>
        </tr>
      `,
    )
    .join('');

  const pageSection = (titleLabel: string, innerHtml: string) => `
    <section class="month-end-page">
      <div class="month-end-section">
        <div class="invoice-summary">
          <div class="invoice-summary-row total">
            <span>${escapeHtml(titleLabel)}</span>
            <span></span>
            <strong>${escapeHtml(payload.monthLabel)}</strong>
          </div>
        </div>
        ${innerHtml}
      </div>
      <div class="month-end-footer">${escapeHtml(payload.poweredByText)}</div>
    </section>
  `;

  const body = `
    <div class="india-invoice">
      <section class="month-end-page">
        <div class="invoice-brand">
          ${payload.workspaceLogoUrl ? `<img src="${escapeHtml(payload.workspaceLogoUrl)}" alt="${escapeHtml(payload.companyName)} logo" class="invoice-logo" />` : ''}
          <div class="invoice-company">${escapeHtml(payload.companyName)}</div>
        </div>
        <div class="invoice-address">Month-end close package for ${escapeHtml(payload.monthLabel)}</div>
        <div class="invoice-address">${escapeHtml(payload.businessAddress)}</div>
        ${payload.businessPhone ? `<div class="invoice-address">PHONE : ${escapeHtml(payload.businessPhone)}</div>` : ''}
        ${payload.gstNumber ? `<div class="invoice-address">GSTIN : ${escapeHtml(payload.gstNumber)}</div>` : ''}
        <div class="month-end-section">
          <div class="invoice-summary">
            <div class="invoice-summary-row total">
              <span>Month-end Checklist</span>
              <span></span>
              <strong>${checklist.length} items</strong>
            </div>
          </div>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>${checklistRows}</tbody>
          </table>
        </div>
        <div class="month-end-footer">${escapeHtml(payload.poweredByText)}</div>
      </section>

      ${pageSection(
        'Profit and Loss Statement',
        `<table class="invoice-table"><thead><tr><th>Line Item</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(profitAndLoss)}</tbody></table>`,
      )}

      ${pageSection(
        'Balance Sheet',
        `
          <table class="invoice-table"><thead><tr><th>Assets</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(balanceSheetAssets)}</tbody></table>
          <table class="invoice-table"><thead><tr><th>Liabilities</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(balanceSheetLiabilities)}</tbody></table>
          <table class="invoice-table"><thead><tr><th>Equity</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(balanceSheetEquity)}</tbody></table>
        `,
      )}

      ${pageSection(
        'Cash Flow Statement',
        `
          <table class="invoice-table"><thead><tr><th>Operating Activities</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(cashFlowOperating)}</tbody></table>
          <table class="invoice-table"><thead><tr><th>Investing Activities</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(cashFlowInvesting)}</tbody></table>
          <table class="invoice-table"><thead><tr><th>Financing Activities</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${sectionRows(cashFlowFinancing)}</tbody></table>
        `,
      )}

      ${pageSection(
        'General Ledger Snapshot',
        `
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Account</th>
                <th style="text-align:right;">Opening</th>
                <th style="text-align:right;">Movements</th>
                <th style="text-align:right;">Closing</th>
              </tr>
            </thead>
            <tbody>${generalLedgerRows}</tbody>
          </table>
        `,
      )}
    </div>
  `;

  printHtml(title, body);
};

export const printAccountingReport = (
  title: string,
  payload: {
    companyName: string;
    monthLabel: string;
    businessAddress: string;
    businessPhone?: string;
    gstNumber?: string;
    workspaceLogoUrl?: string;
    poweredByText: string;
    sections: Array<{
      title: string;
      columns: string[];
      rows: Array<Array<string | number>>;
    }>;
  },
) => {
  const renderSections = payload.sections
    .map((section) => {
      const header = section.columns
        .map((column, index) => `<th${index > 0 ? ' style="text-align:right;"' : ''}>${escapeHtml(column)}</th>`)
        .join('');
      const rows = section.rows
        .map(
          (row) => `
            <tr>
              ${row.map((cell, index) => `<td${index > 0 ? ' style="text-align:right;"' : ''}>${escapeHtml(cell)}</td>`).join('')}
            </tr>
          `,
        )
        .join('');

      return `
        <section class="month-end-page">
          <div class="month-end-section">
            <div class="invoice-summary">
              <div class="invoice-summary-row total">
                <span>${escapeHtml(section.title)}</span>
                <span></span>
                <strong>${escapeHtml(payload.monthLabel)}</strong>
              </div>
            </div>
            <table class="invoice-table">
              <thead><tr>${header}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="month-end-footer">${escapeHtml(payload.poweredByText)}</div>
        </section>
      `;
    })
    .join('');

  const body = `
    <div class="india-invoice">
      <section class="month-end-page">
        <div class="invoice-brand">
          ${payload.workspaceLogoUrl ? `<img src="${escapeHtml(payload.workspaceLogoUrl)}" alt="${escapeHtml(payload.companyName)} logo" class="invoice-logo" />` : ''}
          <div class="invoice-company">${escapeHtml(payload.companyName)}</div>
        </div>
        <div class="invoice-address">${escapeHtml(title)} for ${escapeHtml(payload.monthLabel)}</div>
        <div class="invoice-address">${escapeHtml(payload.businessAddress)}</div>
        ${payload.businessPhone ? `<div class="invoice-address">PHONE : ${escapeHtml(payload.businessPhone)}</div>` : ''}
        ${payload.gstNumber ? `<div class="invoice-address">GSTIN : ${escapeHtml(payload.gstNumber)}</div>` : ''}
        <div class="month-end-footer">${escapeHtml(payload.poweredByText)}</div>
      </section>
      ${renderSections}
    </div>
  `;

  printHtml(title, body);
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
