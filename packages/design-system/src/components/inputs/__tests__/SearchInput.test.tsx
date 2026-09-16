import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SearchInput } from "../SearchInput";

afterEach(() => cleanup());

describe("SearchInput", () => {
  it("renders input element", () => {
    const { container } = render(<SearchInput />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
  });

  it("renders search icon", () => {
    const { container } = render(<SearchInput />);
    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
  });

  it("applies default wrapper width of w-68", () => {
    const { container } = render(<SearchInput />);
    const wrapper = container.querySelector(".w-68");
    expect(wrapper).toBeTruthy();
  });

  it("accepts custom wrapperClassName", () => {
    const { container } = render(<SearchInput wrapperClassName="w-80" />);
    const wrapper = container.querySelector(".w-80");
    expect(wrapper).toBeTruthy();
  });

  it("applies relative positioning to wrapper", () => {
    const { container } = render(<SearchInput />);
    const wrapper = container.querySelector(".relative");
    expect(wrapper).toBeTruthy();
  });

  it("applies text-xs to input", () => {
    const { container } = render(<SearchInput />);
    const input = container.querySelector(".text-xs");
    expect(input).toBeTruthy();
  });

  it("applies pl-8 padding to input", () => {
    const { container } = render(<SearchInput />);
    const input = container.querySelector(".pl-8");
    expect(input).toBeTruthy();
  });

  it("applies text-muted-foreground to icon", () => {
    const { container } = render(<SearchInput />);
    const icon = container.querySelector(".text-muted-foreground");
    expect(icon).toBeTruthy();
  });

  it("positions icon absolutely on left", () => {
    const { container } = render(<SearchInput />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("absolute");
    expect(icon?.getAttribute("class")).toContain("left-2.5");
  });

  it("centers icon vertically", () => {
    const { container } = render(<SearchInput />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("top-1/2");
    expect(icon?.getAttribute("class")).toContain("-translate-y-1/2");
  });

  it("applies size-3.5 to icon", () => {
    const { container } = render(<SearchInput />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("size-3.5");
  });

  it("accepts custom className for input", () => {
    const { container } = render(<SearchInput className="border-2" />);
    const input = container.querySelector(".border-2");
    expect(input).toBeTruthy();
  });

  it("merges custom className with default classes", () => {
    const { container } = render(<SearchInput className="mb-4" />);
    const input = container.querySelector(".text-xs.pl-8.mb-4");
    expect(input).toBeTruthy();
  });

  it("accepts placeholder prop", () => {
    const { container } = render(<SearchInput placeholder="Search..." />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.placeholder).toBe("Search...");
  });

  it("accepts value prop", () => {
    const { container } = render(<SearchInput value="test" readOnly />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.value).toBe("test");
  });

  it("handles onChange events", () => {
    const onChange = vi.fn();
    const { container } = render(<SearchInput onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("accepts disabled prop", () => {
    const { container } = render(<SearchInput disabled />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.disabled).toBe(true);
  });

  it("accepts aria-label for accessibility", () => {
    const { container } = render(<SearchInput aria-label="Search resources" />);
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-label")).toBe("Search resources");
  });

  it("renders without custom wrapperClassName using default", () => {
    const { container } = render(<SearchInput />);
    const wrapper = container.querySelector(".relative.w-68");
    expect(wrapper).toBeTruthy();
  });

  it("handles multiple instances independently", () => {
    const { container } = render(
      <>
        <SearchInput />
        <SearchInput wrapperClassName="w-80" />
      </>
    );
    const widths = container.querySelectorAll(".w-68, .w-80");
    expect(widths.length).toBeGreaterThanOrEqual(1);
  });

  it("maintains input functionality with custom className", () => {
    const onChange = vi.fn();
    const { container } = render(<SearchInput onChange={onChange} className="rounded-lg" />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "query" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders with type='text' by default", () => {
    const { container } = render(<SearchInput />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.type).toBe("text");
  });

  it("accepts type prop override", () => {
    const { container } = render(<SearchInput type="search" />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.type).toBe("search");
  });

  it("handles focus events", () => {
    const onFocus = vi.fn();
    const { container } = render(<SearchInput onFocus={onFocus} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    expect(onFocus).toHaveBeenCalled();
  });

  it("handles blur events", () => {
    const onBlur = vi.fn();
    const { container } = render(<SearchInput onBlur={onBlur} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });
});
