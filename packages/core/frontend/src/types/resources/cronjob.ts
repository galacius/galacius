import type { ManagedField } from "./shared";

export interface CronJob {
  Name: string;
  Namespace: string;
  Schedule: string;
  Timezone: string;
  Suspend: boolean;
  Active: number;
  LastSchedule: string;
  Age: string;
  CreatedAt: string;
  Annotations?: Record<string, string>;
  ManagedFields: ManagedField[];
  ConcurrencyPolicy: string;
  SuccessfulJobsHistoryLimit: number;
  FailedJobsHistoryLimit: number;
  LastSuccessfulTime?: string;
  LastSuccessfulTimeAt?: string;
  LastScheduleAt?: string;
  JobParallelism: number;
  JobCompletions: string;
  JobSuspend: boolean;
  JobTTLSecondsAfterFinished: number;
}

export interface CronJobSummary {
  Scheduled: number;
  Suspended: number;
}
