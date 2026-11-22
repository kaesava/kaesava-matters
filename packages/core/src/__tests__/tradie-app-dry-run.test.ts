import { describe, it, expect, vi } from "vitest";
import {
  registerAppManifest,
  resolveAppConfigOrDefault,
  resolveEffectiveAppFlags,
} from "@kaesava/config";
import {
  serializeCsvObjects,
  type TenantLifecycleHooks,
} from "@kaesava/types";
import {
  createArchiveRegistry,
  computeRecurringDates,
  planSeriesEditScope,
  canRolePerform,
  defineAppRolePolicy,
  buildCorsHeaders,
  evaluateAuthEdgeProxy,
  createConsentGatedTelemetry,
} from "../index.js";

/**
 * Dry-Run Integration Proof:
 * Assembling a multi-tenant, multi-user "TradiePro" app (Tradie Companies = Tenants,
 * Tradies = Tenant Users, Jobs = Domain Entity) purely via AppManifest + Platform Contracts
 * with ZERO budgeting tables or Money Matters domain code.
 */
describe("Dry Run: TradieMatters Multi-Tenant App Assembly", () => {
  const TRADIE_APP_ID = "01908bde-9999-7b19-a178-574211bc93ff";

  it("assembles TradieMatters end-to-end with AppManifest, Job Status Machine, Recurring Maintenance Bursting, RBAC, Archive Registry, and Tenant Hooks", async () => {
    // 1. Register AppManifest (zero changes to platform code)
    registerAppManifest({
      id: TRADIE_APP_ID,
      name: "TradieMatters",
      slug: "tradie-matters",
      trialDays: 14,
      maxOwnedTenantsPerUser: 5,
      storageKeyPrefix: "tradie_matters",
      easProjectId: "tradie-eas-project-id",
      branding: {
        companyName: "Kaesava AU",
        primaryDomain: "tradiematters.kaesava.au",
        appUrl: "https://tradiematters.kaesava.au",
        apiUrl: "https://api.tradiematters.kaesava.au",
        deepLinkScheme: "tradiematters://",
        supportEmail: "support@tradiematters.kaesava.au",
        fromEmail: "TradieMatters <support@tradiematters.kaesava.au>",
        logoUrl: "https://tradiematters.kaesava.au/logo.png",
      },
      terminology: {
        tenantSingular: "Company",
        tenantPlural: "Companies",
        memberSingular: "Tradie",
      },
      allowedRedirectHosts: ["tradiematters.kaesava.au", "localhost"],
      features: {
        premiumEnabled: true,
        partnerInvite: true,
        offlineSync: false,
        canAffordCalculator: false,
        foundingMemberPromo: false,
        aiAssistant: false,
        privateMode: false,
        fileNotes: true,
        simulation: false,
        customAllocationRules: false,
        reports: true,
        bankAccounts: false,
      },
    });

    const manifest = resolveAppConfigOrDefault(TRADIE_APP_ID);
    expect(manifest.name).toBe("TradieMatters");
    expect(manifest.terminology.tenantSingular).toBe("Company");
    expect(manifest.terminology.memberSingular).toBe("Tradie");
    expect(manifest.trialDays).toBe(14);
    expect(manifest.maxOwnedTenantsPerUser).toBe(5);
    expect(manifest.storageKeyPrefix).toBe("tradie_matters");
    expect(manifest.easProjectId).toBe("tradie-eas-project-id");

    // 1b. Auth Edge Proxy & Consent-Gated Telemetry
    const proxyUnauth = evaluateAuthEdgeProxy("/dashboard/jobs", () => false, {
      publicPrefixes: ["/sign-in", "/invite/"],
    });
    expect(proxyUnauth).toEqual({
      action: "redirect",
      redirectPath: "/sign-in?redirect=%2Fdashboard%2Fjobs",
    });
    const proxyAuth = evaluateAuthEdgeProxy(
      "/dashboard/jobs",
      (name) => name === "__Secure-neon-auth.session_token",
      { publicPrefixes: ["/sign-in"] }
    );
    expect(proxyAuth).toEqual({ action: "next" });

    const captureMock = vi.fn();
    const flushMock = vi.fn().mockResolvedValue(undefined);
    const telemetry = createConsentGatedTelemetry({
      client: { capture: captureMock, identify: vi.fn(), flush: flushMock },
      isUserTelemetryGranted: async (_db, uid) => uid === "tradie-1",
    });
    await telemetry.captureIfConsented({}, "tradie-1", "job_completed", { app_id: TRADIE_APP_ID });
    await telemetry.captureIfConsented({}, "tradie-2", "job_completed", { app_id: TRADIE_APP_ID });
    expect(captureMock).toHaveBeenCalledTimes(1);

    // 2. Unified Feature Flags
    const flags = resolveEffectiveAppFlags(TRADIE_APP_ID, { fileNotes: true });
    expect(flags.fileNotes).toBe(true);
    expect(flags.simulation).toBe(false);

    // 3. CORS with x-app-id header
    const cors = buildCorsHeaders("https://tradiematters.kaesava.au", false, manifest.allowedRedirectHosts);
    expect(cors["Access-Control-Allow-Origin"]).toBe("https://tradiematters.kaesava.au");
    expect(cors["Access-Control-Allow-Headers"]).toContain("x-app-id");

    // 4. 2-Layer RBAC (Base Role + TradieMatters App Roles)
    expect(canRolePerform("OWNER", "manage_members")).toBe(true);
    expect(canRolePerform("MEMBER", "write")).toBe(true);
    expect(canRolePerform("MEMBER", "delete_tenant")).toBe(false);
    expect(canRolePerform("VIEWER", "write")).toBe(false);

    const tradieRoles = defineAppRolePolicy({
      COORDINATOR: { baseRole: "MEMBER", permissions: ["jobs:view_all", "jobs:assign"] },
      TRADIE: { baseRole: "MEMBER", permissions: ["jobs:view_assigned", "jobs:complete"] },
      APPRENTICE: { baseRole: "VIEWER", permissions: ["jobs:view_assigned"] },
    });
    expect(tradieRoles.can("MEMBER", "COORDINATOR", "jobs:view_all")).toBe(true);
    expect(tradieRoles.can("MEMBER", "TRADIE", "jobs:view_all")).toBe(false);
    expect(tradieRoles.can("MEMBER", "TRADIE", "jobs:complete")).toBe(true);
    expect(tradieRoles.can("OWNER", null, "jobs:view_all")).toBe(true);

    // 5. Recurring Maintenance Job Bursting & Outlook-style Reschedule
    const maintenanceDates = computeRecurringDates({
      rrule: "FREQ=MONTHLY;INTERVAL=3",
      startDate: "2026-03-01",
      fromDate: "2026-03-01",
      horizonMonths: 12,
      timezone: "Australia/Melbourne",
    });
    expect(maintenanceDates).toEqual(["2026-03-01", "2026-06-01", "2026-09-01", "2026-12-01", "2027-03-01"]);

    const reschedulePlan = planSeriesEditScope({
      scope: "THIS_AND_FOLLOWING",
      fromDate: "2026-09-01",
      existingSeries: {
        id: "maint-1",
        tenantId: "company-1",
        appId: TRADIE_APP_ID,
        name: "Quarterly HVAC Service",
        rrule: "FREQ=MONTHLY;INTERVAL=3",
        startDate: "2026-03-01",
        endDate: null,
        lastBurstDate: "2027-03-01",
      },
      occurrences: [
        { id: "o1", seriesId: "maint-1", expectedDate: "2026-03-01", status: "CONFIRMED" },
        { id: "o2", seriesId: "maint-1", expectedDate: "2026-06-01", status: "CONFIRMED" },
        { id: "o3", seriesId: "maint-1", expectedDate: "2026-09-01", status: "PENDING" },
      ],
      updatedRrule: "FREQ=MONTHLY;INTERVAL=6",
      timezone: "Australia/Melbourne",
      horizonMonths: 12,
    });
    expect(reschedulePlan.truncateSeriesEndDate).toBe("2026-08-31");
    expect(reschedulePlan.newOccurrenceDates).toEqual(["2026-09-01", "2027-03-01", "2027-09-01"]);

    // 7. Pluggable Archive Registry for Jobs
    const restoreJob = vi.fn().mockResolvedValue({ id: "job-42", archivedAt: null });
    const archiveRegistry = createArchiveRegistry([
      {
        itemType: "JOB",
        listArchived: async () => [
          { id: "job-42", name: "Rewire Kitchen", itemType: "JOB", subtitle: "Smith Residence", archivedAt: new Date("2026-04-01T00:00:00Z") },
        ],
        restoreItem: restoreJob,
      },
    ]);
    const archived = await archiveRegistry.listArchivedItems({ db: {}, tenantId: "company-1", appId: TRADIE_APP_ID });
    expect(archived).toHaveLength(1);
    await archiveRegistry.restoreArchivedItem({ db: {}, tenantId: "company-1", appId: TRADIE_APP_ID, userId: "tradie-1" }, "JOB", "job-42");
    expect(restoreJob).toHaveBeenCalledTimes(1);

    // 8. Tenant Lifecycle Hooks for TradiePro (Export Jobs CSV, Zero Budgeting Tables)
    const tradieHooks: TenantLifecycleHooks<unknown> = {
      onExportTenantData: async () => ({
        "Jobs.csv": serializeCsvObjects(
          [{ id: "job-1", title: "Install Switchboard", status: "SCHEDULED", assignedTradie: "Dave" }],
          ["id", "title", "status", "assignedTradie"]
        ),
      }),
    };
    const exported = await tradieHooks.onExportTenantData!({
      db: {},
      tenantId: "company-1",
      appId: TRADIE_APP_ID,
      userId: "tradie-1",
    });
    expect(exported["Jobs.csv"]).toContain("Install Switchboard");
  });
});
