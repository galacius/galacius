export {
  GetJobByName,
  GetJobYAML,
  GetJobsSummary,
  ListJobs,
  UnwatchJobDetail,
  UpdateJobYAML,
  WatchJobDetail,
} from "@wailsjs/go/app/App";

export type { JobCondition, Job, JobSummary } from "@galacius/core";
