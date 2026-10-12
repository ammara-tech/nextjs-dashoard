// Minimal PDF writer for Family Clinic invoices. It has no dependencies: it
// writes a one-page A4 PDF with the standard Helvetica fonts, laid out like the
// clinic's sample invoice (dark header, billing details, services, total).

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitMinor: number;
};

export type InvoiceData = {
  number: string;
  date: string; // YYYY-MM-DD
  billedTo: string;
  status: string; // e.g. Paid, Unpaid
  method: string; // e.g. Visa •••• 4242, Pending
  lines: InvoiceLine[];
  note?: string;
  footer?: string;
  totalLabel?: string; // "Total due" or "Total paid"
  currency?: string; // ISO code, ZAR by default
};

const W = 595.28;
const H = 841.89;
const M = 56.5;

// Helvetica glyph widths (per 1000 units) for ASCII 32 to 126.
const REG = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

type Font = 'F1' | 'F2';

/** Keeps the text to plain ASCII, which the standard PDF fonts can draw. */
function clean(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/[^\x20-\x7E]/g, '?');
}

function width(text: string, size: number, font: Font): number {
  const table = font === 'F2' ? BOLD : REG;
  let total = 0;
  for (const ch of text) total += table[ch.charCodeAt(0) - 32] ?? 556;
  return (total * size) / 1000;
}

function wrap(text: string, size: number, font: Font, max: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next, size, font) <= max || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

const esc = (s: string) => s.replace(/([\\()])/g, '\\$1');

export function formatInvoiceMoney(minor: number, currency = 'ZAR'): string {
  const code = currency.toUpperCase();
  const prefix = code === 'ZAR' ? 'R' : `${code} `;
  return `${prefix}${(minor / 100).toFixed(2)}`;
}

function hex(color: string): string {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => (v / 255).toFixed(3))
    .join(' ');
}

class Page {
  ops: string[] = [];
  // y values are measured from the top of the page, like the layout sketch.
  rect(x: number, top: number, w: number, h: number, fill: string, stroke?: string) {
    const y = H - top - h;
    this.ops.push(`${hex(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    if (stroke) {
      this.ops.push(`${hex(stroke)} RG 0.5 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
    }
  }
  circle(cx: number, cy: number, r: number, fill: string) {
    const k = 0.5523 * r;
    const y = H - cy;
    this.ops.push(
      `${hex(fill)} rg ${cx + r} ${y} m ` +
        `${cx + r} ${y + k} ${cx + k} ${y + r} ${cx} ${y + r} c ` +
        `${cx - k} ${y + r} ${cx - r} ${y + k} ${cx - r} ${y} c ` +
        `${cx - r} ${y - k} ${cx - k} ${y - r} ${cx} ${y - r} c ` +
        `${cx + k} ${y - r} ${cx + r} ${y - k} ${cx + r} ${y} c f`,
    );
  }
  text(
    s: string,
    x: number,
    baseline: number,
    size: number,
    font: Font,
    color: string,
    align: 'left' | 'right' | 'center' = 'left',
  ) {
    const t = clean(s);
    const w = width(t, size, font);
    const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    this.ops.push(
      `BT /${font} ${size} Tf ${hex(color)} rg ${px.toFixed(2)} ${(H - baseline).toFixed(2)} Td (${esc(t)}) Tj ET`,
    );
  }
}

export function buildInvoicePdf(invoice: InvoiceData): Uint8Array {
  const money = (minor: number) => formatInvoiceMoney(minor, invoice.currency);
  const NAVY = '#1E2F66';
  const BLUE = '#1E4FD8';
  const MIST = '#F4F8FC';
  const LINE = '#C9D3E8';
  const INK = '#0F172A';
  const GREY = '#7B8296';
  const p = new Page();

  // Header band with logo
  p.rect(0, 0, W, 74, '#0F172A');
  p.circle(68, 37, 17.5, BLUE);
  p.rect(66.4, 28, 3.2, 18, '#FFFFFF');
  p.rect(60.8, 35.4, 14.4, 3.2, '#FFFFFF');
  p.text('HEALTH CARE', 95, 29, 7.5, 'F1', '#9CC9FF');
  p.text('Family Clinic', 95, 47, 15, 'F2', '#FFFFFF');
  p.text('Invoice', W - M + 4, 40, 8.5, 'F1', '#FFFFFF', 'right');

  // Title
  p.text(`Invoice ${invoice.number}`, M, 122, 16, 'F2', NAVY);

  // Details table
  const rows: [string, string][] = [
    ['Invoice number', invoice.number],
    ['Invoice date', invoice.date],
    ['Billed to', invoice.billedTo],
    ['Payment status', invoice.status],
    ['Payment method', invoice.method],
  ];
  const tableW = W - 2 * M;
  const labelW = 138;
  let y = 138;
  for (const [label, value] of rows) {
    p.rect(M, y, tableW, 24, '#FFFFFF', LINE);
    p.rect(M, y, labelW, 24, MIST, LINE);
    p.text(label, M + 6, y + 15, 8, 'F2', INK);
    p.text(value, M + labelW + 6, y + 15, 8, 'F1', INK);
    y += 24;
  }

  // Services
  y += 24;
  p.text('Services', M, y, 12, 'F2', BLUE);
  y += 12;
  const colQty = M + 250;
  const colUnit = colQty + 44;
  const colAmt = colUnit + 90;
  p.rect(M, y, tableW, 24, NAVY);
  p.text('Description', M + 6, y + 15, 8, 'F2', '#FFFFFF');
  p.text('Qty', colQty + 6, y + 15, 8, 'F2', '#FFFFFF');
  p.text('Unit price', colUnit + 6, y + 15, 8, 'F2', '#FFFFFF');
  p.text('Amount', colAmt + 6, y + 15, 8, 'F2', '#FFFFFF');
  y += 24;

  let total = 0;
  invoice.lines.forEach((line, index) => {
    const lines = wrap(line.description, 8, 'F1', colQty - M - 12);
    const h = Math.max(24, lines.length * 11 + 13);
    const amount = line.quantity * line.unitMinor;
    total += amount;
    p.rect(M, y, tableW, h, index % 2 ? MIST : '#FFFFFF', LINE);
    lines.forEach((l, i) => p.text(l, M + 6, y + 15 + i * 11, 8, 'F1', INK));
    p.text(String(line.quantity), colQty + 6, y + 15, 8, 'F1', INK);
    p.text(money(line.unitMinor), colUnit + 6, y + 15, 8, 'F1', INK);
    p.text(money(amount), colAmt + 6, y + 15, 8, 'F1', INK);
    y += h;
  });

  p.rect(M, y, tableW, 24, MIST, LINE);
  p.text(invoice.totalLabel ?? 'Total due', M + 6, y + 15, 8, 'F2', INK);
  p.text(money(total), colAmt + 6, y + 15, 8, 'F2', INK);
  y += 24;

  if (invoice.note) {
    wrap(invoice.note, 7, 'F1', tableW).forEach((l, i) =>
      p.text(l, M, y + 16 + i * 9, 7, 'F1', GREY),
    );
  }

  // Footer
  p.text(
    invoice.footer ?? 'SAMPLE DOCUMENT - FICTITIOUS DATA FOR SYSTEM DEMONSTRATION ONLY',
    W / 2,
    H - 36,
    7,
    'F2',
    '#B45309',
    'center',
  );
  p.text('Page 1', W - M + 4, H - 36, 7, 'F1', GREY, 'right');

  // Assemble the PDF file
  const content = p.ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    out += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Every character is ASCII, so string length equals byte length.
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return bytes;
}
