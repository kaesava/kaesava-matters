export interface TenantMobileAdapter {
  activeTenantId: string;
  onSwitchTenant: (tenantId: string) => void;
  onExportData: () => Promise<void>;
}
