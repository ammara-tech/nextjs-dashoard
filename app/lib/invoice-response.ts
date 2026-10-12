import 'server-only';

import { buildInvoicePdf, type InvoiceData } from './invoice-pdf';

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invoice number built from the record's date and id, so it never changes. */
export function invoiceNumber(prefix: string, isoDate: string, id: string) {
  return `INV-${prefix}-${isoDate.slice(0, 10).replaceAll('-', '')}-${id
    .replaceAll('-', '')
    .slice(0, 6)
    .toUpperCase()}`;
}

export function titleCase(value: string) {
  const text = value.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pdfResponse(invoice: InvoiceData) {
  const bytes = buildInvoicePdf(invoice);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export function plain(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
