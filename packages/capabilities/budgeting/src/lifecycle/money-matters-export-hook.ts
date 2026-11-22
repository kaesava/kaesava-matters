import {
  envelopes,
  incomeSources,
  incomeEvents,
  expenseEvents,
  transferEvents,
  transactionLedger,
  bankAccounts,
  allocationPlans,
  allocationPlanLines,
  allocationStrategies,
  allocationStrategySteps,
  fileNotes,
  type DbOrTx,
} from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import {
  serializeCsvObjects,
  type TenantLifecycleContext,
  type DataExportContributor,
} from "@money-matters/types";

export function createMoneyMattersExportContributor(
  getPresignedDownloadUrl?: (fileKey: string, expiresIn?: number) => Promise<string>
): DataExportContributor<DbOrTx> {
  return {
    id: "money-matters-budgeting",
    exportCsvFiles: (params) => exportMoneyMattersTenantCsvs(params, getPresignedDownloadUrl),
  };
}

export async function exportMoneyMattersTenantCsvs(
  ctx: TenantLifecycleContext<DbOrTx>,
  getPresignedDownloadUrl?: (fileKey: string, expiresIn?: number) => Promise<string>
): Promise<Record<string, string>> {
  const { db, tenantId, userId, appId } = ctx;

  const rawBankAccounts = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
  const userBankAccounts = rawBankAccounts.filter((b) => !b.isPrivate || b.userId === userId);
  const allowedBankAccountIds = new Set(userBankAccounts.map((b) => b.id));

  const rawEnvelopes = await db
    .select()
    .from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));
  const userEnvelopes = rawEnvelopes.filter((e) => !e.isPrivate || e.userId === userId);
  const allowedEnvelopeIds = new Set(userEnvelopes.map((e) => e.id));

  const rawIncomeSources = await db
    .select()
    .from(incomeSources)
    .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));
  const userIncomeSources = rawIncomeSources.filter(
    (s) => !s.receivingAccountId || allowedBankAccountIds.has(s.receivingAccountId)
  );
  const allowedIncomeSourceIds = new Set(userIncomeSources.map((s) => s.id));

  const rawIncomeEvents = await db
    .select()
    .from(incomeEvents)
    .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
  const userIncomeEvents = rawIncomeEvents.filter(
    (e) => !e.incomeSourceId || allowedIncomeSourceIds.has(e.incomeSourceId)
  );
  const allowedIncomeEventIds = new Set(userIncomeEvents.map((e) => e.id));

  const rawExpenseEvents = await db
    .select()
    .from(expenseEvents)
    .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));
  const userExpenseEvents = rawExpenseEvents.filter((e) => allowedEnvelopeIds.has(e.envelopeId));

  const rawLedger = await db
    .select()
    .from(transactionLedger)
    .where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));
  const userLedger = rawLedger.filter((t) => allowedEnvelopeIds.has(t.envelopeId));

  const rawAllocationPlans = await db
    .select()
    .from(allocationPlans)
    .where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));
  const userAllocationPlans = rawAllocationPlans.filter((p) =>
    allowedIncomeEventIds.has(p.incomeEventId)
  );

  const rawAllocationPlanLines = await db
    .select()
    .from(allocationPlanLines)
    .where(and(eq(allocationPlanLines.tenantId, tenantId), eq(allocationPlanLines.appId, appId)));
  const userAllocationPlanLines = rawAllocationPlanLines.filter((l) =>
    allowedEnvelopeIds.has(l.envelopeId)
  );

  const rawTransferEvents = await db
    .select()
    .from(transferEvents)
    .where(and(eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));
  const userTransferEvents = rawTransferEvents.filter(
    (t) =>
      allowedEnvelopeIds.has(t.sourceEnvelopeId) &&
      allowedEnvelopeIds.has(t.destinationEnvelopeId)
  );

  const rawStrategies = await db
    .select()
    .from(allocationStrategies)
    .where(and(eq(allocationStrategies.tenantId, tenantId), eq(allocationStrategies.appId, appId)));
  const userStrategies = rawStrategies.filter((s) => !s.isPrivate || s.userId === userId);
  const allowedStrategyIds = new Set(userStrategies.map((s) => s.id));

  const rawStrategySteps = await db
    .select()
    .from(allocationStrategySteps)
    .where(
      and(eq(allocationStrategySteps.tenantId, tenantId), eq(allocationStrategySteps.appId, appId))
    );
  const userStrategySteps = rawStrategySteps.filter((st) => allowedStrategyIds.has(st.strategyId));

  const rawFileNotes = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));
  const userFileNotes = rawFileNotes.filter((n) => !n.isPrivate || n.userId === userId);

  const exportedFileNotes = await Promise.all(
    userFileNotes.map(async (note) => ({
      id: note.id,
      entityType: note.entityType,
      entityId: note.entityId,
      comment: note.comment ?? "",
      fileName: note.fileName ?? "",
      fileMimeType: note.fileMimeType ?? "",
      fileSize: note.fileSize ?? "",
      fileKey: note.fileKey ?? "",
      downloadUrl:
        note.fileKey && getPresignedDownloadUrl
          ? await getPresignedDownloadUrl(note.fileKey, 3600)
          : "",
      isPrivate: note.isPrivate,
      createdAt: note.createdAt,
    }))
  );

  return {
    "Bank_Accounts.csv": serializeCsvObjects(userBankAccounts, ["id", "name", "bankProvider", "lastKnownBalance", "isPrivate"]),
    "Envelopes.csv": serializeCsvObjects(userEnvelopes, ["id", "name", "envelopeType", "bankAccountId", "targetAmount", "monthlyAmount", "budgetFrequency"]),
    "Income_Sources.csv": serializeCsvObjects(userIncomeSources, ["id", "name", "amount", "rrule", "startDate", "receivingAccountId"]),
    "Income_Events.csv": serializeCsvObjects(userIncomeEvents, ["id", "incomeSourceId", "expectedDate", "expectedAmount", "status"]),
    "Expense_Events.csv": serializeCsvObjects(userExpenseEvents, ["id", "expectedDate", "expectedAmount", "envelopeId", "isScheduled", "status"]),
    "Transfer_Events.csv": serializeCsvObjects(userTransferEvents, ["id", "sourceEnvelopeId", "destinationEnvelopeId", "name", "expectedDate", "expectedAmount", "status"]),
    "Transactions_Ledger.csv": serializeCsvObjects(userLedger, ["id", "recordedAt", "amount", "flowType", "envelopeId", "bankAccountId"]),
    "Income_Split_Plans.csv": serializeCsvObjects(userAllocationPlans, ["id", "incomeEventId", "totalIncomeAmount", "status"]),
    "Income_Split_Plan_Lines.csv": serializeCsvObjects(userAllocationPlanLines, ["id", "planId", "envelopeId", "proposedAmount", "confirmedAmount"]),
    "Allocation_Strategies.csv": serializeCsvObjects(userStrategies, ["id", "name", "presetKey", "isDefault", "isPrivate"]),
    "Allocation_Strategy_Steps.csv": serializeCsvObjects(userStrategySteps, ["id", "strategyId", "orderIndex", "stepType", "targetEnvelopeId"]),
    "File_Notes.csv": serializeCsvObjects(exportedFileNotes, ["id", "entityType", "entityId", "comment", "fileName", "fileMimeType", "fileSize", "fileKey", "downloadUrl", "isPrivate", "createdAt"]),
  };
}
