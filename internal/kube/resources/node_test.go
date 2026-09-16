package kubeResources

import (
	"errors"
	"testing"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorNodeLister struct{ err error }

func (e *errorNodeLister) List(_ labels.Selector) ([]*corev1.Node, error) { return nil, e.err }
func (e *errorNodeLister) Get(_ string) (*corev1.Node, error)             { return nil, e.err }

func newNodeLister(nodes ...*corev1.Node) listerscorev1.NodeLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, n := range nodes {
		_ = indexer.Add(n)
	}
	return listerscorev1.NewNodeLister(indexer)
}

func makeNode(name string) *corev1.Node {
	return &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

// formatNodeResource tests

func TestFormatNodeResource_CPU_ExactMultiple_NoSuffix(t *testing.T) {
	q := resource.MustParse("2000m")
	got := formatNodeResource("cpu", q)
	if got != "2" {
		t.Errorf("got %q; want %q", got, "2")
	}
}

func TestFormatNodeResource_CPU_NonMultiple_MilliSuffix(t *testing.T) {
	q := resource.MustParse("250m")
	got := formatNodeResource("cpu", q)
	if got != "250m" {
		t.Errorf("got %q; want %q", got, "250m")
	}
}

func TestFormatNodeResource_Memory_GiB(t *testing.T) {
	q := resource.MustParse("2Gi")
	got := formatNodeResource("memory", q)
	if got != "2.0 GiB" {
		t.Errorf("got %q; want %q", got, "2.0 GiB")
	}
}

func TestFormatNodeResource_Memory_MiB(t *testing.T) {
	q := resource.MustParse("512Mi")
	got := formatNodeResource("memory", q)
	if got != "512.0 MiB" {
		t.Errorf("got %q; want %q", got, "512.0 MiB")
	}
}

func TestFormatNodeResource_Memory_KiB(t *testing.T) {
	q := resource.MustParse("512Ki")
	got := formatNodeResource("memory", q)
	if got != "512.0 KiB" {
		t.Errorf("got %q; want %q", got, "512.0 KiB")
	}
}

func TestFormatNodeResource_Memory_Zero(t *testing.T) {
	q := resource.MustParse("0")
	got := formatNodeResource("memory", q)
	if got != "0" {
		t.Errorf("got %q; want %q", got, "0")
	}
}

func TestFormatNodeResource_EphemeralStorage_SameAsMem(t *testing.T) {
	q := resource.MustParse("1Gi")
	got := formatNodeResource("ephemeral-storage", q)
	if got != "1.0 GiB" {
		t.Errorf("got %q; want %q", got, "1.0 GiB")
	}
}

func TestFormatNodeResource_HugePages_SameAsMem(t *testing.T) {
	q := resource.MustParse("1Gi")
	got := formatNodeResource("hugepages-1Gi", q)
	if got != "1.0 GiB" {
		t.Errorf("got %q; want %q", got, "1.0 GiB")
	}
}

func TestFormatNodeResource_UnknownKey_Passthrough(t *testing.T) {
	q := resource.MustParse("42")
	got := formatNodeResource("vendor.io/gpu", q)
	if got != q.String() {
		t.Errorf("got %q; want %q", got, q.String())
	}
}

// toNode tests

func TestToNode_RoleLabels_ExtractedCorrectly(t *testing.T) {
	n := makeNode("node1")
	n.Labels = map[string]string{
		"node-role.kubernetes.io/control-plane": "",
	}
	got := toNode(n)
	if got.Roles != "control-plane" {
		t.Errorf("Roles = %q; want %q", got.Roles, "control-plane")
	}
}

func TestToNode_NoRoleLabels_RolesNone(t *testing.T) {
	n := makeNode("node1")
	n.Labels = map[string]string{"kubernetes.io/hostname": "node1"}
	got := toNode(n)
	if got.Roles != "<none>" {
		t.Errorf("Roles = %q; want %q", got.Roles, "<none>")
	}
}

func TestToNode_CPUCapacity_PopulatesMilliCoresAndString(t *testing.T) {
	n := makeNode("node1")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceCPU: resource.MustParse("4"),
	}
	got := toNode(n)
	if got.CPUCapMilliCores != 4000 {
		t.Errorf("CPUCapMilliCores = %d; want 4000", got.CPUCapMilliCores)
	}
	if got.CPU != "N/A / 4" {
		t.Errorf("CPU = %q; want %q", got.CPU, "N/A / 4")
	}
}

func TestToNode_NoCPUCapacity_ZeroMilliCoresAndNone(t *testing.T) {
	n := makeNode("node1")
	got := toNode(n)
	if got.CPUCapMilliCores != 0 {
		t.Errorf("CPUCapMilliCores = %d; want 0", got.CPUCapMilliCores)
	}
	if got.CPU != "N/A / <none>" {
		t.Errorf("CPU = %q; want %q", got.CPU, "N/A / <none>")
	}
}

func TestToNode_MemoryCapacity_PopulatesBytes(t *testing.T) {
	n := makeNode("node1")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceMemory: resource.MustParse("8Gi"),
	}
	got := toNode(n)
	if got.MemCapBytes != int64(8*1024*1024*1024) {
		t.Errorf("MemCapBytes = %d; want %d", got.MemCapBytes, int64(8*1024*1024*1024))
	}
}

func TestToNode_DiskCapAndAlloc_DiskStrAndPercent(t *testing.T) {
	n := makeNode("node1")
	cap := resource.MustParse("100Gi")
	alloc := resource.MustParse("80Gi")
	n.Status.Capacity = corev1.ResourceList{corev1.ResourceEphemeralStorage: cap}
	n.Status.Allocatable = corev1.ResourceList{corev1.ResourceEphemeralStorage: alloc}
	got := toNode(n)
	if got.DiskPercent != 20 {
		t.Errorf("DiskPercent = %d; want 20", got.DiskPercent)
	}
	want := "20.0 / 100.0 Gi"
	if got.Disk != want {
		t.Errorf("Disk = %q; want %q", got.Disk, want)
	}
}

func TestToNode_DiskCapOnly_DiskStrNone(t *testing.T) {
	n := makeNode("node1")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceEphemeralStorage: resource.MustParse("100Gi"),
	}
	got := toNode(n)
	if got.Disk != "<none>" {
		t.Errorf("Disk = %q; want %q", got.Disk, "<none>")
	}
}

func TestToNode_Taints_CountReflected(t *testing.T) {
	n := makeNode("node1")
	n.Spec.Taints = []corev1.Taint{
		{Key: "key1", Effect: corev1.TaintEffectNoSchedule},
		{Key: "key2", Effect: corev1.TaintEffectNoExecute},
	}
	got := toNode(n)
	if got.Taints != 2 {
		t.Errorf("Taints = %d; want 2", got.Taints)
	}
}

func TestToNode_NodeInfo_Populated(t *testing.T) {
	n := makeNode("node1")
	n.Status.NodeInfo = corev1.NodeSystemInfo{
		KubeletVersion:          "v1.28.0",
		OperatingSystem:         "linux",
		OSImage:                 "Ubuntu 22.04",
		KernelVersion:           "5.15.0",
		ContainerRuntimeVersion: "containerd://1.7.0",
	}
	got := toNode(n)
	if got.Version != "v1.28.0" {
		t.Errorf("Version = %q; want %q", got.Version, "v1.28.0")
	}
	if got.OS != "linux" {
		t.Errorf("OS = %q; want %q", got.OS, "linux")
	}
	if got.OSImage != "Ubuntu 22.04" {
		t.Errorf("OSImage = %q; want %q", got.OSImage, "Ubuntu 22.04")
	}
	if got.KernelVersion != "5.15.0" {
		t.Errorf("KernelVersion = %q; want %q", got.KernelVersion, "5.15.0")
	}
	if got.ContainerRuntime != "containerd://1.7.0" {
		t.Errorf("ContainerRuntime = %q; want %q", got.ContainerRuntime, "containerd://1.7.0")
	}
}

func TestToNode_Addresses_Populated(t *testing.T) {
	n := makeNode("node1")
	n.Status.Addresses = []corev1.NodeAddress{
		{Type: corev1.NodeInternalIP, Address: "10.0.0.1"},
	}
	got := toNode(n)
	if len(got.Addresses) != 1 {
		t.Fatalf("Addresses length = %d; want 1", len(got.Addresses))
	}
	if got.Addresses[0].Address != "10.0.0.1" {
		t.Errorf("Address = %q; want %q", got.Addresses[0].Address, "10.0.0.1")
	}
}

func TestToNode_Conditions_Populated(t *testing.T) {
	n := makeNode("node1")
	n.Status.Conditions = []corev1.NodeCondition{
		{Type: corev1.NodeReady, Status: corev1.ConditionTrue, Reason: "KubeletReady", Message: "ok"},
	}
	got := toNode(n)
	if len(got.Conditions) != 1 {
		t.Fatalf("Conditions length = %d; want 1", len(got.Conditions))
	}
	if got.Conditions[0].Reason != "KubeletReady" {
		t.Errorf("Reason = %q; want %q", got.Conditions[0].Reason, "KubeletReady")
	}
}

func TestToNode_CapacityMap_Populated(t *testing.T) {
	n := makeNode("node1")
	n.Status.Capacity = corev1.ResourceList{
		corev1.ResourceCPU: resource.MustParse("2"),
	}
	got := toNode(n)
	if got.Capacity["cpu"] != "2" {
		t.Errorf("Capacity[cpu] = %q; want %q", got.Capacity["cpu"], "2")
	}
}

func TestToNode_AllocatableMap_Populated(t *testing.T) {
	n := makeNode("node1")
	n.Status.Allocatable = corev1.ResourceList{
		corev1.ResourceMemory: resource.MustParse("4Gi"),
	}
	got := toNode(n)
	if got.Allocatable["memory"] != "4.0 GiB" {
		t.Errorf("Allocatable[memory] = %q; want %q", got.Allocatable["memory"], "4.0 GiB")
	}
}

func TestToNode_NilLabels_EmptyMap(t *testing.T) {
	n := makeNode("node1")
	n.Labels = nil
	got := toNode(n)
	if got.Labels == nil {
		t.Error("Labels should be non-nil empty map, got nil")
	}
}

func TestToNode_NilAnnotations_EmptyMap(t *testing.T) {
	n := makeNode("node1")
	n.Annotations = nil
	got := toNode(n)
	if got.Annotations == nil {
		t.Error("Annotations should be non-nil empty map, got nil")
	}
}

func TestToNode_ManagedFields_NonNil_ResultNonEmpty(t *testing.T) {
	n := makeNode("node1")
	n.ManagedFields = []metav1.ManagedFieldsEntry{
		{Manager: "kubectl", Operation: metav1.ManagedFieldsOperationApply},
	}
	got := toNode(n)
	if len(got.ManagedFields) != 1 {
		t.Errorf("ManagedFields length = %d; want 1", len(got.ManagedFields))
	}
	if got.ManagedFields[0].Manager != "kubectl" {
		t.Errorf("Manager = %q; want %q", got.ManagedFields[0].Manager, "kubectl")
	}
}

func TestToNode_CreatedAt_RFC3339Format(t *testing.T) {
	n := makeNode("node1")
	got := toNode(n)
	want := fixedTime.Format(time.RFC3339)
	if got.CreatedAt != want {
		t.Errorf("CreatedAt = %q; want %q", got.CreatedAt, want)
	}
}

// ListNodes tests

func TestListNodes_EmptyLister_ReturnsNonNilEmptySlice(t *testing.T) {
	result, err := ListNodes(newNodeLister())
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

func TestListNodes_SingleNode_LengthOneNameMatches(t *testing.T) {
	n := makeNode("worker-1")
	result, err := ListNodes(newNodeLister(n))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result; got %d", len(result))
	}
	if result[0].Name != "worker-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "worker-1")
	}
}

func TestListNodes_MultipleNodes_AllReturned(t *testing.T) {
	result, err := ListNodes(newNodeLister(makeNode("a"), makeNode("b"), makeNode("c")))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 3 {
		t.Errorf("expected 3 results; got %d", len(result))
	}
}

func TestListNodes_ListerError_Propagated(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListNodes(&errorNodeLister{err: sentinel})
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
	if result != nil {
		t.Errorf("expected nil result on error; got %v", result)
	}
}

// GetNodeByName tests

func TestGetNodeByName_Found_ReturnsNode(t *testing.T) {
	n := makeNode("control-plane")
	got, err := GetNodeByName(newNodeLister(n), "control-plane")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Name != "control-plane" {
		t.Errorf("Name = %q; want %q", got.Name, "control-plane")
	}
}

func TestGetNodeByName_NotFound_ErrorPropagated(t *testing.T) {
	sentinel := errors.New("not found")
	_, err := GetNodeByName(&errorNodeLister{err: sentinel}, "missing")
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
}

// ApplyNodeMetrics tests

func TestApplyNodeMetrics_CPUUsage_UpdatesPercentAndString(t *testing.T) {
	nodes := []dto.Node{
		{Name: "node1", CPUCapMilliCores: 4000, CPU: "N/A / 4"},
	}
	usage := map[string]dto.NodeUsage{
		"node1": {CPUMilliCores: 2000},
	}
	result := ApplyNodeMetrics(nodes, usage)
	if result[0].CPUPercent != 50 {
		t.Errorf("CPUPercent = %d; want 50", result[0].CPUPercent)
	}
	if result[0].CPU != "2.0 / 4" {
		t.Errorf("CPU = %q; want %q", result[0].CPU, "2.0 / 4")
	}
}

func TestApplyNodeMetrics_MemUsage_UpdatesPercentAndString(t *testing.T) {
	memCap := int64(8 * 1024 * 1024 * 1024)
	nodes := []dto.Node{
		{Name: "node1", MemCapBytes: memCap, MemCapStr: "8.0", Memory: "N/A / 8.0 Gi"},
	}
	usage := map[string]dto.NodeUsage{
		"node1": {MemoryBytes: memCap / 2},
	}
	result := ApplyNodeMetrics(nodes, usage)
	if result[0].MemPercent != 50 {
		t.Errorf("MemPercent = %d; want 50", result[0].MemPercent)
	}
}

func TestApplyNodeMetrics_ZeroCPUCap_NoDivideByZero(t *testing.T) {
	nodes := []dto.Node{
		{Name: "node1", CPUCapMilliCores: 0, CPU: "N/A / <none>"},
	}
	usage := map[string]dto.NodeUsage{
		"node1": {CPUMilliCores: 1000},
	}
	result := ApplyNodeMetrics(nodes, usage)
	if result[0].CPUPercent != 0 {
		t.Errorf("CPUPercent = %d; want 0 when cap is 0", result[0].CPUPercent)
	}
}

func TestApplyNodeMetrics_ZeroMemCap_NoDivideByZero(t *testing.T) {
	nodes := []dto.Node{
		{Name: "node1", MemCapBytes: 0, Memory: "N/A / <none> Gi"},
	}
	usage := map[string]dto.NodeUsage{
		"node1": {MemoryBytes: 1024},
	}
	result := ApplyNodeMetrics(nodes, usage)
	if result[0].MemPercent != 0 {
		t.Errorf("MemPercent = %d; want 0 when cap is 0", result[0].MemPercent)
	}
}

func TestApplyNodeMetrics_NodeNotInUsageMap_FieldsUnchanged(t *testing.T) {
	nodes := []dto.Node{
		{Name: "node1", CPU: "N/A / 4", Memory: "N/A / 8.0 Gi", CPUPercent: 0, MemPercent: 0},
	}
	result := ApplyNodeMetrics(nodes, map[string]dto.NodeUsage{})
	if result[0].CPU != "N/A / 4" {
		t.Errorf("CPU = %q; want %q", result[0].CPU, "N/A / 4")
	}
	if result[0].Memory != "N/A / 8.0 Gi" {
		t.Errorf("Memory = %q; want %q", result[0].Memory, "N/A / 8.0 Gi")
	}
	if result[0].CPUPercent != 0 {
		t.Errorf("CPUPercent = %d; want 0", result[0].CPUPercent)
	}
}
