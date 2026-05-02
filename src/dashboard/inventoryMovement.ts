import type { InventoryItem, SalesInvoice } from './types';

export type InventoryMovement = {
  stockLeft: number;
  availableStock: number;
  soldSinceLastInventoryUpdate: number;
  totalSold: number;
  invoiceCountSinceLastInventoryUpdate: number;
  revenueSinceLastInventoryUpdate: number;
};

const getTime = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const getInventoryMovement = (item: InventoryItem, salesInvoices: SalesInvoice[]): InventoryMovement => {
  const lastInventoryUpdate = getTime(item.lastRestockedAt);
  const invoiceIdsSinceUpdate = new Set<string>();

  const movement = salesInvoices.reduce<InventoryMovement>(
    (summary, invoice) => {
      if (invoice.status === 'draft') return summary;

      const invoiceTime = getTime(invoice.createdAt);
      invoice.lineItems.forEach((lineItem) => {
        if (lineItem.inventoryItemId !== item.id) return;

        summary.totalSold += lineItem.quantity;

        if (invoiceTime >= lastInventoryUpdate) {
          summary.soldSinceLastInventoryUpdate += lineItem.quantity;
          summary.revenueSinceLastInventoryUpdate += lineItem.lineSubtotal;
          invoiceIdsSinceUpdate.add(invoice.id);
        }
      });

      return summary;
    },
    {
      stockLeft: Math.max(item.currentStock, 0),
      availableStock: Math.max(item.currentStock - item.reservedStock, 0),
      soldSinceLastInventoryUpdate: 0,
      totalSold: 0,
      invoiceCountSinceLastInventoryUpdate: 0,
      revenueSinceLastInventoryUpdate: 0,
    },
  );

  return {
    ...movement,
    invoiceCountSinceLastInventoryUpdate: invoiceIdsSinceUpdate.size,
  };
};
