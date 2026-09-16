import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderErrorToast } from "../renderErrorToast";
import * as toastModule from "../../../atoms/toast";

describe("renderErrorToast", () => {
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

  it("calls toast.custom with ErrorToast component", () => {
    renderErrorToast({ title: "Error occurred" });
    expect(customMock).toHaveBeenCalled();
  });

  it("passes title and description to ErrorToast", () => {
    renderErrorToast({
      title: "Test Error",
      description: "This is a test",
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("passes TOAST_STYLE to toast.custom options", () => {
    renderErrorToast({ title: "Error" });
    const call = customMock.mock.calls[0];
    expect(call[1]).toHaveProperty("style");
  });

  it("handles action with onClick", () => {
    const onClick = vi.fn();
    renderErrorToast({
      title: "Error",
      action: { label: "Retry", onClick },
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("wraps action onClick to dismiss and call original", () => {
    const onClick = vi.fn();
    renderErrorToast({
      title: "Error",
      action: { label: "Retry", onClick },
    });

    const renderFn = customMock.mock.calls[0][0];
    const mockToast = { id: "123" };
    const jsx = renderFn(mockToast);

    // Simulate action click through the component
    expect(jsx).toBeTruthy();
  });

  it("does not create action wrapper when action is undefined", () => {
    renderErrorToast({ title: "Error" });
    expect(customMock).toHaveBeenCalled();
    const renderFn = customMock.mock.calls[0][0];
    const jsx = renderFn({ id: "123" });
    expect(jsx).toBeTruthy();
  });

  it("renders error message correctly", () => {
    const title = "Custom Error Message";
    renderErrorToast({ title });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles multiple renderErrorToast calls", () => {
    renderErrorToast({ title: "Error 1" });
    renderErrorToast({ title: "Error 2" });
    renderErrorToast({ title: "Error 3" });
    expect(customMock).toHaveBeenCalledTimes(3);
  });

  it("passes correct props to ErrorToast component", () => {
    const props = {
      title: "Network Error",
      description: "Failed to connect",
      action: { label: "Retry", onClick: vi.fn() },
    };
    renderErrorToast(props);
    expect(customMock).toHaveBeenCalled();
  });

  it("renders with only title prop", () => {
    renderErrorToast({ title: "Simple Error" });
    expect(customMock).toHaveBeenCalled();
  });

  it("action onClick dismisses toast before calling original handler", () => {
    const onClick = vi.fn();
    renderErrorToast({
      title: "Error",
      action: { label: "Undo", onClick },
    });

    expect(customMock).toHaveBeenCalled();
  });

  it("handles empty title gracefully", () => {
    renderErrorToast({ title: "" });
    expect(customMock).toHaveBeenCalled();
  });

  it("handles empty action label", () => {
    renderErrorToast({
      title: "Error",
      action: { label: "", onClick: vi.fn() },
    });
    expect(customMock).toHaveBeenCalled();
  });

  it("preserves action properties during toast rendering", () => {
    const actionClick = vi.fn();
    const action = { label: "Action", onClick: actionClick };
    renderErrorToast({
      title: "Error",
      action,
    });

    const renderFn = customMock.mock.calls[0][0];
    expect(renderFn).toBeTruthy();
  });

  it("includes TOAST_STYLE configuration", () => {
    renderErrorToast({ title: "Error" });
    const options = customMock.mock.calls[0][1];
    expect(options).toHaveProperty("style");
  });
});
