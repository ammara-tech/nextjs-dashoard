export type CsvCell = string | number | null | undefined;

// Spreadsheets run text that starts with = + - @ as a formula. Prefixing an
// apostrophe keeps imported names and notes as plain text.
function cell(value: CsvCell) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvCell[][]) {
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

/** A download response. The leading BOM makes Excel read accents correctly. */
export function csvResponse(filename: string, csv: string) {
  return new Response(`﻿${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export const money = (minor: number) => (minor / 100).toFixed(2);
