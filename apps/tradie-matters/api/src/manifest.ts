import { registerAppManifest } from "@kaesava/config";

export const TRADIE_MATTERS_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";

export function registerTradieMattersApp(): void {
  registerAppManifest({
    id: TRADIE_MATTERS_APP_ID,
    name: "Tradie Matters",
    slug: "tradie-matters",
    trialDays: 30,
    maxOwnedTenantsPerUser: 1,
    storageKeyPrefix: "tradie_matters",
    authStoragePrefix: "tradie-matters",
    branding: {
      companyName: "Kaesava AU",
      primaryDomain: "tradiematters.kaesava.au",
      appUrl: "https://tradiematters.kaesava.au",
      apiUrl: "https://api.tradiematters.kaesava.au",
      deepLinkScheme: "tradiematters://",
      supportEmail: "info@tradiematters.kaesava.au",
      fromEmail: "Tradie Matters <info@tradiematters.kaesava.au>",
      logoUrl: "https://tradiematters.kaesava.au/logo.png",
      legalAddress: "VIC 3030, Australia",
      signInPath: "/sign-in",
    },
    terminology: {
      tenantSingular: "Business",
      tenantPlural: "Businesses",
      memberSingular: "Team Member",
    },
    allowedRedirectHosts: ["kaesava.au", ".kaesava.au", "localhost", "127.0.0.1"],
    features: {
      premiumEnabled: false,
      offlineSync: false,
      foundingMemberPromo: false,
      aiAssistant: false,
      privateMode: false,
      fileNotes: true,
    },
  });
}
