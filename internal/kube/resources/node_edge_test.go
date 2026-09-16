package kubeResources

import (
	"strings"
	"testing"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// — formatNodeResource edge cases —

func TestFormatNodeResource_ExactlyOneByte_FormatsB(t *testing.T) {
	got := formatNodeResource("memory", resource.MustParse("1"))
	if got != "1 B" {
		t.Errorf("got %q; want %q", got, "1 B")
	}
}

func TestFormatNodeResource_ExactlyOneKiB_FormatsKiB(t *testing.T) {
	got := formatNodeResource("memory", resource.MustParse("1Ki"))
	if got != "1.0 KiB" {
		t.Errorf("got %q; want %q", got, "1.0 KiB")
	}
}

func TestFormatNodeResource_ExactlyOneMiB_FormatsMiB(t *testing.T) {
	got := formatNodeResource("memory", resource.MustParse("1Mi"))
	if got != "1.0 MiB" {
		t.Errorf("got %q; want %q", got, "1.0 MiB")
	}
}

func TestFormatNodeResource_ExactlyOneGiB_FormatsGiB(t *testing.T) {
	got := formatNodeResource("ephemeral-storage", resource.MustParse("1Gi"))
	if got != "1.0 GiB" {
		t.Errorf("got %q; want %q", got, "1.0 GiB")
	}
}

func TestFormatNodeResource_HugepagesKey_UsesMemoryByteFormat(t *testing.T) {
	got := formatNodeResource("hugepages-2Mi", resource.MustParse("2Mi"))
	if got != "2.0 MiB" {
		t.Errorf("hugepages-2Mi: got %q; want %q", got, "2.0 MiB")
	}
}

func TestFormatNodeResource_CPU_OneMillicore_MilliSuffix(t *testing.T) {
	got := formatNodeResource("cpu", resource.MustParse("1m"))
	if got != "1m" {
		t.Errorf("got %q; want %q", got, "1m")
	}
}

func TestFormatNodeResource_CPU_1000m_WholeNumber(t *testing.T) {
	got := formatNodeResource("cpu", resource.MustParse("1"))
	if got != "1" {
		t.Errorf("got %q; want %q", got, "1")
	}
}

func TestFormatNodeResource_EmptyKey_PassthroughQString(t *testing.T) {
	q := resource.MustParse("42")
	got := formatNodeResource("", q)
	if got != q.String() {
		t.Errorf("got %q; want %q", got, q.String())
	}
}

// — toNode edge cases —

func TestToNode_MultipleRoleLabels_RolesContainsBothAndOneComma(t *testing.T) {
	n := makeNode("multi-role")
	n.Labels = map[string]string{
		"node-role.kubernetes.io/control-plane": "",
		"node-role.kubernetes.io/worker":        "",
	}
	got := toNode(n)
	if strings.Count(got.Roles, ",") != 1 {
		t.Errorf("Roles = %q; expected exactly one comma (two roles)", got.Roles)
	}
	if !strings.Contains(got.Roles, "control-plane") {
		t.Errorf("Roles = %q; missing %q", got.Roles, "control-plane")
	}
	if !strings.Contains(got.Roles, "worker") {
		t.Errorf("Roles = %q; missing %q", got.Roles, "worker")
	}
}

func TestToNode_ZeroCreationTimestamp_CreatedAtIsValidRFC3339(t *testing.T) {
	n := &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: "zero-ts"},
	}
	got := toNode(n)
	if _, err := time.Parse(time.RFC3339, got.CreatedAt); err != nil {
		t.Errorf("CreatedAt %q is not valid RFC3339: %v", got.CreatedAt, err)
	}
}

func TestToNode_ManagedFieldsEmptySlice_ReturnsNonNilEmptySlice(t *testing.T) {
	n := makeNode("mf-node")
	n.ManagedFields = []metav1.ManagedFieldsEntry{}
	got := toNode(n)
	if got.ManagedFields == nil {
		t.Error("ManagedFields must not be nil for empty input slice")
	}
	if len(got.ManagedFields) != 0 {
		t.Errorf("ManagedFields length = %d; want 0", len(got.ManagedFields))
	}
}

func TestToNode_DiskCapEqualsAlloc_ZeroUsedAndZeroPercent(t *testing.T) {
	n := makeNode("full-disk")
	cap := resource.MustParse("10Gi")
	n.Status.Capacity = corev1.ResourceList{corev1.ResourceEphemeralStorage: cap}
	n.Status.Allocatable = corev1.ResourceList{corev1.ResourceEphemeralStorage: cap}
	got := toNode(n)
	if got.DiskPercent != 0 {
		t.Errorf("DiskPercent = %d; want 0", got.DiskPercent)
	}
	if !strings.HasPrefix(got.Disk, "0.0 /") {
		t.Errorf("Disk = %q; want prefix %q", got.Disk, "0.0 /")
	}
}

func TestToNode_DiskAllocGreaterThanCap_DiskPercentZero(t *testing.T) {
	n := makeNode("over-alloc")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceEphemeralStorage: resource.MustParse("5Gi"),
	}
	n.Status.Allocatable = corev1.ResourceList{
		corev1.ResourceEphemeralStorage: resource.MustParse("10Gi"),
	}
	got := toNode(n)
	if got.DiskPercent != 0 {
		t.Errorf("DiskPercent = %d; want 0 when allocatable > capacity", got.DiskPercent)
	}
}

func TestToNode_ManyTaints_CountCorrect(t *testing.T) {
	n := makeNode("tainted")
	n.Spec.Taints = []corev1.Taint{
		{Key: "a", Effect: corev1.TaintEffectNoSchedule},
		{Key: "b", Effect: corev1.TaintEffectNoExecute},
		{Key: "c", Effect: corev1.TaintEffectPreferNoSchedule},
	}
	got := toNode(n)
	if got.Taints != 3 {
		t.Errorf("Taints = %d; want 3", got.Taints)
	}
}

func TestToNode_MultipleAddresses_SliceLengthMatches(t *testing.T) {
	n := makeNode("multi-addr")
	n.Status.Addresses = []corev1.NodeAddress{
		{Type: corev1.NodeInternalIP, Address: "10.0.0.1"},
		{Type: corev1.NodeExternalIP, Address: "1.2.3.4"},
		{Type: corev1.NodeHostName, Address: "node-1"},
	}
	got := toNode(n)
	if len(got.Addresses) != 3 {
		t.Errorf("Addresses length = %d; want 3", len(got.Addresses))
	}
}

func TestToNode_CapacityWithCPUMemoryDisk_AllKeysPresent(t *testing.T) {
	n := makeNode("full-cap")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceCPU:              resource.MustParse("4"),
		corev1.ResourceMemory:           resource.MustParse("8Gi"),
		corev1.ResourceEphemeralStorage: resource.MustParse("100Gi"),
	}
	got := toNode(n)
	for _, key := range []string{"cpu", "memory", "ephemeral-storage"} {
		if _, ok := got.Capacity[key]; !ok {
			t.Errorf("Capacity missing key %q", key)
		}
	}
}

// — ListNodes edge cases —

func TestListNodes_FiveNodes_AllReturned(t *testing.T) {
	nodes := []*corev1.Node{
		makeNode("n1"), makeNode("n2"), makeNode("n3"), makeNode("n4"), makeNode("n5"),
	}
	result, err := ListNodes(newNodeLister(nodes...))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 5 {
		t.Errorf("len = %d; want 5", len(result))
	}
}

// — GetNodeByName edge cases —

func TestGetNodeByName_NameMismatch_ReturnsError(t *testing.T) {
	lister := newNodeLister(makeNode("node-a"))
	_, err := GetNodeByName(lister, "node-b")
	if err == nil {
		t.Error("expected error for name mismatch; got nil")
	}
}

// — ApplyNodeMetrics edge cases —

func TestApplyNodeMetrics_EmptyNodesSlice_NoPanic(t *testing.T) {
	result := ApplyNodeMetrics([]dto.Node{}, map[string]dto.NodeUsage{"x": {CPUMilliCores: 100}})
	if len(result) != 0 {
		t.Errorf("expected empty slice; got %d items", len(result))
	}
}

func TestApplyNodeMetrics_PartialUsage_OnlyMatchingNodeUpdated(t *testing.T) {
	nodes := []dto.Node{
		{Name: "n1", CPUCapMilliCores: 2000, MemCapBytes: 4 * 1024 * 1024 * 1024, MemCapStr: "4.0", CPU: "N/A / 2", Memory: "N/A / 4.0 Gi"},
		{Name: "n2", CPUCapMilliCores: 2000, MemCapBytes: 4 * 1024 * 1024 * 1024, MemCapStr: "4.0", CPU: "N/A / 2", Memory: "N/A / 4.0 Gi"},
	}
	result := ApplyNodeMetrics(nodes, map[string]dto.NodeUsage{
		"n1": {CPUMilliCores: 500, MemoryBytes: 1 * 1024 * 1024 * 1024},
	})
	if result[0].CPU == "N/A / 2" {
		t.Error("n1 CPU should have been updated")
	}
	if result[1].CPU != "N/A / 2" {
		t.Errorf("n2 CPU = %q; want unchanged", result[1].CPU)
	}
}

func TestApplyNodeMetrics_CPUUsageExceedsCap_ClampedTo100(t *testing.T) {
	nodes := []dto.Node{
		{Name: "n1", CPUCapMilliCores: 1000, MemCapBytes: 1024 * 1024 * 1024, MemCapStr: "1.0"},
	}
	result := ApplyNodeMetrics(nodes, map[string]dto.NodeUsage{
		"n1": {CPUMilliCores: 1500, MemoryBytes: 0},
	})
	if result[0].CPUPercent != 100 {
		t.Errorf("CPUPercent = %d; want 100 (clamped)", result[0].CPUPercent)
	}
}

func TestApplyNodeMetrics_MemUsageExceedsCap_ClampedTo100(t *testing.T) {
	cap := int64(1024 * 1024 * 1024)
	nodes := []dto.Node{
		{Name: "n1", CPUCapMilliCores: 1000, MemCapBytes: cap, MemCapStr: "1.0"},
	}
	result := ApplyNodeMetrics(nodes, map[string]dto.NodeUsage{
		"n1": {CPUMilliCores: 0, MemoryBytes: cap * 2},
	})
	if result[0].MemPercent != 100 {
		t.Errorf("MemPercent = %d; want 100 (clamped)", result[0].MemPercent)
	}
}

func TestApplyNodeMetrics_CPUStringFormat_FloatSlashInteger(t *testing.T) {
	nodes := []dto.Node{
		{Name: "n1", CPUCapMilliCores: 4000, MemCapBytes: 8 * 1024 * 1024 * 1024, MemCapStr: "8.0"},
	}
	result := ApplyNodeMetrics(nodes, map[string]dto.NodeUsage{
		"n1": {CPUMilliCores: 1500, MemoryBytes: 0},
	})
	if !strings.HasPrefix(result[0].CPU, "1.5 /") {
		t.Errorf("CPU = %q; want prefix %q", result[0].CPU, "1.5 /")
	}
	if !strings.Contains(result[0].CPU, "/ 4") {
		t.Errorf("CPU = %q; want integer cap after slash", result[0].CPU)
	}
}

// — Unschedulable field edge cases —

func TestToNode_UnschedulableFalse_StoredCorrectly(t *testing.T) {
	n := makeNode("sched-node")
	n.Spec.Unschedulable = false
	got := toNode(n)
	if got.Unschedulable != false {
		t.Errorf("Unschedulable = %v; want false", got.Unschedulable)
	}
}

func TestToNode_UnschedulableTrue_StoredCorrectly(t *testing.T) {
	n := makeNode("unsched-node")
	n.Spec.Unschedulable = true
	got := toNode(n)
	if got.Unschedulable != true {
		t.Errorf("Unschedulable = %v; want true", got.Unschedulable)
	}
}

/*
COVERAGE_GAPS:
- sigsyaml.JSONToYAML error path inside ManagedFields loop: triggered only when
  mf.FieldsV1.GetRawBytes() returns non-empty bytes that are invalid JSON. The
  metav1.FieldsV1 struct's internal byte slice is unexported; there is no public
  constructor that lets a test inject malformed raw bytes without unsafe/reflection.
- mf.FieldsV1.GetRawBytes() non-empty valid JSON path (fieldsYAML != ""): same
  constraint — FieldsV1 bytes cannot be set via the public API in test code.
- Affinities marshal error path (line 365 pod.go, 148 deployment.go): sigsyaml.Marshal
  can only fail on unexported fields or non-serializable types in the input struct, which
  is controlled by k8s.io/api types and not injectable via public test API.
*/
