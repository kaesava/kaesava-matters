export interface TaxInvoiceComplianceInput {
  gstRegistered: boolean;
  supplierAbn: string | null | undefined;
  totalIncTax: number;
  buyerName: string | null | undefined;
  buyerAbn: string | null | undefined;
}

export interface TaxInvoiceComplianceResult {
  valid: boolean;
  documentTitle: "Tax Invoice" | "Invoice";
  complianceNote: string | null;
  errors: string[];
}

/**
 * Enforces ATO GSTR 2013/1 tax invoice requirements.
 */
export function evaluateTaxInvoiceCompliance(
  input: TaxInvoiceComplianceInput
): TaxInvoiceComplianceResult {
  const errors: string[] = [];
  if (!input.gstRegistered) {
    return {
      valid: true,
      documentTitle: "Invoice",
      complianceNote: "No GST has been charged",
      errors,
    };
  }

  if (!input.supplierAbn || input.supplierAbn.trim().length < 11) {
    errors.push("ATO GSTR 2013/1 requires a valid supplier ABN for Tax Invoices.");
  }

  if (input.totalIncTax >= 1000 && !input.buyerName?.trim() && !input.buyerAbn?.trim()) {
    errors.push("ATO GSTR 2013/1 requires buyer identity or ABN for Tax Invoices >= $1,000.");
  }

  return {
    valid: errors.length === 0,
    documentTitle: "Tax Invoice",
    complianceNote: null,
    errors,
  };
}
