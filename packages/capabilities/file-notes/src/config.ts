import type { EntityPrivacyResolverMap } from "@money-matters/types";
import type { DbOrTx } from "@money-matters/db";

export interface FileNotesEntityRule {
  maxFiles?: number;
  isMandatory?: boolean;
  allowedMimeTypes?: readonly string[];
}

export interface FileNotesAppConfig {
  /** App-specific canonical display name (e.g. "File Notes" vs "Job Attachments"). */
  displayName: string;
  allowedEntityTypes: readonly string[];
  entityRules?: Record<string, FileNotesEntityRule>;
  privacyResolvers?: EntityPrivacyResolverMap<DbOrTx>;
}

export function validateFileNotePolicy(
  config: FileNotesAppConfig,
  params: { entityType: string; existingCount: number; mimeType?: string }
): { allowed: boolean; reason?: string } {
  if (!config.allowedEntityTypes.includes(params.entityType)) {
    return {
      allowed: false,
      reason: `${config.displayName} are not enabled for entity type "${params.entityType}".`,
    };
  }
  const rule = config.entityRules?.[params.entityType];
  if (rule?.maxFiles !== undefined && params.existingCount >= rule.maxFiles) {
    return {
      allowed: false,
      reason: `Maximum of ${rule.maxFiles} ${config.displayName.toLowerCase()} reached.`,
    };
  }
  if (
    params.mimeType &&
    rule?.allowedMimeTypes &&
    !rule.allowedMimeTypes.includes(params.mimeType)
  ) {
    return {
      allowed: false,
      reason: `File type "${params.mimeType}" is not allowed for "${params.entityType}".`,
    };
  }
  return { allowed: true };
}
