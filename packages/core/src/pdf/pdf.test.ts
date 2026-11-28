import { describe, expect, it } from "vitest";
import { buildStructuredPdfBytes } from "./index.js";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("buildStructuredPdfBytes", () => {
  it("generates a valid PDF-1.4 document with header, xref, trailer, and content", () => {
    const bytes = buildStructuredPdfBytes({
      title: "TAX INVOICE",
      headerRight: "INV-0042",
      metaLines: ["ABN: 51 824 753 556", "Due: 2026-12-15"],
      columns: [
        { label: "Description", width: 320, align: "left" },
        { label: "Amount", width: 120, align: "right" },
      ],
      rows: [
        ["Switchboard upgrade", "1250.00"],
        ["Callout fee", "150.00"],
      ],
      totalsLines: ["Subtotal: 1400.00", "GST: 140.00", "Total: 1540.00"],
      footerNote: "Thank you for your business",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    const pdf = decode(bytes);
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    expect(pdf).toContain("xref\n");
    expect(pdf).toContain("trailer\n");
    expect(pdf).toContain("/Count 1");
    expect(pdf).toContain("(TAX INVOICE) Tj");
    expect(pdf).toContain("(INV-0042) Tj");
    expect(pdf).toContain("(Switchboard upgrade) Tj");
    expect(pdf).toContain("(Total: 1540.00) Tj");
    expect(pdf).toContain("(Thank you for your business) Tj");
  });

  it("escapes parentheses and backslashes and replaces non-ASCII characters", () => {
    const pdf = decode(
      buildStructuredPdfBytes({
        title: "Quote (Draft) \\ A",
        columns: [{ label: "Item", width: 300 }],
        rows: [["Pipe \u2014 Copper (15mm)"]],
      })
    );

    expect(pdf).toContain("(Quote \\(Draft\\) \\\\ A) Tj");
    expect(pdf).toContain("(Pipe   Copper \\(15mm\\)) Tj");
  });

  it("truncates cell text exceeding column width with a trailing period", () => {
    const pdf = decode(
      buildStructuredPdfBytes({
        title: "Narrow",
        columns: [{ label: "Code", width: 30 }],
        rows: [["ABCDEFGHIJKLMNO"]],
      })
    );

    // width - 4 = 26, size = 9 -> maxChars = floor(26 / 4.68) = 5 -> "ABCD."
    expect(pdf).toContain("(ABCD.) Tj");
  });

  it("paginates rows across multiple pages when vertical space runs out", () => {
    const rows = Array.from({ length: 65 }, (_, i) => [`Line item ${i + 1}`, `${(i + 1) * 10}.00`]);
    const pdf = decode(
      buildStructuredPdfBytes({
        title: "Multi-Page Statement",
        columns: [
          { label: "Item", width: 300 },
          { label: "Total", width: 120, align: "right" },
        ],
        rows,
      })
    );

    expect(pdf).toContain("/Count 2");
    expect(pdf).toContain("(Line item 1) Tj");
    expect(pdf).toContain("(Line item 65) Tj");
  });
});
