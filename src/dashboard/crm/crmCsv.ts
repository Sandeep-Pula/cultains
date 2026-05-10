import type { CrmContact, CrmDeal, CrmLead } from './types';

export type CsvImportRow = Record<string, string>;

export const parseCsv = (text: string): CsvImportRow[] => {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
  const [headers, ...body] = rows;
  if (!headers?.length) return [];
  return body.map((cells) =>
    headers.reduce<CsvImportRow>((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {}),
  );
};

export const detectDuplicate = (
  row: CsvImportRow,
  existing: Array<{ phone?: string; email?: string }>,
) => {
  const phone = row.phone?.replace(/\D/g, '');
  const email = row.email?.toLowerCase();
  return existing.some((item) => {
    const itemPhone = item.phone?.replace(/\D/g, '');
    const itemEmail = item.email?.toLowerCase();
    return Boolean((phone && itemPhone === phone) || (email && itemEmail === email));
  });
};

export const validateContactRow = (row: CsvImportRow) => {
  const errors: string[] = [];
  if (!row.name) errors.push('Missing name');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
  if (row.phone && row.phone.replace(/\D/g, '').length < 7) errors.push('Invalid phone');
  return errors;
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const exportContactsCsv = (contacts: CrmContact[]) => {
  const headers = ['name', 'type', 'phone', 'email', 'companyName', 'city', 'state', 'country', 'source', 'status'];
  const lines = contacts.map((contact) => headers.map((key) => escapeCsv(contact[key as keyof CrmContact])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

export const exportLeadsCsv = (leads: CrmLead[]) => {
  const headers = ['name', 'phone', 'email', 'companyName', 'source', 'status', 'score', 'estimatedValue', 'expectedCloseDate'];
  const lines = leads.map((lead) => headers.map((key) => escapeCsv(lead[key as keyof CrmLead])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

export const exportDealsCsv = (deals: CrmDeal[]) => {
  const headers = ['name', 'value', 'expectedCloseDate', 'probability', 'status', 'pipelineId', 'stageId', 'assignedTo', 'lostReason', 'wonReason'];
  const lines = deals.map((deal) => headers.map((key) => escapeCsv(deal[key as keyof CrmDeal])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

export const downloadCsv = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
