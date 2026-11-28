import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import {
  tmCommLogs,
  tmQuoteLines,
  tmQuoteOptionGroups,
  tmQuotes,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";

export async function listQuotesQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  status?: string
) {
  const filters = [
    eq(tmQuotes.tenantId, tenantId),
    eq(tmQuotes.appId, appId),
    isNull(tmQuotes.archivedAt),
  ];
  if (status) filters.push(eq(tmQuotes.status, status));
  return db
    .select()
    .from(tmQuotes)
    .where(and(...filters))
    .orderBy(desc(tmQuotes.createdAt));
}

export async function getQuoteByIdQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  quoteId: string
) {
  const [quote] = await db
    .select()
    .from(tmQuotes)
    .where(
      and(
        eq(tmQuotes.id, quoteId),
        eq(tmQuotes.tenantId, tenantId),
        eq(tmQuotes.appId, appId),
        isNull(tmQuotes.archivedAt)
      )
    )
    .limit(1);
  if (!quote) return null;

  const [optionGroups, lines, commLogs] = await Promise.all([
    db
      .select()
      .from(tmQuoteOptionGroups)
      .where(and(eq(tmQuoteOptionGroups.quoteId, quoteId), isNull(tmQuoteOptionGroups.archivedAt)))
      .orderBy(tmQuoteOptionGroups.sortOrder),
    db
      .select()
      .from(tmQuoteLines)
      .where(and(eq(tmQuoteLines.quoteId, quoteId), isNull(tmQuoteLines.archivedAt)))
      .orderBy(tmQuoteLines.sortOrder),
    db
      .select()
      .from(tmCommLogs)
      .where(
        and(
          eq(tmCommLogs.tenantId, tenantId),
          eq(tmCommLogs.entityType, "QUOTE"),
          eq(tmCommLogs.entityId, quoteId),
          isNull(tmCommLogs.archivedAt)
        )
      )
      .orderBy(desc(tmCommLogs.sentAt)),
  ]);

  return { quote, optionGroups, lines, commLogs };
}

export async function findQuotesDueForFollowUpQuery(
  db: DbOrTx,
  cutoffDate: Date
) {
  return db
    .select()
    .from(tmQuotes)
    .where(
      and(
        inArray(tmQuotes.status, ["SENT", "VIEWED"]),
        lt(tmQuotes.sentAt, cutoffDate),
        isNull(tmQuotes.followUpSentAt),
        isNull(tmQuotes.archivedAt)
      )
    );
}
