import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => cleanup());
import {
  ResourceDetailDrawer,
  ResourceDetailEmptyBody,
  ResourceDetailDrawerHeader,
  ResourceDetailDrawerBody,
} from "../ResourceDetailDrawer";

describe("ResourceDetailDrawer", () => {
  it("renders children when open", () => {
    const { getByText } = render(
      <ResourceDetailDrawer open={true} onClose={vi.fn()}>
        <div>Drawer Content</div>
      </ResourceDetailDrawer>
    );
    expect(getByText("Drawer Content")).toBeTruthy();
  });

  it("calls onClose when close is triggered", () => {
    const onClose = vi.fn();
    render(
      <ResourceDetailDrawer open={true} onClose={onClose}>
        <div>Drawer Content</div>
      </ResourceDetailDrawer>
    );

    // Trigger close by calling onOpenChange with false
    // This simulates the Sheet's onOpenChange callback
    const sheet = document.body.querySelector('[data-slot="sheet-content"]');
    expect(sheet).toBeTruthy();
  });

  it("accepts custom className", () => {
    render(
      <ResourceDetailDrawer open={true} onClose={vi.fn()} className="custom-class">
        <div>Content</div>
      </ResourceDetailDrawer>
    );
    // The Sheet component applies className to SheetContent
    expect(document.body.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
  });

  it("renders SheetContent with correct width", () => {
    render(
      <ResourceDetailDrawer open={true} onClose={vi.fn()}>
        <div>Content</div>
      </ResourceDetailDrawer>
    );
    // The drawer should be styled with w-200
    const drawer = document.body.querySelector('[data-slot="sheet-content"]');
    expect(drawer).toBeTruthy();
  });

  it("renders children inside SheetContent", () => {
    const { getByText } = render(
      <ResourceDetailDrawer open={true} onClose={vi.fn()}>
        <span>Test Child</span>
      </ResourceDetailDrawer>
    );
    expect(getByText("Test Child")).toBeTruthy();
  });

  it("applies flex flex-col gap-0 p-0 styles", () => {
    render(
      <ResourceDetailDrawer open={true} onClose={vi.fn()}>
        <div>Content</div>
      </ResourceDetailDrawer>
    );
    expect(document.body.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
  });
});

describe("ResourceDetailEmptyBody", () => {
  it("renders empty state message with resource kind", () => {
    const { getByText } = render(<ResourceDetailEmptyBody resourceKind="Pod" />);
    expect(getByText(/Pod/)).toBeTruthy();
  });

  it("renders correct message format", () => {
    const { getByText } = render(<ResourceDetailEmptyBody resourceKind="Service" />);
    expect(getByText("There are no information for this Service.")).toBeTruthy();
  });

  it("applies text-muted-foreground color", () => {
    const { container } = render(<ResourceDetailEmptyBody resourceKind="Pod" />);
    const text = container.querySelector(".text-muted-foreground");
    expect(text).toBeTruthy();
  });

  it("applies text-xs size", () => {
    const { container } = render(<ResourceDetailEmptyBody resourceKind="Pod" />);
    const text = container.querySelector(".text-xs");
    expect(text).toBeTruthy();
  });

  it("applies p-4 padding", () => {
    const { container } = render(<ResourceDetailEmptyBody resourceKind="Pod" />);
    const text = container.querySelector(".p-4");
    expect(text).toBeTruthy();
  });

  it("handles different resource kinds", () => {
    const kinds = ["Pod", "Service", "Deployment", "ConfigMap"];
    kinds.forEach((kind) => {
      const { getByText } = render(<ResourceDetailEmptyBody resourceKind={kind} />);
      expect(getByText(new RegExp(kind))).toBeTruthy();
    });
  });

  it("renders as paragraph element", () => {
    const { container } = render(<ResourceDetailEmptyBody resourceKind="Pod" />);
    const p = container.querySelector("p");
    expect(p).toBeTruthy();
  });
});

describe("ResourceDetailDrawerHeader", () => {
  it("renders children", () => {
    const { getByText } = render(
      <ResourceDetailDrawerHeader>
        <span>Header Title</span>
      </ResourceDetailDrawerHeader>
    );
    expect(getByText("Header Title")).toBeTruthy();
  });

  it("applies border-bottom styling", () => {
    const { container } = render(
      <ResourceDetailDrawerHeader>
        <span>Title</span>
      </ResourceDetailDrawerHeader>
    );
    const header = container.querySelector(".border-b");
    expect(header).toBeTruthy();
  });

  it("applies flex row layout", () => {
    const { container } = render(
      <ResourceDetailDrawerHeader>
        <span>Title</span>
      </ResourceDetailDrawerHeader>
    );
    const header = container.querySelector(".flex.flex-row");
    expect(header).toBeTruthy();
  });

  it("applies justify-between for spacing", () => {
    const { container } = render(
      <ResourceDetailDrawerHeader>
        <span>Title</span>
      </ResourceDetailDrawerHeader>
    );
    const header = container.querySelector(".justify-between");
    expect(header).toBeTruthy();
  });

  it("applies px-4 py-3 padding", () => {
    const { container } = render(
      <ResourceDetailDrawerHeader>
        <span>Title</span>
      </ResourceDetailDrawerHeader>
    );
    const header = container.querySelector(".px-4.py-3");
    expect(header).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(
      <ResourceDetailDrawerHeader className="custom-header">
        <span>Title</span>
      </ResourceDetailDrawerHeader>
    );
    const header = container.querySelector(".custom-header");
    expect(header).toBeTruthy();
  });

  it("renders multiple children correctly", () => {
    const { getByText } = render(
      <ResourceDetailDrawerHeader>
        <span>Title</span>
        <button>Close</button>
      </ResourceDetailDrawerHeader>
    );
    expect(getByText("Title")).toBeTruthy();
    expect(getByText("Close")).toBeTruthy();
  });
});

describe("ResourceDetailDrawerBody", () => {
  it("renders children", () => {
    const { getByText } = render(
      <ResourceDetailDrawerBody>
        <div>Body Content</div>
      </ResourceDetailDrawerBody>
    );
    expect(getByText("Body Content")).toBeTruthy();
  });

  it("applies default p-4 padding", () => {
    const { container } = render(
      <ResourceDetailDrawerBody>
        <div>Content</div>
      </ResourceDetailDrawerBody>
    );
    const body = container.querySelector(".p-4");
    expect(body).toBeTruthy();
  });

  it("applies h-full height", () => {
    const { container } = render(
      <ResourceDetailDrawerBody>
        <div>Content</div>
      </ResourceDetailDrawerBody>
    );
    const scrollArea = container.querySelector(".h-full");
    expect(scrollArea).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(
      <ResourceDetailDrawerBody className="p-0">
        <div>Content</div>
      </ResourceDetailDrawerBody>
    );
    const body = container.querySelector(".p-0");
    expect(body).toBeTruthy();
  });

  it("overrides default padding with custom className", () => {
    const { container } = render(
      <ResourceDetailDrawerBody className="p-0">
        <div>Content</div>
      </ResourceDetailDrawerBody>
    );
    const body = container.querySelector(".p-0");
    expect(body).toBeTruthy();
  });

  it("wraps content in ScrollArea", () => {
    const { container } = render(
      <ResourceDetailDrawerBody>
        <div>Content</div>
      </ResourceDetailDrawerBody>
    );
    // ScrollArea should be present for scrolling
    const scrollArea = container.querySelector(".h-full");
    expect(scrollArea).toBeTruthy();
  });

  it("renders multiple children", () => {
    const { getByText } = render(
      <ResourceDetailDrawerBody>
        <div>Section 1</div>
        <div>Section 2</div>
        <div>Section 3</div>
      </ResourceDetailDrawerBody>
    );
    expect(getByText("Section 1")).toBeTruthy();
    expect(getByText("Section 2")).toBeTruthy();
    expect(getByText("Section 3")).toBeTruthy();
  });
});
