export interface BillingMobileAdapter {
  status: string;
  planType?: string | null;
  onUpgrade: () => void;
  onManagePortal: () => void;
  onSync: () => void;
}
