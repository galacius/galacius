import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TimezoneSelect } from "../TimezoneSelect";

afterEach(() => cleanup());

function selectOption(option: Element) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

describe("TimezoneSelect", () => {
  it("renders trigger button with current value", () => {
    const { getByText } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    expect(getByText("America/New_York")).toBeTruthy();
  });

  it("renders chevron down icon", () => {
    const { container } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
  });

  it("opens dropdown when button is clicked", async () => {
    const { getByRole, queryByRole } = render(
      <TimezoneSelect value="America/New_York" onChange={vi.fn()} />
    );
    const button = getByRole("combobox");
    fireEvent.click(button);
    await waitFor(() => {
      const listbox = queryByRole("listbox");
      expect(listbox).toBeTruthy();
    });
  });

  it("renders search input when dropdown is open", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));
    await waitFor(() => {
      const searchInput = document.querySelector("input[placeholder*='Search']");
      expect(searchInput).toBeTruthy();
    });
  });

  it("filters timezones based on search input", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const searchInput = document.querySelector(
        "input[placeholder*='Search']"
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "New_York" } });
    });

    await waitFor(() => {
      const option = document.querySelector("[role='option']");
      expect(option?.textContent).toContain("New_York");
    });
  });

  it("shows no results message when search has no matches", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const searchInput = document.querySelector(
        "input[placeholder*='Search']"
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "XXXYYYZZZ" } });
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("No timezone found");
    });
  });

  it("calls onChange when timezone is selected", async () => {
    const onChange = vi.fn();
    const { getByRole, queryAllByRole } = render(
      <TimezoneSelect value="America/New_York" onChange={onChange} />
    );
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const options = queryAllByRole("option");
      if (options.length > 0) {
        selectOption(options[0]);
      }
    });

    expect(onChange).toHaveBeenCalled();
  });

  it("closes dropdown after selection", async () => {
    const { getByRole, queryByRole, queryAllByRole } = render(
      <TimezoneSelect value="America/New_York" onChange={vi.fn()} />
    );
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const options = queryAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
      selectOption(options[0]);
    });

    await waitFor(() => {
      expect(queryByRole("listbox")).toBeFalsy();
    });
  });

  it("marks current value as selected with CheckIcon", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const selected = document.querySelector('[aria-selected="true"]');
      expect(selected).toBeTruthy();
    });
  });

  it("accepts aria-labelledby prop", () => {
    const { container } = render(
      <TimezoneSelect value="America/New_York" onChange={vi.fn()} aria-labelledby="tz-label" />
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-labelledby")).toBe("tz-label");
  });

  it("sets aria-haspopup on trigger button", () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    const button = getByRole("combobox");
    expect(button.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("sets aria-expanded to true when open", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    const button = getByRole("combobox");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("handles keyboard selection with Enter key", async () => {
    const onChange = vi.fn();
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={onChange} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const option = document.querySelector("[role='option']") as HTMLElement;
      fireEvent.keyDown(option, { key: "Enter" });
    });

    expect(onChange).toHaveBeenCalled();
  });

  it("handles keyboard selection with Space key", async () => {
    const onChange = vi.fn();
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={onChange} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const option = document.querySelector("[role='option']") as HTMLElement;
      fireEvent.keyDown(option, { key: " " });
    });

    expect(onChange).toHaveBeenCalled();
  });

  it("closes dropdown when clicking outside", async () => {
    const { getByRole, queryByRole } = render(
      <>
        <TimezoneSelect value="America/New_York" onChange={vi.fn()} />
        <div data-testid="outside">Outside</div>
      </>
    );

    fireEvent.click(getByRole("combobox"));
    await waitFor(() => {
      expect(queryByRole("listbox")).toBeTruthy();
    });

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(queryByRole("listbox")).toBeFalsy();
    });
  });

  it("handles empty search correctly", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const searchInput = document.querySelector(
        "input[placeholder*='Search']"
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "" } });
    });

    await waitFor(() => {
      const options = document.querySelectorAll("[role='option']");
      expect(options.length).toBeGreaterThan(0);
    });
  });

  it("case-insensitive search", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const searchInput = document.querySelector(
        "input[placeholder*='Search']"
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "america" } });
    });

    await waitFor(() => {
      const option = document.querySelector("[role='option']");
      expect(option?.textContent).toContain("America");
    });
  });

  it("renders list with proper scrolling container", async () => {
    const { getByRole } = render(<TimezoneSelect value="America/New_York" onChange={vi.fn()} />);
    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const content = document.querySelector("[data-slot='select-content']");
      expect(content?.className).toContain("max-h-72");
      expect(content?.className).toContain("overflow-y-auto");
    });
  });

  it("updates when value prop changes", () => {
    const { rerender, getByText } = render(
      <TimezoneSelect value="America/New_York" onChange={vi.fn()} />
    );
    expect(getByText("America/New_York")).toBeTruthy();

    rerender(<TimezoneSelect value="Europe/London" onChange={vi.fn()} />);
    expect(getByText("Europe/London")).toBeTruthy();
  });
});
