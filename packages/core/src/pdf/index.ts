export interface PdfColumn {
  label: string;
  width: number;
  align?: "left" | "right";
}

export interface StructuredPdfInput {
  title: string;
  headerRight?: string;
  metaLines?: readonly string[];
  columns: readonly PdfColumn[];
  rows: readonly (readonly string[])[];
  totalsLines?: readonly string[];
  footerNote?: string;
}

const enc = new TextEncoder();
const esc = (s: string) =>
  s.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const txt = (x: number, y: number, f: "F1" | "F2", sz: number, s: string) =>
  `BT /${f} ${sz} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${esc(s)}) Tj ET`;
const rule = (x1: number, x2: number, y: number) => `0.5 w ${x1} ${y.toFixed(1)} m ${x2} ${y.toFixed(1)} l S`;

function fitCell(val: string, width: number, size: number): string {
  const maxChars = Math.max(1, Math.floor(width / (size * 0.52)));
  return val.length > maxChars ? `${val.slice(0, Math.max(0, maxChars - 1))}.` : val;
}

function drawRow(cmds: string[], cols: readonly PdfColumn[], vals: readonly string[], y: number, f: "F1" | "F2") {
  let x = 40;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const cell = fitCell(vals[i] ?? "", col.width - 4, 9);
    const drawX = col.align === "right" ? Math.max(x, x + col.width - 4 - cell.length * 4.7) : x;
    cmds.push(txt(drawX, y, f, 9, cell));
    x += col.width;
  }
}

function buildPageHeader(input: StructuredPdfInput, cmds: string[]): number {
  cmds.push(txt(40, 800, "F2", 16, input.title));
  if (input.headerRight) {
    const rightX = Math.max(300, 555 - input.headerRight.length * 5.2);
    cmds.push(txt(rightX, 800, "F1", 10, input.headerRight));
  }
  let y = 780;
  for (const line of input.metaLines ?? []) {
    cmds.push(txt(40, y, "F1", 9, line));
    y -= 13;
  }
  y -= 6;
  drawRow(cmds, input.columns, input.columns.map((c) => c.label), y, "F2");
  cmds.push(rule(40, 555, y - 5));
  return y - 18;
}

function paginateContent(input: StructuredPdfInput): string[] {
  const pages: string[][] = [[]];
  let y = buildPageHeader(input, pages[0]);
  for (const row of input.rows) {
    if (y < 70) {
      const next: string[] = [];
      pages.push(next);
      y = buildPageHeader(input, next);
    }
    drawRow(pages[pages.length - 1], input.columns, row, y, "F1");
    y -= 14;
  }
  const last = pages[pages.length - 1];
  if (input.totalsLines?.length) {
    last.push(rule(40, 555, y + 4));
    y -= 12;
    for (const line of input.totalsLines) {
      last.push(txt(Math.max(40, 555 - line.length * 5.4), y, "F2", 10, line));
      y -= 14;
    }
  }
  if (input.footerNote) last.push(txt(40, 42, "F1", 8, input.footerNote));
  return pages.map((cmds) => cmds.join("\n"));
}

function assemblePdf(streams: string[]): Uint8Array {
  const objs: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "",
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];
  const kids: string[] = [];
  streams.forEach((stream, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objs.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
      `${contentId} 0 obj\n<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });
  objs[1] = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>\nendobj\n`;
  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objs) {
    offsets.push(enc.encode(body).length);
    body += obj;
  }
  const xrefOffset = enc.encode(body).length;
  const xref = offsets.map((o, i) => (i === 0 ? "0000000000 65535 f \n" : `${String(o).padStart(10, "0")} 00000 n \n`));
  return enc.encode(`${body}xref\n0 ${offsets.length}\n${xref.join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
}

/** Builds a zero-dependency PDF-1.4 document from structured header, table, and totals data. */
export function buildStructuredPdfBytes(input: StructuredPdfInput): Uint8Array {
  return assemblePdf(paginateContent(input));
}
