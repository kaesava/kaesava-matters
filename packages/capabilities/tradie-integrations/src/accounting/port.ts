export type AccountingProvider = "XERO" | "MYOB" | "QBO";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  externalTenantId: string;
  externalTenantName: string | null;
}

export interface AccountingCustomerPayload {
  localId: string;
  name: string;
  email: string | null;
  phone: string | null;
  abn: string | null;
}

export interface AccountingInvoicePayload {
  localId: string;
  invoiceNumber: string;
  customerExternalId: string;
  issueDate: string;
  dueDate: string;
  subtotalExTax: number;
  totalTax: number;
  totalIncTax: number;
}

export interface AccountingCreditNotePayload {
  localId: string;
  creditNoteNumber: string;
  customerExternalId: string;
  amountExTax: number;
  taxAmount: number;
  totalIncTax: number;
  reason: string;
}

export interface AccountingSupplierBillPayload {
  localId: string;
  billNumber: string | null;
  supplierName: string;
  issueDate: string;
  dueDate: string | null;
  subtotalExTax: number;
  taxAmount: number;
  totalIncTax: number;
}

export interface AccountingTimesheetPayload {
  localId: string;
  employeeUserId: string;
  weekStartDate: string;
  hoursWorked: number;
  paydaySuperRatePct: number;
}

export interface InboundPaymentRecord {
  externalPaymentId: string;
  invoiceExternalId: string;
  amount: number;
  paidAt: string;
}

export interface AccountingProviderPort {
  readonly provider: AccountingProvider;
  getAuthorizeUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  pushCustomer(accessToken: string, extTenantId: string, payload: AccountingCustomerPayload): Promise<string>;
  pushInvoice(accessToken: string, extTenantId: string, payload: AccountingInvoicePayload): Promise<string>;
  pushCreditNote(accessToken: string, extTenantId: string, payload: AccountingCreditNotePayload): Promise<string>;
  pushSupplierBill(accessToken: string, extTenantId: string, payload: AccountingSupplierBillPayload): Promise<string>;
  pushWeeklyTimesheet(accessToken: string, extTenantId: string, payload: AccountingTimesheetPayload): Promise<string>;
  fetchInboundPayments(accessToken: string, extTenantId: string, sinceCursor: string | null): Promise<{ payments: InboundPaymentRecord[]; nextCursor: string | null }>;
}
