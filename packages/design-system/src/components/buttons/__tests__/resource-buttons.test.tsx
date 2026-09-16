import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/menu", () => {
  const Item = ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement>) => (
    <div role="menuitem" className={className} onClick={onClick}>
      {children}
    </div>
  );
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
    },
  };
});

vi.mock("@base-ui/react/tooltip", () => ({
  Tooltip: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({
      children,
      render: renderProp,
    }: {
      children?: React.ReactNode;
      render?: React.ReactElement;
    }) => renderProp || children,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Arrow: () => null,
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { ResourceCreationButton } from "../ResourceCreationButton";
import { ResourceDeletionButton } from "../ResourceDeletionButton";
import { ResourceModificationButton } from "../ResourceModificationButton";
import { ResourceRestartButton } from "../ResourceRestartButton";
import { ResourceScaleButton } from "../ResourceScaleButton";
import { ResourceBulkDeletionButton } from "../ResourceBulkDeletionButton";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("ResourceCreationButton", () => {
  it("renders with Plus icon", () => {
    const { container } = render(
      <ResourceCreationButton
        ariaLabel="Create new resource"
        tooltip="Create a new resource"
        onClick={() => {}}
      />
    );
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
  });

  it("renders with custom aria label", () => {
    const { container } = render(
      <ResourceCreationButton
        ariaLabel="Add new item"
        tooltip="Add a new item"
        onClick={() => {}}
      />
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe("Add new item");
  });

  it("triggers onClick callback", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ResourceCreationButton ariaLabel="Create" tooltip="Create new" onClick={handleClick} />
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("renders with rounded-full styling", () => {
    const { container } = render(
      <ResourceCreationButton ariaLabel="Create" tooltip="Create new" onClick={() => {}} />
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("rounded-full");
  });
});

describe("ResourceDeletionButton", () => {
  describe("menu-item mode", () => {
    it("renders as dropdown menu item", () => {
      const { container } = render(<ResourceDeletionButton onClick={() => {}} label="Delete" />);
      expect(container.textContent).toContain("Delete");
    });

    it("applies disabled state", () => {
      const { container } = render(
        <ResourceDeletionButton onClick={() => {}} disabled={true} label="Delete" />
      );
      const item = container.querySelector("[role='menuitem']");
      expect(item).toBeTruthy();
    });

    it("shows spinner when isPending", () => {
      const { container } = render(
        <ResourceDeletionButton onClick={() => {}} isPending={true} label="Delete" />
      );
      expect(container).toBeTruthy();
    });
  });

  describe("icon-button mode", () => {
    it("renders as icon button", () => {
      const { container } = render(
        <ResourceDeletionButton onClick={() => {}} mode="icon-button" ariaLabel="Delete item" />
      );
      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-label")).toBe("Delete item");
    });

    it("applies disabled state", () => {
      const { container } = render(
        <ResourceDeletionButton onClick={() => {}} mode="icon-button" disabled={true} />
      );
      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
    });

    it("triggers onClick", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <ResourceDeletionButton onClick={handleClick} mode="icon-button" />
      );
      const button = container.querySelector("button") as HTMLButtonElement;
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

describe("ResourceModificationButton", () => {
  describe("menu-item mode", () => {
    it("renders as menu item", () => {
      const { container } = render(<ResourceModificationButton onClick={() => {}} />);
      expect(container.textContent).toContain("Edit");
    });
  });

  describe("icon-button mode", () => {
    it("renders as icon button", () => {
      const { container } = render(
        <ResourceModificationButton onClick={() => {}} mode="icon-button" ariaLabel="Edit item" />
      );
      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-label")).toBe("Edit item");
    });

    it("applies disabled state", () => {
      const { container } = render(
        <ResourceModificationButton onClick={() => {}} mode="icon-button" disabled={true} />
      );
      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
    });

    it("triggers onClick", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <ResourceModificationButton onClick={handleClick} mode="icon-button" />
      );
      const button = container.querySelector("button") as HTMLButtonElement;
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

describe("ResourceRestartButton", () => {
  describe("menu-item mode", () => {
    it("renders as menu item", () => {
      const { container } = render(<ResourceRestartButton onClick={() => {}} />);
      expect(container.textContent).toContain("Restart");
    });
  });

  describe("icon-button mode", () => {
    it("renders as icon button", () => {
      const { container } = render(
        <ResourceRestartButton onClick={() => {}} mode="icon-button" ariaLabel="Restart" />
      );
      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-label")).toBe("Restart");
    });

    it("triggers onClick", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <ResourceRestartButton onClick={handleClick} mode="icon-button" />
      );
      const button = container.querySelector("button") as HTMLButtonElement;
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

describe("ResourceScaleButton", () => {
  describe("menu-item mode", () => {
    it("renders as menu item", () => {
      const { container } = render(<ResourceScaleButton onClick={() => {}} />);
      expect(container.textContent).toContain("Scale");
    });

    it("renders disabled when isNotAllowed", () => {
      const { container } = render(
        <ResourceScaleButton
          onClick={() => {}}
          isNotAllowed={true}
          notAllowedReason="Cannot scale owned resource"
        />
      );
      expect(container.textContent).toContain("Scale");
      expect(container.textContent).toContain("Cannot scale owned resource");
    });
  });

  describe("icon-button mode", () => {
    it("renders as icon button", () => {
      const { container } = render(
        <ResourceScaleButton onClick={() => {}} mode="icon-button" ariaLabel="Scale" />
      );
      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-label")).toBe("Scale");
    });

    it("renders disabled when isNotAllowed", () => {
      const { container } = render(
        <ResourceScaleButton
          onClick={() => {}}
          mode="icon-button"
          isNotAllowed={true}
          notAllowedReason="Scaling not available"
        />
      );
      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
      expect(container.textContent).toContain("Scaling not available");
    });

    it("triggers onClick", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <ResourceScaleButton onClick={handleClick} mode="icon-button" />
      );
      const button = container.querySelector("button") as HTMLButtonElement;
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

describe("ResourceBulkDeletionButton", () => {
  it("renders with delete icon and count badge", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={3}
        ariaLabel="Delete selected items"
        tooltip="Delete 3 items"
        onClick={() => {}}
      />
    );
    expect(container.textContent).toContain("3");
  });

  it("disables button when count is 0", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={0}
        ariaLabel="Delete selected"
        tooltip="No items selected"
        onClick={() => {}}
      />
    );
    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);
  });

  it("enables button when count > 0", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={5}
        ariaLabel="Delete selected"
        tooltip="Delete 5 items"
        onClick={() => {}}
      />
    );
    const button = container.querySelector("button");
    expect(button?.disabled).toBe(false);
  });

  it("displays correct count in badge", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={10}
        ariaLabel="Delete"
        tooltip="Delete 10 items"
        onClick={() => {}}
      />
    );
    expect(container.textContent).toContain("10");
  });

  it("hides badge when count is 0", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={0}
        ariaLabel="Delete"
        tooltip="No selection"
        onClick={() => {}}
      />
    );
    expect(container.textContent).not.toContain("0");
  });

  it("triggers onClick", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ResourceBulkDeletionButton
        count={2}
        ariaLabel="Delete"
        tooltip="Delete 2"
        onClick={handleClick}
      />
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it("applies destructive variant", () => {
    const { container } = render(
      <ResourceBulkDeletionButton
        count={1}
        ariaLabel="Delete"
        tooltip="Delete"
        onClick={() => {}}
      />
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("destructive");
  });
});
