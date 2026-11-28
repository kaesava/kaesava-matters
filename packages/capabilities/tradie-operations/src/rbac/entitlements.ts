import { and, eq, isNull } from "drizzle-orm";
import { tenantUsers, type DbOrTx } from "@kaesava/db/rings/tradie-matters";

export const TRADIE_TRIAL_DAYS = 14;
export const FOUNDING_CREW_CAP = 250;
export const TRADIE_FREE_VIEWER_SEATS = 1;

export type TradieTierKey = "TRIAL" | "SOLO" | "FOUNDING_CREW" | "SMALL_CREW";

export const TRADIE_TIER_SEAT_LIMITS: Record<
  TradieTierKey,
  { maxActiveSeats: number; freeViewerSeats: number }
> = {
  TRIAL: { maxActiveSeats: 5, freeViewerSeats: TRADIE_FREE_VIEWER_SEATS },
  SOLO: { maxActiveSeats: 1, freeViewerSeats: TRADIE_FREE_VIEWER_SEATS },
  FOUNDING_CREW: { maxActiveSeats: 5, freeViewerSeats: TRADIE_FREE_VIEWER_SEATS },
  SMALL_CREW: { maxActiveSeats: 5, freeViewerSeats: TRADIE_FREE_VIEWER_SEATS },
};

export function resolveTierSeatLimits(planType?: string | null): {
  maxActiveSeats: number;
  freeViewerSeats: number;
} {
  const key = (planType ?? "TRIAL").toUpperCase();
  if (key === "TRIAL") {
    return TRADIE_TIER_SEAT_LIMITS.TRIAL;
  }
  if (key.startsWith("FOUNDING")) {
    return TRADIE_TIER_SEAT_LIMITS.FOUNDING_CREW;
  }
  if (key.startsWith("SMALL_CREW") || key === "ANNUAL") {
    return TRADIE_TIER_SEAT_LIMITS.SMALL_CREW;
  }
  return TRADIE_TIER_SEAT_LIMITS.SOLO;
}

export function canClaimFoundingCrew(activeFoundingCount: number): boolean {
  return activeFoundingCount < FOUNDING_CREW_CAP;
}

export async function countTenantSeats(
  db: DbOrTx,
  tenantId: string
): Promise<{ activeMemberSeats: number; freeViewerSeats: number }> {
  const rows = await db
    .select({ role: tenantUsers.role, inviteStatus: tenantUsers.inviteStatus })
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), isNull(tenantUsers.archivedAt)));

  const occupied = rows.filter((r) => r.inviteStatus !== "REVOKED");
  const freeViewerSeats = occupied.filter((r) => r.role === "VIEWER").length;
  const activeMemberSeats = occupied.length - freeViewerSeats;
  return { activeMemberSeats, freeViewerSeats };
}

export function evaluateSeatEntitlement(params: {
  planType?: string | null;
  activeMemberSeats: number;
  freeViewerSeats: number;
  targetBaseRole: "OWNER" | "MEMBER" | "VIEWER";
  targetAppRole?: string | null;
}): {
  allowed: boolean;
  reason?: string;
  maxActiveSeats: number;
  freeViewerSeats: number;
} {
  const limits = resolveTierSeatLimits(params.planType);
  if (params.targetBaseRole === "VIEWER" || params.targetAppRole === "BOOKKEEPER") {
    const allowed = params.freeViewerSeats < limits.freeViewerSeats;
    return {
      allowed,
      reason: allowed ? undefined : "Free Bookkeeper viewer seat limit reached for this plan.",
      maxActiveSeats: limits.maxActiveSeats,
      freeViewerSeats: limits.freeViewerSeats,
    };
  }
  const allowed = params.activeMemberSeats < limits.maxActiveSeats;
  return {
    allowed,
    reason: allowed ? undefined : "Active crew seat limit reached for this plan.",
    maxActiveSeats: limits.maxActiveSeats,
    freeViewerSeats: limits.freeViewerSeats,
  };
}
