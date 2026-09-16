import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { Ingress } from "../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/data-access/useGetIngresses", () => ({
  useGetIngresses: vi.fn(),
}));

vi.mock("../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

vi.mock("../../../../shared/components/trays/unified/UnifiedTrayContext", () => ({
  useUnifiedTray: () => ({ openTab: openTabMock }),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useGetIngresses } from "../hooks/data-access/useGetIngresses";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { IngressesView } from "../IngressesView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeIngress(overrides: Partial<Ingress> = {}): Ingress {
  return {
    Name: "test-ingress",
    Namespace: "default",
    LoadBalancers: "10.0.0.1",
    Rules: [],
    Age: "1d",
    ...overrides,
  };
}

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

function renderView(context = "ctx") {
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: context,
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: context,
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
  return render(<IngressesView />, { wrapper: makeWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "ctx",
    namespaces: "",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "ctx",
    namespaces: "",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("IngressesView", () => {
  it('renders heading "Ingresses" with "0 items" count', () => {
    renderView();

    expect(screen.getAllByText("Ingresses").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 item/).length).toBeGreaterThan(0);
  });

  it("renders ingress rows with all columns (Name, Namespace, LoadBalancers, Rules, Age)", () => {
    const ingresses = [
      makeIngress({
        Name: "ingress-a",
        Namespace: "ns-a",
        LoadBalancers: "1.2.3.4",
        Rules: [{ Host: "a.example.com", Paths: [{ Path: "/", Backend: "svc-a:80" }] }],
        Age: "2d",
      }),
      makeIngress({
        Name: "ingress-b",
        Namespace: "ns-b",
        LoadBalancers: "5.6.7.8",
        Rules: [{ Host: "b.example.com", Paths: [{ Path: "/", Backend: "svc-b:443" }] }],
        Age: "5d",
      }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    expect(screen.getAllByText("ingress-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ingress-b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ns-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ns-b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.2.3.4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5.6.7.8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("svc-a:80").length).toBeGreaterThan(0);
    expect(screen.getAllByText("svc-b:443").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5d").length).toBeGreaterThan(0);
  });

  it('shows "Item list is empty" when data is empty', () => {
    renderView();

    expect(screen.getAllByText("No Ingresses").length).toBeGreaterThan(0);
  });

  it("filters ingresses by search (case-insensitive)", () => {
    const ingresses = [
      makeIngress({ Name: "frontend-ingress", Namespace: "default" }),
      makeIngress({ Name: "backend-ingress", Namespace: "default" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    const input = screen.getByPlaceholderText("Search Ingresses...");
    fireEvent.change(input, { target: { value: "FRONTEND" } });

    expect(screen.getAllByText("frontend-ingress").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("backend-ingress")).toHaveLength(0);
  });

  it("renders ingresses sorted alphabetically by Name", () => {
    const ingresses = [
      makeIngress({ Name: "zebra-ingress", Namespace: "default" }),
      makeIngress({ Name: "alpha-ingress", Namespace: "default" }),
      makeIngress({ Name: "mango-ingress", Namespace: "default" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    const rows = screen.getAllByRole("row");
    // Filter to rows that contain a known ingress name to guard against portal-injected rows
    // Column 0 is the select-row checkbox; Name is column 1
    const knownNames = new Set(["alpha-ingress", "mango-ingress", "zebra-ingress"]);
    const dataRows = rows.filter((row) => {
      const text = row.querySelectorAll("td")[1]?.textContent ?? "";
      return knownNames.has(text);
    });
    const nameCells = dataRows.map((row) => row.querySelectorAll("td")[1]?.textContent);
    expect(nameCells).toEqual(["alpha-ingress", "mango-ingress", "zebra-ingress"]);
  });
});

// ─── edge-case tests ──────────────────────────────────────────────────────────

describe("IngressesView — edge cases", () => {
  it("shows empty state when search produces no matches", () => {
    const ingresses = [
      makeIngress({ Name: "alpha-ingress" }),
      makeIngress({ Name: "beta-ingress", Namespace: "kube-system" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    const input = screen.getByPlaceholderText("Search Ingresses...");
    fireEvent.change(input, { target: { value: "zzz-no-match" } });

    expect(screen.getAllByText("No Ingresses").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("alpha-ingress")).toHaveLength(0);
    expect(screen.queryAllByText("beta-ingress")).toHaveLength(0);
  });

  it("restores full list when search is cleared back to empty string", () => {
    const ingresses = [
      makeIngress({ Name: "alpha-ingress" }),
      makeIngress({ Name: "beta-ingress", Namespace: "kube-system" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    const input = screen.getByPlaceholderText("Search Ingresses...");

    // Filter down to one result
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(screen.queryAllByText("beta-ingress")).toHaveLength(0);

    // Clear the search — full list must reappear
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getAllByText("alpha-ingress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("beta-ingress").length).toBeGreaterThan(0);
  });

  it('shows "1 item" (singular, not "1 items") when exactly one ingress exists', () => {
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeIngress({ Name: "solo-ingress" })],
    });

    renderView();

    expect(screen.getAllByText("1 item").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("1 items")).toHaveLength(0);
  });

  it('shows "3 items" (plural) when three ingresses exist', () => {
    const ingresses = [
      makeIngress({ Name: "a-ingress" }),
      makeIngress({ Name: "b-ingress", Namespace: "kube-system" }),
      makeIngress({ Name: "c-ingress", Namespace: "monitoring" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView();

    expect(screen.getAllByText("3 items").length).toBeGreaterThan(0);
  });

  it("renders both rows for ingresses with identical names in different namespaces", () => {
    const ingresses = [
      makeIngress({ Name: "shared-ingress", Namespace: "team-a" }),
      makeIngress({ Name: "shared-ingress", Namespace: "team-b" }),
    ];
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: ingresses });

    renderView("ctx");

    // Both rows must appear — two cells with the shared name
    expect(screen.getAllByText("shared-ingress").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("team-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("team-b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 items").length).toBeGreaterThan(0);
  });

  it("clicking namespace ResourceLink calls onToggleNamespaceDetail and does not break the view", () => {
    const ingress = makeIngress({ Name: "my-ingress", Namespace: "production" });
    (useGetIngresses as ReturnType<typeof vi.fn>).mockReturnValue({ data: [ingress] });

    renderView();

    const nsLinks = screen.getAllByText("production");
    const nsBtn = nsLinks.find((el) => el.closest("button") !== null);
    expect(nsBtn).toBeTruthy();
    if (!nsBtn) throw new Error("namespace button not found");

    fireEvent.click(nsBtn);

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("production");
    // View must still be intact after click
    expect(screen.getAllByText("my-ingress").length).toBeGreaterThan(0);
  });

  it("renders all five table headers: Name, Namespace, Load Balancers, Rules, Age", () => {
    renderView();

    expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Namespace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Load Balancers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rules").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Age").length).toBeGreaterThan(0);
  });
});
