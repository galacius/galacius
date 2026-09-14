/**
 * Format an ISO 8601 datetime string as relative time with full timestamp.
 * Returns a combined string like "4m33s ago (2026-07-12T17:15:18+07:00)".
 *
 * Time formatting rules:
 * - < 1 minute: "45s ago"
 * - 1 min to < 1 hour: "4m33s ago" if seconds > 0, else "5m ago"
 * - 1 hour to < 1 day: "2h15m ago" if minutes > 0, else "3h ago"
 * - >= 1 day: "33d ago" (days only)
 *
 * @param isoString - ISO 8601 datetime string (e.g., "2026-07-12T17:15:18+07:00")
 * @returns Formatted relative time with full timestamp, or empty string if input is invalid
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString || typeof isoString !== "string") {
    return "";
  }

  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // If time is in the future or very close, return empty
    if (diffMs < 0) {
      return "";
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relativeStr: string;

    if (diffSeconds < 60) {
      relativeStr = `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      const seconds = diffSeconds % 60;
      if (seconds > 0) {
        relativeStr = `${diffMinutes}m${seconds}s ago`;
      } else {
        relativeStr = `${diffMinutes}m ago`;
      }
    } else if (diffHours < 24) {
      const minutes = diffMinutes % 60;
      if (minutes > 0) {
        relativeStr = `${diffHours}h${minutes}m ago`;
      } else {
        relativeStr = `${diffHours}h ago`;
      }
    } else {
      relativeStr = `${diffDays}d ago`;
    }

    return `${relativeStr} (${isoString})`;
  } catch {
    return "";
  }
}

export function formatTs(unix: number): string {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
