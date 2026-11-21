import { describe, it, expect, vi } from "vitest";
import {
  registerAppManifest,
  resolveAppConfigOrDefault,
  resolveEffectiveAppFlags,
} from "@money-matters/config";
import {
  defineStatusMachine,
  serializeCsvObjects,
  type TenantLifecycleHooks,
} from "@money-matters/types";
import {
  createArchiveRegistry,
  computeRecurringDates,
  planSeriesEditScope,
  canRolePerform,
  buildCorsHeaders,
} from "../index.js";

/**
 * Dry-Run Integration Proof:
 * Assembling a multi-tenant, multi-user "TradiePro" app (Tradie Companies = Tenants,
 * Tradies = Tenant Users, Jobs = Domain Entity) purely via AppManifest + Platform Contracts
 * with ZERO budgeting tables or Money Matters domain code.
 */
describe("Dry Run: TradiePro Multi-Tenant App Assembly", () => {
  const TRADIE_APP_ID = "01908bde-9999-7b19-a178-574211bc93ff";

  it("assembles TradiePro end-to-end with AppManifest, Job Status Machine, Recurring Maintenance Bursting, RBAC, Archive Registry, and Tenant Hooks", async () => {
    // 1. Register AppManifest (zero changes to platform code)
    registerAppManifest({
      id: TRADIE_APP_ID,
      name: "TradiePro",
      slug: "tradie-pro",
      trialDays: 14,
      branding: {
        companyName: "Kaesava AU",
        primaryDomain: "tradiepro.kaesava.au",
        appUrl: "https://tradiepro.kaesava.au",
        apiUrl: "https://api.tradiepro.kaesava.au",
        deepLinkScheme: "tradiepro://",
        supportEmail: "support@tradiepro.kaesava.au",
        fromEmail: "TradiePro <support@tradiepro.kaesava.au>",
        logoUrl: "https://tradiepro.kaesava.au/logo.png",
      },
      terminology: {
        tenantSingular: "Company",
        tenantPlural: "Companies",
        memberSingular: "Tradie",
      },
      allowedRedirectHosts: ["tradiepro.kaesava.au", "localhost"],
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
    expect(manifest.name).toBe("TradiePro");
    expect(manifest.terminology.tenantSingular).toBe("Company");
    expect(manifest.terminology.memberSingular).toBe("Tradie");
    expect(manifest.trialDays).toBe(14);

    // 2. Unified Feature Flags
    const flags = resolveEffectiveAppFlags(TRADIE_APP_ID, { fileNotes: true });
    expect(flags.fileNotes).toBe(true);
    expect(flags.simulation).toBe(false);

    // 3. CORS with x-app-id header
    const cors = buildCorsHeaders("https://tradiepro.kaesava.au", false, manifest.allowedRedirectHosts);
    expect(cors["Access-Control-Allow-Origin"]).toBe("https://tradiepro.kaesava.au");
    expect(cors["Access-Control-Allow-Headers"]).toContain("x-app-id");

    // 4. RBAC (Owner = Company Director, Member = Tradie, Viewer = Apprentice/Client)
    expect(canRolePerform("OWNER", "manage_members")).toBe(true);
    expect(canRolePerform("MEMBER", "write")).toBe(true);
    expect(canRolePerform("MEMBER", "delete_tenant")).toBe(false);
    expect(canRolePerform("VIEWER", "write")).toBe(false);

    // 5. Custom Job Status State Machine
    const jobStatusMachine = defineStatusMachine({
      states: ["QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "INVOICED"] as const,
      transitions: {
        QUOTED: ["SCHEDULED"],
        SCHEDULED: ["IN_PROGRESS", "COMPLETED"],
        IN_PROGRESS: ["COMPLETED"],
        COMPLETED: ["INVOICED"],
        INVOICED: [],
      },
      terminalStates: ["INVOICED"],
      badgeTones: {
        QUOTED: "neutral",
        SCHEDULED: "info",
        IN_PROGRESS: "warning",
        COMPLETED: "success",
        INVOICED: "success",
      },
    });
    expect(jobStatusMachine.canTransition("QUOTED", "SCHEDULED")).toBe(true);
    expect(jobStatusMachine.canTransition("QUOTED", "INVOICED")).toBe(false);
    expect(jobStatusMachine.isTerminal("INVOICED")).toBe(true);

    // 6. Recurring Maintenance Job Bursting & Outlook-style Reschedule
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
