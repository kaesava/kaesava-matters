import { askAssistant } from "../queries/ask.query";

export const assistantProcedures = {
  ask: { execute: askAssistant },
} as const;
