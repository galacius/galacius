import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventTypeBadge } from "../EventTypeBadge";

afterEach(() => {
  cleanup();
});

describe("EventTypeBadge", () => {
  it('renders a badge with text "Normal" with success variant', () => {
    render(<EventTypeBadge type="Normal" />);

    const badge = screen.getByText("Normal");
    expect(badge).toBeInTheDocument();
  });

  it('renders a badge with text "Warning" with warning variant', () => {
    render(<EventTypeBadge type="Warning" />);

    const badge = screen.getByText("Warning");
    expect(badge).toBeInTheDocument();
  });

  it('renders a "—" span when type is an empty string', () => {
    render(<EventTypeBadge type="" />);

    const dash = screen.getByText("—");
    expect(dash).toBeInTheDocument();
    expect(dash.tagName).toBe("SPAN");
  });

  it('renders a badge with text "Unknown" when type is an unrecognised value', () => {
    render(<EventTypeBadge type="Unknown" />);

    const badge = screen.getByText("Unknown");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/muted/);
  });
});
