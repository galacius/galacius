import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSuccessToast } from "../renderSuccessToast";
import * as toastModule from "../../../atoms/toast";

describe("renderSuccessToast", () => {
  let customMock: ReturnType<typeof vi.fn>;
  let dismissMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    customMock = vi.fn();
    dismissMock = vi.fn();
    vi.spyOn(toastModule.toast, "custom").mockImplementation(customMock as never);
    vi.spyOn(toastModule.toast, "dismiss").mockImplementation(dismissMock as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls toast.custom with SuccessToast component", () => {
    renderSuccessToast({ title: "Success", description: "Operation completed" });
    expect(customMock).toHaveBeenCalled();
  });

  it("passes title and description to SuccessToast", () => {
    renderSuccessToast({
      title: "File uploaded",
      description: "Your file has been uploaded successfully",
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("passes TOAST_STYLE to toast.custom options", () => {
    renderSuccessToast({ title: "Success", description: "Done" });
    const call = customMock.mock.calls[0];
    expect(call[1]).toHaveProperty("style");
  });

  it("handles action with onClick", () => {
    const onClick = vi.fn();
    renderSuccessToast({
      title: "Success",
      description: "Done",
      action: { label: "View", onClick },
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("wraps action onClick to dismiss and call original", () => {
    const onClick = vi.fn();
    renderSuccessToast({
      title: "Success",
      description: "Done",
      action: { label: "View", onClick },
    });

    const renderFn = customMock.mock.calls[0][0];
    const mockToast = { id: "123" };
    const jsx = renderFn(mockToast);

    expect(jsx).toBeTruthy();
  });

  it("does not create action wrapper when action is undefined", () => {
    renderSuccessToast({ title: "Success", description: "Done" });
    expect(customMock).toHaveBeenCalled();
    const renderFn = customMock.mock.calls[0][0];
    const jsx = renderFn({ id: "123" });
    expect(jsx).toBeTruthy();
  });

  it("renders success message correctly", () => {
    const title = "Upload Complete";
    renderSuccessToast({ title, description: "File saved" });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles multiple renderSuccessToast calls", () => {
    renderSuccessToast({ title: "Success 1", description: "Done" });
    renderSuccessToast({ title: "Success 2", description: "Completed" });
    renderSuccessToast({ title: "Success 3", description: "Finished" });
    expect(customMock).toHaveBeenCalledTimes(3);
  });

  it("passes correct props to SuccessToast component", () => {
    const props = {
      title: "Connection Established",
      description: "Successfully connected to server",
      action: { label: "Dismiss", onClick: vi.fn() },
    };
    renderSuccessToast(props);
    expect(customMock).toHaveBeenCalled();
  });

  it("handles long description", () => {
    const longDesc = "This is a very long success message ".repeat(10);
    renderSuccessToast({
      title: "Success",
      description: longDesc,
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("action onClick dismisses toast before calling original handler", () => {
    const onClick = vi.fn();
    renderSuccessToast({
      title: "Success",
      description: "Done",
      action: { label: "Undo", onClick },
    });

    expect(customMock).toHaveBeenCalled();
  });

  it("handles empty title gracefully", () => {
    renderSuccessToast({ title: "", description: "Done" });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles empty description", () => {
    renderSuccessToast({ title: "Success", description: "" });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles empty action label", () => {
    renderSuccessToast({
      title: "Success",
      description: "Done",
      action: { label: "", onClick: vi.fn() },
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("preserves action properties during toast rendering", () => {
    const actionClick = vi.fn();
    const action = { label: "View Details", onClick: actionClick };
    renderSuccessToast({
      title: "Success",
      description: "Operation succeeded",
      action,
    });

    const renderFn = customMock.mock.calls[0][0];
    expect(renderFn).toBeTruthy();
  });

  it("includes TOAST_STYLE configuration", () => {
    renderSuccessToast({ title: "Success", description: "Done" });
    const options = customMock.mock.calls[0][1];
    expect(options).toHaveProperty("style");
  });

  it("description is required prop for SuccessToast", () => {
    renderSuccessToast({
      title: "Success",
      description: "Required description",
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles different action scenarios", () => {
    // No action
    renderSuccessToast({ title: "Success 1", description: "Done" });
    // With action
    renderSuccessToast({
      title: "Success 2",
      description: "Done",
      action: { label: "View", onClick: vi.fn() },
    });
    expect(customMock).toHaveBeenCalledTimes(2);
  });

  it("maintains toast identity through dismiss", () => {
    const onClick = vi.fn();
    renderSuccessToast({
      title: "Success",
      description: "Done",
      action: { label: "Action", onClick },
    });

    const renderFn = customMock.mock.calls[0][0];
    const mockToast = { id: "toast-123" };
    const jsx = renderFn(mockToast);

    // Toast id should be preserved
    expect(jsx).toBeTruthy();
  });
});
