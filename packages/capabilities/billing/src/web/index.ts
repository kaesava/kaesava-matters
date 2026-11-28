export interface BillingWebAdapter {
  status: string;
  planType?: string | null;
  onUpgrade: () => void;
  onManagePortal: () => void;
  onSync: () => void;
}

export { TrialBanner, type TrialBannerProps } from "./TrialBanner.js";
export { SubscriptionOverviewSection, type SubscriptionOverviewSectionProps } from "./SubscriptionOverviewSection.js";
export { BillingInvoicesTable, type BillingInvoicesTableProps, type BillingInvoiceItem } from "./BillingInvoicesTable.js";
export { PlanUpgradeView, type PlanUpgradeViewProps } from "./PlanUpgradeView.js";
