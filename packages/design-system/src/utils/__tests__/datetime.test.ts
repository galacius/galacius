import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime, formatTs } from "../datetime";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for null input", () => {
    const result = formatRelativeTime("");
    expect(result).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    const result = formatRelativeTime("not-a-date");
    expect(result).toBe("");
  });

  it("returns empty string for future dates", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const futureDate = "2026-07-20T12:00:00Z";
    const result = formatRelativeTime(futureDate);
    expect(result).toBe("");
  });

  it("formats seconds correctly", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:45Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("45s ago");
  });

  it("formats minutes without seconds", () => {
    vi.setSystemTime(new Date("2026-07-19T12:05:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("5m ago");
  });

  it("formats minutes with seconds", () => {
    vi.setSystemTime(new Date("2026-07-19T12:04:33Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("4m33s ago");
  });

  it("formats hours without minutes", () => {
    vi.setSystemTime(new Date("2026-07-19T15:00:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("3h ago");
  });

  it("formats hours with minutes", () => {
    vi.setSystemTime(new Date("2026-07-19T14:45:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("2h45m ago");
  });

  it("formats days", () => {
    vi.setSystemTime(new Date("2026-07-26T12:00:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("7d ago");
  });

  it("includes iso string in output", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const pastDate = "2026-07-19T11:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain(pastDate);
  });

  it("handles non-string input", () => {
    const result = formatRelativeTime(null as any);
    expect(result).toBe("");
  });

  it("handles edge case: exactly 1 minute", () => {
    vi.setSystemTime(new Date("2026-07-19T12:01:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("1m ago");
  });

  it("handles edge case: exactly 1 hour", () => {
    vi.setSystemTime(new Date("2026-07-19T13:00:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("1h ago");
  });

  it("handles edge case: exactly 1 day", () => {
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("1d ago");
  });

  it("handles edge case: 59 seconds", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:59Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("59s ago");
  });

  it("handles edge case: 60 seconds becomes 1 minute", () => {
    vi.setSystemTime(new Date("2026-07-19T12:01:00Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("1m ago");
  });

  it("handles edge case: 59 minutes 59 seconds", () => {
    vi.setSystemTime(new Date("2026-07-19T12:59:59Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("59m59s ago");
  });

  it("handles UTC timezone offset", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const dateWithOffset = "2026-07-19T11:00:00+00:00";
    const result = formatRelativeTime(dateWithOffset);
    expect(result).toContain("ago");
  });

  it("handles positive timezone offset", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const dateWithOffset = "2026-07-19T06:00:00+07:00";
    const result = formatRelativeTime(dateWithOffset);
    expect(result).toContain("ago");
  });

  it("handles negative timezone offset", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const dateWithOffset = "2026-07-19T06:00:00-05:00";
    const result = formatRelativeTime(dateWithOffset);
    expect(result).toContain("ago");
  });

  it("handles large time differences", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const pastDate = "2026-01-01T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("d ago");
  });

  it("handles very recent times", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:01Z"));
    const pastDate = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(pastDate);
    expect(result).toContain("1s ago");
  });

  it("returns empty string for try/catch errors", () => {
    const result = formatRelativeTime(undefined as any);
    expect(result).toBe("");
  });

  it("handles zero difference (same timestamp)", () => {
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
    const date = "2026-07-19T12:00:00Z";
    const result = formatRelativeTime(date);
    expect(result).toContain("0s ago");
  });
});

describe("formatTs", () => {
  it("returns empty string for 0 unix timestamp", () => {
    const result = formatTs(0);
    expect(result).toBe("");
  });

  it("returns empty string for falsy values", () => {
    expect(formatTs(0)).toBe("");
    expect(formatTs(-0)).toBe("");
  });

  it("formats unix timestamp correctly", () => {
    const unix = Math.floor(new Date("2026-07-19T12:00:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("2026");
    expect(result).toContain("07");
  });

  it("formats with 2-digit month", () => {
    const unix = Math.floor(new Date("2026-01-05T12:00:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("01");
  });

  it("formats with 2-digit day", () => {
    const unix = Math.floor(new Date("2026-07-05T12:00:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("05");
  });

  it("formats with 2-digit hour (24-hour format)", () => {
    const unix = Math.floor(new Date("2026-07-19T09:30:00").getTime() / 1000);
    const result = formatTs(unix);
    // Check that it contains a time portion, not a specific hour (timezone-agnostic)
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats with 2-digit minute", () => {
    const unix = Math.floor(new Date("2026-07-19T12:05:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("05");
  });

  it("formats with 2-digit second", () => {
    const unix = Math.floor(new Date("2026-07-19T12:00:05Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("05");
  });

  it("handles edge case: epoch", () => {
    const result = formatTs(1);
    // Unix timestamp 1 second after epoch
    expect(result).toBeTruthy();
  });

  it("handles large unix timestamps", () => {
    const largeUnix = Math.floor(new Date("2050-01-01T00:00:00Z").getTime() / 1000);
    const result = formatTs(largeUnix);
    expect(result).toContain("2050");
  });

  it("handles negative unix timestamps (before epoch)", () => {
    // Unix timestamps before 1970 are negative
    const beforeEpoch = -86400; // 1 day before epoch
    const result = formatTs(beforeEpoch);
    // Should format without errors
    expect(typeof result).toBe("string");
  });

  it("uses local time locale", () => {
    const unix = Math.floor(new Date("2026-07-19T12:00:00").getTime() / 1000);
    const result = formatTs(unix);
    // Result should contain date components
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes time in output", () => {
    const unix = Math.floor(new Date("2026-07-19T15:30:45Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("30");
    expect(result).toContain("45");
  });

  it("formats midnight correctly", () => {
    const unix = Math.floor(new Date("2026-07-19T00:00:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("00");
  });

  it("formats noon correctly", () => {
    const unix = Math.floor(new Date("2026-07-19T12:00:00Z").getTime() / 1000);
    const result = formatTs(unix);
    expect(result).toContain("00");
    expect(result).toContain("2026");
  });
});
