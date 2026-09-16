package kubeResources

import (
	"testing"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
	"k8s.io/client-go/tools/cache"
)

func newJobLister(jobs ...*batchv1.Job) listersbatchv1.JobLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, job := range jobs {
		_ = indexer.Add(job)
	}
	return listersbatchv1.NewJobLister(indexer)
}

func makeJob(name, namespace string) *batchv1.Job {
	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: batchv1.JobSpec{},
	}
}

func TestListJobs_SingleNamespace(t *testing.T) {
	job := makeJob("my-job", "production")
	lister := newJobLister(job)

	result, err := ListJobs(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-job" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-job")
	}
}

func TestListJobs_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	job1 := makeJob("job-a", "ns-a")
	job2 := makeJob("job-b", "ns-b")
	lister := newJobLister(job1, job2)

	result, err := ListJobs(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListJobs_SpecificNamespaceFilters(t *testing.T) {
	job1 := makeJob("job-a", "ns-a")
	job2 := makeJob("job-b", "ns-b")
	lister := newJobLister(job1, job2)

	result, err := ListJobs(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "job-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "job-a")
	}
}

func TestListJobs_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newJobLister()

	result, err := ListJobs(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestGetJobByName_Found(t *testing.T) {
	job := makeJob("my-job", "production")
	lister := newJobLister(job)

	result, err := GetJobByName(lister, "production", "my-job")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-job" {
		t.Errorf("Name = %q; want %q", result.Name, "my-job")
	}
}

func TestGetJobByName_Age_NonZeroTimestamp(t *testing.T) {
	job := makeJob("my-job", "default")
	lister := newJobLister(job)

	result, err := GetJobByName(lister, "default", "my-job")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToJob_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "job",
			Namespace: "default",
		},
		Spec: batchv1.JobSpec{},
	}
	got := toJob(job)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToJob_WithStatus(t *testing.T) {
	completions := int32(3)
	succeeded := int32(2)
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-job",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: batchv1.JobSpec{
			Completions: &completions,
		},
		Status: batchv1.JobStatus{
			Succeeded: succeeded,
		},
	}
	got := toJob(job)
	if got.Succeeded != 2 {
		t.Errorf("Succeeded = %d; want 2", got.Succeeded)
	}
}

func TestToJob_PodsStatuses_OmitsZeroCounts(t *testing.T) {
	ready := int32(1)
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-job",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: batchv1.JobStatus{
			Active:    2,
			Ready:     &ready,
			Succeeded: 3,
		},
	}
	got := toJob(job)
	want := []string{"2 Active", "1 Ready", "3 Succeeded"}
	if len(got.PodsStatuses) != len(want) {
		t.Fatalf("PodsStatuses = %v; want %v", got.PodsStatuses, want)
	}
	for i, s := range want {
		if got.PodsStatuses[i] != s {
			t.Errorf("PodsStatuses[%d] = %q; want %q", i, got.PodsStatuses[i], s)
		}
	}
}

func TestToJob_PodsStatuses_AllZeroCounts_ReturnsEmptyNotNil(t *testing.T) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-job",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: batchv1.JobStatus{},
	}
	got := toJob(job)
	if got.PodsStatuses == nil {
		t.Fatal("PodsStatuses must not be nil when all counts are zero, to avoid marshaling as JSON null")
	}
	if len(got.PodsStatuses) != 0 {
		t.Errorf("PodsStatuses = %v; want empty", got.PodsStatuses)
	}
}

func TestToJob_NoCompletions(t *testing.T) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-job",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: batchv1.JobSpec{},
	}
	got := toJob(job)
	if got.Completions != 1 {
		t.Errorf("Completions = %d; want 1 (default)", got.Completions)
	}
}

// — SummarizeJobs tests —

// TestSummarizeJobs_EmptyList verifies zero summary for empty job list.
func TestSummarizeJobs_EmptyList(t *testing.T) {
	summary := SummarizeJobs([]*batchv1.Job{})
	if summary.Succeeded != 0 || summary.Failed != 0 || summary.Pending != 0 {
		t.Errorf("empty list returned non-zero summary: %+v", summary)
	}
}

// TestSummarizeJobs_AllComplete verifies jobs with Complete condition count as succeeded.
func TestSummarizeJobs_AllComplete(t *testing.T) {
	jobs := []*batchv1.Job{
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobComplete, Status: corev1.ConditionTrue},
				},
			},
		},
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobComplete, Status: corev1.ConditionTrue},
				},
			},
		},
	}
	summary := SummarizeJobs(jobs)
	if summary.Succeeded != 2 {
		t.Errorf("Succeeded = %d; want 2", summary.Succeeded)
	}
	if summary.Failed != 0 {
		t.Errorf("Failed = %d; want 0", summary.Failed)
	}
	if summary.Pending != 0 {
		t.Errorf("Pending = %d; want 0", summary.Pending)
	}
}

// TestSummarizeJobs_AllFailed verifies jobs with Failed condition count as failed.
func TestSummarizeJobs_AllFailed(t *testing.T) {
	jobs := []*batchv1.Job{
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobFailed, Status: corev1.ConditionTrue},
				},
			},
		},
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobFailed, Status: corev1.ConditionTrue},
				},
			},
		},
	}
	summary := SummarizeJobs(jobs)
	if summary.Succeeded != 0 {
		t.Errorf("Succeeded = %d; want 0", summary.Succeeded)
	}
	if summary.Failed != 2 {
		t.Errorf("Failed = %d; want 2", summary.Failed)
	}
	if summary.Pending != 0 {
		t.Errorf("Pending = %d; want 0", summary.Pending)
	}
}

// TestSummarizeJobs_NeitherCompleteNorFailed_CountAsPending verifies jobs without Complete/Failed count as pending.
func TestSummarizeJobs_NeitherCompleteNorFailed_CountAsPending(t *testing.T) {
	jobs := []*batchv1.Job{
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobSuspended, Status: corev1.ConditionFalse},
				},
			},
		},
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{},
			},
		},
	}
	summary := SummarizeJobs(jobs)
	if summary.Succeeded != 0 {
		t.Errorf("Succeeded = %d; want 0", summary.Succeeded)
	}
	if summary.Failed != 0 {
		t.Errorf("Failed = %d; want 0", summary.Failed)
	}
	if summary.Pending != 2 {
		t.Errorf("Pending = %d; want 2 (jobs without Complete/Failed)", summary.Pending)
	}
}

// TestSummarizeJobs_Mixed verifies a mix of complete, failed, and pending jobs.
func TestSummarizeJobs_Mixed(t *testing.T) {
	jobs := []*batchv1.Job{
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobComplete, Status: corev1.ConditionTrue},
				},
			},
		},
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobFailed, Status: corev1.ConditionTrue},
				},
			},
		},
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{},
			},
		},
	}
	summary := SummarizeJobs(jobs)
	if summary.Succeeded != 1 {
		t.Errorf("Succeeded = %d; want 1", summary.Succeeded)
	}
	if summary.Failed != 1 {
		t.Errorf("Failed = %d; want 1", summary.Failed)
	}
	if summary.Pending != 1 {
		t.Errorf("Pending = %d; want 1", summary.Pending)
	}
}

// TestSummarizeJobs_BothCompleteAndFailed_CompleteTakesPriority verifies if both Complete and Failed are present, Succeeded is incremented.
func TestSummarizeJobs_BothCompleteAndFailed_CompleteTakesPriority(t *testing.T) {
	jobs := []*batchv1.Job{
		{
			Status: batchv1.JobStatus{
				Conditions: []batchv1.JobCondition{
					{Type: batchv1.JobComplete, Status: corev1.ConditionTrue},
					{Type: batchv1.JobFailed, Status: corev1.ConditionTrue},
				},
			},
		},
	}
	summary := SummarizeJobs(jobs)
	if summary.Succeeded != 1 {
		t.Errorf("Succeeded = %d; want 1 (Complete takes priority)", summary.Succeeded)
	}
	if summary.Failed != 0 {
		t.Errorf("Failed = %d; want 0", summary.Failed)
	}
	if summary.Pending != 0 {
		t.Errorf("Pending = %d; want 0", summary.Pending)
	}
}
