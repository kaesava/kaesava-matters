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

export class MyobAdapter implements AccountingProviderPort {
  readonly provider = "MYOB" as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetcher: typeof fetch;

  constructor(cfg: { clientId: string; clientSecret: string; fetcher?: typeof fetch }) {
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
    this.fetcher = cfg.fetcher ?? fetch;
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "CompanyFile",
      state,
    });
    return `https://secure.myob.com/oauth2/account/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const res = await this.fetcher("https://secure.myob.com/oauth2/v1/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`MYOB token exchange failed (${res.status})`);
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "myob-company-file",
      externalTenantName: "MYOB Business",
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await this.fetcher("https://secure.myob.com/oauth2/v1/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`MYOB token refresh failed (${res.status})`);
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "myob-company-file",
      externalTenantName: "MYOB Business",
    };
  }

  async pushCustomer(accessToken: string, extTenantId: string, payload: AccountingCustomerPayload): Promise<string> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Contact/Customer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ CompanyName: payload.name, IsIndividual: false }),
    });
    if (!res.ok) throw new Error(`MYOB pushCustomer failed (${res.status})`);
    const json = (await res.json()) as { UID?: string };
    return json.UID ?? `myob-cust-${payload.localId}`;
  }

  async pushInvoice(accessToken: string, extTenantId: string, payload: AccountingInvoicePayload): Promise<string> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Sale/Invoice/Service`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Number: payload.invoiceNumber,
        Date: payload.issueDate,
        Customer: { UID: payload.customerExternalId },
        TotalAmount: payload.totalIncTax,
      }),
    });
    if (!res.ok) throw new Error(`MYOB pushInvoice failed (${res.status})`);
    const json = (await res.json()) as { UID?: string };
    return json.UID ?? `myob-inv-${payload.localId}`;
  }

  async pushCreditNote(accessToken: string, extTenantId: string, payload: AccountingCreditNotePayload): Promise<string> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Sale/CreditSettlement`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ Customer: { UID: payload.customerExternalId }, Amount: payload.totalIncTax, Memo: payload.reason }),
    });
    if (!res.ok) throw new Error(`MYOB pushCreditNote failed (${res.status})`);
    const json = (await res.json()) as { UID?: string };
    return json.UID ?? `myob-cn-${payload.localId}`;
  }

  async pushSupplierBill(accessToken: string, extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Purchase/Bill/Service`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ Number: payload.billNumber, Date: payload.issueDate, TotalAmount: payload.totalIncTax }),
    });
    if (!res.ok) throw new Error(`MYOB pushSupplierBill failed (${res.status})`);
    const json = (await res.json()) as { UID?: string };
    return json.UID ?? `myob-bill-${payload.localId}`;
  }

  async pushWeeklyTimesheet(accessToken: string, extTenantId: string, payload: AccountingTimesheetPayload): Promise<string> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Payroll/Timesheet`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ Employee: { UID: payload.employeeUserId }, StartDate: payload.weekStartDate, Hours: payload.hoursWorked }),
    });
    if (!res.ok) throw new Error(`MYOB pushWeeklyTimesheet failed (${res.status})`);
    const json = (await res.json()) as { UID?: string };
    return json.UID ?? `myob-ts-${payload.localId}`;
  }

  async fetchInboundPayments(accessToken: string, extTenantId: string): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }> {
    const res = await this.fetcher(`https://api.myob.com/accountright/${extTenantId}/Sale/CustomerPayment`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`MYOB fetchInboundPayments failed (${res.status})`);
    const json = (await res.json()) as { Items?: Array<{ UID?: string; AmountReceived?: number; Date?: string; Invoices?: Array<{ UID?: string }> }> };
    const payments: InboundPaymentRecord[] = (json.Items ?? []).map((item) => ({
      externalPaymentId: item.UID ?? "",
      invoiceExternalId: item.Invoices?.[0]?.UID ?? "",
      amount: Number(item.AmountReceived ?? 0),
      paidAt: item.Date ?? new Date().toISOString(),
    }));
    return { payments, nextCursor: new Date().toISOString() };
  }
}

export class QboAdapter implements AccountingProviderPort {
  readonly provider = "QBO" as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetcher: typeof fetch;

  constructor(cfg: { clientId: string; clientSecret: string; fetcher?: typeof fetch }) {
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
    this.fetcher = cfg.fetcher ?? fetch;
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      state,
    });
    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const auth = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await this.fetcher("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`QBO token exchange failed (${res.status})`);
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "qbo-realm",
      externalTenantName: "QuickBooks Online",
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const auth = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await this.fetcher("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`QBO token refresh failed (${res.status})`);
    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    return {
      accessToken: data.access_token ?? "",
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      externalTenantId: "qbo-realm",
      externalTenantName: "QuickBooks Online",
    };
  }

  async pushCustomer(accessToken: string, extTenantId: string, payload: AccountingCustomerPayload): Promise<string> {
    const res = await this.fetcher(`https://quickbooks.api.intuit.com/v3/company/${extTenantId}/customer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ DisplayName: payload.name, PrimaryEmailAddr: payload.email ? { Address: payload.email } : undefined }),
    });
    if (!res.ok) throw new Error(`QBO pushCustomer failed (${res.status})`);
    const json = (await res.json()) as { Customer?: { Id?: string } };
    return json.Customer?.Id ?? `qbo-cust-${payload.localId}`;
  }

  async pushInvoice(accessToken: string, extTenantId: string, payload: AccountingInvoicePayload): Promise<string> {
    const res = await this.fetcher(`https://quickbooks.api.intuit.com/v3/company/${extTenantId}/invoice`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        DocNumber: payload.invoiceNumber,
        CustomerRef: { value: payload.customerExternalId },
        Line: [{ Amount: payload.subtotalExTax, DetailType: "SalesItemLineDetail" }],
      }),
    });
    if (!res.ok) throw new Error(`QBO pushInvoice failed (${res.status})`);
    const json = (await res.json()) as { Invoice?: { Id?: string } };
    return json.Invoice?.Id ?? `qbo-inv-${payload.localId}`;
  }

  async pushCreditNote(accessToken: string, extTenantId: string, payload: AccountingCreditNotePayload): Promise<string> {
    const res = await this.fetcher(`https://quickbooks.api.intuit.com/v3/company/${extTenantId}/creditmemo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        DocNumber: payload.creditNoteNumber,
        CustomerRef: { value: payload.customerExternalId },
        Line: [{ Amount: payload.amountExTax, DetailType: "SalesItemLineDetail" }],
      }),
    });
    if (!res.ok) throw new Error(`QBO pushCreditNote failed (${res.status})`);
    const json = (await res.json()) as { CreditMemo?: { Id?: string } };
    return json.CreditMemo?.Id ?? `qbo-cn-${payload.localId}`;
  }

  async pushSupplierBill(accessToken: string, extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string> {
    const res = await this.fetcher(`https://quickbooks.api.intuit.com/v3/company/${extTenantId}/bill`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        DocNumber: payload.billNumber,
        Line: [{ Amount: payload.subtotalExTax, DetailType: "AccountBasedExpenseLineDetail" }],
      }),
    });
    if (!res.ok) throw new Error(`QBO pushSupplierBill failed (${res.status})`);
    const json = (await res.json()) as { Bill?: { Id?: string } };
    return json.Bill?.Id ?? `qbo-bill-${payload.localId}`;
  }

  async pushWeeklyTimesheet(accessToken: string, extTenantId: string, payload: AccountingTimesheetPayload): Promise<string> {
    const res = await this.fetcher(`https://quickbooks.api.intuit.com/v3/company/${extTenantId}/timeactivity`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        NameOf: "Employee",
        EmployeeRef: { value: payload.employeeUserId },
        TxnDate: payload.weekStartDate,
        Hours: payload.hoursWorked,
      }),
    });
    if (!res.ok) throw new Error(`QBO pushWeeklyTimesheet failed (${res.status})`);
    const json = (await res.json()) as { TimeActivity?: { Id?: string } };
    return json.TimeActivity?.Id ?? `qbo-ts-${payload.localId}`;
  }

  async fetchInboundPayments(accessToken: string, extTenantId: string): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }> {
    const res = await this.fetcher(
      `https://quickbooks.api.intuit.com/v3/company/${extTenantId}/query?query=${encodeURIComponent("SELECT * FROM Payment")}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`QBO fetchInboundPayments failed (${res.status})`);
    const json = (await res.json()) as { QueryResponse?: { Payment?: Array<{ Id?: string; TotalAmt?: number; TxnDate?: string; Line?: Array<{ LinkedTxn?: Array<{ TxnId?: string }> }> }> } };
    const payments: InboundPaymentRecord[] = (json.QueryResponse?.Payment ?? []).map((p) => ({
      externalPaymentId: p.Id ?? "",
      invoiceExternalId: p.Line?.[0]?.LinkedTxn?.[0]?.TxnId ?? "",
      amount: Number(p.TotalAmt ?? 0),
      paidAt: p.TxnDate ?? new Date().toISOString(),
    }));
    return { payments, nextCursor: new Date().toISOString() };
  }
}
