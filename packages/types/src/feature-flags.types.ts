/**
 * Separated platform capability flags vs app-specific feature flags.
 */

export interface PlatformCapabilityFlags {
  billing?: boolean;
  memberInvite?: boolean;
  memberInvites?: boolean;
  aiAssistant: boolean;
  privateMode: boolean;
  fileNotes: boolean;
  fileNotesMaxStorageMb: number;
  fileNotesMaxFileMb: number;
  schedules?: boolean;
  transactions?: boolean;
  bankAccounts?: boolean;
  offlineSync?: boolean;
  foundingMemberPromo?: boolean;
}

export interface AppFeatureFlagsRecord extends PlatformCapabilityFlags {
  appFlags?: Record<string, boolean | number | string>;
  [key: string]: unknown;
}

export type AppFeatureFlags = AppFeatureFlagsRecord;

export const DEFAULT_APP_FEATURE_FLAGS: PlatformCapabilityFlags = {
  aiAssistant: true,
  privateMode: true,
  fileNotes: true,
  fileNotesMaxStorageMb: 100,
  fileNotesMaxFileMb: 10,
  bankAccounts: false,
  foundingMemberPromo: false,
  offlineSync: false,
  memberInvite: true,
};
