import { useEffect, useState } from "react";

export type SectionSaveStatus = "idle" | "saving" | "saved" | "error";

export function saveLabel(status: SectionSaveStatus): string {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved!";
  return "Save";
}

export const useSectionSaveState = () => {
  const [status, setStatus] = useState<SectionSaveStatus>("idle");

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  return [status, setStatus] as const;
};
