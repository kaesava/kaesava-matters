export interface TenantMobileAdapter {
  activeTenantId: string;
  onSwitchTenant: (tenantId: string) => void;
  onExportData: () => Promise<void>;
}

export * from "../ui-contracts.js";
export { MobileUserProfileSettingsSection } from "./MobileUserProfileSettingsSection.js";
export { MobileTenantDetailsSection } from "./MobileTenantDetailsSection.js";
export { MobileTenantMembersSection } from "./MobileTenantMembersSection.js";
export { MobileTenantDangerZoneSection } from "./MobileTenantDangerZoneSection.js";
export { MobileArchivedItemsSection } from "./MobileArchivedItemsSection.js";
export { MobileDataPrivacyAndExportSection } from "./MobileDataPrivacyAndExportSection.js";
export { MobileTenantSwitcher } from "./MobileTenantSwitcher.js";
export { MobileInviteAcceptFlow } from "./MobileInviteAcceptFlow.js";
