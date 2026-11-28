import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import {
  tmInvoices,
  tmJobs,
  tmMaterialUsages,
  tmTimeEntries,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { canReadInternalCostRates } from "../rbac/policy.js";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function getJobMarginQuery(
  db: DbOrTx,
  params: {
    tenantId: string;
    appId: string;
    jobId: string;
    callerBaseRole: string | null | undefined;
    callerAppRole: string | null | undefined;
    canViewMargins?: boolean;
  }
) {
  const allowed =
    canReadInternalCostRates(params.callerBaseRole, params.callerAppRole) &&
    (params.callerAppRole !== "ADMIN" || params.canViewMargins !== false);

  if (!allowed) {
    return { redacted: true as const, revenueExTax: null, labourCost: null, materialCost: null, grossProfit: null, marginPct: null };
  }

  const [job, invoices, timeEntries, materials] = await Promise.all([
    db.select().from(tmJobs).where(and(eq(tmJobs.id, params.jobId), eq(tmJobs.tenantId, params.tenantId))).limit(1),
    db.select().from(tmInvoices).where(and(eq(tmInvoices.jobId, params.jobId), ne(tmInvoices.status, "VOID"), isNull(tmInvoices.archivedAt))),
    db.select().from(tmTimeEntries).where(and(eq(tmTimeEntries.jobId, params.jobId), isNull(tmTimeEntries.archivedAt))),
    db.select().from(tmMaterialUsages).where(and(eq(tmMaterialUsages.jobId, params.jobId), isNull(tmMaterialUsages.archivedAt))),
  ]);

  const invoicedExTax = invoices.reduce((s, inv) => s + Number(inv.subtotalExTax), 0);
  const revenueExTax = round2(invoicedExTax > 0 ? invoicedExTax : Number(job[0]?.quotedAmountExTax ?? 0));
  const labourCost = round2(
    timeEntries.reduce((s, t) => s + (t.durationMinutes / 60) * Number(t.hourlyCostSnapshot), 0)
  );
  const materialCost = round2(
    materials.reduce((s, m) => s + Number(m.quantity) * Number(m.unitCostSnapshot), 0)
  );
  const grossProfit = round2(revenueExTax - labourCost - materialCost);
  const marginPct = revenueExTax > 0 ? round2((grossProfit / revenueExTax) * 100) : 0;

  return { redacted: false as const, revenueExTax, labourCost, materialCost, grossProfit, marginPct };
}

export async function getWeeklyPaydayCashPulseQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string
) {
  const [openInvoices, timeEntries] = await Promise.all([
    db
      .select()
      .from(tmInvoices)
      .where(
        and(
          eq(tmInvoices.tenantId, tenantId),
          eq(tmInvoices.appId, appId),
          inArray(tmInvoices.status, ["SENT", "PARTIALLY_PAID", "OVERDUE"]),
          isNull(tmInvoices.archivedAt)
        )
      ),
    db
      .select()
      .from(tmTimeEntries)
      .where(and(eq(tmTimeEntries.tenantId, tenantId), eq(tmTimeEntries.appId, appId), isNull(tmTimeEntries.archivedAt))),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  let dueReceivables = 0;
  let overdueReceivables = 0;
  for (const inv of openInvoices) {
    const bal = Number(inv.balanceDue);
    if (inv.dueDate < today) overdueReceivables += bal;
    else dueReceivables += bal;
  }

  const accruedWages = round2(
    timeEntries.reduce((s, t) => s + (t.durationMinutes / 60) * Number(t.hourlyCostSnapshot), 0)
  );
  const superContribution12Pct = round2(accruedWages * 0.12);
  const totalCrewObligation = round2(accruedWages + superContribution12Pct);
  const totalReceivables = round2(dueReceivables + overdueReceivables);

  return {
    dueReceivables: round2(dueReceivables),
    overdueReceivables: round2(overdueReceivables),
    totalReceivables,
    accruedWages,
    superContribution12Pct,
    totalCrewObligation,
    netCashPulse: round2(totalReceivables - totalCrewObligation),
  };
}
