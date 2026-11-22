export interface TenantWebAdapter {
  activeTenantId: string;
  onSwitchTenant: (tenantId: string) => void;
  onExportData: () => Promise<void>;
}
