/**
 * Mobile Application Structured Logger
 * Instantiates universal PII-safe logger from @kaesava/types.
 */
import { createPiiSafeLogger } from "@kaesava/types";
export type { LogLevel } from "@kaesava/types";

export const logger = createPiiSafeLogger(() => process.env.NODE_ENV !== "production");

