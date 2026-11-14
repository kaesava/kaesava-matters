import { incomeEvents, incomeSources, DbOrTx } from "@money-matters/db";
import { getTenantDateString } from "@money-matters/core";
import { DEFAULT_TIMEZONE } from "@money-matters/types";
import { eq } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";

export async function burstIncomeEvents(
  tx: DbOrTx,
  params: {
    incomeSourceId: string;
    name: string;
    amount: string;
    rrule: string;
    startDate: string;
    endDate?: string | null;
    contributionMode?: "FULL" | "PERCENTAGE" | "FIXED_AMOUNT" | null;
    contributionValue?: string | null;
    tenantId: string;
    appId: string;
    userId: string;
    timeZone?: string;
    afterDateStr?: string | null;
  }
): Promise<number> {
  const dates = generateBurstDates(
    params.rrule,
    params.startDate,
    params.endDate,
    12,
    1000,
    params.afterDateStr
  );
  if (dates.length === 0) return 0;
  const tz = params.timeZone || DEFAULT_TIMEZONE;

  const eventsToInsert = dates.map((d) => {
    const dateStr = getTenantDateString(d, { timezone: tz });
    return {
      tenantId: params.tenantId,
      appId: params.appId,
      incomeSourceId: params.incomeSourceId,
      name: params.name,
      expectedDate: dateStr,
      actualDate: dateStr,
      expectedAmount: params.amount,
      actualAmount: params.amount,
      contributionMode: params.contributionMode || ("FULL" as const),
      contributionValue: params.contributionValue || null,
      status: "PENDING" as const,
      createdBy: params.userId,
      updatedBy: params.userId,
    };
  });

  await tx.insert(incomeEvents).values(eventsToInsert).onConflictDoNothing();

  const lastDate = eventsToInsert[eventsToInsert.length - 1].expectedDate;
  await tx
    .update(incomeSources)
    .set({
      lastBurstDate: lastDate,
      updatedAt: new Date(),
      updatedBy: params.userId,
    })
    .where(eq(incomeSources.id, params.incomeSourceId));

  return eventsToInsert.length;
}
