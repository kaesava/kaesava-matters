import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  MyobAdapter,
  QboAdapter,
  XeroAdapter,
  deductSmsCreditsCommand,
  extractReceiptViaAiVisionQuery,
  grantSmsCreditPackCommand,
  handleAccountingPaymentWebhookCommand,
  handleInboundTwilioSms,
  handleTwilioMissedCallWebhook,
  sendReviewBoosterCommand,
  submitCustomerSatisfactionCommand,
  verifyTwilioSignature,
  type IntegrationsContext,
} from "../index.js";

const ctx: IntegrationsContext = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  appId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
};

async function computeTwilioSig(authToken: string, url: string, params: Record<string, string>): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, k) => `${acc}${k}${params[k] ?? ""}`, url);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe("Accounting adapters & payment auto-pause", () => {
  it("maps XeroAdapter customer, invoice, credit note, bill, timesheet, and inbound payments", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ Contacts: [{ ContactID: "xero-c1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Invoices: [{ InvoiceID: "xero-i1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ CreditNotes: [{ CreditNoteID: "xero-cn1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Invoices: [{ InvoiceID: "xero-b1" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Timesheets: [{ TimesheetID: "xero-t1" }] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Payments: [{ PaymentID: "pay-1", Invoice: { InvoiceID: "xero-i1" }, Amount: 550, Date: "2026-11-28" }],
          })
        )
      );

    const xero = new XeroAdapter({ clientId: "cid", clientSecret: "csec", fetcher: mockFetch });
    expect(xero.getAuthorizeUrl("st-1", "https://app.test/cb")).toContain("login.xero.com");

    expect(await xero.pushCustomer("tok", "org-1", { localId: "c1", name: "Acme", email: "a@b.au", phone: null, abn: "123" })).toBe("xero-c1");
    expect(await xero.pushInvoice("tok", "org-1", { localId: "i1", invoiceNumber: "INV-1", customerExternalId: "xero-c1", issueDate: "2026-11-01", dueDate: "2026-11-15", subtotalExTax: 500, totalTax: 50, totalIncTax: 550 })).toBe("xero-i1");
    expect(await xero.pushCreditNote("tok", "org-1", { localId: "cn1", creditNoteNumber: "CN-1", customerExternalId: "xero-c1", amountExTax: 50, taxAmount: 5, totalIncTax: 55, reason: "Discount" })).toBe("xero-cn1");
    expect(await xero.pushSupplierBill("tok", "org-1", { localId: "b1", billNumber: "B-1", supplierName: "Reece", issueDate: "2026-11-02", dueDate: null, subtotalExTax: 100, taxAmount: 10, totalIncTax: 110 })).toBe("xero-b1");
    expect(await xero.pushWeeklyTimesheet("tok", "org-1", { localId: "t1", employeeUserId: "u1", weekStartDate: "2026-11-23", hoursWorked: 38, paydaySuperRatePct: 11.5 })).toBe("xero-t1");

    const inbound = await xero.fetchInboundPayments("tok", "org-1", "2026-11-01");
    expect(inbound.payments).toEqual([
      { externalPaymentId: "pay-1", invoiceExternalId: "xero-i1", amount: 550, paidAt: "2026-11-28" },
    ]);
  });

  it("maps MYOB and QBO adapter authorize URLs and entity IDs", async () => {
    const myob = new MyobAdapter({ clientId: "myob-id-123", clientSecret: "sec" });
    const qbo = new QboAdapter({ clientId: "qbo-id-123", clientSecret: "sec" });

    expect(myob.getAuthorizeUrl("s", "https://cb")).toContain("secure.myob.com");
    expect(qbo.getAuthorizeUrl("s", "https://cb")).toContain("appcenter.intuit.com");
    expect(await myob.pushInvoice("t", "e", { localId: "42", invoiceNumber: "1", customerExternalId: "c", issueDate: "2026-11-01", dueDate: "2026-11-10", subtotalExTax: 10, totalTax: 1, totalIncTax: 11 })).toBe("myob-inv-42");
    expect(await qbo.pushInvoice("t", "e", { localId: "42", invoiceNumber: "1", customerExternalId: "c", issueDate: "2026-11-01", dueDate: "2026-11-10", subtotalExTax: 10, totalTax: 1, totalIncTax: 11 })).toBe("qbo-inv-42");
  });

  it("auto-pauses invoice chasing on inbound payment webhook when entity link exists", async () => {
    const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const mockDbHit = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ localId: "inv-local-1" }]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({ set: setMock }),
    };

    const hit = await handleAccountingPaymentWebhookCommand(mockDbHit as unknown as DbOrTx, "XERO", "xero-i1");
    expect(hit).toEqual({ pausedChasing: true });
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ chasingEnabled: false, status: "PAID" }));

    const mockDbMiss = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn(),
    };
    const miss = await handleAccountingPaymentWebhookCommand(mockDbMiss as unknown as DbOrTx, "XERO", "unknown");
    expect(miss).toEqual({ pausedChasing: false });
    expect(mockDbMiss.update).not.toHaveBeenCalled();
  });
});

describe("Cloudflare AI Vision strict Zod OCR prefill", () => {
  it("calls AI Gateway with cf-aig-skip-cache and validates strict Zod output", async () => {
    const payload = {
      supplierName: "Bunnings Warehouse",
      supplierAbn: "63008672179",
      issueDate: "2026-11-28",
      subtotalExTax: 100,
      taxAmount: 10,
      totalIncTax: 110,
    };
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { response: `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` } }))
    );

    const parsed = await extractReceiptViaAiVisionQuery(
      {
        CLOUDFLARE_ACCOUNT_ID: "acc-1",
        CLOUDFLARE_AI_GATEWAY_ID: "gw-1",
        CLOUDFLARE_API_TOKEN: "tok-1",
        fetcher: mockFetch,
      },
      { imageBase64: "abc123", mimeType: "image/jpeg" }
    );

    expect(parsed).toEqual(payload);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["cf-aig-skip-cache"]).toBe("true");
  });

  it("rejects extra/invalid fields via strict Zod schema and supports env.AI fallback", async () => {
    const invalidAi = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          supplierName: "Reece",
          supplierAbn: null,
          issueDate: "28-11-2026",
          subtotalExTax: 50,
          taxAmount: 5,
          totalIncTax: 55,
          extraField: "disallowed",
        }),
      }),
    };

    await expect(
      extractReceiptViaAiVisionQuery({ AI: invalidAi }, { imageBase64: "abc", mimeType: "image/png" })
    ).rejects.toThrow();

    await expect(extractReceiptViaAiVisionQuery({}, { imageBase64: "abc", mimeType: "image/png" })).rejects.toThrow(
      "AI Gateway credentials are not configured."
    );
  });
});

describe("Twilio HMAC-SHA1 signature verification", () => {
  it("verifies valid signatures and rejects tampered params or missing tokens", async () => {
    const authToken = "twilio-secret-token";
    const url = "https://api.tradie.test/webhooks/twilio/sms";
    const params = { From: "+61400111222", To: "+61400999888", Body: "Need a quote" };
    const validSig = await computeTwilioSig(authToken, url, params);

    expect(await verifyTwilioSignature(authToken, url, params, validSig)).toBe(true);
    expect(await verifyTwilioSignature(authToken, url, { ...params, Body: "Tampered" }, validSig)).toBe(false);
    expect(await verifyTwilioSignature("", url, params, validSig)).toBe(false);
    expect(await verifyTwilioSignature(authToken, url, params, "")).toBe(false);
  });
});

describe("SMS credits & pack purchase", () => {
  it("deducts credits when balance is sufficient and rejects insufficient balance", async () => {
    const insertedEntry = { id: "entry-1", creditsDelta: -2, reason: "OUTBOUND_SMS" };
    const mockDbOk = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ balance: 10 }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedEntry]),
        }),
      }),
    };

    const res = await deductSmsCreditsCommand(mockDbOk as unknown as DbOrTx, ctx, { cost: 2, reason: "OUTBOUND_SMS" });
    expect(res).toEqual({ entry: insertedEntry, remainingBalance: 8 });

    const mockDbLow = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ balance: 1 }]),
        }),
      }),
      insert: vi.fn(),
    };
    await expect(
      deductSmsCreditsCommand(mockDbLow as unknown as DbOrTx, ctx, { cost: 2, reason: "OUTBOUND_SMS" })
    ).rejects.toThrow("Insufficient SMS credits");
  });

  it("grants pack credits idempotently by stripeCheckoutSessionId", async () => {
    const granted = { id: "pack-1", creditsDelta: 500, reason: "PACK_PURCHASE" };
    const mockDbNew = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([granted]),
        }),
      }),
    };

    expect(
      await grantSmsCreditPackCommand(mockDbNew as unknown as DbOrTx, ctx, {
        packKey: "PACK_500",
        stripeCheckoutSessionId: "cs_test_123",
      })
    ).toEqual(granted);

    const mockDbDup = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([granted]),
          }),
        }),
      }),
      insert: vi.fn(),
    };
    expect(
      await grantSmsCreditPackCommand(mockDbDup as unknown as DbOrTx, ctx, {
        packKey: "PACK_500",
        stripeCheckoutSessionId: "cs_test_123",
      })
    ).toEqual(granted);
    expect(mockDbDup.insert).not.toHaveBeenCalled();
  });
});

describe("Missed-call auto-text & Lead creation", () => {
  it("sends missed-call auto-SMS and deducts 1 credit", async () => {
    let selectCall = 0;
    const phoneRow = {
      id: "phone-1", e164Number: "+61400999888", twilioPhoneSid: "PN123",
      missedCallAutoTextEnabled: true, missedCallTemplate: "Sorry we missed you!",
      tenantId: ctx.tenantId, appId: ctx.appId, createdBy: ctx.userId,
    };
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall += 1;
            return selectCall === 1 ? { limit: vi.fn().mockResolvedValue([phoneRow]) } : Promise.resolve([{ balance: 5 }]);
          }),
        }),
      })),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "credit-1" }]) }),
      }),
    };

    const res = await handleTwilioMissedCallWebhook(mockDb as unknown as DbOrTx, {}, {
      toNumber: "+61400999888", fromNumber: "+61400111222", callSid: "CA123",
    });

    expect(res.sent).toBe(true);
    expect(res.twilioPhoneSid).toBe("PN123");
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("creates a LEAD job when an inbound SMS replies to a recent missed call", async () => {
    let selectCall = 0;
    const insertedTables: unknown[] = [];
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall += 1;
            if (selectCall === 1) {
              return {
                limit: vi.fn().mockResolvedValue([
                  { id: "phone-1", tenantId: ctx.tenantId, appId: ctx.appId, createdBy: ctx.userId },
                ]),
              };
            }
            if (selectCall === 2) {
              return {
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: "missed-1" }]),
                }),
              };
            }
            return {
              limit: vi.fn().mockResolvedValue([{ id: "cust-1" }]),
            };
          }),
        }),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: unknown) => {
          insertedTables.push(vals);
          return Promise.resolve([]);
        }),
      })),
    };

    const res = await handleInboundTwilioSms(mockDb as unknown as DbOrTx, {
      toNumber: "+61400999888",
      fromNumber: "+61400111222",
      body: "Hot water system leaking",
    });

    expect(res.matched).toBe(true);
    expect(res.leadJobId).toBeTruthy();
    const leadInsert = insertedTables[0] as { status: string; title: string };
    expect(leadInsert.status).toBe("LEAD");
    expect(leadInsert.title).toContain("+61400111222");
  });
});

describe("Review booster >= 4 star Google redirect", () => {
  it("creates review request and redirects to Google only when rating >= 4 and URL exists", async () => {
    const reqRow = {
      id: "44444444-4444-4444-8444-444444444444",
      googleReviewUrl: "https://g.page/r/tradie-review",
    };
    const mockDbCreate = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([reqRow]),
        }),
      }),
    };

    expect(
      await sendReviewBoosterCommand(mockDbCreate as unknown as DbOrTx, ctx, {
        customerId: "55555555-5555-4555-8555-555555555555",
        googleReviewUrl: reqRow.googleReviewUrl,
      })
    ).toEqual(reqRow);

    const makeSatisfactionDb = (ratingScore: number) => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([reqRow]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...reqRow, ratingScore }]),
          }),
        }),
      }),
    });

    const high = await submitCustomerSatisfactionCommand(makeSatisfactionDb(4) as unknown as DbOrTx, {
      reviewRequestId: reqRow.id,
      ratingScore: 4,
    });
    expect(high.redirectUrl).toBe(reqRow.googleReviewUrl);

    const low = await submitCustomerSatisfactionCommand(makeSatisfactionDb(3) as unknown as DbOrTx, {
      reviewRequestId: reqRow.id,
      ratingScore: 3,
    });
    expect(low.redirectUrl).toBeNull();
  });
});
