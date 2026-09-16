import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PluginManifest } from "../../hooks/data-access/useGetPluginsFromMarketplace";
import { PluginCard } from "../PluginCard";

// Mock plugin manifest for testing
const mockPlugin: PluginManifest = {
  id: "helm",
  name: "Helm",
  description: "Helm package manager for Kubernetes",
  version: "3.15.0",
  repository: "galacius/plugin-helm",
  homepage: "",
  sourceUrl: "",
  minimumHostVersion: "0.1.0",
  maximumHostVersion: "99.99.99",
  os: {
    linux: ["x86_64", "arm64"],
    darwin: ["x86_64", "arm64"],
    windows: ["amd64"],
  },
  bundle: {
    sha256: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    size: 50000000, // 50 MB
  },
  binary: {
    sha256: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    size: 10000000, // 10 MB
  },
  capabilities: [],
  assets: {
    binaryName: "plugin-helm",
    bundleDir: "dist",
  },
};

describe("PluginCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders plugin name and description", () => {
    render(<PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />);

    expect(screen.getByText("Helm")).toBeInTheDocument();
    expect(screen.getByText("Helm package manager for Kubernetes")).toBeInTheDocument();
  });

  describe("Version display logic", () => {
    it("NOT_INSTALLED state: left shows fallback, right is empty (no installed size)", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="NOT_INSTALLED"
          updateAvailable={false}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("Not installed");
      expect(versionText).not.toMatch(/\d+(\.\d+)? (B|KB|MB|GB)/);
    });

    it("READY state with installedVersion and installedSize: left shows installedVersion, right shows installed size", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          installedSize={45000000} // ~42.9 MB
          updateAvailable={false}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const text = metadataSections[0]?.textContent || "";
      expect(text).toContain("v3.15.0");
      expect(text).toMatch(/\d+(\.\d+)? MB/);
      expect(text).not.toMatch(/Not installed/);
    });

    it("READY state with installedVersion and update available: shows installed version in metadata and new version + size in CTA", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.14.0"
          installedSize={45000000}
          updateAvailable={true}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("v3.14.0");

      const button = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.startsWith("Update v3.15.0")
      );
      expect(button).toBeTruthy();
      expect(button?.textContent).toContain("MB");
    });

    it("READY state with undefined installedVersion (legacy plugin): left falls back to 'Installed (version unknown)'", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion={undefined}
          installedSize={45000000}
          updateAvailable={false}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("Installed (version unknown)");
      expect(versionText).toMatch(/\d+(\.\d+)? MB/);
    });

    it("READY state with empty string installedVersion (legacy plugin): left falls back to 'Installed (version unknown)'", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion=""
          installedSize={45000000}
          updateAvailable={false}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("Installed (version unknown)");
      expect(versionText).toMatch(/\d+(\.\d+)? MB/);
    });

    it("INSTALLING state: metadata still shows installed version and installed size", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="INSTALLING"
          installedVersion="v3.14.0"
          installedSize={45000000}
          updateAvailable={false}
          installProgress={50}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toMatch(/\d+(\.\d+)? MB/);
      expect(versionText).toContain("v3.14.0");
    });

    it("INSTALLING state with no prior installedVersion (fresh install): shows skeleton loaders instead of text", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="INSTALLING"
          installProgress={50}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const skeletons = metadataSections[0]?.querySelectorAll(".animate-pulse") || [];
      expect(skeletons.length).toBe(2);
      expect(metadataSections[0]?.textContent).toBe("");
    });

    it("CRASHED state: metadata still shows installed version and installed size", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="CRASHED"
          installedVersion="v3.14.0"
          installedSize={45000000}
          updateAvailable={false}
        />
      );

      const metadataSections = container.querySelectorAll(".text-caption");
      const versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toMatch(/\d+(\.\d+)? MB/);
      expect(versionText).toContain("v3.14.0");
    });
  });

  describe("Update badge visibility", () => {
    it("shows 'Update available' badge when updateAvailable=true and installStatus=READY", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.14.0"
          updateAvailable={true}
        />
      );

      const badgeSpans = Array.from(container.querySelectorAll("span")).filter(
        (s) => s.textContent === "Update available"
      );
      expect(badgeSpans.length).toBeGreaterThan(0);
    });

    it("does not show 'Update available' badge when updateAvailable=false", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
        />
      );

      const badgeSpans = Array.from(container.querySelectorAll("span")).filter(
        (s) => s.textContent === "Update available"
      );
      expect(badgeSpans.length).toBe(0);
    });

    it("does not show 'Update available' badge when installStatus is NOT_INSTALLED", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="NOT_INSTALLED"
          updateAvailable={true}
        />
      );

      const badgeSpans = Array.from(container.querySelectorAll("span")).filter(
        (s) => s.textContent === "Update available"
      );
      expect(badgeSpans.length).toBe(0);
    });
  });

  describe("Button states", () => {
    it("shows 'Install' button when NOT_INSTALLED", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      const button = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.startsWith("Install v")
      );
      expect(button).toBeTruthy();
    });

    it("shows 'Downloading...' button when INSTALLING", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="INSTALLING"
          installProgress={50}
        />
      );

      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Downloading..."
      );
      expect(button).toBeTruthy();
    });

    it("shows 'Installed' button (disabled) when READY and no update available", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
        />
      );

      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Installed"
      );
      expect(button).toBeTruthy();
      expect(button?.hasAttribute("disabled")).toBe(true);
    });

    it("shows 'Update vX.X.X (size)' button when READY and update available", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.14.0"
          updateAvailable={true}
        />
      );

      // bundle (50000000) + binary (10000000) bytes = ~57.2 MB
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Update v3.15.0 (57.2 MB)"
      );
      expect(button).toBeTruthy();
    });

    it("shows 'Retry' button when CRASHED", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="CRASHED" />
      );

      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Retry"
      );
      expect(button).toBeTruthy();
    });

    it("shows 'Incompatible' button when INCOMPATIBLE", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.0.1" installStatus="INCOMPATIBLE" />
      );

      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Incompatible"
      );
      expect(button).toBeTruthy();
    });
  });

  describe("Disable/Enable button visibility (regression: Enable button missing after disable)", () => {
    it("shows the Enable icon button when the plugin is disabled", () => {
      render(<PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="DISABLED" />);

      expect(screen.getByLabelText("Enable plugin")).toBeInTheDocument();
      expect(screen.queryByLabelText("Disable plugin")).not.toBeInTheDocument();
    });

    it("shows the Disable icon button when READY and not disabled", () => {
      render(<PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="READY" />);

      expect(screen.getByLabelText("Disable plugin")).toBeInTheDocument();
      expect(screen.queryByLabelText("Enable plugin")).not.toBeInTheDocument();
    });

    it("shows 'Plugin disabled' footer text and still allows Remove when disabled", () => {
      render(<PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="DISABLED" />);

      expect(screen.getByText("Plugin disabled")).toBeInTheDocument();
      expect(screen.getByLabelText("Remove plugin")).toBeInTheDocument();
    });
  });

  describe("OS compatibility display", () => {
    it("renders all supported OS platforms", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      const text = container.textContent || "";
      expect(text).toMatch(/Linux/);
      expect(text).toMatch(/MacOS/);
      expect(text).toMatch(/Windows/);
    });

    it("highlights the chip matching hostPlatform with the info variant", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          hostPlatform="darwin"
          installStatus="NOT_INSTALLED"
        />
      );

      const chips = Array.from(container.querySelectorAll("span")).filter((s) =>
        /^(Linux|MacOS|Windows) \(/.test(s.textContent || "")
      );
      const macChip = chips.find((c) => c.textContent?.startsWith("MacOS"));
      const linuxChip = chips.find((c) => c.textContent?.startsWith("Linux"));

      expect(macChip?.className).toMatch(/font-semibold/);
      expect(linuxChip?.className).not.toMatch(/font-semibold/);
    });

    it("does not highlight any chip when hostPlatform is undefined", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      const chips = Array.from(container.querySelectorAll("span")).filter((s) =>
        /^(Linux|MacOS|Windows) \(/.test(s.textContent || "")
      );
      expect(chips.every((c) => !c.className.match(/font-semibold/))).toBe(true);
    });

    it("renders installed size in MB in the metadata row", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          installedSize={45000000}
        />
      );

      const text = container.textContent || "";
      expect(text).toMatch(/\d+(\.\d+)? MB/);
    });

    it("renders installed size in KB for installs under 1 MB instead of rounding to 0 MB", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          installedSize={500000} // ~488 KB
        />
      );

      const text = container.textContent || "";
      expect(text).toMatch(/\d+(\.\d+)? KB/);
      expect(text).not.toContain("0 MB");
    });

    it("renders new version size in the Update CTA button", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.14.0"
          updateAvailable={true}
        />
      );

      // bundle (50000000) + binary (10000000) bytes = ~57.2 MB
      const text = container.textContent || "";
      expect(text).toMatch(/\d+(\.\d+)? MB/);
    });
  });

  describe("Edge cases", () => {
    it("handles plugin with no OS variants gracefully", () => {
      const pluginNoOS = {
        ...mockPlugin,
        os: {},
      };

      const { container } = render(
        <PluginCard plugin={pluginNoOS} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      // Should render without crashing
      const heading = container.querySelector("h3");
      expect(heading?.textContent).toBe("Helm");
    });

    it("renders version metadata row correctly with all states", () => {
      const { rerender, container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      // NOT_INSTALLED: left shows fallback, right is empty (no installed size yet)
      let metadataSections = container.querySelectorAll(".text-caption");
      let versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("Not installed");

      // Switch to READY with installed version and installed size
      rerender(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          installedSize={45000000}
          updateAvailable={false}
        />
      );

      metadataSections = container.querySelectorAll(".text-caption");
      versionText = metadataSections[0]?.textContent || "";
      expect(versionText).toContain("v3.15.0");
      expect(versionText).toMatch(/\d+(\.\d+)? MB/);
      expect(versionText).not.toMatch(/Not installed/);
    });
  });

  describe("Version compatibility with v/V prefix handling", () => {
    it("treats plugin as compatible when hostVersion has v prefix and minimumHostVersion doesn't (e.g. v1.7.5 >= 1.7.5)", () => {
      const compatiblePlugin: PluginManifest = {
        ...mockPlugin,
        minimumHostVersion: "1.7.5",
        maximumHostVersion: "999.999.999",
      };

      const { container } = render(
        <PluginCard plugin={compatiblePlugin} hostVersion="v1.7.5" installStatus="NOT_INSTALLED" />
      );

      // Should show Install button (not Incompatible)
      const installButton = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.startsWith("Install v")
      );
      expect(installButton).toBeTruthy();
      expect(installButton?.textContent).not.toContain("Incompatible");
    });
  });

  describe("Remove button", () => {
    it("shows remove button when installStatus is READY", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
        />
      );

      // Find the remove button by aria-label
      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      expect(removeButton).toBeInTheDocument();
    });

    it("shows remove button when installStatus is CRASHED", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="CRASHED"
          installedVersion="v3.15.0"
        />
      );

      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      expect(removeButton).toBeInTheDocument();
    });

    it("does not show remove button when installStatus is NOT_INSTALLED", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="0.1.0" installStatus="NOT_INSTALLED" />
      );

      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      expect(removeButton).not.toBeInTheDocument();
    });

    it("does not show remove button when installStatus is INSTALLING", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="INSTALLING"
          installProgress={50}
        />
      );

      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      expect(removeButton).not.toBeInTheDocument();
    });

    it("does not show remove button when installStatus is INCOMPATIBLE", () => {
      const { container } = render(
        <PluginCard plugin={mockPlugin} hostVersion="99.99.99" installStatus="INCOMPATIBLE" />
      );

      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      expect(removeButton).not.toBeInTheDocument();
    });

    it("clicking remove button opens confirmation dialog", async () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
        />
      );

      const removeButton = container.querySelector(
        '[aria-label="Remove plugin"]'
      ) as HTMLButtonElement;
      expect(removeButton).toBeInTheDocument();

      // Click the remove button
      removeButton.click();

      // Dialog title should appear
      const dialogTitle = await screen.findByText(`Remove Plugin: ${mockPlugin.name}`);
      expect(dialogTitle).toBeInTheDocument();
    });

    it("dialog displays correct confirmation message", async () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
        />
      );

      const removeButton = container.querySelector(
        '[aria-label="Remove plugin"]'
      ) as HTMLButtonElement;
      removeButton.click();

      const confirmMessage = await screen.findByText(
        "This plugin will be permanently removed from your system. You can reinstall it anytime from the marketplace."
      );
      expect(confirmMessage).toBeInTheDocument();
    });

    it("disables remove button when isRemoving is true", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
          isRemoving={true}
        />
      );

      const removeButton = container.querySelector(
        '[aria-label="Remove plugin"]'
      ) as HTMLButtonElement;
      expect(removeButton.disabled).toBe(true);
    });

    it("shows spinner icon when isRemoving is true", () => {
      const { container } = render(
        <PluginCard
          plugin={mockPlugin}
          hostVersion="0.1.0"
          installStatus="READY"
          installedVersion="v3.15.0"
          updateAvailable={false}
          isRemoving={true}
        />
      );

      const removeButton = container.querySelector('[aria-label="Remove plugin"]');
      // Check if the button contains a spinner icon (Loader2Icon with animate-spin class)
      const spinner = removeButton?.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });
});
