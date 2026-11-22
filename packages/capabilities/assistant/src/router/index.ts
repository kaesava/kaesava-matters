import {
  askAssistantCommand,
  getAiUsageQuery,
  getAssistantPreferencesQuery,
  updateAssistantPreferencesCommand,
} from "../index";

export const assistantProcedures = {
  ask: { execute: askAssistantCommand },
  getUsage: { execute: getAiUsageQuery },
  getPreferences: { execute: getAssistantPreferencesQuery },
  updatePreferences: { execute: updateAssistantPreferencesCommand },
} as const;
