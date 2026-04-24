import JsBarcode from 'jsbarcode';

const normalizeToken = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);

const hashToken = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36).toUpperCase();
};

export const buildBusinessBarcodeKey = (userId: string) =>
  hashToken(`business:${userId}`).padStart(6, '0').slice(0, 6);

export const buildInventoryBarcodeValue = (
  userId: string,
  inventoryItemId: string,
  sku: string,
  itemCode: string,
) => {
  const businessKey = buildBusinessBarcodeKey(userId);
  const itemKey = hashToken(`item:${inventoryItemId}`).padStart(6, '0').slice(0, 6);
  const skuKey = normalizeToken(itemCode || sku).padEnd(4, 'X').slice(0, 4);
  const checksum = hashToken(`${userId}:${inventoryItemId}:${skuKey}`).padStart(2, '0').slice(0, 2);

  return `AIV-${businessKey}-${itemKey}-${skuKey}-${checksum}`;
};

export const buildInvoiceNumber = (userId: string, invoiceId: string, createdAt: string) => {
  const businessKey = buildBusinessBarcodeKey(userId);
  const date = createdAt.slice(0, 10).replace(/-/g, '');
  const suffix = normalizeToken(invoiceId).padStart(6, '0').slice(0, 6);
  return `INV-${businessKey}-${date}-${suffix}`;
};

export const renderBarcodeSvgMarkup = (value: string, width = 2, height = 64) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: true,
    height,
    margin: 0,
    width,
    fontOptions: 'bold',
    fontSize: 13,
    textMargin: 6,
  });

  return svg.outerHTML;
};

export const renderBarcodeDataUrl = (value: string, width = 2, height = 64) => {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: true,
    height,
    margin: 0,
    width,
    fontOptions: 'bold',
    fontSize: 13,
    textMargin: 6,
    background: '#ffffff',
  });

  return canvas.toDataURL('image/png');
};
