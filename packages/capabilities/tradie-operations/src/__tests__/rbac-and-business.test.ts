import { describe, expect, it, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  canClaimFoundingCrew,
  canManageBusiness,
  canManageTeam,
  canReadInternalCostRates,
  CompleteBusinessSetupInput,
  completeBusinessSetupCommand,
  countTenantSeats,
  createTradieTenantLifecycleHooks,
  evaluateSeatEntitlement,
  FOUNDING_CREW_CAP,
  getBusinessProfileQuery,
  listTeamMembersWithRatesQuery,
  resolveTierSeatLimits,
  tradieRolePolicy,
  UpdateBusinessProfileInput,
  updateBusinessProfileCommand,
  UpsertTeamMemberProfileInput,
  upsertTeamMemberProfileCommand,
} from "../index.js";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const APP_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

function sampleProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "prof-1",
    tradeType: "ELECTRICAL",
    abn: "51824753556",
    gstRegistered: true,
    defaultTaxRatePercent: "10.00",
    quotePrefix: "Q-",
    nextQuoteNumber: 1,
    invoicePrefix: "INV-",
    nextInvoiceNumber: 1,
    defaultPaymentTermsDays: 14,
    defaultHourlyChargeRate: "120.00",
    bankAccountName: "Sparky Pty Ltd",
    bankBsb: "062000",
    bankAccountNumber: "12345678",
    tenantId: TENANT_ID,
    appId: APP_ID,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("tradie-operations RBAC policy", () => {
  it("maps app roles to platform base roles and evaluates permissions", () => {
    expect(tradieRolePolicy.getBaseRole("OWNER")).toBe("OWNER");
    expect(tradieRolePolicy.getBaseRole("ADMIN")).toBe("MEMBER");
    expect(tradieRolePolicy.getBaseRole("TRADIE")).toBe("MEMBER");
    expect(tradieRolePolicy.getBaseRole("BOOKKEEPER")).toBe("VIEWER");

    expect(canReadInternalCostRates("OWNER", null)).toBe(true);
    expect(canReadInternalCostRates("MEMBER", "ADMIN")).toBe(true);
    expect(canReadInternalCostRates("VIEWER", "BOOKKEEPER")).toBe(true);
    expect(canReadInternalCostRates("MEMBER", "TRADIE")).toBe(false);

    expect(canManageBusiness("MEMBER", "ADMIN")).toBe(true);
    expect(canManageBusiness("MEMBER", "TRADIE")).toBe(false);
    expect(canManageBusiness("VIEWER", "BOOKKEEPER")).toBe(false);

    expect(canManageTeam("MEMBER", "ADMIN")).toBe(true);
    expect(canManageTeam("MEMBER", "TRADIE")).toBe(false);
    expect(tradieRolePolicy.can("MEMBER", "TRADIE", "timesheets:write")).toBe(true);
    expect(tradieRolePolicy.can("VIEWER", "BOOKKEEPER", "invoices:write")).toBe(false);
    expect(tradieRolePolicy.can(null, undefined, "business:read")).toBe(false);
  });
});

describe("tradie-operations seat entitlements", () => {
  it("resolves tier seat limits and founding crew cap", () => {
    expect(resolveTierSeatLimits("TRIAL")).toEqual({ maxActiveSeats: 5, freeViewerSeats: 1 });
    expect(resolveTierSeatLimits("solo")).toEqual({ maxActiveSeats: 1, freeViewerSeats: 1 });
    expect(resolveTierSeatLimits("FOUNDING_CREW").maxActiveSeats).toBe(5);
    expect(resolveTierSeatLimits("UNKNOWN_PLAN")).toEqual({ maxActiveSeats: 1, freeViewerSeats: 1 });

    expect(canClaimFoundingCrew(FOUNDING_CREW_CAP - 1)).toBe(true);
    expect(canClaimFoundingCrew(FOUNDING_CREW_CAP)).toBe(false);
  });

  it("counts occupied seats excluding REVOKED invites", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: async () => [
            { role: "OWNER", inviteStatus: "ACCEPTED" },
            { role: "MEMBER", inviteStatus: "PENDING" },
            { role: "VIEWER", inviteStatus: "ACCEPTED" },
            { role: "MEMBER", inviteStatus: "REVOKED" },
          ],
        }),
      }),
    } as unknown as DbOrTx;

    const counts = await countTenantSeats(mockDb, TENANT_ID);
    expect(counts).toEqual({ activeMemberSeats: 2, freeViewerSeats: 1 });
  });

  it("evaluates viewer and active member seat limits", () => {
    const viewerAllowed = evaluateSeatEntitlement({
      planType: "SOLO",
      activeMemberSeats: 1,
      freeViewerSeats: 0,
      targetBaseRole: "VIEWER",
      targetAppRole: "BOOKKEEPER",
    });
    expect(viewerAllowed.allowed).toBe(true);

    const viewerDenied = evaluateSeatEntitlement({
      planType: "SOLO",
      activeMemberSeats: 1,
      freeViewerSeats: 1,
      targetBaseRole: "VIEWER",
      targetAppRole: "BOOKKEEPER",
    });
    expect(viewerDenied.allowed).toBe(false);
    expect(viewerDenied.reason).toContain("Bookkeeper");

    const crewDenied = evaluateSeatEntitlement({
      planType: "SOLO",
      activeMemberSeats: 1,
      freeViewerSeats: 0,
      targetBaseRole: "MEMBER",
      targetAppRole: "TRADIE",
    });
    expect(crewDenied.allowed).toBe(false);
    expect(crewDenied.reason).toContain("Active crew seat limit");
  });
});

describe("tradie-operations business schemas, queries, and commands", () => {
  it("validates business and team member input schemas strictly", () => {
    expect(
      UpdateBusinessProfileInput.safeParse({
        businessName: "Sparky Bros",
        defaultTaxRatePercent: "10.00",
        defaultHourlyChargeRate: "125.5",
      }).success
    ).toBe(true);
    expect(
      UpdateBusinessProfileInput.safeParse({
        unknownField: "nope",
      }).success
    ).toBe(false);

    const setup = CompleteBusinessSetupInput.parse({});
    expect(setup.tradeType).toBe("GENERAL");

    expect(
      UpsertTeamMemberProfileInput.safeParse({
        userId: USER_ID,
        licenseExpiryDate: "2027-06-30",
        internalHourlyCostRate: "55.00",
      }).success
    ).toBe(true);
    expect(
      UpsertTeamMemberProfileInput.safeParse({
        userId: USER_ID,
        licenseExpiryDate: "30/06/2027",
      }).success
    ).toBe(false);
  });

  it("queries business profile and redacts internalHourlyCostRate for TRADIE callers", async () => {
    const profile = sampleProfile();
    const profileDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [profile],
          }),
        }),
      }),
    } as unknown as DbOrTx;
    await expect(getBusinessProfileQuery(profileDb, TENANT_ID, APP_ID)).resolves.toEqual(profile);

    const memberRows = [
      {
        userId: USER_ID,
        email: "dave@tradie.au",
        displayName: "Dave",
        role: "MEMBER",
        appRole: "TRADIE",
        profileId: "tp-1",
        tradeLicenseNumber: "LIC-1",
        licenseExpiryDate: "2027-01-01",
        internalHourlyCostRate: "52.00",
        defaultChargeOutRate: "110.00",
        colorHex: "#2563eb",
        phone: "0400000000",
        isFieldActive: null,
      },
    ];
    const teamDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            leftJoin: () => ({
              where: async () => memberRows,
            }),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    const tradieView = await listTeamMembersWithRatesQuery(teamDb, {
      tenantId: TENANT_ID,
      appId: APP_ID,
      callerBaseRole: "MEMBER",
      callerAppRole: "TRADIE",
    });
    expect(tradieView[0]?.internalHourlyCostRate).toBeNull();
    expect(tradieView[0]?.isFieldActive).toBe(true);

    const ownerView = await listTeamMembersWithRatesQuery(teamDb, {
      tenantId: TENANT_ID,
      appId: APP_ID,
      callerBaseRole: "OWNER",
      callerAppRole: "OWNER",
    });
    expect(ownerView[0]?.internalHourlyCostRate).toBe("52.00");
  });

  it("updates business profile, completes setup, and upserts team member profiles", async () => {
    const profile = sampleProfile();
    const updateWhere = vi.fn(async () => []);
    const insertValues = vi.fn(async () => []);
    let selectCall = 0;

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCall += 1;
              return selectCall === 1 ? [] : [profile];
            },
          }),
        }),
      }),
      insert: () => ({
        values: insertValues,
      }),
      update: () => ({
        set: () => ({
          where: updateWhere,
        }),
      }),
    } as unknown as DbOrTx;

    const updated = await updateBusinessProfileCommand(
      mockDb,
      { tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID },
      { businessName: "Apex Electrical", tradeType: "ELECTRICAL" }
    );
    expect(updated).toEqual(profile);
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);

    const setupResult = await completeBusinessSetupCommand(
      mockDb,
      { tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID },
      { businessName: "Apex Electrical", tradeType: "ELECTRICAL" }
    );
    expect(setupResult.profile).toEqual(profile);
    expect(setupResult.setupCompletedAt).toBeInstanceOf(Date);

    const createdMember = { id: "tp-new", userId: USER_ID, isFieldActive: true };
    const memberCreateDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [createdMember],
        }),
      }),
    } as unknown as DbOrTx;
    await expect(
      upsertTeamMemberProfileCommand(
        memberCreateDb,
        { tenantId: TENANT_ID, appId: APP_ID, actorUserId: USER_ID },
        { userId: USER_ID, isFieldActive: true }
      )
    ).resolves.toEqual(createdMember);
  });

  it("executes lifecycle hooks including seat enforcement on invite and profile archival", async () => {
    const hooks = createTradieTenantLifecycleHooks();
    const updateWhere = vi.fn(() =>
      Object.assign(Promise.resolve([]), {
        returning: async () => [{ id: "tp-1", userId: USER_ID }],
      })
    );
    const profile = sampleProfile();

    const fullDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [profile],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "tp-1", userId: USER_ID }],
        }),
      }),
      update: () => ({
        set: () => ({
          where: updateWhere,
        }),
      }),
    } as unknown as DbOrTx;

    await hooks.onTenantCreated?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID });
    await hooks.onSetupCancelled?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID });
    await expect(
      hooks.onEnrichTenantDetails?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID })
    ).resolves.toEqual({ businessProfile: profile });
    await hooks.onMemberJoined?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID });
    await hooks.onMemberRemoved?.({
      db: fullDb,
      tenantId: TENANT_ID,
      appId: APP_ID,
      userId: USER_ID,
      removedUserId: "44444444-4444-4444-8444-444444444444",
    });
    await hooks.onMemberLeft?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID });
    await hooks.onTenantDeleting?.({ db: fullDb, tenantId: TENANT_ID, appId: APP_ID, userId: USER_ID });
    expect(updateWhere).toHaveBeenCalled();

    let inviteSelect = 0;
    const inviteBlockedDb = {
      select: () => ({
        from: () => ({
          where: () => {
            inviteSelect += 1;
            if (inviteSelect === 1) {
              return { limit: async () => [{ planType: "SOLO" }] };
            }
            return Promise.resolve([{ role: "OWNER", inviteStatus: "ACCEPTED" }]);
          },
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      hooks.onBeforeMemberInvite?.({
        db: inviteBlockedDb,
        tenantId: TENANT_ID,
        appId: APP_ID,
        userId: USER_ID,
        inviteeEmail: "crew@tradie.au",
        role: "MEMBER",
        appRole: "TRADIE",
      })
    ).rejects.toThrow(/Active crew seat limit/);
  });
});
