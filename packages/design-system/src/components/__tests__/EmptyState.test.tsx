import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { EmptyState } from "../EmptyState";

afterEach(() => cleanup());

describe("EmptyState", () => {
  it("renders icon, title, and description", () => {
    const { getByText } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" description="No resources found." />
    );
    expect(getByText("No resources")).toBeTruthy();
    expect(getByText("No resources found.")).toBeTruthy();
  });

  it("renders without description when not provided", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="No resources" />);
    expect(container.textContent).toContain("No resources");
    const captions = container.querySelectorAll(".text-caption");
    expect(captions.length).toBe(0);
  });

  it("renders with action when provided", () => {
    const { getByText } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" action={<button>Create</button>} />
    );
    expect(getByText("Create")).toBeTruthy();
  });

  it("does not render action when not provided", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="No resources" />);
    const actionDiv = container.querySelector(".mt-2");
    expect(actionDiv).toBeFalsy();
  });

  it("renders icon in correct position", () => {
    const { container } = render(
      <EmptyState icon={<div className="test-icon">📋</div>} title="No resources" />
    );
    const iconDiv = container.querySelector(".test-icon");
    expect(iconDiv).toBeTruthy();
  });

  it("applies correct layout classes", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="No resources" />);
    const outer = container.querySelector(".flex.flex-col.items-center");
    expect(outer).toBeTruthy();
  });

  it("applies correct spacing classes", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="No resources" />);
    const outer = container.querySelector(".gap-2.py-12");
    expect(outer).toBeTruthy();
  });

  it("applies h3 typography to title", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="No resources" />);
    const title = container.querySelector(".text-h3");
    expect(title).toBeTruthy();
  });

  it("applies caption typography to description", () => {
    const { container } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" description="No resources found." />
    );
    const description = container.querySelector(".text-caption");
    expect(description).toBeTruthy();
  });

  it("applies muted-foreground color to icon and description", () => {
    const { container } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" description="No resources found." />
    );
    const muteElements = container.querySelectorAll(".text-muted-foreground");
    expect(muteElements.length).toBeGreaterThan(0);
  });

  it("wraps action in mt-2 container", () => {
    const { container } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" action={<button>Create</button>} />
    );
    const actionContainer = container.querySelector(".mt-2");
    expect(actionContainer).toBeTruthy();
  });

  it("renders ReactNode icon types", () => {
    const customIcon = (
      <svg>
        <circle r="10" />
      </svg>
    );
    const { container } = render(<EmptyState icon={customIcon} title="No resources" />);
    const circle = container.querySelector("circle");
    expect(circle).toBeTruthy();
  });

  it("handles empty title gracefully", () => {
    const { container } = render(<EmptyState icon={<div>📋</div>} title="" />);
    const title = container.querySelector(".text-h3");
    expect(title?.textContent).toBe("");
  });

  it("handles empty description gracefully", () => {
    const { container } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" description="" />
    );
    // Empty string description does not render caption
    expect(container.querySelector(".text-caption")).toBeFalsy();
  });

  it("handles complex action elements", () => {
    const action = (
      <div>
        <button>CreateBtn</button>
        <button>ImportBtn</button>
      </div>
    );
    const { container } = render(
      <EmptyState icon={<div>📋</div>} title="No resources" action={action} />
    );
    expect(container.textContent).toContain("CreateBtn");
    expect(container.textContent).toContain("ImportBtn");
  });

  it("renders all props together correctly", () => {
    const { container } = render(
      <EmptyState
        icon={<div>📋</div>}
        title="No resources"
        description="Create one to get started"
        action={<button>Create Resource</button>}
      />
    );
    expect(container.textContent).toContain("No resources");
    expect(container.textContent).toContain("Create one to get started");
    expect(container.textContent).toContain("Create Resource");
    expect(container.querySelector(".flex.flex-col")).toBeTruthy();
  });
});
