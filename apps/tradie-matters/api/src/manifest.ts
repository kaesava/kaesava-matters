import { registerAppManifest } from "@kaesava/config";

export const TRADIE_MATTERS_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";

export const TRADIE_BILLING_TIERS = {
  SOLO: {
    key: "SOLO",
    label: "Solo",
    monthlyPrice: "$9.95",
    annualPrice: "$99",
    maxActiveSeats: 1,
    freeViewerSeats: 1,
  },
  FOUNDING_CREW: {
    key: "FOUNDING_CREW",
    label: "Founding Crew",
    monthlyPrice: "$9.95",
    annualPrice: "$99",
    maxActiveSeats: 5,
    freeViewerSeats: 1,
    capLimit: 250,
  },
  SMALL_CREW: {
    key: "SMALL_CREW",
    label: "Small Crew",
    monthlyPrice: "$24.95",
    annualPrice: "$249",
    maxActiveSeats: 5,
    freeViewerSeats: 1,
  },
} as const;

export function registerTradieMattersApp(): void {
  registerAppManifest({
    id: TRADIE_MATTERS_APP_ID,
    name: "Tradie Matters",
    slug: "tradie-matters",
    trialDays: 14,
    maxOwnedTenantsPerUser: 1,
    storageKeyPrefix: "tradie_matters",
    authStoragePrefix: "tradie-matters",
    roles: [
      { key: "OWNER", label: "Owner", baseRole: "OWNER" },
      { key: "ADMIN", label: "Admin", baseRole: "MEMBER" },
      { key: "TRADIE", label: "Tradie", baseRole: "MEMBER" },
      { key: "BOOKKEEPER", label: "Bookkeeper", baseRole: "VIEWER" },
    ],
    branding: {
      companyName: "Kaesava AU",
      primaryDomain: "tradiematters.kaesava.au",
      appUrl: "https://tradiematters.kaesava.au",
      apiUrl: "https://api.tradiematters.kaesava.au",
      deepLinkScheme: "tradiematters://",
      supportEmail: "info@tradiematters.kaesava.au",
      fromEmail: "Tradie Matters <info@tradiematters.kaesava.au>",
      logoUrl: "https://tradiematters.kaesava.au/icon-192x192.png",
      legalAddress: "VIC 3030, Australia",
      signInPath: "/sign-in",
    },
    terminology: {
      tenantSingular: "Business",
      tenantPlural: "Businesses",
      memberSingular: "Team Member",
    },
    billing: {
      foundingCapLimit: TRADIE_BILLING_TIERS.FOUNDING_CREW.capLimit,
      tiers: {
        SOLO: {
          maxActiveSeats: TRADIE_BILLING_TIERS.SOLO.maxActiveSeats,
          freeViewerSeats: TRADIE_BILLING_TIERS.SOLO.freeViewerSeats,
        },
        FOUNDING_CREW: {
          maxActiveSeats: TRADIE_BILLING_TIERS.FOUNDING_CREW.maxActiveSeats,
          freeViewerSeats: TRADIE_BILLING_TIERS.FOUNDING_CREW.freeViewerSeats,
        },
        SMALL_CREW: {
          maxActiveSeats: TRADIE_BILLING_TIERS.SMALL_CREW.maxActiveSeats,
          freeViewerSeats: TRADIE_BILLING_TIERS.SMALL_CREW.freeViewerSeats,
        },
      },
      displayPrices: {
        monthly: "$9.95/mo",
        annual: "$99/yr",
        foundingAnnual: "$99/yr",
      },
      priceIds: {
        small_crew_monthly: process.env.STRIPE_PRICE_TM_SMALL_CREW_MONTHLY ?? "price_tm_small_crew_monthly",
        small_crew_annual: process.env.STRIPE_PRICE_TM_SMALL_CREW_ANNUAL ?? "price_tm_small_crew_annual",
        founding_crew_monthly: process.env.STRIPE_PRICE_TM_FOUNDING_CREW_MONTHLY ?? "price_tm_founding_crew_monthly",
        founding_crew_annual: process.env.STRIPE_PRICE_TM_FOUNDING_CREW_ANNUAL ?? "price_tm_founding_crew_annual",
      },
    },
    allowedRedirectHosts: ["kaesava.au", ".kaesava.au", "localhost", "127.0.0.1"],
    features: {
      premiumEnabled: false,
      memberInvite: true,
      offlineSync: false,
      foundingMemberPromo: true,
      aiAssistant: false,
      privateMode: false,
      fileNotes: true,
    },
  });
}
