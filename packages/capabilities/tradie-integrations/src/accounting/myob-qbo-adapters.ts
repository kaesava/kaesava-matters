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

  constructor(cfg: { clientId: string; clientSecret: string }) {
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
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

  async exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokens> {
    return {
      accessToken: `myob-token-${this.clientId.slice(0, 6)}`,
      refreshToken: "myob-refresh",
      expiresAt: new Date(Date.now() + 1200 * 1000),
      externalTenantId: "myob-company-file",
      externalTenantName: "MYOB Business",
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    return {
      accessToken: "myob-refreshed-token",
      refreshToken,
      expiresAt: new Date(Date.now() + 1200 * 1000),
      externalTenantId: "myob-company-file",
      externalTenantName: "MYOB Business",
    };
  }

  async pushCustomer(_accessToken: string, _extTenantId: string, payload: AccountingCustomerPayload): Promise<string> {
    return `myob-cust-${payload.localId}`;
  }

  async pushInvoice(_accessToken: string, _extTenantId: string, payload: AccountingInvoicePayload): Promise<string> {
    return `myob-inv-${payload.localId}`;
  }

  async pushCreditNote(_accessToken: string, _extTenantId: string, payload: AccountingCreditNotePayload): Promise<string> {
    return `myob-cn-${payload.localId}`;
  }

  async pushSupplierBill(_accessToken: string, _extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string> {
    return `myob-bill-${payload.localId}`;
  }

  async pushWeeklyTimesheet(_accessToken: string, _extTenantId: string, payload: AccountingTimesheetPayload): Promise<string> {
    return `myob-ts-${payload.localId}`;
  }

  async fetchInboundPayments(): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }> {
    return { payments: [], nextCursor: new Date().toISOString() };
  }
}

export class QboAdapter implements AccountingProviderPort {
  readonly provider = "QBO" as const;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(cfg: { clientId: string; clientSecret: string }) {
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
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

  async exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokens> {
    return {
      accessToken: `qbo-token-${this.clientId.slice(0, 6)}`,
      refreshToken: "qbo-refresh",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      externalTenantId: "qbo-realm",
      externalTenantName: "QuickBooks Online",
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    return {
      accessToken: "qbo-refreshed-token",
      refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      externalTenantId: "qbo-realm",
      externalTenantName: "QuickBooks Online",
    };
  }

  async pushCustomer(_accessToken: string, _extTenantId: string, payload: AccountingCustomerPayload): Promise<string> {
    return `qbo-cust-${payload.localId}`;
  }

  async pushInvoice(_accessToken: string, _extTenantId: string, payload: AccountingInvoicePayload): Promise<string> {
    return `qbo-inv-${payload.localId}`;
  }

  async pushCreditNote(_accessToken: string, _extTenantId: string, payload: AccountingCreditNotePayload): Promise<string> {
    return `qbo-cn-${payload.localId}`;
  }

  async pushSupplierBill(_accessToken: string, _extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string> {
    return `qbo-bill-${payload.localId}`;
  }

  async pushWeeklyTimesheet(_accessToken: string, _extTenantId: string, payload: AccountingTimesheetPayload): Promise<string> {
    return `qbo-ts-${payload.localId}`;
  }

  async fetchInboundPayments(): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }> {
    return { payments: [], nextCursor: new Date().toISOString() };
  }
}
