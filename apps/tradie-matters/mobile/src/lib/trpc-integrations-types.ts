import type {
  CreateChatRoomInputDto,
  ListRoomMessagesInputDto,
  MarkRoomReadInputDto,
  PostChatMessageInputDto,
  RoomUnreadCount,
} from "@kaesava/capability-chat";
import type { ReceiptExtractionResult } from "@tradie-matters/capability-integrations";
import type { AppRouter } from "../../../api/src/routers/_app";

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

export interface AccountingConnectionDto {
  id: string;
  provider: string;
  externalTenantId: string;
  externalTenantName: string | null;
}

export interface AccountingEntityLinkDto {
  id: string;
  provider: string;
  entityType: string;
  localId: string;
  externalId: string;
  syncStatus: string;
}

export interface SupplierBillDto {
  id: string;
  jobId: string | null;
  supplierName: string;
  supplierAbn: string | null;
  billNumber: string | null;
  issueDate: string;
  subtotalExTax: string;
  taxAmount: string;
  totalIncTax: string;
  appliedMarkupPct: string;
  status: string;
}

export interface CreateSupplierBillInputDto {
  jobId?: string | null;
  supplierName: string;
  supplierAbn?: string | null;
  billNumber?: string | null;
  issueDate: string;
  dueDate?: string | null;
  subtotalExTax: number;
  taxAmount: number;
  totalIncTax: number;
  receiptFileNoteId?: string | null;
  source?: "OCR" | "EMAIL" | "MANUAL";
  appliedMarkupPct?: number;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  jobId: string | null;
  supplierName: string;
  status: string;
}

export interface CommLogDto {
  id: string;
  entityType: string;
  entityId: string;
  channel: string;
  direction: string;
  recipient: string | null;
  subject: string | null;
  bodyPreview: string | null;
  sentAt: string | Date;
}

export interface ChatRoomDto {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  isPinned: boolean;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderUserId: string;
  body: string;
  replyToMessageId: string | null;
  mentionedUserIdsJson: string[];
  createdAt: string | Date;
}

export interface IntegrationsAndChatRouterRecord {
  accounting: {
    listConnections: QueryProc<undefined, AccountingConnectionDto[]>;
    saveConnection: MutationProc<
      {
        provider: "XERO" | "MYOB" | "QBO";
        externalTenantId: string;
        externalTenantName?: string | null;
        accessTokenEnc: string;
        refreshTokenEnc?: string | null;
        tokenExpiresAt?: string | null;
        syncCursor?: string | null;
      },
      AccountingConnectionDto
    >;
    upsertEntityLink: MutationProc<
      {
        provider: "XERO" | "MYOB" | "QBO";
        entityType: "CUSTOMER" | "INVOICE" | "CREDIT_NOTE" | "SUPPLIER_BILL" | "TIMESHEET";
        localId: string;
        externalId: string;
        syncStatus?: "SYNCED" | "PENDING" | "ERROR";
        lastSyncHash?: string | null;
        lastError?: string | null;
      },
      AccountingEntityLinkDto
    >;
  };
  suppliers: {
    listBills: QueryProc<undefined, SupplierBillDto[]>;
    createBill: MutationProc<CreateSupplierBillInputDto, SupplierBillDto>;
    extractReceipt: MutationProc<{ imageBase64: string; mimeType?: string }, ReceiptExtractionResult>;
    listPurchaseOrders: QueryProc<undefined, PurchaseOrderDto[]>;
    createPurchaseOrder: MutationProc<
      {
        poNumber: string;
        jobId?: string | null;
        supplierName: string;
        supplierEmail?: string | null;
        lines: Array<{ description: string; quantity: number; unitCostExTax: number }>;
        notes?: string | null;
      },
      PurchaseOrderDto
    >;
    sendPurchaseOrder: MutationProc<{ id: string }, PurchaseOrderDto>;
    convertPurchaseOrderToBill: MutationProc<{ id: string }, SupplierBillDto>;
  };
  sms: {
    getCreditBalance: QueryProc<undefined, number>;
    sendOnMyWay: MutationProc<
      {
        jobId: string;
        recipientPhone: string;
        originLat: number;
        originLng: number;
        destLat: number;
        destLng: number;
        tradieName: string;
      },
      { log: CommLogDto; etaMinutes: number }
    >;
    sendReviewBooster: MutationProc<
      { jobId?: string | null; invoiceId?: string | null; customerId: string; googleReviewUrl?: string | null },
      { id: string }
    >;
    submitSatisfaction: MutationProc<{ reviewRequestId: string; ratingScore: number }, { id: string }>;
  };
  chat: {
    createRoom: MutationProc<CreateChatRoomInputDto, ChatRoomDto>;
    postMessage: MutationProc<PostChatMessageInputDto, ChatMessageDto>;
    listRoomMessages: QueryProc<ListRoomMessagesInputDto, ChatMessageDto[]>;
    markRoomRead: MutationProc<MarkRoomReadInputDto, { id: string }>;
    getUnreadCounts: QueryProc<undefined, RoomUnreadCount[]>;
  };
}