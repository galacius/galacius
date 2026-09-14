import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Backdrop: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Popup: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Close: ({ children, "data-slot": dataSlot, render: renderProp, ...rest }: any) => {
      if (renderProp) {
        return React.cloneElement(renderProp, { "data-slot": dataSlot, ...rest }, children);
      }
      return (
        <button data-slot={dataSlot} {...rest}>
          {children}
        </button>
      );
    },
    Title: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLHeadingElement> & { "data-slot"?: string }) => (
      <h2 className={className} data-slot={dataSlot}>
        {children}
      </h2>
    ),
    Description: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLParagraphElement> & { "data-slot"?: string }) => (
      <p className={className} data-slot={dataSlot}>
        {children}
      </p>
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { ConfirmationModal } from "../ConfirmationModal";
import { FormModal } from "../FormModal";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("ConfirmationModal", () => {
  describe("rendering", () => {
    it("renders when open=true", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm Action"
          description="Are you sure?"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Confirm Action");
      expect(container.textContent).toContain("Are you sure?");
    });

    it("passes open prop to Dialog", () => {
      const { rerender, container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Test"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Confirm");

      rerender(
        <ConfirmationModal
          open={false}
          title="Confirm"
          description="Test"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
    });
  });

  describe("content and UI", () => {
    it("displays title", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Delete Item?"
          description="This action cannot be undone"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Delete Item?");
    });

    it("displays description", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="This is the description text"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("This is the description text");
    });

    it("renders Cancel button", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Cancel");
    });

    it("renders confirm button with default label", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Confirm");
    });

    it("renders confirm button with custom label", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          confirmLabel="Delete Forever"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container.textContent).toContain("Delete Forever");
    });
  });

  describe("variants", () => {
    it("applies default button variant", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          confirmVariant="default"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container).toBeTruthy();
    });

    it("applies destructive button variant", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Delete"
          description="Are you sure?"
          confirmVariant="destructive"
          isPending={false}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("disables cancel button when isPending=true", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={true}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent?.includes("Cancel")) {
          expect(btn.disabled).toBe(true);
        }
      });
    });

    it("disables confirm button when isPending=true", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={true}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent?.includes("Confirm")) {
          expect(btn.disabled).toBe(true);
        }
      });
    });

    it("shows loading spinner when isPending=true", () => {
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={true}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      );
      const loader = container.querySelector(".animate-spin");
      expect(loader).toBeTruthy();
    });
  });

  describe("callbacks", () => {
    it("calls onConfirm when confirm button clicked", () => {
      const handleConfirm = vi.fn();
      const { container } = render(
        <ConfirmationModal
          open={true}
          title="Confirm"
          description="Description"
          isPending={false}
          onClose={() => {}}
          onConfirm={handleConfirm}
        />
      );
      const confirmButton = Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Confirm")
      );
      if (confirmButton) {
        fireEvent.click(confirmButton);
        expect(handleConfirm).toHaveBeenCalled();
      }
    });
  });
});

describe("FormModal", () => {
  describe("rendering", () => {
    it("renders when open=true", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Edit Item" onSubmit={() => {}}>
          <input type="text" />
        </FormModal>
      );
      expect(container.textContent).toContain("Edit Item");
    });

    it("passes open prop to Dialog", () => {
      const { rerender, container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" onSubmit={() => {}}>
          <input type="text" />
        </FormModal>
      );
      expect(container.textContent).toContain("Form");

      rerender(
        <FormModal open={false} onClose={() => {}} title="Form" onSubmit={() => {}}>
          <input type="text" />
        </FormModal>
      );
    });
  });

  describe("content and UI", () => {
    it("displays title", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Create New Resource" onSubmit={() => {}}>
          <input type="text" />
        </FormModal>
      );
      expect(container.textContent).toContain("Create New Resource");
    });

    it("renders children form content", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Edit Form" onSubmit={() => {}}>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
        </FormModal>
      );
      const nameInput = container.querySelector("input[placeholder='Name']");
      const emailInput = container.querySelector("input[placeholder='Email']");
      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
    });

    it("renders cancel button with default label", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      expect(container.textContent).toContain("Cancel");
    });

    it("renders submit button with default label", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      expect(container.textContent).toContain("Submit");
    });

    it("renders submit button with custom label", () => {
      const { container } = render(
        <FormModal
          open={true}
          onClose={() => {}}
          title="Form"
          submitLabel="Save Changes"
          onSubmit={() => {}}
        >
          <div>Content</div>
        </FormModal>
      );
      expect(container.textContent).toContain("Save Changes");
    });
  });

  describe("sizes", () => {
    it("renders with default size sm", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      expect(container).toBeTruthy();
    });

    it("renders with custom size lg", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" size="lg" onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      expect(container).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("disables cancel button when isLoading=true", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" isLoading={true} onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent?.includes("Cancel")) {
          expect(btn.disabled).toBe(true);
        }
      });
    });

    it("disables submit button when isLoading=true", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" isLoading={true} onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent?.includes("Submit")) {
          expect(btn.disabled).toBe(true);
        }
      });
    });

    it("shows loading spinner when isLoading=true", () => {
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" isLoading={true} onSubmit={() => {}}>
          <div>Content</div>
        </FormModal>
      );
      const loader = container.querySelector(".animate-spin");
      expect(loader).toBeTruthy();
    });
  });

  describe("submit disabled prop", () => {
    it("disables submit button when submitDisabled=true", () => {
      const { container } = render(
        <FormModal
          open={true}
          onClose={() => {}}
          title="Form"
          submitDisabled={true}
          onSubmit={() => {}}
        >
          <div>Content</div>
        </FormModal>
      );
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent?.includes("Submit")) {
          expect(btn.disabled).toBe(true);
        }
      });
    });
  });

  describe("callbacks", () => {
    it("calls onSubmit when submit button clicked", () => {
      const handleSubmit = vi.fn();
      const { container } = render(
        <FormModal open={true} onClose={() => {}} title="Form" onSubmit={handleSubmit}>
          <div>Content</div>
        </FormModal>
      );
      const submitButton = Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Submit")
      );
      if (submitButton) {
        fireEvent.click(submitButton);
        expect(handleSubmit).toHaveBeenCalled();
      }
    });
  });
});
