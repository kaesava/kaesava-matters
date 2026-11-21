/**
 * Separated platform capability flags vs app-specific feature flags.
 */

export interface PlatformCapabilityFlags {
  aiAssistant: boolean;
  privateMode: boolean;
  fileNotes: boolean;
  fileNotesMaxStorageMb: number;
  fileNotesMaxFileMb: number;
  reports: boolean;
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
