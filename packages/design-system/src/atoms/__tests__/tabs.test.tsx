import { render, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

describe("Tabs component", () => {
  // TabsIndicator schedules a low-priority position update on mount; without
  // flushing it here, it can fire after this file's jsdom environment tears
  // down and throw "window is not defined" in the next test file.
  afterEach(async () => {
    await act(async () => {});
  });

  describe("TabsContent cross-fade transition", () => {
    it("should render TabsContent with transition-fade class", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const content = container.querySelector("[data-slot='tabs-content']");
      expect(content).toBeTruthy();
      // Verify transition-fade class is present (provides transition-opacity + duration-150)
      expect(content?.className).toContain("transition-fade");
    });

    it("should render TabsContent with data-attributes for Base UI animation control", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const content = container.querySelector("[data-slot='tabs-content']");
      expect(content).toBeTruthy();

      // Verify the classes for data-attribute-driven opacity transitions are present
      // These classes bind opacity-0 to Base UI's data-starting-style, data-ending-style, and data-hidden
      expect(content?.className).toContain("data-starting-style:opacity-0");
      expect(content?.className).toContain("data-ending-style:opacity-0");
      expect(content?.className).toContain("data-hidden:opacity-0");
    });

    it("should render TabsContent with outline-none to prevent default focus outline", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const content = container.querySelector("[data-slot='tabs-content']");
      expect(content?.className).toContain("outline-none");
    });

    it("should allow custom className to be merged without overriding transition classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="mt-0 min-h-0 flex-1">
            Content 1
          </TabsContent>
        </Tabs>
      );

      const content = container.querySelector("[data-slot='tabs-content']");
      expect(content).toBeTruthy();
      // Verify both custom classes and transition classes are present
      expect(content?.className).toContain("transition-fade");
      expect(content?.className).toContain("mt-0");
      expect(content?.className).toContain("min-h-0");
      expect(content?.className).toContain("flex-1");
    });

    it("should render as TabsPrimitive.Panel with data-slot attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const content = container.querySelector("[data-slot='tabs-content']");
      expect(content?.getAttribute("data-slot")).toBe("tabs-content");
    });
  });

  describe("TabsIndicator sliding indicator", () => {
    it("should render inside TabsList with data-slot attribute regardless of variant", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList variant="line">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const indicator = container.querySelector("[data-slot='tabs-indicator']");
      expect(indicator).toBeTruthy();
    });

    it("should render a sliding pill box bound to the full active-tab bounding box when variant='default' (or no variant prop)", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList variant="default">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const indicator = container.querySelector("[data-slot='tabs-indicator']");
      expect(indicator).toBeTruthy();
      expect(indicator?.className).toContain("left-(--active-tab-left)");
      expect(indicator?.className).toContain("top-(--active-tab-top)");
      expect(indicator?.className).toContain("w-(--active-tab-width)");
      expect(indicator?.className).toContain("h-(--active-tab-height)");
      expect(indicator?.className).toContain("bg-background");
      expect(indicator?.className).toContain("shadow-sm");
    });

    it("should default to the pill box style when TabsList has no variant prop", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const indicator = container.querySelector("[data-slot='tabs-indicator']");
      expect(indicator?.className).toContain("bg-background");
      expect(indicator?.className).not.toContain("bg-primary");
    });

    it("should apply position/size classes bound to Base UI's active-tab CSS variables when variant='line'", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList variant="line">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const indicator = container.querySelector("[data-slot='tabs-indicator']");
      expect(indicator?.className).toContain("group-data-horizontal/tabs:left-(--active-tab-left)");
      expect(indicator?.className).toContain("group-data-horizontal/tabs:w-(--active-tab-width)");
      expect(indicator?.className).toContain("group-data-vertical/tabs:top-(--active-tab-top)");
      expect(indicator?.className).toContain("group-data-vertical/tabs:h-(--active-tab-height)");
      expect(indicator?.className).toContain("transition-interactive");
      expect(indicator?.className).toContain("bg-primary");
    });

    it("should allow indicatorClassName on TabsList to override the default indicator color", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList variant="line" indicatorClassName="bg-success">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const indicator = container.querySelector("[data-slot='tabs-indicator']");
      expect(indicator?.className).toContain("bg-success");
      expect(indicator?.className).not.toContain("bg-primary");
    });
  });

  describe("TabsTrigger active state", () => {
    it("should sit above the sliding indicator (z-10) and use transparent background so the indicator box shows through", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const trigger = container.querySelector("[data-slot='tabs-trigger']");
      expect(trigger?.className).toContain("z-10");
      expect(trigger?.className).toContain("bg-transparent");
    });
  });
});
