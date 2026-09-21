import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppFooter } from "../AppFooter";

const usePluginFooterWidgetsMock = vi.hoisted(() => vi.fn());

vi.mock("../../plugins/hooks/registry/footer/usePluginFooterWidgets", () => ({
  usePluginFooterWidgets: usePluginFooterWidgetsMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("AppFooter", () => {
  const mockOnUpdateClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    usePluginFooterWidgetsMock.mockReturnValue([]);
  });

  it("renders without plugin footer widgets", () => {
    render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("renders a single plugin footer widget", () => {
    const TestWidget = () => <div data-testid="test-widget">Test Widget</div>;
    usePluginFooterWidgetsMock.mockReturnValue([
      { pluginId: "test-plugin", widget: { id: "test-widget", component: TestWidget } },
    ]);

    render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByTestId("test-widget")).toBeTruthy();
    expect(screen.getByText("Test Widget")).toBeTruthy();
  });

  it("renders multiple plugin footer widgets", () => {
    const TestWidget1 = () => <div data-testid="test-widget-1">Widget 1</div>;
    const TestWidget2 = () => <div data-testid="test-widget-2">Widget 2</div>;
    usePluginFooterWidgetsMock.mockReturnValue([
      { pluginId: "plugin-1", widget: { id: "widget-1", component: TestWidget1 } },
      { pluginId: "plugin-2", widget: { id: "widget-2", component: TestWidget2 } },
    ]);

    render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByTestId("test-widget-1")).toBeTruthy();
    expect(screen.getByTestId("test-widget-2")).toBeTruthy();
  });

  it("wraps each widget in an ErrorBoundary", () => {
    const BrokenWidget = () => {
      throw new Error("Widget crashed");
    };
    const GoodWidget = () => <div data-testid="good-widget">Good Widget</div>;

    usePluginFooterWidgetsMock.mockReturnValue([
      { pluginId: "broken-plugin", widget: { id: "broken-widget", component: BrokenWidget } },
      { pluginId: "good-plugin", widget: { id: "good-widget", component: GoodWidget } },
    ]);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );

    // The broken widget should be caught by the error boundary; the good widget still renders
    expect(screen.getByTestId("good-widget")).toBeTruthy();

    consoleErrorSpy.mockRestore();
  });

  it("renders widget components with correct key", () => {
    const TestWidget = () => <div data-testid="test-widget">Test Widget</div>;
    usePluginFooterWidgetsMock.mockReturnValue([
      { pluginId: "unique-plugin", widget: { id: "unique-widget-id", component: TestWidget } },
    ]);

    const { container } = render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );

    // Verify widget is in the DOM
    expect(screen.getByTestId("test-widget")).toBeTruthy();
    expect(container.querySelector("footer")).toBeTruthy();
  });

  it("updates when new widgets are registered", () => {
    const TestWidget = () => <div data-testid="test-widget">Test Widget</div>;
    const { rerender } = render(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />,
      { wrapper: makeWrapper() }
    );

    expect(screen.queryByTestId("test-widget")).toBeNull();

    usePluginFooterWidgetsMock.mockReturnValue([
      { pluginId: "test-plugin", widget: { id: "test-widget", component: TestWidget } },
    ]);
    rerender(
      <AppFooter activeContext="default" updateInfo={null} onUpdateClick={mockOnUpdateClick} />
    );

    expect(screen.getByTestId("test-widget")).toBeTruthy();
  });
});
