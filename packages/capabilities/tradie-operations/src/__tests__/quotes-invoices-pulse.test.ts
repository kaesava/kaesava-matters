import { describe, expect, it, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  acceptQuoteViaPortalCommand,
  calculateQuoteLineAmounts,
  calculateQuoteTotals,
  evaluateTaxInvoiceCompliance,
  getJobMarginQuery,
  getWeeklyPaydayCashPulseQuery,
  issueCreditNoteCommand,
  refundInvoicePaymentCommand,
  resolveAllowedPaymentMethods,
  updateInvoiceCommand,
} from "../index.js";

const CTX = { tenantId: "t1", appId: "a1", userId: "u1" };

function mockSelectRows<T>(rows: T[]) {
  const whereResult = Object.assign(Promise.resolve(rows), {
    limit: vi.fn().mockResolvedValue(rows),
  });
  return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(whereResult) }) };
}

function mockUpdateRows<T>(rows: T[]) {
  const whereResult = Object.assign(Promise.resolve(rows), {
    returning: vi.fn().mockResolvedValue(rows),
  });
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(whereResult) }) };
}

function mockInsertRows<T>(rows: T[]) {
  const valuesResult = Object.assign(Promise.resolve(rows), {
    returning: vi.fn().mockResolvedValue(rows),
  });
  return { values: vi.fn().mockReturnValue(valuesResult) };
}

describe("Quotes: 10% GST incl/excl, GST_FREE & Good/Better/Best rollup", () => {
  it("computes EXCLUSIVE, INCLUSIVE, and GST_FREE line math accurately", () => {
    expect(calculateQuoteLineAmounts({ quantity: 2, unitSellPrice: 150, taxCode: "GST" }, "EXCLUSIVE")).toEqual({
      lineTotalExTax: 300, lineTax: 30, lineTotalIncTax: 330,
    });
    expect(calculateQuoteLineAmounts({ quantity: 1, unitSellPrice: 220, taxCode: "GST" }, "INCLUSIVE")).toEqual({
      lineTotalExTax: 200, lineTax: 20, lineTotalIncTax: 220,
    });
    expect(calculateQuoteLineAmounts({ quantity: 1, unitSellPrice: 220, taxCode: "GST_FREE" }, "INCLUSIVE")).toEqual({
      lineTotalExTax: 220, lineTax: 0, lineTotalIncTax: 220,
    });
    expect(calculateQuoteLineAmounts({ quantity: 3, unitSellPrice: 100, taxCode: "GST" }, "GST_FREE")).toEqual({
      lineTotalExTax: 300, lineTax: 0, lineTotalIncTax: 300,
    });
  });

  it("rolls up Good/Better/Best option groups using selected or recommended tier and deposit", () => {
    const totals = calculateQuoteTotals({
      gstMode: "EXCLUSIVE",
      depositType: "PERCENT",
      depositValue: 20,
      optionGroups: [
        { key: "good", isSelected: false },
        { key: "better", isRecommended: true, isSelected: false },
        { key: "best", isSelected: true },
      ],
      lines: [
        { optionGroupKey: "good", quantity: 1, unitSellPrice: 500, taxCode: "GST" },
        { optionGroupKey: "better", quantity: 1, unitSellPrice: 1000, taxCode: "GST" },
        { optionGroupKey: "best", quantity: 1, unitSellPrice: 1500, taxCode: "GST" },
        { optionGroupKey: "best", quantity: 1, unitSellPrice: 200, taxCode: "GST_FREE" },
      ],
    });

    expect(totals.optionGroups).toEqual([
      { key: "good", subtotalExTax: 500, totalTax: 50, totalIncTax: 550 },
      { key: "better", subtotalExTax: 1000, totalTax: 100, totalIncTax: 1100 },
      { key: "best", subtotalExTax: 1700, totalTax: 150, totalIncTax: 1850 },
    ]);
    expect(totals.subtotalExTax).toBe(1700);
    expect(totals.totalTax).toBe(150);
    expect(totals.totalIncTax).toBe(1850);
    expect(totals.depositAmountDue).toBe(370);
  });

  it("falls back to recommended tier when no option group is selected and caps fixed deposit", () => {
    const totals = calculateQuoteTotals({
      gstMode: "INCLUSIVE",
      depositType: "FIXED",
      depositValue: 2000,
      optionGroups: [{ key: "good" }, { key: "better", isRecommended: true }],
      lines: [
        { optionGroupKey: "good", quantity: 1, unitSellPrice: 330, taxCode: "GST" },
        { optionGroupKey: "better", quantity: 1, unitSellPrice: 660, taxCode: "GST" },
      ],
    });
    expect(totals.subtotalExTax).toBe(600);
    expect(totals.totalTax).toBe(60);
    expect(totals.totalIncTax).toBe(660);
    expect(totals.depositAmountDue).toBe(660);
  });
});

describe("Quotes: portal acceptance & auto-deposit invoice", () => {
  it("accepts quote, updates job, and generates a locked DEPOSIT invoice when deposit > 0", async () => {
    const quoteRow = {
      id: "q1", quoteNumber: "Q-0001", title: "Switchboard Upgrade", status: "SENT",
      customerId: "c1", siteId: "s1", jobId: "j1", selectedOptionGroupId: null,
      subtotalExTax: "1000.00", totalTax: "100.00", totalIncTax: "1100.00",
      depositType: "PERCENT", depositAmountDue: "330.00", tenantId: "t1", appId: "a1", createdBy: "u1",
    };
    const depositInv = {
      id: "inv-dep-1", invoiceNumber: "INV-0012", invoiceType: "DEPOSIT",
      status: "SENT", totalIncTax: "330.00", balanceDue: "330.00",
    };

    const insertValuesCalls: Array<Record<string, unknown>> = [];
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(mockSelectRows([quoteRow]))
        .mockReturnValueOnce(
          mockSelectRows([{ id: "bp1", invoicePrefix: "INV-", nextInvoiceNumber: 12, gstRegistered: true, defaultPaymentTermsDays: 7 }])
        ),
      update: vi
        .fn()
        .mockReturnValueOnce(mockUpdateRows([{ ...quoteRow, status: "ACCEPTED" }]))
        .mockReturnValueOnce(mockUpdateRows([]))
        .mockReturnValueOnce(mockUpdateRows([])),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          insertValuesCalls.push(vals);
          return Object.assign(Promise.resolve([depositInv]), {
            returning: vi.fn().mockResolvedValue([depositInv]),
          });
        }),
      })),
    } as unknown as DbOrTx;

    const result = await acceptQuoteViaPortalCommand(mockDb, {
      rawToken: "raw-portal-token",
      signerName: "Pat Customer",
      signatureSvg: "<svg/>",
    });

    expect(result.quote.status).toBe("ACCEPTED");
    expect(result.depositInvoice?.invoiceNumber).toBe("INV-0012");
    expect(result.depositPortalToken).toBeTruthy();

    const invoiceInsert = insertValuesCalls.find((v) => v.invoiceType === "DEPOSIT");
    expect(invoiceInsert?.subtotalExTax).toBe("300.00");
    expect(invoiceInsert?.totalTax).toBe("30.00");
    expect(invoiceInsert?.totalIncTax).toBe("330.00");
    expect(invoiceInsert?.lockedAt).toBeInstanceOf(Date);
  });

  it("rejects already ACCEPTED quotes", async () => {
    const acceptedDb = {
      select: vi.fn().mockReturnValueOnce(mockSelectRows([{ id: "q1", status: "ACCEPTED" }])),
    } as unknown as DbOrTx;
    await expect(
      acceptQuoteViaPortalCommand(acceptedDb, { rawToken: "tok", signerName: "A", signatureSvg: "<svg/>" })
    ).rejects.toThrow("Quote has already been accepted.");
  });
});

describe("Invoicing: ATO GSTR 2013/1, lockedAt guard, credit notes & refunds", () => {
  it("enforces ATO GSTR 2013/1 >= $1,000 buyer identity and non-GST rules", () => {
    expect(
      evaluateTaxInvoiceCompliance({
        gstRegistered: false, supplierAbn: null, totalIncTax: 2500, buyerName: null, buyerAbn: null,
      })
    ).toEqual({
      valid: true, documentTitle: "Invoice", complianceNote: "No GST has been charged", errors: [],
    });

    const under1k = evaluateTaxInvoiceCompliance({
      gstRegistered: true, supplierAbn: "51824753556", totalIncTax: 999.99, buyerName: null, buyerAbn: null,
    });
    expect(under1k.valid).toBe(true);
    expect(under1k.documentTitle).toBe("Tax Invoice");

    const at1kMissingBuyer = evaluateTaxInvoiceCompliance({
      gstRegistered: true, supplierAbn: "51824753556", totalIncTax: 1000, buyerName: "  ", buyerAbn: null,
    });
    expect(at1kMissingBuyer.valid).toBe(false);
    expect(at1kMissingBuyer.errors[0]).toContain("1,000");

    const at1kWithBuyerAbn = evaluateTaxInvoiceCompliance({
      gstRegistered: true, supplierAbn: "51824753556", totalIncTax: 1200, buyerName: null, buyerAbn: "53004085616",
    });
    expect(at1kWithBuyerAbn.valid).toBe(true);
  });

  it("blocks editing invoices with lockedAt set or non-DRAFT status", async () => {
    const lockedDb = {
      select: vi.fn().mockReturnValueOnce(
        mockSelectRows([{ id: "inv1", status: "DRAFT", lockedAt: new Date(), gstRegisteredSnapshot: true }])
      ),
    } as unknown as DbOrTx;

    await expect(
      updateInvoiceCommand(lockedDb, CTX, {
        id: "inv1", invoiceType: "FINAL", customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-11-01", dueDate: "2026-11-14", allowCardPayment: true,
        chasingEnabled: true, chasingScheduleDaysJson: [3, 7, 14], lines: [],
      })
    ).rejects.toThrow("Locked or issued invoices cannot be edited. Issue a Credit Note instead.");
  });

  it("issues GST credit note against INVOICE_BALANCE and marks invoice PAID when balance hits 0", async () => {
    const updatePayloads: Array<Record<string, unknown>> = [];
    const mockDb = {
      select: vi.fn().mockReturnValueOnce(
        mockSelectRows([{
          id: "inv1", invoiceNumber: "INV-0005", customerId: "c1", gstRegisteredSnapshot: true,
          balanceDue: "220.00", creditApplied: "0.00", status: "SENT",
        }])
      ),
      insert: vi.fn().mockReturnValueOnce(
        mockInsertRows([{ id: "cn1", amountExTax: "200.00", taxAmount: "20.00", totalIncTax: "220.00" }])
      ),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          updatePayloads.push(vals);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      })),
    } as unknown as DbOrTx;

    const cn = await issueCreditNoteCommand(mockDb, CTX, {
      invoiceId: "inv1", reason: "Scope reduction", amountExTax: 200, includeGst: true, creditDestination: "INVOICE_BALANCE",
    });
    expect(cn.totalIncTax).toBe("220.00");
    expect(updatePayloads[0]?.creditApplied).toBe("220.00");
    expect(updatePayloads[0]?.balanceDue).toBe("0.00");
    expect(updatePayloads[0]?.status).toBe("PAID");
  });

  it("enforces refundable balance guard and updates invoice balance on partial MANUAL refund", async () => {
    const overRefundDb = {
      select: vi.fn().mockReturnValueOnce(
        mockSelectRows([{ id: "pay1", invoiceId: "inv1", amount: "300.00", refundedAmount: "250.00" }])
      ),
    } as unknown as DbOrTx;
    await expect(
      refundInvoicePaymentCommand(overRefundDb, CTX, { paymentId: "pay1", amount: 60, refundMethod: "MANUAL" })
    ).rejects.toThrow("Refund amount exceeds remaining refundable payment balance.");

    const updatePayloads: Array<Record<string, unknown>> = [];
    const partialRefundDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(mockSelectRows([{ id: "pay1", invoiceId: "inv1", amount: "300.00", refundedAmount: "0.00" }]))
        .mockReturnValueOnce(mockSelectRows([{ id: "inv1", amountPaid: "300.00", balanceDue: "0.00", status: "PAID" }])),
      insert: vi.fn().mockReturnValueOnce(mockInsertRows([{ id: "ref1", amount: "100.00" }])),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          updatePayloads.push(vals);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      })),
    } as unknown as DbOrTx;

    const refund = await refundInvoicePaymentCommand(partialRefundDb, CTX, {
      paymentId: "pay1", amount: 100, refundMethod: "MANUAL", reason: "Overpayment",
    });
    expect(refund.amount).toBe("100.00");
    expect(updatePayloads[0]?.refundedAmount).toBe("100.00");
    expect(updatePayloads[1]?.amountPaid).toBe("200.00");
    expect(updatePayloads[1]?.balanceDue).toBe("100.00");
    expect(updatePayloads[1]?.status).toBe("PARTIALLY_PAID");
  });

  it("suppresses card payment when disallowed or above override/default threshold", () => {
    expect(resolveAllowedPaymentMethods({
      allowCardPayment: false, balanceDue: 100, maxCardAmountOverride: null, defaultMaxCardAmount: "5000.00",
    })).toEqual(["au_becs_debit"]);
    expect(resolveAllowedPaymentMethods({
      allowCardPayment: true, balanceDue: 2000, maxCardAmountOverride: "1500.00", defaultMaxCardAmount: "5000.00",
    })).toEqual(["au_becs_debit"]);
    expect(resolveAllowedPaymentMethods({
      allowCardPayment: true, balanceDue: 1500, maxCardAmountOverride: null, defaultMaxCardAmount: "1500.00",
    })).toEqual(["au_becs_debit", "card"]);
  });
});

describe("Pulse: Live Job Margin redaction & 12% Payday Super Cash Pulse", () => {
  it("redacts Live Job Margin for TRADIE and calculates exact margin for OWNER", async () => {
    const unusedDb = {} as unknown as DbOrTx;
    const tradieMargin = await getJobMarginQuery(unusedDb, {
      tenantId: "t1", appId: "a1", jobId: "j1", callerBaseRole: "MEMBER", callerAppRole: "TRADIE",
    });
    expect(tradieMargin).toEqual({
      redacted: true, revenueExTax: null, labourCost: null, materialCost: null, grossProfit: null, marginPct: null,
    });

    const ownerDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(mockSelectRows([{ id: "j1", quotedAmountExTax: "2000.00" }]))
        .mockReturnValueOnce(mockSelectRows([{ subtotalExTax: "2500.00" }]))
        .mockReturnValueOnce(mockSelectRows([{ durationMinutes: 150, hourlyCostSnapshot: "60.00" }]))
        .mockReturnValueOnce(mockSelectRows([{ quantity: "4.00", unitCostSnapshot: "50.00" }]))
        .mockReturnValueOnce(mockSelectRows([])),
    } as unknown as DbOrTx;

    const ownerMargin = await getJobMarginQuery(ownerDb, {
      tenantId: "t1", appId: "a1", jobId: "j1", callerBaseRole: "OWNER", callerAppRole: "OWNER",
    });
    expect(ownerMargin).toEqual({
      redacted: false, revenueExTax: 2500, labourCost: 150, materialCost: 200, grossProfit: 2150, marginPct: 86,
    });
  });

  it("computes due/overdue receivables, 12% Payday Super, and net cash pulse", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(mockSelectRows([
          { balanceDue: "1200.00", dueDate: today },
          { balanceDue: "800.00", dueDate: "2020-01-01" },
        ]))
        .mockReturnValueOnce(mockSelectRows([
          { durationMinutes: 600, hourlyCostSnapshot: "50.00" },
          { durationMinutes: 120, hourlyCostSnapshot: "100.00" },
        ])),
    } as unknown as DbOrTx;

    const pulse = await getWeeklyPaydayCashPulseQuery(mockDb, "t1", "a1");
    expect(pulse).toEqual({
      dueReceivables: 1200, overdueReceivables: 800, totalReceivables: 2000,
      accruedWages: 700, superContribution12Pct: 84, totalCrewObligation: 784, netCashPulse: 1216,
    });
  });
});
