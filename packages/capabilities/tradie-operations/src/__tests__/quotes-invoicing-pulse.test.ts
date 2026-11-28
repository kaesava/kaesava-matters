import { describe, expect, it } from "vitest";
import { generatePortalToken, hashPortalToken } from "@kaesava/core";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import { calculateQuoteTotals } from "../quotes/calculateQuoteTotals.js";
import { evaluateTaxInvoiceCompliance } from "../invoicing/tax-invoice-rules.js";
import { resolveAllowedPaymentMethods } from "../invoicing/stripe-connect.js";
import { getJobMarginQuery } from "../pulse/queries.js";

describe("Quotes, Invoicing & Pulse domain logic", () => {
  it("generates and hashes portal tokens deterministically", async () => {
    const { rawToken, tokenHash } = await generatePortalToken();
    expect(rawToken.length).toBeGreaterThan(20);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPortalToken(rawToken)).toBe(tokenHash);
  });

  it("calculates GST exclusive, inclusive, GST_FREE, Good/Better/Best options and deposits", () => {
    const exclusive = calculateQuoteTotals({
      gstMode: "EXCLUSIVE",
      depositType: "PERCENT",
      depositValue: 25,
      optionGroups: [
        { key: "good", isSelected: false },
        { key: "better", isRecommended: true, isSelected: true },
      ],
      lines: [
        { optionGroupKey: "good", quantity: 1, unitSellPrice: 100, taxCode: "GST" },
        { optionGroupKey: "better", quantity: 2, unitSellPrice: 200, taxCode: "GST" },
        { optionGroupKey: "better", quantity: 1, unitSellPrice: 100, taxCode: "GST_FREE" },
      ],
    });
    expect(exclusive.subtotalExTax).toBe(500);
    expect(exclusive.totalTax).toBe(40);
    expect(exclusive.totalIncTax).toBe(540);
    expect(exclusive.depositAmountDue).toBe(135);

    const inclusive = calculateQuoteTotals({
      gstMode: "INCLUSIVE",
      depositType: "FIXED",
      depositValue: 50,
      lines: [{ quantity: 1, unitSellPrice: 110, taxCode: "GST" }],
    });
    expect(inclusive.subtotalExTax).toBe(100);
    expect(inclusive.totalTax).toBe(10);
    expect(inclusive.totalIncTax).toBe(110);
    expect(inclusive.depositAmountDue).toBe(50);
  });

  it("enforces ATO GSTR 2013/1 tax invoice rules", () => {
    const unreg = evaluateTaxInvoiceCompliance({
      gstRegistered: false,
      supplierAbn: null,
      totalIncTax: 1500,
      buyerName: null,
      buyerAbn: null,
    });
    expect(unreg.valid).toBe(true);
    expect(unreg.documentTitle).toBe("Invoice");
    expect(unreg.complianceNote).toBe("No GST has been charged");

    const highValueMissingBuyer = evaluateTaxInvoiceCompliance({
      gstRegistered: true,
      supplierAbn: "51824753556",
      totalIncTax: 1000,
      buyerName: "",
      buyerAbn: "",
    });
    expect(highValueMissingBuyer.valid).toBe(false);
    expect(highValueMissingBuyer.documentTitle).toBe("Tax Invoice");
  });

  it("hides card payment when disallowed or above maxCardAmount", () => {
    expect(
      resolveAllowedPaymentMethods({
        allowCardPayment: false,
        balanceDue: 200,
        maxCardAmountOverride: null,
        defaultMaxCardAmount: null,
      })
    ).toEqual(["au_becs_debit"]);

    expect(
      resolveAllowedPaymentMethods({
        allowCardPayment: true,
        balanceDue: 2500,
        maxCardAmountOverride: "1500.00",
        defaultMaxCardAmount: "5000.00",
      })
    ).toEqual(["au_becs_debit"]);

    expect(
      resolveAllowedPaymentMethods({
        allowCardPayment: true,
        balanceDue: 500,
        maxCardAmountOverride: null,
        defaultMaxCardAmount: "1500.00",
      })
    ).toEqual(["au_becs_debit", "card"]);
  });

  it("redacts job margin for TRADIE and ADMIN without canViewMargins", async () => {
    const mockDb = {} as unknown as DbOrTx;
    const tradieRes = await getJobMarginQuery(mockDb, {
      tenantId: "t1",
      appId: "a1",
      jobId: "j1",
      callerBaseRole: "MEMBER",
      callerAppRole: "TRADIE",
    });
    expect(tradieRes.redacted).toBe(true);

    const adminDenied = await getJobMarginQuery(mockDb, {
      tenantId: "t1",
      appId: "a1",
      jobId: "j1",
      callerBaseRole: "MEMBER",
      callerAppRole: "ADMIN",
      canViewMargins: false,
    });
    expect(adminDenied.redacted).toBe(true);
  });
});
