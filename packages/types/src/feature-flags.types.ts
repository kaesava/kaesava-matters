/**
 * Separated platform capability flags vs app-specific feature flags.
 */

export interface PlatformCapabilityFlags {
  billing?: boolean;
  memberInvites?: boolean;
  aiAssistant: boolean;
  privateMode: boolean;
  fileNotes: boolean;
  fileNotesMaxStorageMb: number;
  fileNotesMaxFileMb: number;
  categories?: boolean;
  schedules?: boolean;
  transactions?: boolean;
  bankAccounts?: boolean;
  reports: boolean;
  offlineSync?: boolean;
  foundingMemberPromo?: boolean;
}

export interface AppFeatureFlagsRecord extends PlatformCapabilityFlags {
  appFlags?: Record<string, boolean | number | string>;
}

export interface MoneyMattersFeatureFlags {
  simulation: boolean;
  customAllocationRules: boolean;
}

export type AppFeatureFlags = PlatformCapabilityFlags & MoneyMattersFeatureFlags;

export const DEFAULT_APP_FEATURE_FLAGS: AppFeatureFlags = {
  aiAssistant: true,
  privateMode: true,
  fileNotes: true,
  fileNotesMaxStorageMb: 100,
  fileNotesMaxFileMb: 10,
  simulation: true,
  customAllocationRules: true,
  reports: true,
};
