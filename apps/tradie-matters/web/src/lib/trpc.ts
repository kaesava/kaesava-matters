import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { initTRPC } from "@trpc/server";
import type { z } from "zod";
import type {
  ApproveVariationInputType,
  AssignVisitCrewInputType,
  AttachJobPhotoInputType,
  CheckInVisitInputType,
  CheckOutVisitInputType,
  CompleteBusinessSetupInputType,
  CreateCustomerInputType,
  CreateInvoiceInputType,
  CreateJobInputType,
  CreatePricebookItemInputType,
  CreateQuoteInputType,
  CreateSiteInputType,
  CreateVariationInputType,
  CreateVisitInputType,
  GetDispatchBoardInputType,
  LogMaterialUsageInputType,
  RescheduleVisitInputType,
  TransitionJobStatusInput,
  UpdateBusinessProfileInputType,
  UpdateCustomerInputType,
  UpdateInvoiceInputType,
  UpdateJobInputType,
  UpdatePricebookItemInputType,
  UpdateQuoteInputType,
  UpdateSiteInputType,
  UpsertTeamMemberProfileInputType,
} from "@tradie-matters/capability-operations";
import type { SearchAddressesResult } from "@kaesava/capability-geo";
import type {
  CreateChatRoomInputDto,
  ListRoomMessagesInputDto,
  MarkRoomReadInputDto,
  PostChatMessageInputDto,
  RoomUnreadCount,
} from "@kaesava/capability-chat";
import type { InviteAcceptFlowProps } from "@kaesava/capability-tenant/web";
import type { ReceiptExtractionResult } from "@tradie-matters/capability-integrations";
import type { AppRouter as ApiAppRouter } from "../../../api/src/routers/_app";

export const TRADIE_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";
export const TRADIE_ACTIVE_TENANT_KEY = "tradie_matters_active_tenant_id";

declare const _t: ReturnType<typeof initTRPC.create>;
function _typeHelper<I, O>() {
  return {
    q: _t.procedure.query(async () => undefined as unknown as O),
    qi: _t.procedure.input(undefined as unknown as z.ZodType<I>).query(async () => undefined as unknown as O),
    m: _t.procedure.mutation(async () => undefined as unknown as O),
    mi: _t.procedure.input(undefined as unknown as z.ZodType<I>).mutation(async () => undefined as unknown as O),
  };
}
type Q<O> = ReturnType<typeof _typeHelper<void, O>>["q"];
type QI<I, O> = ReturnType<typeof _typeHelper<I, O>>["qi"];
type M<O> = ReturnType<typeof _typeHelper<void, O>>["m"];
type MI<I, O> = ReturnType<typeof _typeHelper<I, O>>["mi"];

type CustomerOut = { id: string; name: string; companyName: string | null; customerType: string; email: string | null; phone: string | null; mobile: string | null; abn: string | null; billingAddress: string | null; paymentTermsDays: number | null; notes: string | null };
type SiteOut = { id: string; name: string; addressLine1: string; suburb: string | null; state: string | null; postcode: string | null; country: string; accessNotes: string | null; keySafeCode: string | null; siteContactName: string | null; siteContactPhone: string | null };
type PricebookItemOut = { id: string; sku: string | null; name: string; description: string | null; itemType: string; category: string | null; unitOfMeasure: string; searchAliases: string | null; unitCostExTax: string; markupPct: string; sellPriceExTax: string; taxCode: string; isFavourite: boolean; supplierName: string | null };
type JobOut = { id: string; jobNumber: string; title: string; status: string; priority: string; customerId: string; siteId: string | null; scheduledStart: string | Date | null; scheduledEnd: string | Date | null; quotedAmountExTax: string | null; hasUnbilledExtras: boolean };
type VisitOut = { id: string; jobId: string; title: string; status: string; scheduledStart: string | Date; scheduledEnd: string | Date; assignees: Array<{ userId: string }> };
type TimeEntryOut = { id: string; startedAt: string | Date; endedAt: string | Date | null; durationMinutes: number | null; isBillable: boolean; notes: string | null };
type VariationOut = { id: string; variationNumber: string; title: string; status: string; totalSellExTax: string; approvedByName: string | null };
type MaterialUsageOut = { id: string; description: string; quantity: string; unitSellPriceExTax: string; isBillable: boolean };
type PhotoAttachmentOut = { id: string; fileNoteId: string; photoCategory: string; caption: string | null };
type QuoteOut = { id: string; quoteNumber: string; title: string; description: string | null; status: string; customerId: string; siteId: string | null; jobId: string | null; version: number; validUntil: string | Date | null; gstMode: string; subtotalExTax: string; totalTax: string; totalIncTax: string; depositType: string; depositValue: string; depositAmountDue: string; selectedOptionGroupId: string | null; pdfFileNoteId: string | null; followUpSentAt: string | Date | null; sentAt: string | Date | null; viewedAt: string | Date | null; acceptedAt: string | Date | null; declinedAt: string | Date | null; signerName: string | null; notes: string | null; createdAt: string | Date };
type QuoteOptionGroupOut = { id: string; quoteId: string; name: string; description: string | null; isRecommended: boolean; isSelected: boolean; subtotalExTax: string; totalTax: string; totalIncTax: string; sortOrder: number };
type QuoteLineOut = { id: string; quoteId: string; optionGroupId: string | null; pricebookItemId: string | null; description: string; quantity: string; unitCostExTax: string; unitSellPrice: string; taxCode: string; lineTotalExTax: string; lineTax: string; lineTotalIncTax: string; sortOrder: number };
type CommLogOut = { id: string; channel: string; direction: string; recipient: string | null; subject: string | null; status: string; sentAt: string | Date };
type InvoiceOut = { id: string; invoiceNumber: string; invoiceType: string; status: string; customerId: string; siteId: string | null; jobId: string | null; quoteId: string | null; issueDate: string; dueDate: string; gstRegisteredSnapshot: boolean; documentTitle: string; subtotalExTax: string; totalTax: string; totalIncTax: string; amountPaid: string; creditApplied: string; balanceDue: string; lockedAt: string | Date | null; allowCardPayment: boolean; maxCardAmountOverride: string | null; chasingEnabled: boolean; pdfFileNoteId: string | null; notes: string | null };
type InvoiceLineOut = { id: string; invoiceId: string; sourceType: string; description: string; quantity: string; unitSellPrice: string; taxCode: string; lineTotalExTax: string; lineTax: string; lineTotalIncTax: string; sortOrder: number };
type InvoicePaymentOut = { id: string; invoiceId: string; amount: string; paymentMethod: string; paymentDate: string | Date; reference: string | null; refundedAmount: string; notes: string | null };
type CreditNoteOut = { id: string; creditNoteNumber: string; invoiceId: string; reason: string; amountExTax: string; taxAmount: string; totalIncTax: string; creditDestination: string; issuedAt: string | Date };
type InvoiceRefundOut = { id: string; paymentId: string; amount: string; refundMethod: string; reason: string | null; refundedAt: string | Date };
type ActivityHistoryOut = { id: string; kind: "PAYMENT" | "DEPOSIT" | "CREDIT_NOTE" | "REFUND" | "MATERIAL_COST" | "LABOUR_COST"; title: string; subtitle: string | null; amount: string; occurredAt: string; entityId: string };
type AccountingConnectionOut = { id: string; provider: string; externalTenantId: string; externalTenantName: string | null; lastSyncedAt: string | Date | null; syncCursor: string | null };
type SupplierBillOut = { id: string; jobId: string | null; supplierName: string; supplierAbn: string | null; billNumber: string | null; issueDate: string; dueDate: string | null; subtotalExTax: string; taxAmount: string; totalIncTax: string; source: string; status: string };
type PurchaseOrderOut = { id: string; poNumber: string; jobId: string | null; supplierName: string; supplierEmail: string | null; totalExTax: string; status: string; sentAt: string | Date | null; notes: string | null; linesJson: string };
type ChatRoomOut = { id: string; entityType: string; entityId: string; title: string; isPinned: boolean };
type ChatMessageOut = { id: string; roomId: string; senderUserId: string; body: string; createdAt: string | Date };
type ReviewRequestOut = { id: string; jobId: string | null; invoiceId: string | null; customerId: string; googleReviewUrl: string | null; ratingScore: number | null; sentAt: string | Date };

type TypedProcedures = {
  getTenantStatus: Q<{ hasTenant: boolean; setupCompleted: boolean; tenantId?: string | null; role?: string | null }>;
  createTenant: MI<{ name: string; displayName?: string; country?: string; currency?: string; timezone?: string }, { tenantId: string }>;
  listUserTenants: Q<Array<{ id: string; name: string; role: string }>>;
  getUserProfile: Q<{ id: string; email: string; displayName: string; phoneNumber?: string | null }>;
  updateUserProfile: MI<{ displayName: string; notificationEmail?: string; phoneNumber?: string }, { success: boolean }>;
  getUserPreferences: Q<{ language?: string; locale?: string; currency?: string; country?: string; timezone?: string; tenantTimezone?: string; showIcons?: boolean; notificationEmail?: string | null; telemetryConsent?: string | null; notificationPreferences?: Record<string, { email?: boolean; push?: boolean }>; appPreferences?: Record<string, Record<string, unknown>> }>;
  updateUserPreferences: MI<{ telemetryConsent?: "granted" | "denied"; notificationPreferences?: Record<string, { email?: boolean; push?: boolean }>; appPreferences?: Record<string, Record<string, unknown>> }, { success: boolean }>;
  getTenantDetails: Q<{ id: string; name: string; country: string; currency: string; timezone: string; state?: string | null; postcode?: string | null; currentUserRole: string }>;
  updateTenantDetails: MI<{ name: string; timezone: string; state?: string; postcode?: string }, { success: boolean }>;
  listTenantMembers: Q<Array<{ id: string; userId: string; displayName: string; email: string; role: string; appRole?: string | null }>>;
  inviteMember: MI<{ email: string; role: "MEMBER" | "VIEWER"; appRole?: string }, { success: boolean }>;
  removeMember: MI<{ memberId: string }, { success: boolean }>;
  getInviteDetails: QI<{ inviteToken: string }, InviteAcceptFlowProps["inviteDetails"]>;
  acceptInvite: MI<{ inviteToken: string }, { tenantId: string }>;
  leaveTenant: M<{ success: boolean }>;
  deleteTenant: M<{ success: boolean }>;
  exportTenantData: Q<unknown>;
  getBusinessProfile: Q<{ businessName?: string | null; tradeType: string; abn?: string | null; gstRegistered: boolean; defaultTaxRatePercent: string; quotePrefix: string; nextQuoteNumber: number; invoicePrefix: string; nextInvoiceNumber: number; defaultPaymentTermsDays: number; defaultHourlyChargeRate?: string | null; bankAccountName?: string | null; bankBsb?: string | null; bankAccountNumber?: string | null } | null>;
  completeBusinessSetup: MI<CompleteBusinessSetupInputType, { success: boolean }>;
  updateBusinessProfile: MI<UpdateBusinessProfileInputType, { success: boolean }>;
  listTeamMembersWithRates: Q<Array<{ userId: string; displayName: string; tradeLicenseNumber?: string | null; licenseExpiryDate?: string | null; internalHourlyCostRate?: string | null; defaultChargeOutRate?: string | null; isFieldActive: boolean }>>;
  upsertTeamMemberProfile: MI<UpsertTeamMemberProfileInputType, { success: boolean }>;
  getSeatEntitlements: Q<{ planType: string; subscriptionStatus: string; activeSeatsUsed: number; viewerSeatsUsed: number; maxActiveSeats: number; freeViewerSeats: number }>;
};

type R<T extends Parameters<typeof _t.router>[0]> = ReturnType<typeof _t.router<T>>;

type NestedProcedures = {
  geo: R<{
    searchAddresses: QI<{ query: string }, SearchAddressesResult>;
  }>;
  customers: R<{
    list: QI<{ search?: string; limit?: number }, CustomerOut[]>;
    getHistory: QI<{ id: string }, { customer: CustomerOut; sites: Array<{ linkId: string; relationshipRole: string; site: SiteOut }>; jobs: JobOut[] } | null>;
    create: MI<CreateCustomerInputType, CustomerOut>;
    update: MI<UpdateCustomerInputType, CustomerOut>;
    archive: MI<{ id: string }, { success: boolean }>;
  }>;
  sites: R<{
    list: QI<{ search?: string; limit?: number }, SiteOut[]>;
    getHistory: QI<{ id: string }, { site: SiteOut; customers: Array<{ linkId: string; relationshipRole: string; customer: CustomerOut }>; jobs: JobOut[] } | null>;
    create: MI<CreateSiteInputType, SiteOut>;
    update: MI<UpdateSiteInputType, SiteOut>;
    archive: MI<{ id: string }, { success: boolean }>;
  }>;
  pricebook: R<{
    list: Q<PricebookItemOut[]>;
    fuzzySearch: QI<{ query?: string; itemType?: "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACT"; favouritesOnly?: boolean; limit?: number }, PricebookItemOut[]>;
    create: MI<CreatePricebookItemInputType, PricebookItemOut>;
    update: MI<UpdatePricebookItemInputType, PricebookItemOut>;
    archive: MI<{ id: string }, { success: boolean }>;
    installStarterPack: MI<{ packKey: "ELECTRICAL" | "PLUMBING" | "HVAC" | "CARPENTRY" | "PAINTING" | "GENERAL" }, { insertedCount: number }>;
    importCsv: MI<{ source: "XERO" | "TRADIFY" | "SERVICEM8" | "FERGUS"; csvText: string }, { importedCount: number }>;
  }>;
  jobs: R<{
    list: QI<{ status?: string; customerId?: string; search?: string; limit?: number }, JobOut[]>;
    getDetail: QI<{ id: string }, { job: JobOut; customer: CustomerOut | null; site: SiteOut | null; visits: VisitOut[]; timeEntries: TimeEntryOut[]; variations: VariationOut[]; materialUsages: MaterialUsageOut[]; attachments: PhotoAttachmentOut[] } | null>;
    create: MI<CreateJobInputType, JobOut>;
    update: MI<UpdateJobInputType, JobOut>;
    transitionStatus: MI<z.infer<typeof TransitionJobStatusInput>, JobOut>;
    archive: MI<{ id: string }, { success: boolean }>;
  }>;
  dispatch: R<{
    getBoard: QI<GetDispatchBoardInputType, { visits: VisitOut[]; unscheduledJobs: JobOut[] }>;
    createVisit: MI<CreateVisitInputType, VisitOut>;
    rescheduleVisit: MI<RescheduleVisitInputType, VisitOut>;
    assignCrew: MI<AssignVisitCrewInputType, { success: boolean }>;
  }>;
  field: R<{
    checkInVisit: MI<CheckInVisitInputType, { success: boolean }>;
    checkOutVisit: MI<CheckOutVisitInputType, { success: boolean }>;
    listTimeEntries: QI<{ id: string }, TimeEntryOut[]>;
    createVariation: MI<CreateVariationInputType, VariationOut>;
    approveVariation: MI<ApproveVariationInputType, VariationOut>;
    logMaterialUsage: MI<LogMaterialUsageInputType, MaterialUsageOut>;
    attachJobPhoto: MI<AttachJobPhotoInputType, PhotoAttachmentOut>;
  }>;
  quotes: R<{
    list: QI<{ status?: string } | void, QuoteOut[]>;
    getById: QI<{ id: string }, { quote: QuoteOut; optionGroups: QuoteOptionGroupOut[]; lines: QuoteLineOut[]; commLogs: CommLogOut[] } | null>;
    create: MI<CreateQuoteInputType, QuoteOut>;
    update: MI<UpdateQuoteInputType, QuoteOut>;
    send: MI<{ id: string; recipientEmail?: string }, { quote: QuoteOut; rawToken: string }>;
    archive: MI<{ id: string }, QuoteOut>;
  }>;
  portalQuote: R<{
    view: QI<{ rawToken: string }, { quote: QuoteOut; optionGroups: QuoteOptionGroupOut[]; lines: QuoteLineOut[] }>;
    accept: MI<{ rawToken: string; signerName: string; signatureSvg: string; selectedOptionGroupId?: string | null }, { quote: QuoteOut; depositInvoice: InvoiceOut | null; depositPortalToken: string | null }>;
    decline: MI<{ rawToken: string; declineReason?: string | null }, QuoteOut>;
  }>;
  invoices: R<{
    list: QI<{ status?: string } | void, InvoiceOut[]>;
    getById: QI<{ id: string }, { invoice: InvoiceOut; lines: InvoiceLineOut[]; payments: InvoicePaymentOut[]; creditNotes: CreditNoteOut[]; refunds: InvoiceRefundOut[] } | null>;
    create: MI<CreateInvoiceInputType, InvoiceOut>;
    update: MI<UpdateInvoiceInputType, InvoiceOut>;
    send: MI<{ id: string }, InvoiceOut>;
    convertJob: MI<{ jobId: string; sendImmediately?: boolean; allowCardPayment?: boolean; dueDate?: string }, InvoiceOut>;
    recordPayment: MI<{ invoiceId: string; amount: number; paymentMethod?: "STRIPE_CARD" | "STRIPE_BECS" | "BANK_TRANSFER" | "CASH" | "CUSTOMER_CREDIT"; reference?: string | null; notes?: string | null }, unknown>;
    issueCreditNote: MI<{ invoiceId: string; reason: string; amountExTax: number; includeGst?: boolean; creditDestination?: "INVOICE_BALANCE" | "CUSTOMER_CREDIT" }, CreditNoteOut>;
    applyCustomerCredit: MI<{ invoiceId: string; amount: number }, unknown>;
    refundPayment: MI<{ paymentId: string; amount: number; refundMethod?: "STRIPE" | "MANUAL"; reason?: string | null }, InvoiceRefundOut>;
    dispute: MI<{ invoiceId: string; disputedReason: string }, InvoiceOut>;
    voidInvoice: MI<{ id: string }, InvoiceOut>;
    createConnectOnboardingLink: MI<{ refreshUrl: string; returnUrl: string }, { stripeAccountId: string; url: string }>;
  }>;
  portalInvoice: R<{
    view: QI<{ rawToken: string }, { invoice: InvoiceOut; lines: InvoiceLineOut[]; paymentMethods: Array<"au_becs_debit" | "card">; stripeChargesEnabled: boolean }>;
    createCheckout: MI<{ rawToken: string; successUrl: string; cancelUrl: string }, { sessionId: string; url: string | null }>;
  }>;
  timesheets: R<{
    list: QI<{ jobId?: string } | void, Array<{ entry: TimeEntryOut & { jobId: string; userId: string; hourlyCostSnapshot: string; hourlyChargeSnapshot: string }; jobNumber: string | null; jobTitle: string | null; workerName: string | null; workerEmail: string | null }>>;
    approve: MI<{ entryId: string; isBillable: boolean; durationMinutes?: number; notes?: string }, TimeEntryOut>;
  }>;
  activity: R<{
    list: QI<{ jobId?: string } | void, ActivityHistoryOut[]>;
  }>;
  pulse: R<{
    getJobMargin: QI<{ jobId: string; canViewMargins?: boolean }, { redacted: true; revenueExTax: null; labourCost: null; materialCost: null; grossProfit: null; marginPct: null } | { redacted: false; revenueExTax: number; labourCost: number; materialCost: number; grossProfit: number; marginPct: number }>;
    getWeeklyPaydayCashPulse: Q<{ dueReceivables: number; overdueReceivables: number; totalReceivables: number; accruedWages: number; superContribution12Pct: number; totalCrewObligation: number; netCashPosition: number }>;
    exportAccountantPack: Q<Record<string, string>>;
  }>;
  accounting: R<{
    listConnections: Q<AccountingConnectionOut[]>;
    saveConnection: MI<{ provider: "XERO" | "MYOB" | "QBO"; externalTenantId: string; externalTenantName?: string | null; accessTokenEnc: string; refreshTokenEnc?: string | null; tokenExpiresAt?: string | null; syncCursor?: string | null }, AccountingConnectionOut>;
    upsertEntityLink: MI<{ provider: "XERO" | "MYOB" | "QBO"; entityType: "CUSTOMER" | "INVOICE" | "CREDIT_NOTE" | "SUPPLIER_BILL" | "TIMESHEET"; localId: string; externalId: string; syncStatus?: "SYNCED" | "PENDING" | "ERROR"; lastSyncHash?: string | null; lastError?: string | null }, unknown>;
  }>;
  suppliers: R<{
    listBills: Q<SupplierBillOut[]>;
    createBill: MI<{ jobId?: string | null; supplierName: string; supplierAbn?: string | null; billNumber?: string | null; issueDate: string; dueDate?: string | null; subtotalExTax: number; taxAmount: number; totalIncTax: number; receiptFileNoteId?: string | null; source?: "OCR" | "EMAIL" | "MANUAL"; appliedMarkupPct?: number }, SupplierBillOut>;
    extractReceipt: MI<{ imageBase64: string; mimeType?: string }, ReceiptExtractionResult>;
    listPurchaseOrders: Q<PurchaseOrderOut[]>;
    createPurchaseOrder: MI<{ poNumber: string; jobId?: string | null; supplierName: string; supplierEmail?: string | null; lines: Array<{ description: string; quantity: number; unitCostExTax: number }>; notes?: string | null }, PurchaseOrderOut>;
    sendPurchaseOrder: MI<{ id: string }, PurchaseOrderOut>;
    convertPurchaseOrderToBill: MI<{ id: string }, SupplierBillOut>;
  }>;
  sms: R<{
    getCreditBalance: Q<number>;
    sendOnMyWay: MI<{ jobId: string; recipientPhone: string; originLat: number; originLng: number; destLat: number; destLng: number; tradieName: string }, { sent: boolean; etaMinutes: number }>;
    sendReviewBooster: MI<{ jobId?: string | null; invoiceId?: string | null; customerId: string; googleReviewUrl?: string | null }, ReviewRequestOut>;
    submitSatisfaction: MI<{ reviewRequestId: string; ratingScore: number }, { redirectToGoogle: boolean; googleReviewUrl: string | null }>;
  }>;
  chat: R<{
    createRoom: MI<CreateChatRoomInputDto, ChatRoomOut>;
    postMessage: MI<PostChatMessageInputDto, ChatMessageOut>;
    listRoomMessages: QI<ListRoomMessagesInputDto, ChatMessageOut[]>;
    markRoomRead: MI<MarkRoomReadInputDto, { success: boolean }>;
    getUnreadCounts: Q<RoomUnreadCount[]>;
  }>;
};

type ApiTypedRecord = {
  getSubscriptionStatus: ApiAppRouter["getSubscriptionStatus"];
  createCheckoutSession: ApiAppRouter["createCheckoutSession"];
  verifyCheckoutSession: ApiAppRouter["verifyCheckoutSession"];
  createCustomerPortalSession: ApiAppRouter["createCustomerPortalSession"];
  listInvoices: ApiAppRouter["listInvoices"];
  syncSubscription: ApiAppRouter["syncSubscription"];
  getNotificationChannelStatus: ApiAppRouter["getNotificationChannelStatus"];
  registerToken: ApiAppRouter["registerToken"];
  removeToken: ApiAppRouter["removeToken"];
  sendTestNotification: ApiAppRouter["sendTestNotification"];
  fileNotes: ApiAppRouter["fileNotes"];
} & NestedProcedures;

export type AppRouter = ReturnType<typeof _t.router<TypedProcedures & ApiTypedRecord>>;

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "/api";
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    if (cleanUrl.endsWith("/trpc")) cleanUrl = cleanUrl.slice(0, -5);
    return cleanUrl;
  }
  return "http://localhost:3011";
}

export function buildTrpcClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers() {
          const appId = process.env.NEXT_PUBLIC_APP_ID || TRADIE_APP_ID;
          const headers: Record<string, string> = { "x-app-id": appId };
          if (typeof window !== "undefined") {
            const activeTenantId = localStorage.getItem(TRADIE_ACTIVE_TENANT_KEY);
            if (activeTenantId) headers["x-tenant-id"] = activeTenantId;
          }
          return headers;
        },
        fetch: (url, options) => fetch(url, { ...options, credentials: "include", signal: options?.signal ?? AbortSignal.timeout(15000) }),
      }),
    ],
  });
}
