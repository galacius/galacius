import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";
import type { Secret } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetSecretsMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetSecrets", () => ({
  useGetSecrets: useGetSecretsMock,
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { SecretsView } from "../../SecretsView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(UnifiedTrayProvider, null, children)
    );
}

function makeSecret(overrides: Partial<Secret> = {}): Secret {
  return {
    Name: "test-secret",
    Namespace: "default",
    Labels: [],
    Keys: [],
    Type: "Opaque",
    Age: "1d",
    ...overrides,
  };
}

function renderView() {
  return render(<SecretsView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetSecretsMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("SecretsView", () => {
  it('renders "Secrets" heading and "0 items" count when data is empty', () => {
    renderView();

    expect(screen.getByText("Secrets")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it('renders "Item list is empty" empty state row when no items', () => {
    renderView();

    expect(screen.getByText("No Secrets")).toBeInTheDocument();
  });

  it("renders a single secret with all 6 columns: Name, Namespace, Labels, Keys, Type, Age", () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({
          Name: "my-secret",
          Namespace: "production",
          Labels: ["app=web"],
          Keys: ["password", "token"],
          Type: "kubernetes.io/tls",
          Age: "5d",
        }),
      ],
    });

    renderView();

    expect(screen.getByText("my-secret")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("app=web")).toBeInTheDocument();
    expect(screen.getByText("password, token")).toBeInTheDocument();
    expect(screen.getByText("kubernetes.io/tls")).toBeInTheDocument();
    expect(screen.getByText("5d")).toBeInTheDocument();
  });

  it("displays joined Labels string when non-empty", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Labels: ["app=backend", "env=prod"] })],
    });

    renderView();

    expect(screen.getByText("app=backend, env=prod")).toBeInTheDocument();
  });

  it('shows "—" for Labels when Labels array is empty', () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Labels: [] })],
    });

    renderView();

    const rows = screen.getAllByRole("row").slice(1);
    const labelsCell = rows[0].querySelectorAll("td")[3];
    expect(labelsCell?.textContent).toBe("—");
  });

  it("displays joined Keys string when non-empty", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Keys: ["username", "password"] })],
    });

    renderView();

    expect(screen.getByText("username, password")).toBeInTheDocument();
  });

  it('shows "—" for Keys when Keys array is empty', () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Keys: [] })],
    });

    renderView();

    const rows = screen.getAllByRole("row").slice(1);
    const keysCell = rows[0].querySelectorAll("td")[4];
    expect(keysCell?.textContent).toBe("—");
  });

  it("renders all rows when multiple secrets are provided", () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({ Name: "secret-alpha", Namespace: "ns-a" }),
        makeSecret({ Name: "secret-beta", Namespace: "ns-b" }),
        makeSecret({ Name: "secret-gamma", Namespace: "ns-c" }),
      ],
    });

    renderView();

    expect(screen.getByText("secret-alpha")).toBeInTheDocument();
    expect(screen.getByText("secret-beta")).toBeInTheDocument();
    expect(screen.getByText("secret-gamma")).toBeInTheDocument();
  });

  it('shows "1 item" (singular) when exactly one secret is present', () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "only-secret" })],
    });

    renderView();

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it('shows "N items" (plural) when multiple secrets are present', () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({ Name: "secret-one" }),
        makeSecret({ Name: "secret-two" }),
        makeSecret({ Name: "secret-three" }),
      ],
    });

    renderView();

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("filters secrets by Name substring (case-insensitive)", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "db-password" }), makeSecret({ Name: "tls-certificate" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "TLS" } });

    expect(screen.getByText("tls-certificate")).toBeInTheDocument();
    expect(screen.queryByText("db-password")).not.toBeInTheDocument();
  });

  it('shows "0 items" and empty state when search matches nothing', () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "db-password" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "nonexistent" } });

    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Secrets")).toBeInTheDocument();
  });

  it("clicking Namespace ResourceLink calls onToggleNamespaceDetail with the correct namespace", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "my-secret", Namespace: "staging" })],
    });

    renderView();

    fireEvent.click(screen.getByText("staging"));

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("staging");
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
  });
});
