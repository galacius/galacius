import { toString as cronToString } from "cronstrue";

export function getCronDescription(schedule: string): string | null {
  try {
    return cronToString(schedule);
  } catch {
    return null;
  }
}
