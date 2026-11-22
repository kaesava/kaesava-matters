export interface BillingWebAdapter {
  status: string;
  planType?: string | null;
  onUpgrade: () => void;
  onManagePortal: () => void;
  onSync: () => void;
}
