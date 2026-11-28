import type { ArchivedRecordItem, GetInviteDetailsResult } from "@kaesava/types";
import type { AppRoleOption, AppTerminologyConfig } from "@kaesava/config";

export interface TenantMemberItem {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: "OWNER" | "MEMBER" | "VIEWER" | string;
  appRole?: string | null;
  isOwner: boolean;
  isPending: boolean;
}

export interface UserProfileSettingsProps {
  displayName: string;
  loginEmail: string;
  notificationEmail: string;
  phoneNumber?: string;
  isSaving?: boolean;
  onSave: (input: {
    displayName: string;
    notificationEmail: string;
    phoneNumber?: string;
  }) => Promise<void>;
}

export interface TenantDetailsProps {
  tenantName: string;
  country: string;
  currency: string;
  timezone: string;
  state?: string | null;
  postcode?: string | null;
  isOwner: boolean;
  isSaving?: boolean;
  terminology?: Partial<AppTerminologyConfig>;
  onSave: (input: {
    name: string;
    timezone: string;
    state?: string;
    postcode?: string;
  }) => Promise<void>;
}

export interface TenantMembersProps {
  members: TenantMemberItem[];
  currentUserId: string;
  isOwner: boolean;
  roleOptions?: readonly AppRoleOption[];
  isInviting?: boolean;
  onInvite: (input: {
    email: string;
    role?: "MEMBER" | "VIEWER";
    appRole?: string | null;
  }) => Promise<void>;
  onUpdateRole?: (input: {
    memberId: string;
    newRole: "OWNER" | "MEMBER" | "VIEWER";
    newAppRole?: string | null;
  }) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
}

export interface TenantDangerZoneProps {
  tenantName: string;
  isOwner: boolean;
  isSoleOwner: boolean;
  isSubmitting?: boolean;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface ArchivedItemsProps {
  items: ArchivedRecordItem[];
  isLoading?: boolean;
  isRestoringId?: string | null;
  onRestore: (item: ArchivedRecordItem) => Promise<void>;
}

export interface DataPrivacyAndExportProps {
  telemetryConsent: "granted" | "denied" | null;
  isExporting?: boolean;
  onToggleTelemetry: (granted: boolean) => Promise<void>;
  onExportData: () => Promise<void>;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
}

export interface TenantSummaryItem {
  id: string;
  name: string;
  role?: string;
}

export interface TenantSwitcherProps {
  tenants: TenantSummaryItem[];
  activeTenantId: string;
  onSwitchTenant: (tenantId: string) => void | Promise<void>;
}

export interface InviteAcceptFlowProps {
  inviteDetails: GetInviteDetailsResult;
  isLoading?: boolean;
  isAccepting?: boolean;
  onAccept: () => Promise<void>;
  onSignOut?: () => void;
  onReturnHome?: () => void;
}
