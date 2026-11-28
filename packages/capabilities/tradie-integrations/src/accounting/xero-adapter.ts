import type {
  AccountingCreditNotePayload,
  AccountingCustomerPayload,
  AccountingInvoicePayload,
  AccountingProviderPort,
  AccountingSupplierBillPayload,
  AccountingTimesheetPayload,
  InboundPaymentRecord,
  OAuthTokens,
} from "./port.js";

export interface XeroAdapterConfig {
  clientId: string;
  clientSecret: string;
  fetcher?: typeof fetch;
}

export class XeroAdapter implements AccountingProviderPort {
  readonly provider = "XERO" as const;
  private readonly cfg: XeroAdapterConfig;

  constructor(cfg: XeroAdapterConfig) {
    this.cfg = cfg;
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.cfg.clientId,
      redirect_uri: redirectUri,
      scope: "offline_access accounting.transactions accounting.contacts payroll.timesheets",
      state,
    });
    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "xero-org",
      externalTenantName: "Xero Organisation",
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "xero-org",
      externalTenantName: "Xero Organisation",
    };
  }

  async pushCustomer(accessToken: string, extTenantId: string, payload: AccountingCustomerPayload): Promise<string> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://api.xero.com/api.xro/2.0/Contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId, "Content-Type": "application/json" },
      body: JSON.stringify({ Contacts: [{ Name: payload.name, EmailAddress: payload.email, TaxNumber: payload.abn }] }),
    });
    const json = (await res.json()) as { Contacts?: Array<{ ContactID?: string }> };
    return json.Contacts?.[0]?.ContactID ?? `xero-contact-${payload.localId}`;
  }

  async pushInvoice(accessToken: string, extTenantId: string, payload: AccountingInvoicePayload): Promise<string> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId, "Content-Type": "application/json" },
      body: JSON.stringify({
        Invoices: [{ Type: "ACCREC", InvoiceNumber: payload.invoiceNumber, Contact: { ContactID: payload.customerExternalId }, Date: payload.issueDate, DueDate: payload.dueDate, Total: payload.totalIncTax }],
      }),
    });
    const json = (await res.json()) as { Invoices?: Array<{ InvoiceID?: string }> };
    return json.Invoices?.[0]?.InvoiceID ?? `xero-inv-${payload.localId}`;
  }

  async pushCreditNote(accessToken: string, extTenantId: string, payload: AccountingCreditNotePayload): Promise<string> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://api.xero.com/api.xro/2.0/CreditNotes", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId, "Content-Type": "application/json" },
      body: JSON.stringify({
        CreditNotes: [{ Type: "ACCRECCREDIT", CreditNoteNumber: payload.creditNoteNumber, Contact: { ContactID: payload.customerExternalId }, Total: payload.totalIncTax, Reference: payload.reason }],
      }),
    });
    const json = (await res.json()) as { CreditNotes?: Array<{ CreditNoteID?: string }> };
    return json.CreditNotes?.[0]?.CreditNoteID ?? `xero-cn-${payload.localId}`;
  }

  async pushSupplierBill(accessToken: string, extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId, "Content-Type": "application/json" },
      body: JSON.stringify({
        Invoices: [{ Type: "ACCPAY", InvoiceNumber: payload.billNumber, Contact: { Name: payload.supplierName }, Date: payload.issueDate, DueDate: payload.dueDate, Total: payload.totalIncTax }],
      }),
    });
    const json = (await res.json()) as { Invoices?: Array<{ InvoiceID?: string }> };
    return json.Invoices?.[0]?.InvoiceID ?? `xero-bill-${payload.localId}`;
  }

  async pushWeeklyTimesheet(accessToken: string, extTenantId: string, payload: AccountingTimesheetPayload): Promise<string> {
    const fn = this.cfg.fetcher ?? fetch;
    const res = await fn("https://api.xero.com/payroll.xro/1.0/Timesheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId, "Content-Type": "application/json" },
      body: JSON.stringify({
        EmployeeID: payload.employeeUserId,
        StartDate: payload.weekStartDate,
        Hours: payload.hoursWorked,
        PaydaySuperRatePct: payload.paydaySuperRatePct,
      }),
    });
    const json = (await res.json()) as { Timesheets?: Array<{ TimesheetID?: string }> };
    return json.Timesheets?.[0]?.TimesheetID ?? `xero-ts-${payload.localId}`;
  }

  async fetchInboundPayments(accessToken: string, extTenantId: string, sinceCursor: string | null): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }> {
    const fn = this.cfg.fetcher ?? fetch;
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "xero-tenant-id": extTenantId };
    if (sinceCursor) headers["If-Modified-Since"] = sinceCursor;
    const res = await fn("https://api.xero.com/api.xro/2.0/Payments", { headers });
    const json = (await res.json()) as { Payments?: Array<{ PaymentID?: string; Invoice?: { InvoiceID?: string }; Amount?: number; Date?: string }> };
    const payments: InboundPaymentRecord[] = (json.Payments ?? [])
      .filter((p) => p.PaymentID && p.Invoice?.InvoiceID)
      .map((p) => ({
        externalPaymentId: p.PaymentID as string,
        invoiceExternalId: p.Invoice?.InvoiceID as string,
        amount: p.Amount ?? 0,
        paidAt: p.Date ?? new Date().toISOString(),
      }));
    return { payments, nextCursor: new Date().toISOString() };
  }
}
