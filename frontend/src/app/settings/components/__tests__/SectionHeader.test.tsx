import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SectionHeader } from "../SectionHeader";

afterEach(() => {
  cleanup();
});

describe("SectionHeader", () => {
  it("renders the title", () => {
    render(<SectionHeader title="Variables" />);
    expect(screen.getByText("Variables")).toBeInTheDocument();
  });

  it("renders as a heading", () => {
    render(<SectionHeader title="Kubernetes" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Kubernetes");
  });

  it("does not render a save button (button moved to content components)", () => {
    render(<SectionHeader title="Variables" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
