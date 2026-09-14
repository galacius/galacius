import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Divider } from "../Divider";

afterEach(() => cleanup());

describe("Divider", () => {
  it("renders as an hr element", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr).toBeTruthy();
  });

  it("applies default border styling", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("border-border");
  });

  it("applies w-full class", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("w-full");
  });

  it("accepts custom className", () => {
    const { container } = render(<Divider className="my-4" />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("my-4");
  });

  it("merges custom className with default classes", () => {
    const { container } = render(<Divider className="my-8 opacity-50" />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("border-border");
    expect(hr?.className).toContain("w-full");
    expect(hr?.className).toContain("my-8");
    expect(hr?.className).toContain("opacity-50");
  });

  it("renders without children", () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector("hr");
    expect(hr?.childNodes.length).toBe(0);
  });

  it("handles empty custom className", () => {
    const { container } = render(<Divider className="" />);
    const hr = container.querySelector("hr");
    expect(hr?.className).toContain("border-border");
  });

  it("renders multiple dividers independently", () => {
    const { container } = render(
      <>
        <Divider />
        <Divider className="my-4" />
        <Divider className="opacity-25" />
      </>
    );
    const hrs = container.querySelectorAll("hr");
    expect(hrs.length).toBe(3);
  });
});
