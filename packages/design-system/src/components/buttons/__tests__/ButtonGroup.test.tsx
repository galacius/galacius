import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ButtonGroup } from "../ButtonGroup";
import { Button } from "../../../atoms/button";

describe("ButtonGroup component", () => {
  describe("rendering", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group).toBeTruthy();
      expect(group?.getAttribute("data-slot")).toBe("button-group");
    });

    it("applies base styling", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("flex");
      expect(group?.className).toContain("-space-x-px");
    });

    it("renders all children buttons", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );
      expect(container.textContent).toContain("First");
      expect(container.textContent).toContain("Second");
      expect(container.textContent).toContain("Third");
    });
  });

  describe("styling", () => {
    it("applies rounded corners to first button", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("[&>button:first-child]:rounded-l-lg");
    });

    it("applies rounded corners to last button", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("[&>button:last-child]:rounded-r-lg");
    });

    it("removes border radius from middle buttons", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Middle</Button>
          <Button>Last</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("[&>button]:rounded-none");
    });

    it("sets focus z-index for buttons", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("[&>button:focus-visible]:z-10");
    });
  });

  describe("custom className", () => {
    it("accepts and merges custom className", () => {
      const { container } = render(
        <ButtonGroup className="custom-group">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("custom-group");
      expect(group?.className).toContain("flex");
    });
  });

  describe("flex container", () => {
    it("is a flex container", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("flex");
    });

    it("applies negative space for overlap", () => {
      const { container } = render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const group = container.querySelector("[data-slot='button-group']");
      expect(group?.className).toContain("-space-x-px");
    });
  });
});
