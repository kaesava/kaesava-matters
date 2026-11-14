/**
 * Web Application Structured Logger
 * Instantiates universal PII-safe logger from @money-matters/types.
 */
import { createPiiSafeLogger } from "@money-matters/types";
export type { LogLevel } from "@money-matters/types";

export const logger = createPiiSafeLogger(() => process.env.NODE_ENV !== "production");
