export interface TenantWebAdapter {
  activeTenantId: string;
  onSwitchTenant: (tenantId: string) => void;
  onExportData: () => Promise<void>;
}

export * from "../ui-contracts.js";
export { UserProfileSettingsSection } from "./UserProfileSettingsSection.js";
export { TenantDetailsSection } from "./TenantDetailsSection.js";
export { TenantMembersSection } from "./TenantMembersSection.js";
export { TenantDangerZoneSection } from "./TenantDangerZoneSection.js";
export { ArchivedItemsSection } from "./ArchivedItemsSection.js";
export { DataPrivacyAndExportSection } from "./DataPrivacyAndExportSection.js";
export { TenantSwitcher } from "./TenantSwitcher.js";
export { InviteAcceptFlow } from "./InviteAcceptFlow.js";
