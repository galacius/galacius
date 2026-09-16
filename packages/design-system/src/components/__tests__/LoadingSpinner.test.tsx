import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { LoadingSpinner } from "../LoadingSpinner";

afterEach(() => cleanup());

describe("LoadingSpinner", () => {
  it("renders a spinner container", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".flex");
    expect(spinner).toBeTruthy();
  });

  it("renders with h-full and items-center classes", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".h-full.items-center");
    expect(spinner).toBeTruthy();
  });

  it("renders with justify-center class", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".justify-center");
    expect(spinner).toBeTruthy();
  });

  it("renders the Loader2Icon inside", () => {
    const { container } = render(<LoadingSpinner />);
    // Loader2Icon is rendered; check for svg or icon element
    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
  });

  it("applies animate-spin class to icon", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("applies muted-foreground color to icon", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".text-muted-foreground");
    expect(spinner).toBeTruthy();
  });

  it("applies size-5 to icon", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".size-5");
    expect(spinner).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<LoadingSpinner className="mb-4" />);
    const spinner = container.querySelector(".mb-4");
    expect(spinner).toBeTruthy();
  });

  it("merges custom className with default classes", () => {
    const { container } = render(<LoadingSpinner className="mb-4 opacity-50" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain("h-full");
    expect(spinner.className).toContain("items-center");
    expect(spinner.className).toContain("justify-center");
    expect(spinner.className).toContain("mb-4");
    expect(spinner.className).toContain("opacity-50");
  });

  it("renders without className prop", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".flex.h-full.items-center.justify-center");
    expect(spinner).toBeTruthy();
  });

  it("handles empty className string", () => {
    const { container } = render(<LoadingSpinner className="" />);
    const spinner = container.querySelector(".flex");
    expect(spinner).toBeTruthy();
  });

  it("renders as a div element", () => {
    const { container } = render(<LoadingSpinner />);
    const div = container.querySelector("div");
    expect(div).toBeTruthy();
  });

  it("icon inherits flex centering from parent", () => {
    const { container } = render(<LoadingSpinner />);
    const parentDiv = container.firstChild as HTMLElement;
    expect(parentDiv.className).toContain("flex");
    expect(parentDiv.className).toContain("items-center");
    expect(parentDiv.className).toContain("justify-center");
  });

  it("maintains animation during render", () => {
    const { container, rerender } = render(<LoadingSpinner />);
    let spinnerElement = container.querySelector(".animate-spin");
    expect(spinnerElement).toBeTruthy();

    rerender(<LoadingSpinner />);
    spinnerElement = container.querySelector(".animate-spin");
    expect(spinnerElement).toBeTruthy();
  });

  it("supports multiple spinners on same page", () => {
    const { container } = render(
      <>
        <LoadingSpinner className="mb-4" />
        <LoadingSpinner className="mt-4" />
      </>
    );
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(2);
  });

  it("applies custom className without breaking layout", () => {
    const { container } = render(<LoadingSpinner className="h-screen w-screen" />);
    const spinner = container.querySelector(".flex");
    expect(spinner?.className).toContain("w-screen");
    expect(spinner?.className).toContain("h-screen");
    expect(spinner?.className).toContain("flex");
  });
});
