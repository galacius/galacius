import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { FullTextSearchInput } from "../FullTextSearchInput";

afterEach(() => cleanup());

describe("FullTextSearchInput", () => {
  it("renders search icon", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
  });

  it("renders input element", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
  });

  it("renders output element for match count", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={2}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output).toBeTruthy();
  });

  it("displays match count correctly", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={2}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.textContent).toBe("3/5");
  });

  it("displays empty output when no search term", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.textContent).toBe("");
  });

  it("displays 0 when no matches found", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="xyz"
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.textContent).toBe("0");
  });

  it("calls onSearch when input value changes", () => {
    const onSearch = vi.fn();
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={onSearch}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    expect(onSearch).toHaveBeenCalledWith("test");
  });

  it("calls onSearchNext when Enter key is pressed", () => {
    const onSearchNext = vi.fn();
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={onSearchNext}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSearchNext).toHaveBeenCalled();
  });

  it("does not trigger onSearchNext on other keys", () => {
    const onSearchNext = vi.fn();
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={onSearchNext}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "a" });
    expect(onSearchNext).not.toHaveBeenCalled();
  });

  it("input has correct placeholder", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.placeholder).toBe("Search…");
  });

  it("input has correct value prop", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="mytext"
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.value).toBe("mytext");
  });

  it("applies text-xs to input", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector(".text-xs");
    expect(input).toBeTruthy();
  });

  it("applies h-6 to input", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector(".h-6");
    expect(input).toBeTruthy();
  });

  it("applies w-44 to input", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector(".w-44");
    expect(input).toBeTruthy();
  });

  it("icon is positioned absolute left", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("absolute");
    expect(icon?.getAttribute("class")).toContain("left-1.5");
  });

  it("output is positioned absolute right", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.className).toContain("absolute");
    expect(output?.className).toContain("right-1.5");
  });

  it("output has aria-live polite", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.getAttribute("aria-live")).toBe("polite");
  });

  it("uses default aria label", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-label")).toBe("Search");
  });

  it("accepts custom aria label", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
        ariaLabel="Custom Search"
      />
    );
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-label")).toBe("Custom Search");
  });

  it("displays correct match index (1-based)", () => {
    const { container: c1 } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    expect(c1.querySelector("output")?.textContent).toBe("1/5");

    const { container: c2 } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={4}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    expect(c2.querySelector("output")?.textContent).toBe("5/5");
  });

  it("handles large match counts", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm="a"
        matchCount={1000}
        currentMatchIdx={500}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const output = container.querySelector("output");
    expect(output?.textContent).toBe("501/1000");
  });

  it("Enter key preventDefault is called", () => {
    const onSearchNext = vi.fn();
    const { container } = render(
      <FullTextSearchInput
        searchTerm="test"
        matchCount={5}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={onSearchNext}
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    fireEvent(input, event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("renders with proper relative positioning", () => {
    const { container } = render(
      <FullTextSearchInput
        searchTerm=""
        matchCount={0}
        currentMatchIdx={0}
        onSearch={vi.fn()}
        onSearchNext={vi.fn()}
      />
    );
    const wrapper = container.querySelector(".relative");
    expect(wrapper).toBeTruthy();
  });
});
