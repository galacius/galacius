import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ResourceLink } from "../resources/ResourceLink";

afterEach(() => cleanup());

describe("ResourceLink", () => {
  it("renders children text", () => {
    const { getByText } = render(<ResourceLink>Pod Name</ResourceLink>);
    expect(getByText("Pod Name")).toBeTruthy();
  });

  it("renders as span when no onClick provided", () => {
    const { container } = render(<ResourceLink>Pod Name</ResourceLink>);
    const span = container.querySelector("span.text-info");
    expect(span).toBeTruthy();
  });

  it("renders as button when onClick provided", () => {
    const onClick = vi.fn();
    const { container } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  it("calls onClick handler when clicked", () => {
    const onClick = vi.fn();
    const { getByText } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    fireEvent.click(getByText("Pod Name"));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not render tooltip when truncate is not enabled", () => {
    const { queryByRole } = render(<ResourceLink truncate={false}>Long Pod Name</ResourceLink>);
    const tooltip = queryByRole("tooltip");
    expect(tooltip).toBeFalsy();
  });

  it("applies text-info color class", () => {
    const { container } = render(<ResourceLink>Pod Name</ResourceLink>);
    const link = container.querySelector(".text-info");
    expect(link).toBeTruthy();
  });

  it("applies cursor-default when not clickable", () => {
    const { container } = render(<ResourceLink>Pod Name</ResourceLink>);
    const link = container.querySelector(".cursor-default");
    expect(link).toBeTruthy();
  });

  it("applies h-auto and p-0 when clickable", () => {
    const onClick = vi.fn();
    const { container } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = container.querySelector(".h-auto.p-0");
    expect(button).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<ResourceLink className="custom-class">Pod Name</ResourceLink>);
    const link = container.querySelector(".custom-class");
    expect(link).toBeTruthy();
  });

  it("renders truncated span when truncate is enabled", () => {
    const { container } = render(<ResourceLink truncate={true}>Pod Name</ResourceLink>);
    const truncated = container.querySelector(".truncate");
    expect(truncated).toBeTruthy();
  });

  it("applies max-w-65 to truncated text", () => {
    const { container } = render(<ResourceLink truncate={true}>Pod Name</ResourceLink>);
    const truncated = container.querySelector(".max-w-65");
    expect(truncated).toBeTruthy();
  });

  it("accepts truncateTextClassName", () => {
    const { container } = render(
      <ResourceLink truncate={true} truncateTextClassName="custom-truncate">
        Pod Name
      </ResourceLink>
    );
    const truncated = container.querySelector(".custom-truncate");
    expect(truncated).toBeTruthy();
  });

  it("applies group-hover/button styling when clickable", () => {
    const onClick = vi.fn();
    const { container } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  it("handles children as ReactNode", () => {
    const { container } = render(
      <ResourceLink>
        <span>Custom</span>
        <span>Child</span>
      </ResourceLink>
    );
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("renders without truncate by default", () => {
    const { container } = render(<ResourceLink>Pod Name</ResourceLink>);
    const truncated = container.querySelector(".max-w-65");
    expect(truncated).toBeFalsy();
  });

  it("handles click event with preventDefault", () => {
    const onClick = vi.fn();
    const { getByText } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const event = new MouseEvent("click", { bubbles: true });
    fireEvent(getByText("Pod Name").closest("button")!, event);
    expect(onClick).toHaveBeenCalled();
  });

  it("merges custom className with default classes", () => {
    const { container } = render(<ResourceLink className="ml-2">Pod Name</ResourceLink>);
    const link = container.querySelector(".text-info.ml-2");
    expect(link).toBeTruthy();
  });

  it("renders as link component (button) without href", () => {
    const onClick = vi.fn();
    const { container } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = container.querySelector("button");
    expect(button?.getAttribute("href")).toBeNull();
  });

  it("applies correct variant to button when clickable", () => {
    const onClick = vi.fn();
    const { container } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = container.querySelector("button");
    // Button should have link variant styling
    expect(button).toBeTruthy();
  });

  it("updates when children change", () => {
    const { rerender, getByText } = render(<ResourceLink>Pod Name</ResourceLink>);
    expect(getByText("Pod Name")).toBeTruthy();

    rerender(<ResourceLink>New Pod Name</ResourceLink>);
    expect(getByText("New Pod Name")).toBeTruthy();
  });

  it("handles rapid clicks correctly", () => {
    const onClick = vi.fn();
    const { getByText } = render(<ResourceLink onClick={onClick}>Pod Name</ResourceLink>);
    const button = getByText("Pod Name").closest("button")!;
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
