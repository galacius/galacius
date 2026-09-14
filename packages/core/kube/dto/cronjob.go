package dto

type CronJobRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type CronJob struct {
	Name         string
	Namespace    string
	Schedule     string
	Timezone     string
	Suspend      bool
	Active       int
	LastSchedule string
	Age          string

	CreatedAt                  string
	Annotations                map[string]string
	ManagedFields              []ManagedField
	ConcurrencyPolicy          string
	SuccessfulJobsHistoryLimit int
	FailedJobsHistoryLimit     int
	LastSuccessfulTime         string
	LastSuccessfulTimeAt       string
	LastScheduleAt             string
	JobParallelism             int
	JobCompletions             string
	JobSuspend                 bool
	JobTTLSecondsAfterFinished int32
}

type CronJobSummary struct {
	Scheduled int
	Suspended int
}
