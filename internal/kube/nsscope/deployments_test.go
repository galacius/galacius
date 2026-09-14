package nsscope

import (
	"fmt"
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newDeployment(namespace, name string) *appsv1.Deployment {
	return &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewDeploymentsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newDeployment("ns-a", "a1"), newDeployment("ns-a", "a2"),
		newDeployment("ns-b", "b1"),
		newDeployment("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewDeploymentsResource(cs, func() cache.SharedIndexInformer { return factory.Apps().V1().Deployments().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing deployments: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 deployments across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no deployments from unselected namespace ns-c, got %v", d)
		}
	}
}

// TestNewDeploymentsResourceClusterWideSurvivesRepeatedRescope guards
// against a regression where returning to cluster-wide scope (Rescope(nil))
// a second time silently freezes: NewClusterWideInformer here (like
// production's resources.go) is backed by a SharedInformerFactory singleton
// — the same *SharedIndexInformer instance on every call — and
// client-go's SharedIndexInformer.Run can only be started once per
// instance. If ScopedResource naively called Run again on the reused
// informer's already-closed group, or bound its one Run call to a
// transient group's stop channel instead of a longer-lived one, the second
// cluster-wide view would keep returning only the data visible at the
// first cluster-wide Rescope, ignoring anything added afterward.
func TestNewDeploymentsResourceClusterWideSurvivesRepeatedRescope(t *testing.T) {
	cs := fake.NewSimpleClientset(newDeployment("ns-a", "a1"))
	factory := informers.NewSharedInformerFactory(cs, 0)
	globalStop := make(chan struct{})
	defer close(globalStop)
	r := NewDeploymentsResource(cs, func() cache.SharedIndexInformer { return factory.Apps().V1().Deployments().Informer() }, nil, nil, globalStop)
	defer r.Stop()

	// Bootstrap (New calls Rescope(nil)) already put us in cluster-wide
	// scope; confirm it sees the one deployment that exists so far.
	<-r.SyncedChan()
	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing deployments: %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("expected 1 deployment before switching away, got %d", len(all))
	}

	// Switch to a specific namespace and back to cluster-wide, simulating a
	// user picking a namespace then clearing the filter.
	r.Rescope([]string{"ns-a"})
	<-r.SyncedChan()
	r.Rescope(nil)
	<-r.SyncedChan()

	// A deployment added after the first cluster-wide scope must still show
	// up in this SECOND cluster-wide view — proving its informer is still
	// actually running, not frozen on its first snapshot.
	if _, err := cs.AppsV1().Deployments("ns-b").Create(t.Context(), newDeployment("ns-b", "b1"), metav1.CreateOptions{}); err != nil {
		t.Fatalf("failed to create deployment: %v", err)
	}

	deadline := time.After(2 * time.Second)
	for {
		all, err = r.Lister().List(labels.Everything())
		if err != nil {
			t.Fatalf("unexpected error listing deployments: %v", err)
		}
		if len(all) == 2 {
			break
		}
		select {
		case <-deadline:
			t.Fatalf("expected the second cluster-wide view to observe the newly created deployment within 2s, got %d deployments", len(all))
		case <-time.After(10 * time.Millisecond):
		}
	}
}

func TestNewDeploymentsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedDeploymentInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newDeployment(ns, "dep"))
	}
	objs = append(objs, newDeployment("ns-other", "dep"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewDeploymentsResource(cs, func() cache.SharedIndexInformer { return factory.Apps().V1().Deployments().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing deployments: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d deployments, got %d", len(namespaces)+1, len(all))
	}
}
