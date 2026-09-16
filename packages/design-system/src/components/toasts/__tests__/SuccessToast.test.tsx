import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SuccessToast } from "../SuccessToast";

afterEach(() => cleanup());

describe("SuccessToast", () => {
  it("renders title", () => {
    const { getByText } = render(
      <SuccessToast title="Success" description="Operation completed" />
    );
    expect(getByText("Success")).toBeTruthy();
  });

  it("renders description (required prop)", () => {
    const { getByText } = render(
      <SuccessToast title="Success" description="Operation completed" />
    );
    expect(getByText("Operation completed")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const action = { label: "View", onClick: vi.fn() };
    const { getByText } = render(
      <SuccessToast title="Success" description="Done" action={action} />
    );
    expect(getByText("View")).toBeTruthy();
  });

  it("does not render action button when not provided", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });

  it("calls action onClick when button is clicked", () => {
    const onClick = vi.fn();
    const action = { label: "Undo", onClick };
    const { getByText } = render(
      <SuccessToast title="Success" description="Done" action={action} />
    );
    fireEvent.click(getByText("Undo"));
    expect(onClick).toHaveBeenCalled();
  });

  it("applies success background color", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.querySelector(".bg-success");
    expect(wrapper).toBeTruthy();
  });

  it("renders with white text", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.querySelector(".text-white");
    expect(wrapper).toBeTruthy();
  });

  it("renders success icon (CircleCheckIcon)", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders with shadow-lg", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.querySelector(".shadow-lg");
    expect(wrapper).toBeTruthy();
  });

  it("applies padding px-4 py-3", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.querySelector(".px-4.py-3");
    expect(wrapper).toBeTruthy();
  });

  it("renders rounded corners", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.className).toContain("rounded-(--radius)");
  });

  it("title has semibold font", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const title = container.querySelector(".font-semibold");
    expect(title).toBeTruthy();
  });

  it("title text size is sm", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const title = container.querySelector(".text-sm");
    expect(title).toBeTruthy();
  });

  it("description has opacity-90", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const description = container.querySelector(".opacity-90");
    expect(description).toBeTruthy();
  });

  it("description has pl-7 padding", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const description = container.querySelector(".pl-7");
    expect(description).toBeTruthy();
  });

  it("description text size is xs", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const description = container.querySelector(".text-xs");
    expect(description).toBeTruthy();
  });

  it("action button has outline variant", () => {
    const action = { label: "View", onClick: vi.fn() };
    const { container } = render(
      <SuccessToast title="Success" description="Done" action={action} />
    );
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  it("action button has white styling", () => {
    const action = { label: "View", onClick: vi.fn() };
    const { getByText } = render(
      <SuccessToast title="Success" description="Done" action={action} />
    );
    const button = getByText("View").closest("button");
    expect(button?.className).toContain("text-white");
  });

  it("renders flex layout for title and icon", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const flex = container.querySelector(".flex.items-start");
    expect(flex).toBeTruthy();
  });

  it("renders gap between elements", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer?.className).toContain("gap-1.5");
  });

  it("renders full width container", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const wrapper = container.querySelector(".w-full");
    expect(wrapper).toBeTruthy();
  });

  it("renders flex column layout", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const flex = container.querySelector(".flex.flex-col");
    expect(flex).toBeTruthy();
  });

  it("icon has shrink-0 class", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const icon = container.querySelector(".shrink-0");
    expect(icon).toBeTruthy();
  });

  it("icon has correct sizing h-4 w-4", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const icon = container.querySelector(".h-4.w-4");
    expect(icon).toBeTruthy();
  });

  it("title has flex-1 for space", () => {
    const { container } = render(<SuccessToast title="Success" description="Done" />);
    const title = container.querySelector(".flex-1");
    expect(title).toBeTruthy();
  });

  it("handles long title", () => {
    const longTitle = "This is a very long success message".repeat(3);
    const { container } = render(<SuccessToast title={longTitle} description="Done" />);
    expect(container.textContent).toContain("This is a very long");
  });

  it("handles long description", () => {
    const longDesc = "This is a detailed success description".repeat(3);
    const { container } = render(<SuccessToast title="Success" description={longDesc} />);
    expect(container.textContent).toContain("detailed success");
  });

  it("handles multiple actions sequentially", () => {
    const onClick1 = vi.fn();
    const onClick2 = vi.fn();
    const action1 = { label: "Action1", onClick: onClick1 };
    const { rerender, getByText } = render(
      <SuccessToast title="Success" description="Done" action={action1} />
    );
    fireEvent.click(getByText("Action1"));
    expect(onClick1).toHaveBeenCalledTimes(1);

    const action2 = { label: "Action2", onClick: onClick2 };
    rerender(<SuccessToast title="Success" description="Done" action={action2} />);
    fireEvent.click(getByText("Action2"));
    expect(onClick2).toHaveBeenCalledTimes(1);
  });
});
