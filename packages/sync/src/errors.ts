/**
 * Typed failure modes for the nightly sync (issue #6), so run.ts can print the right
 * remedy per cause — a 401 (rotated x-api-key) needs a different message than a network
 * blip or a tripwire trip, and none of them should ever be confused with each other.
 */
export type SyncErrorCode = "auth" | "network" | "validation" | "tripwire";

export class SyncError extends Error {
  readonly code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
  }
}
