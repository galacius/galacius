/**
 * Masks CRASHED/INCOMPATIBLE terminal statuses as NOT_INSTALLED for display.
 *
 * Rationale: A CRASHED/INCOMPATIBLE status carried over from a previous session
 * should not keep presenting "Retry"/"Incompatible" UI forever — it's masked
 * as NOT_INSTALLED until the user reports an install was attempted this mount.
 * This prevents confusing lingering error UI from past sessions.
 *
 * @param rawStatus The raw plugin status from the backend
 * @param hasAttemptedInstall Whether the user attempted an install in this mount
 * @returns The display status (may be masked)
 */
export const maskTerminalStatus = (rawStatus: string, hasAttemptedInstall: boolean): string => {
  if (!hasAttemptedInstall && (rawStatus === "CRASHED" || rawStatus === "INCOMPATIBLE")) {
    return "NOT_INSTALLED";
  }
  return rawStatus;
};
