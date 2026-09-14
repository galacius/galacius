import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/menu", () => {
  const Item = ({
    children,
    onClick,
    className,
    ref,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} role="menuitem" tabIndex={-1} className={className} onClick={onClick} {...rest}>
      {children}
    </div>
  );
  Item.displayName = "MockMenuItem";

  return {
    Menu: {
      Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Popup: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
      ),
      Item,
      Group: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      GroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Separator: () => <hr />,
      CheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      RadioGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      RadioItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      SubmenuRoot: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      SubmenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  };
});

// ─── imports after mocks ──────────────────────────────────────────────────────

import { DropdownMenuItem } from "../dropdown-menu";

// ─── tests ───────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("DropdownMenuItem", () => {
  it("forwards onClick to the underlying item element", () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<DropdownMenuItem onClick={handleClick}>Delete</DropdownMenuItem>);

    fireEvent.click(getByRole("menuitem"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies cursor-pointer class when onClick is provided", () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<DropdownMenuItem onClick={handleClick}>Action</DropdownMenuItem>);

    expect(getByRole("menuitem")).toHaveClass("cursor-pointer");
  });

  it("does not apply cursor-pointer class when onClick is absent", () => {
    const { getByRole } = render(<DropdownMenuItem>Label</DropdownMenuItem>);

    expect(getByRole("menuitem")).not.toHaveClass("cursor-pointer");
  });

  it("invokes the correct handler when multiple items are rendered", () => {
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const { getAllByRole } = render(
      <>
        <DropdownMenuItem onClick={onFirst}>First</DropdownMenuItem>
        <DropdownMenuItem onClick={onSecond}>Second</DropdownMenuItem>
      </>
    );

    const [, secondItem] = getAllByRole("menuitem");
    fireEvent.click(secondItem);

    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
  });

  it("renders children correctly", () => {
    const { getByRole } = render(<DropdownMenuItem>Open Logs</DropdownMenuItem>);

    expect(getByRole("menuitem")).toHaveTextContent("Open Logs");
  });

  it("passes through additional props to the underlying element", () => {
    const { getByTestId, getByRole } = render(
      <DropdownMenuItem data-testid="custom-item" aria-label="Custom action">
        Custom
      </DropdownMenuItem>
    );

    expect(getByTestId("custom-item")).toBeInTheDocument();
    expect(getByRole("menuitem")).toHaveAttribute("aria-label", "Custom action");
  });
});
