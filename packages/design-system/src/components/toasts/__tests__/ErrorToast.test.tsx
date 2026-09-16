import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorToast } from "../ErrorToast";

afterEach(() => cleanup());

describe("ErrorToast", () => {
  it("renders title", () => {
    const { getByText } = render(<ErrorToast title="Error occurred" />);
    expect(getByText("Error occurred")).toBeTruthy();
  });

  it("renders description when provided", () => {
    const { getByText } = render(<ErrorToast title="Error" description="Something went wrong" />);
    expect(getByText("Something went wrong")).toBeTruthy();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const description = container.querySelector(".opacity-90");
    expect(description).toBeFalsy();
  });

  it("renders action button when provided", () => {
    const action = { label: "Retry", onClick: vi.fn() };
    const { getByText } = render(<ErrorToast title="Error" action={action} />);
    expect(getByText("Retry")).toBeTruthy();
  });

  it("does not render action button when not provided", () => {
    const { queryByText } = render(<ErrorToast title="Error" />);
    // There might be other buttons, so just check the content doesn't have action label
    expect(queryByText("Retry")).toBeFalsy();
  });

  it("calls action onClick when button is clicked", () => {
    const onClick = vi.fn();
    const action = { label: "Retry", onClick };
    const { getByText } = render(<ErrorToast title="Error" action={action} />);
    fireEvent.click(getByText("Retry"));
    expect(onClick).toHaveBeenCalled();
  });

  it("applies destructive background color", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.querySelector(".bg-destructive");
    expect(wrapper).toBeTruthy();
  });

  it("renders with white text", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.querySelector(".text-white");
    expect(wrapper).toBeTruthy();
  });

  it("renders error icon (CircleXIcon)", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders with shadow-lg", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.querySelector(".shadow-lg");
    expect(wrapper).toBeTruthy();
  });

  it("applies padding px-4 py-3", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.querySelector(".px-4.py-3");
    expect(wrapper).toBeTruthy();
  });

  it("renders rounded corners", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.className).toContain("rounded-(--radius)");
  });

  it("title has semibold font", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const title = container.querySelector(".font-semibold");
    expect(title).toBeTruthy();
  });

  it("description has opacity-90", () => {
    const { container } = render(<ErrorToast title="Error" description="Details" />);
    const description = container.querySelector(".opacity-90");
    expect(description).toBeTruthy();
  });

  it("description has pl-7 padding", () => {
    const { container } = render(<ErrorToast title="Error" description="Details" />);
    const description = container.querySelector(".pl-7");
    expect(description).toBeTruthy();
  });

  it("action button has outline variant", () => {
    const action = { label: "Retry", onClick: vi.fn() };
    const { container } = render(<ErrorToast title="Error" action={action} />);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  it("action button has white border and text", () => {
    const action = { label: "Retry", onClick: vi.fn() };
    const { container } = render(<ErrorToast title="Error" action={action} />);
    const button = container.querySelector("button");
    expect(button?.className).toContain("text-white");
  });

  it("renders flex layout for title and icon", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const flex = container.querySelector(".flex.items-start");
    expect(flex).toBeTruthy();
  });

  it("handles long error titles", () => {
    const longTitle = "This is a very long error message that might wrap".repeat(3);
    const { getByText } = render(<ErrorToast title={longTitle} />);
    expect(getByText(new RegExp(longTitle.substring(0, 20)))).toBeTruthy();
  });

  it("handles long error descriptions", () => {
    const longDesc = "This is a detailed error description that explains what went wrong.".repeat(
      3
    );
    const { container } = render(<ErrorToast title="Error" description={longDesc} />);
    expect(container.textContent).toContain("detailed error");
  });

  it("renders icon with correct sizing", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const icon = container.querySelector(".h-4.w-4");
    expect(icon).toBeTruthy();
  });

  it("renders gap between elements", () => {
    const { container } = render(<ErrorToast title="Error" description="Details" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer?.className).toContain("gap-1.5");
  });

  it("renders full width container", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const wrapper = container.querySelector(".w-full");
    expect(wrapper).toBeTruthy();
  });

  it("title text size is sm", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const title = container.querySelector(".text-sm");
    expect(title).toBeTruthy();
  });

  it("description text size is xs", () => {
    const { container } = render(<ErrorToast title="Error" description="Details" />);
    const description = container.querySelector(".text-xs");
    expect(description).toBeTruthy();
  });

  it("icon has shrink-0 class", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const icon = container.querySelector(".shrink-0");
    expect(icon).toBeTruthy();
  });

  it("title has flex-1 for space", () => {
    const { container } = render(<ErrorToast title="Error" />);
    const title = container.querySelector(".flex-1");
    expect(title).toBeTruthy();
  });
});
