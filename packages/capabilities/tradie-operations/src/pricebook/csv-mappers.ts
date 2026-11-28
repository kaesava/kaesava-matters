import type { CreatePricebookItemInputType } from "./schemas.js";

export type PricebookCsvSource = "XERO" | "TRADIFY" | "SERVICEM8" | "FERGUS";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function toMoney(raw: string | undefined): string {
  const cleaned = (raw ?? "").replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num.toFixed(2) : "0.00";
}

function computeMarkupPct(costStr: string, sellStr: string): string {
  const cost = Number.parseFloat(costStr);
  const sell = Number.parseFloat(sellStr);
  if (cost <= 0 || sell <= 0) return "0.00";
  return (((sell - cost) / cost) * 100).toFixed(2);
}

function mapTaxCode(raw: string | undefined): "GST" | "GST_FREE" | "EXEMPT" {
  const upper = (raw ?? "").toUpperCase();
  if (upper.includes("FREE")) return "GST_FREE";
  if (upper.includes("EXEMPT") || upper.includes("NONE") || upper === "NO") return "EXEMPT";
  return "GST";
}

function mapRow(source: PricebookCsvSource, row: Record<string, string>): CreatePricebookItemInputType | null {
  const get = (...keys: string[]) => keys.map((k) => row[k.toLowerCase()]).find((v) => v && v.length > 0);
  const name = get("itemname", "name", "title", "description", "material name");
  if (!name) return null;

  const sku = get("itemcode", "code", "sku", "part number") ?? null;
  const description = get("salesdescription", "purchasesdescription", "description", "notes") ?? null;
  const unitCostExTax = toMoney(get("purchasesunitprice", "cost", "costprice", "unit cost", "buy price"));
  const sellPriceExTax = toMoney(get("salesunitprice", "price", "sellprice", "unit price", "sell price"));
  const markupPct = computeMarkupPct(unitCostExTax, sellPriceExTax);
  const taxCode = mapTaxCode(get("salestaxrate", "tax", "taxcode", "gst"));
  const category = get("category", "group") ?? source;
  const supplierName = get("supplier", "suppliername") ?? null;

  return {
    sku,
    name: name.slice(0, 255),
    description,
    itemType: /labour|labor|hour/i.test(name) ? "LABOUR" : "MATERIAL",
    category,
    unitOfMeasure: get("unit", "uom") ?? "EACH",
    searchAliases: sku ? `${sku} ${name}` : null,
    unitCostExTax,
    markupPct,
    sellPriceExTax,
    taxCode,
    isFavourite: false,
    supplierName,
  };
}

export function mapPricebookCsv(source: PricebookCsvSource, csvText: string): CreatePricebookItemInputType[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const items: CreatePricebookItemInputType[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i] ?? "");
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? "";
    });
    const mapped = mapRow(source, record);
    if (mapped) items.push(mapped);
  }
  return items;
}
