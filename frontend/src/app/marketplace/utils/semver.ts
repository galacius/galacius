// Simple version comparison (major.minor.patch). Strips a leading v/V since
// release builds report the host version as e.g. "v1.7.5" (ldflags -X main.Version=vX.Y.Z)
// while plugin manifests use bare semver like "1.7.5".
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/^v/i, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};
