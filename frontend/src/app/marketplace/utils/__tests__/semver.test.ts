import { describe, expect, it } from "vitest";
import { compareVersions } from "../semver";

describe("compareVersions", () => {
  describe("Version prefix handling (v/V stripping)", () => {
    it("compares v1.7.5 with 1.7.5 as equal (leading v on first arg)", () => {
      const result = compareVersions("v1.7.5", "1.7.5");
      expect(result).toBe(0);
    });

    it("compares V1.7.5 with 1.7.5 as equal (uppercase V on first arg)", () => {
      const result = compareVersions("V1.7.5", "1.7.5");
      expect(result).toBe(0);
    });

    it("compares 1.7.5 with v1.7.5 as equal (leading v on second arg)", () => {
      const result = compareVersions("1.7.5", "v1.7.5");
      expect(result).toBe(0);
    });

    it("compares both args with v prefix: v1.7.5 vs v2.0.0 correctly", () => {
      const result = compareVersions("v1.7.5", "v2.0.0");
      expect(result).toBe(-1);
    });

    it("compares both args with mixed case: V1.7.5 vs v2.0.0 correctly", () => {
      const result = compareVersions("V1.7.5", "v2.0.0");
      expect(result).toBe(-1);
    });
  });

  describe("Major version comparison", () => {
    it("returns 1 when v1 major > v2 major: v1.7.5 vs 1.7.4", () => {
      const result = compareVersions("v1.7.5", "1.7.4");
      expect(result).toBe(1);
    });

    it("returns -1 when v1 major < v2 major: v1.7.5 vs 1.7.6", () => {
      const result = compareVersions("v1.7.5", "1.7.6");
      expect(result).toBe(-1);
    });

    it("returns 1 when v1 major > v2 major: 2.0.0 vs 1.9.9", () => {
      const result = compareVersions("2.0.0", "1.9.9");
      expect(result).toBe(1);
    });

    it("returns -1 when v1 major < v2 major: 1.9.9 vs 2.0.0", () => {
      const result = compareVersions("1.9.9", "2.0.0");
      expect(result).toBe(-1);
    });
  });

  describe("Minor version comparison", () => {
    it("returns 1 when major equal, v1 minor > v2 minor: 1.2.0 vs 1.0.0", () => {
      const result = compareVersions("1.2.0", "1.0.0");
      expect(result).toBe(1);
    });

    it("returns -1 when major equal, v1 minor < v2 minor: 1.0.0 vs 1.2.0", () => {
      const result = compareVersions("1.0.0", "1.2.0");
      expect(result).toBe(-1);
    });

    it("returns 0 when major and minor equal: 1.2.0 vs 1.2.0", () => {
      const result = compareVersions("1.2.0", "1.2.0");
      expect(result).toBe(0);
    });
  });

  describe("Patch version comparison", () => {
    it("returns 1 when major and minor equal, v1 patch > v2 patch: 1.2.5 vs 1.2.3", () => {
      const result = compareVersions("1.2.5", "1.2.3");
      expect(result).toBe(1);
    });

    it("returns -1 when major and minor equal, v1 patch < v2 patch: 1.2.3 vs 1.2.5", () => {
      const result = compareVersions("1.2.3", "1.2.5");
      expect(result).toBe(-1);
    });

    it("returns 0 when all versions equal: 1.2.3 vs 1.2.3", () => {
      const result = compareVersions("1.2.3", "1.2.3");
      expect(result).toBe(0);
    });
  });

  describe("Bare semver (no prefix) regression", () => {
    it("compares two bare versions correctly: 1.2.0 vs 1.0.0 returns 1", () => {
      const result = compareVersions("1.2.0", "1.0.0");
      expect(result).toBe(1);
    });

    it("compares two bare versions correctly: 1.0.0 vs 1.2.0 returns -1", () => {
      const result = compareVersions("1.0.0", "1.2.0");
      expect(result).toBe(-1);
    });

    it("compares two bare versions correctly: 1.0.0 vs 1.0.0 returns 0", () => {
      const result = compareVersions("1.0.0", "1.0.0");
      expect(result).toBe(0);
    });
  });

  describe("App version compatibility scenario", () => {
    it("app v1.7.5 >= minimum host version 1.7.5 (with prefix stripping)", () => {
      const hostVersion = "v1.7.5";
      const minimumHostVersion = "1.7.5";
      const result = compareVersions(hostVersion, minimumHostVersion);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("app v1.7.5 <= maximum host version 999.999.999", () => {
      const hostVersion = "v1.7.5";
      const maximumHostVersion = "999.999.999";
      const result = compareVersions(hostVersion, maximumHostVersion);
      expect(result).toBeLessThanOrEqual(0);
    });
  });
});
