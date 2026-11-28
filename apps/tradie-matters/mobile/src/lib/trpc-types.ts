import type { SearchAddressesResult } from "@kaesava/capability-geo";
import type {
  ActivityHistoryRow,
  ApproveVariationInputType,
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
  LogMaterialUsageInputType,
  SyncFieldMutationsInputType,
  UpdateBusinessProfileInputType,
  UpdateCustomerInputType,
  UpdateInvoiceInputType,
  UpdateJobInputType,
  UpdatePricebookItemInputType,
  UpdateQuoteInputType,
} from "@tradie-matters/capability-operations";
import type { SubscriptionStatusDto } from "@kaesava/types";
import type { ArchivedItemsProps, TenantMemberItem } from "@kaesava/capability-tenant/mobile";
import type { AppRouter } from "../../../api/src/routers/_app";
import type { IntegrationsAndChatRouterRecord } from "./trpc-integrations-types";

type SampleQuery = AppRouter["getNotificationChannelStatus"];
type SampleMutation = AppRouter["registerToken"];

type QueryProc<TInput, TOutput> = ((opts: unknown) => Promise<TOutput>) & {
  meta: object;
  _def: Omit<SampleQuery["_def"], "$types"> & {
    $types: { input: TInput; output: TOutput };
  };
};

type MutationProc<TInput, TOutput> = ((opts: unknown) => Promise<TOutput>) & {
  meta: object;
  _def: Omit<SampleMutation["_def"], "$types"> & {
    $types: { input: TInput; output: TOutput };
  };
};

export interface BusinessProfileDto {
  businessName?: string | null;
  tradeType?: string | null;
  abn?: string | null;
  gstRegistered?: boolean | null;
  defaultTaxRatePercent?: string | null;
  quotePrefix?: string | null;
  nextQuoteNumber?: number | null;
  invoicePrefix?: string | null;
  nextInvoiceNumber?: number | null;
  defaultPaymentTermsDays?: number | null;
  defaultHourlyChargeRate?: string | null;
  bankAccountName?: string | null;
  bankBsb?: string | null;
  bankAccountNumber?: string | null;
}

export interface TenantStatusDto {
  hasTenant: boolean;
  tenantId: string | null;
  setupCompleted: boolean;
}

export interface UserTenantSummary {
  id: string;
  name: string;
  role: string;
}

export interface UserPreferencesDto {
  appId?: string;
  locale?: string | null;
  timezone?: string | null;
  tenantTimezone?: string | null;
  currency?: string | null;
  language?: string | null;
  showIcons?: boolean | null;
  notificationEmail?: string | null;
  telemetryConsent?: string | null;
  appPreferences?: Record<string, unknown> | null;
}

export interface CustomerDto {
  id: string;
  name: string;
  companyName: string | null;
  customerType: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  creditBalance: string;
  notes: string | null;
}

export interface SiteDto {
  id: string;
  name: string;
  addressLine1: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}

export interface PricebookItemDto {
  id: string;
  sku: string | null;
  name: string;
  itemType: string;
  unitCostExTax: string;
  sellPriceExTax: string;
  taxCode: string;
  isFavourite: boolean;
  supplierName: string | null;
}

export interface JobDto {
  id: string;
  tenantId: string;
  jobNumber: string;
  title: string;
  status: string;
  priority: string;
  hasUnbilledExtras: boolean;
  internalNotes: string | null;
}

export interface VisitDto {
  id: string;
  jobId: string;
  visitTitle: string | null;
  status: string;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  visitNotes: string | null;
}

export interface JobDetailDto {
  job: JobDto;
  customer: CustomerDto | null;
  site: SiteDto | null;
  visits: VisitDto[];
  timeEntries: Array<{ id: string; checkInAt: string | Date; checkOutAt: string | Date | null }>;
  variations: Array<{ id: string; title: string; status: string }>;
  materialUsages: Array<{ id: string; description: string; quantity: string }>;
  attachments: Array<{ id: string; photoCategory: string; caption: string | null }>;
}

export interface QuoteDto {
  id: string;
  quoteNumber: string;
  title: string;
  description: string | null;
  status: string;
  customerId: string;
  jobId: string | null;
  selectedOptionGroupId: string | null;
  validUntil: string | Date | null;
  gstMode: string;
  subtotalExTax: string;
  totalTax: string;
  totalIncTax: string;
  depositType: string;
  depositAmountDue: string;
  notes: string | null;
}

export interface QuoteOptionGroupDto {
  id: string;
  name: string;
  description: string | null;
  isRecommended: boolean;
  isSelected: boolean;
  totalIncTax: string;
  sortOrder: number;
}

export interface QuoteLineDto {
  id: string;
  optionGroupId: string | null;
  description: string;
  quantity: string;
  unitSellPrice: string;
  lineTotalIncTax: string;
  taxCode: string;
}

export interface QuoteDetailDto {
  quote: QuoteDto;
  optionGroups: QuoteOptionGroupDto[];
  lines: QuoteLineDto[];
  commLogs: Array<{ id: string; channel: string; recipient: string | null; sentAt: string | Date }>;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  documentTitle: string;
  status: string;
  customerId: string;
  jobId: string | null;
  issueDate: string;
  dueDate: string;
  gstRegisteredSnapshot: boolean;
  subtotalExTax: string;
  totalTax: string;
  totalIncTax: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
}

export interface InvoiceLineDto {
  id: string;
  description: string;
  quantity: string;
  unitSellPrice: string;
  lineTotalIncTax: string;
}

export interface InvoiceDetailDto {
  invoice: InvoiceDto;
  lines: InvoiceLineDto[];
  payments: Array<{ id: string; amount: string; paymentMethod: string; paymentDate: string | Date }>;
  creditNotes: Array<{ id: string; creditNoteNumber: string; totalIncTax: string; reason: string }>;
  refunds: Array<{ id: string; amount: string; refundMethod: string }>;
}

export interface TimesheetRowDto {
  entry: {
    id: string;
    jobId: string;
    startedAt: string | Date;
    durationMinutes: number;
    isBillable: boolean;
    notes: string | null;
  };
  jobNumber: string | null;
  jobTitle: string | null;
  workerName: string | null;
  workerEmail: string | null;
}

export interface JobMarginDto {
  redacted: boolean;
  revenueExTax: number | null;
  labourCost: number | null;
  materialCost: number | null;
  grossProfit: number | null;
  marginPct: number | null;
}

export interface WeeklyPaydayCashPulseDto {
  dueReceivables: number;
  overdueReceivables: number;
  totalReceivables: number;
  accruedWages: number;
  superContribution12Pct: number;
  totalCrewObligation: number;
  netCashPulse: number;
}

export interface TradieMobileRouter extends Omit<AppRouter, "_def"> {
  _def: Omit<AppRouter["_def"], "record"> & {
    record: IntegrationsAndChatRouterRecord & {
      getNotificationChannelStatus: AppRouter["getNotificationChannelStatus"];
      registerToken: AppRouter["registerToken"];
      removeToken: AppRouter["removeToken"];
      sendTestNotification: AppRouter["sendTestNotification"];
      fileNotes: AppRouter["fileNotes"];
      geo: {
        searchAddresses: QueryProc<{ query: string }, SearchAddressesResult>;
      };
      customers: {
        list: QueryProc<{ search?: string; limit?: number }, CustomerDto[]>;
        getHistory: QueryProc<
          { id: string },
          { customer: CustomerDto; sites: Array<{ linkId: string; site: SiteDto }>; jobs: JobDto[] } | null
        >;
        create: MutationProc<CreateCustomerInputType, CustomerDto>;
        update: MutationProc<UpdateCustomerInputType, CustomerDto>;
      };
      sites: {
        create: MutationProc<CreateSiteInputType, SiteDto>;
      };
      pricebook: {
        fuzzySearch: QueryProc<
          { query?: string; itemType?: "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACT"; limit?: number },
          PricebookItemDto[]
        >;
        create: MutationProc<CreatePricebookItemInputType, PricebookItemDto>;
        update: MutationProc<UpdatePricebookItemInputType, PricebookItemDto>;
        installStarterPack: MutationProc<
          { packKey: "ELECTRICAL" | "PLUMBING" | "HVAC" | "CARPENTRY" | "PAINTING" | "GENERAL" },
          { inserted: number }
        >;
      };
      jobs: {
        list: QueryProc<{ search?: string; status?: "LEAD" | "QUOTED" | "SCHEDULED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "INVOICED" | "CANCELLED"; limit?: number }, JobDto[]>;
        getDetail: QueryProc<{ id: string }, JobDetailDto | null>;
        create: MutationProc<CreateJobInputType, JobDto>;
        update: MutationProc<UpdateJobInputType, JobDto>;
      };
      dispatch: {
        getBoard: QueryProc<
          { rangeStart: string; rangeEnd: string; assigneeUserId?: string },
          { visits: VisitDto[]; unscheduledJobs: JobDto[] }
        >;
      };
      field: {
        checkInVisit: MutationProc<CheckInVisitInputType, { id: string }>;
        checkOutVisit: MutationProc<CheckOutVisitInputType, { id: string }>;
        createVariation: MutationProc<CreateVariationInputType, { id: string }>;
        approveVariation: MutationProc<ApproveVariationInputType, { id: string }>;
        logMaterialUsage: MutationProc<LogMaterialUsageInputType, { id: string }>;
        attachJobPhoto: MutationProc<AttachJobPhotoInputType, { id: string }>;
        syncMutations: MutationProc<SyncFieldMutationsInputType, { applied: number }>;
      };
      quotes: {
        list: QueryProc<{ status?: string } | undefined, QuoteDto[]>;
        getById: QueryProc<{ id: string }, QuoteDetailDto | null>;
        create: MutationProc<CreateQuoteInputType, QuoteDto>;
        update: MutationProc<UpdateQuoteInputType, QuoteDto>;
        send: MutationProc<{ id: string; recipientEmail?: string }, { quote: QuoteDto; rawToken: string }>;
        archive: MutationProc<{ id: string }, { id: string }>;
      };
      portalQuote: {
        accept: MutationProc<
          { rawToken: string; signerName: string; signatureSvg: string; selectedOptionGroupId?: string | null },
          { id: string; status: string }
        >;
      };
      invoices: {
        list: QueryProc<{ status?: string } | undefined, InvoiceDto[]>;
        getById: QueryProc<{ id: string }, InvoiceDetailDto | null>;
        create: MutationProc<CreateInvoiceInputType, InvoiceDto>;
        update: MutationProc<UpdateInvoiceInputType, InvoiceDto>;
        send: MutationProc<{ id: string }, { invoice: InvoiceDto; rawToken: string }>;
        convertJob: MutationProc<
          { jobId: string; sendImmediately?: boolean; allowCardPayment?: boolean; dueDate?: string },
          InvoiceDto
        >;
        recordPayment: MutationProc<
          {
            invoiceId: string;
            amount: number;
            paymentMethod?: "STRIPE_CARD" | "STRIPE_BECS" | "BANK_TRANSFER" | "CASH" | "CUSTOMER_CREDIT";
            reference?: string | null;
            notes?: string | null;
          },
          { id: string }
        >;
        issueCreditNote: MutationProc<
          {
            invoiceId: string;
            reason: string;
            amountExTax: number;
            includeGst?: boolean;
            creditDestination?: "INVOICE_BALANCE" | "CUSTOMER_CREDIT";
          },
          { id: string }
        >;
        applyCustomerCredit: MutationProc<{ invoiceId: string; amount: number }, { id: string }>;
        refundPayment: MutationProc<
          { paymentId: string; amount: number; refundMethod?: "STRIPE" | "MANUAL"; reason?: string | null },
          { id: string }
        >;
        dispute: MutationProc<{ invoiceId: string; disputedReason: string }, { id: string }>;
        voidInvoice: MutationProc<{ id: string }, { id: string }>;
      };
      timesheets: {
        list: QueryProc<{ jobId?: string } | undefined, TimesheetRowDto[]>;
        approve: MutationProc<
          { entryId: string; isBillable: boolean; durationMinutes?: number; notes?: string },
          { id: string }
        >;
      };
      activity: {
        list: QueryProc<{ jobId?: string } | undefined, ActivityHistoryRow[]>;
      };
      pulse: {
        getJobMargin: QueryProc<{ jobId: string; canViewMargins?: boolean }, JobMarginDto>;
        getWeeklyPaydayCashPulse: QueryProc<undefined, WeeklyPaydayCashPulseDto>;
        exportAccountantPack: QueryProc<undefined, Record<string, string>>;
      };
      getTenantStatus: QueryProc<undefined, TenantStatusDto>;
      listUserTenants: QueryProc<undefined, UserTenantSummary[]>;
      createTenant: MutationProc<{ householdName: string }, { tenantId: string }>;
      getTenant: QueryProc<
        undefined,
        {
          id: string;
          name: string;
          country?: string | null;
          currency?: string | null;
          timezone?: string | null;
          currentUserRole?: string | null;
          members?: TenantMemberItem[];
        }
      >;
      getUserProfile: QueryProc<undefined, { name?: string | null; phoneNumber?: string | null }>;
      getUserPreferences: QueryProc<undefined, UserPreferencesDto>;
      updateUserPreferences: MutationProc<
        { telemetryConsent?: "granted" | "denied"; appPreferences?: Record<string, unknown> },
        { success: boolean }
      >;
      getInviteDetails: QueryProc<
        { inviteToken: string },
        { status: string; householdName?: string | null; inviteEmail?: string | null }
      >;
      acceptInvite: MutationProc<{ inviteToken: string }, { tenantId: string }>;
      leaveTenant: MutationProc<undefined, { success: boolean }>;
      deleteMyAccount: MutationProc<undefined, { success: boolean }>;
      exportData: QueryProc<undefined, Record<string, unknown>>;
      listArchivedItems: QueryProc<undefined, ArchivedItemsProps["items"]>;
      restoreArchivedItem: MutationProc<{ itemType: string; id: string }, { success: boolean }>;
      getSubscriptionStatus: QueryProc<undefined, SubscriptionStatusDto>;
      getBusinessProfile: QueryProc<undefined, BusinessProfileDto | null>;
      updateBusinessProfile: MutationProc<UpdateBusinessProfileInputType, { success: boolean }>;
      completeBusinessSetup: MutationProc<CompleteBusinessSetupInputType, { success: boolean }>;
      getSeatEntitlements: QueryProc<
        undefined,
        { activeMemberSeats: number; maxActiveSeats: number; freeViewerSeats: number }
      >;
    };
  };
}
