export interface QuoteCalcLineInput {
  optionGroupKey?: string | null;
  quantity: number;
  unitSellPrice: number;
  taxCode: "GST" | "GST_FREE";
}

export interface QuoteCalcGroupInput {
  key: string;
  isSelected?: boolean;
  isRecommended?: boolean;
}

export interface CalculatedQuoteLine {
  lineTotalExTax: number;
  lineTax: number;
  lineTotalIncTax: number;
}

export interface CalculatedOptionGroupTotals {
  key: string;
  subtotalExTax: number;
  totalTax: number;
  totalIncTax: number;
}

export interface CalculatedQuoteTotals {
  lines: CalculatedQuoteLine[];
  optionGroups: CalculatedOptionGroupTotals[];
  subtotalExTax: number;
  totalTax: number;
  totalIncTax: number;
  depositAmountDue: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteLineAmounts(
  line: QuoteCalcLineInput,
  gstMode: "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE"
): CalculatedQuoteLine {
  const raw = round2(line.quantity * line.unitSellPrice);
  if (gstMode === "GST_FREE" || line.taxCode === "GST_FREE") {
    return { lineTotalExTax: raw, lineTax: 0, lineTotalIncTax: raw };
  }
  if (gstMode === "INCLUSIVE") {
    const exTax = round2(raw / 1.1);
    const tax = round2(raw - exTax);
    return { lineTotalExTax: exTax, lineTax: tax, lineTotalIncTax: raw };
  }
  const tax = round2(raw * 0.1);
  return { lineTotalExTax: raw, lineTax: tax, lineTotalIncTax: round2(raw + tax) };
}

function sumLines(lines: CalculatedQuoteLine[]) {
  const subtotalExTax = round2(lines.reduce((acc, l) => acc + l.lineTotalExTax, 0));
  const totalTax = round2(lines.reduce((acc, l) => acc + l.lineTax, 0));
  return { subtotalExTax, totalTax, totalIncTax: round2(subtotalExTax + totalTax) };
}

export function calculateDepositAmount(
  totalIncTax: number,
  depositType: "NONE" | "PERCENT" | "FIXED",
  depositValue: number
): number {
  if (depositType === "NONE" || depositValue <= 0) return 0;
  if (depositType === "PERCENT") {
    return round2(Math.min(totalIncTax, (totalIncTax * Math.min(depositValue, 100)) / 100));
  }
  return round2(Math.min(totalIncTax, depositValue));
}

export function calculateQuoteTotals(params: {
  gstMode: "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE";
  depositType: "NONE" | "PERCENT" | "FIXED";
  depositValue: number;
  optionGroups?: QuoteCalcGroupInput[];
  lines: QuoteCalcLineInput[];
}): CalculatedQuoteTotals {
  const calcLines = params.lines.map((l) => calculateQuoteLineAmounts(l, params.gstMode));
  const groups = params.optionGroups ?? [];
  const optionGroups = groups.map((g) => {
    const groupLines = calcLines.filter((_, idx) => params.lines[idx]?.optionGroupKey === g.key);
    return { key: g.key, ...sumLines(groupLines) };
  });

  const activeKey =
    groups.find((g) => g.isSelected)?.key ??
    groups.find((g) => g.isRecommended)?.key ??
    groups[0]?.key;

  const activeSummary =
    optionGroups.length > 0
      ? (optionGroups.find((g) => g.key === activeKey) ?? { subtotalExTax: 0, totalTax: 0, totalIncTax: 0 })
      : sumLines(calcLines);

  const depositAmountDue = calculateDepositAmount(
    activeSummary.totalIncTax,
    params.depositType,
    params.depositValue
  );

  return {
    lines: calcLines,
    optionGroups,
    subtotalExTax: activeSummary.subtotalExTax,
    totalTax: activeSummary.totalTax,
    totalIncTax: activeSummary.totalIncTax,
    depositAmountDue,
  };
}
