export type CapabilityErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR";

/**
 * Framework-agnostic domain error for Ring 2 capabilities.
 * Mapped to TRPCError in `./router` or `apps/api` so Ring 2 domain code never imports `@trpc/server`.
 */
export class CapabilityError extends Error {
  public readonly code: CapabilityErrorCode;

  constructor(code: CapabilityErrorCode, message: string) {
    super(message);
    this.name = "CapabilityError";
    this.code = code;
  }
}
