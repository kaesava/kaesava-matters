import { createPiiSafeLogger } from "@kaesava/types";
export type { LogLevel } from "@kaesava/types";

export const logger = createPiiSafeLogger(() => process.env.NODE_ENV !== "production");
