import { sql, eq, and, isNull } from "drizzle-orm";
import { aiUsage, DbOrTx } from "@kaesava/db/rings/capabilities";
import { AI_TIER_LIMITS } from "@kaesava/config";
import type { UsageStorePort } from "./index.js";

function getCurrentPeriodMonth(now: Date): string {
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}-01`;
}

function getNextResetDate(now: Date): string {
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const year = nextMonth.getUTCFullYear();
  const month = (nextMonth.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}-01`;
}

export class DbUsageStore implements UsageStorePort {
  constructor(
    private db: DbOrTx,
    private appId: string,
    private now: () => Date = () => new Date()
  ) {}

  async getUsage(tenantId: string): Promise<{ used: number; limit: number; remaining: number; resetsOn: string }> {
    const current = this.now();
    const periodMonth = getCurrentPeriodMonth(current);
    const limit = AI_TIER_LIMITS.free.monthlyLlmCalls;

    const [row] = await this.db
      .select({ llmCalls: aiUsage.llmCalls })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.tenantId, tenantId),
          eq(aiUsage.appId, this.appId),
          eq(aiUsage.periodMonth, periodMonth),
          isNull(aiUsage.archivedAt)
        )
      )
      .limit(1);

    const used = row?.llmCalls ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      resetsOn: getNextResetDate(current),
    };
  }

  async incrementLlmCalls(tenantId: string, limit: number): Promise<boolean> {
    if (limit <= 0) return false;
    const current = this.now();
    const periodMonth = getCurrentPeriodMonth(current);

    // Atomic conditional upsert protecting against race conditions
    const result = await this.db
      .insert(aiUsage)
      .values({
        tenantId,
        appId: this.appId,
        periodMonth,
        llmCalls: 1,
      })
      .onConflictDoUpdate({
        target: [aiUsage.tenantId, aiUsage.appId, aiUsage.periodMonth],
        set: {
          llmCalls: sql`${aiUsage.llmCalls} + 1`,
          updatedAt: current,
        },
        where: sql`${aiUsage.llmCalls} < ${limit}`,
      })
      .returning({ id: aiUsage.id });

    return result.length > 0;
  }

  async decrementLlmCalls(tenantId: string): Promise<void> {
    const current = this.now();
    const periodMonth = getCurrentPeriodMonth(current);
    await this.db
      .update(aiUsage)
      .set({
        llmCalls: sql`GREATEST(0, ${aiUsage.llmCalls} - 1)`,
        updatedAt: current,
      })
      .where(
        and(
          eq(aiUsage.tenantId, tenantId),
          eq(aiUsage.appId, this.appId),
          eq(aiUsage.periodMonth, periodMonth)
        )
      );
  }
}
