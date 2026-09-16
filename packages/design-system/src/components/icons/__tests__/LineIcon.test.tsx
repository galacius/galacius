import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { LineIcon } from "../LineIcon";

afterEach(() => cleanup());

describe("LineIcon", () => {
  it("renders error icon when isError is true", () => {
    const { container } = render(<LineIcon isError={true} isSpinning={false} />);
    const icon = container.querySelector(".text-destructive");
    expect(icon).toBeTruthy();
  });

  it("renders spinner icon when isSpinning is true", () => {
    const { container } = render(<LineIcon isError={false} isSpinning={true} />);
    const icon = container.querySelector(".animate-spin");
    expect(icon).toBeTruthy();
  });

  it("renders success icon when both isError and isSpinning are false", () => {
    const { container } = render(<LineIcon isError={false} isSpinning={false} />);
    const icon = container.querySelector(".text-success");
    expect(icon).toBeTruthy();
  });

  it("renders error icon even when isSpinning is also true (error takes precedence)", () => {
    const { container } = render(<LineIcon isError={true} isSpinning={true} />);
    const icon = container.querySelector(".text-destructive");
    expect(icon).toBeTruthy();
  });

  it("applies text-destructive color to error icon", () => {
    const { container } = render(<LineIcon isError={true} isSpinning={false} />);
    const icon = container.querySelector(".text-destructive");
    expect(icon).toBeTruthy();
  });

  it("applies text-info color to spinner icon", () => {
    const { container } = render(<LineIcon isError={false} isSpinning={true} />);
    const icon = container.querySelector(".text-info");
    expect(icon).toBeTruthy();
  });

  it("applies text-success color to success icon", () => {
    const { container } = render(<LineIcon isError={false} isSpinning={false} />);
    const icon = container.querySelector(".text-success");
    expect(icon).toBeTruthy();
  });

  it("applies mt-0.5 top margin to all icons", () => {
    const { container: container1 } = render(<LineIcon isError={true} isSpinning={false} />);
    expect(container1.querySelector("svg")?.getAttribute("class")).toContain("mt-0.5");

    const { container: container2 } = render(<LineIcon isError={false} isSpinning={true} />);
    expect(container2.querySelector("svg")?.getAttribute("class")).toContain("mt-0.5");

    const { container: container3 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container3.querySelector("svg")?.getAttribute("class")).toContain("mt-0.5");
  });

  it("applies h-3.5 w-3.5 sizing to all icons", () => {
    const { container: container1 } = render(<LineIcon isError={true} isSpinning={false} />);
    expect(container1.querySelector("svg")?.getAttribute("class")).toContain("h-3.5");
    expect(container1.querySelector("svg")?.getAttribute("class")).toContain("w-3.5");

    const { container: container2 } = render(<LineIcon isError={false} isSpinning={true} />);
    expect(container2.querySelector("svg")?.getAttribute("class")).toContain("h-3.5");
    expect(container2.querySelector("svg")?.getAttribute("class")).toContain("w-3.5");

    const { container: container3 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container3.querySelector("svg")?.getAttribute("class")).toContain("h-3.5");
    expect(container3.querySelector("svg")?.getAttribute("class")).toContain("w-3.5");
  });

  it("applies shrink-0 to all icons", () => {
    const { container: container1 } = render(<LineIcon isError={true} isSpinning={false} />);
    expect(container1.querySelector(".shrink-0")).toBeTruthy();

    const { container: container2 } = render(<LineIcon isError={false} isSpinning={true} />);
    expect(container2.querySelector(".shrink-0")).toBeTruthy();

    const { container: container3 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container3.querySelector(".shrink-0")).toBeTruthy();
  });

  it("applies animate-spin only to spinner", () => {
    const { container: container1 } = render(<LineIcon isError={true} isSpinning={false} />);
    expect(container1.querySelector(".animate-spin")).toBeFalsy();

    const { container: container2 } = render(<LineIcon isError={false} isSpinning={true} />);
    expect(container2.querySelector(".animate-spin")).toBeTruthy();

    const { container: container3 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container3.querySelector(".animate-spin")).toBeFalsy();
  });

  it("renders svg for all icon types", () => {
    const { container: container1 } = render(<LineIcon isError={true} isSpinning={false} />);
    expect(container1.querySelector("svg")).toBeTruthy();

    const { container: container2 } = render(<LineIcon isError={false} isSpinning={true} />);
    expect(container2.querySelector("svg")).toBeTruthy();

    const { container: container3 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container3.querySelector("svg")).toBeTruthy();
  });

  it("transitions between states correctly", () => {
    const { rerender, container } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(container.querySelector(".text-success")).toBeTruthy();

    rerender(<LineIcon isError={false} isSpinning={true} />);
    expect(container.querySelector(".text-info")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeTruthy();

    rerender(<LineIcon isError={true} isSpinning={false} />);
    expect(container.querySelector(".text-destructive")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeFalsy();
  });

  it("handles boolean edge cases", () => {
    // Both false
    const { container: c1 } = render(<LineIcon isError={false} isSpinning={false} />);
    expect(c1.querySelector(".text-success")).toBeTruthy();

    // Both true
    const { container: c2 } = render(<LineIcon isError={true} isSpinning={true} />);
    expect(c2.querySelector(".text-destructive")).toBeTruthy();
  });
});
