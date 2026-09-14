package kubeResources

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
	"k8s.io/client-go/tools/cache"
)

// errorIngressLister always returns a fixed error from List / namespaced List.
type errorIngressLister struct{ err error }

func (e *errorIngressLister) List(_ labels.Selector) ([]*networkingv1.Ingress, error) {
	return nil, e.err
}
func (e *errorIngressLister) Ingresses(_ string) listersnetworkingv1.IngressNamespaceLister {
	return &errorIngressNamespaceLister{e.err}
}

type errorIngressNamespaceLister struct{ err error }

func (e *errorIngressNamespaceLister) List(_ labels.Selector) ([]*networkingv1.Ingress, error) {
	return nil, e.err
}
func (e *errorIngressNamespaceLister) Get(_ string) (*networkingv1.Ingress, error) {
	return nil, e.err
}

func newIngressLister(ings ...*networkingv1.Ingress) listersnetworkingv1.IngressLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, ing := range ings {
		_ = indexer.Add(ing)
	}
	return listersnetworkingv1.NewIngressLister(indexer)
}

func makeIngress(name, namespace string, lbs []networkingv1.IngressLoadBalancerIngress, rules []networkingv1.IngressRule) *networkingv1.Ingress {
	return &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: time.Now().Add(-2 * time.Hour)},
		},
		Status: networkingv1.IngressStatus{
			LoadBalancer: networkingv1.IngressLoadBalancerStatus{
				Ingress: lbs,
			},
		},
		Spec: networkingv1.IngressSpec{
			Rules: rules,
		},
	}
}

func httpRule(host string, paths ...string) networkingv1.IngressRule {
	var httpPaths []networkingv1.HTTPIngressPath
	for _, p := range paths {
		httpPaths = append(httpPaths, networkingv1.HTTPIngressPath{Path: p})
	}
	return networkingv1.IngressRule{
		Host: host,
		IngressRuleValue: networkingv1.IngressRuleValue{
			HTTP: &networkingv1.HTTPIngressRuleValue{
				Paths: httpPaths,
			},
		},
	}
}

func hostOnlyRule(host string) networkingv1.IngressRule {
	return networkingv1.IngressRule{Host: host}
}

func TestListIngresses_LoadBalancers(t *testing.T) {
	tests := []struct {
		name    string
		lbs     []networkingv1.IngressLoadBalancerIngress
		wantLBs string
	}{
		{
			name:    "lb with ip",
			lbs:     []networkingv1.IngressLoadBalancerIngress{{IP: "10.0.0.1"}},
			wantLBs: "10.0.0.1",
		},
		{
			name:    "lb with hostname",
			lbs:     []networkingv1.IngressLoadBalancerIngress{{Hostname: "lb.example.com"}},
			wantLBs: "lb.example.com",
		},
		{
			name:    "lb empty returns dash",
			lbs:     nil,
			wantLBs: "-",
		},
		{
			name: "multiple lbs comma separated",
			lbs: []networkingv1.IngressLoadBalancerIngress{
				{IP: "10.0.0.1"},
				{Hostname: "lb.example.com"},
			},
			wantLBs: "10.0.0.1, lb.example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ing := makeIngress("test", "default", tt.lbs, nil)
			lister := newIngressLister(ing)

			result, err := ListIngresses(lister, []string{"default"})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != 1 {
				t.Fatalf("expected 1 result, got %d", len(result))
			}
			if result[0].LoadBalancers != tt.wantLBs {
				t.Errorf("LoadBalancers = %q; want %q", result[0].LoadBalancers, tt.wantLBs)
			}
		})
	}
}

func TestListIngresses_Rules(t *testing.T) {
	tests := []struct {
		name      string
		rules     []networkingv1.IngressRule
		wantRules []dto.IngressRule
	}{
		{
			name:      "no rules returns empty slice",
			rules:     nil,
			wantRules: nil,
		},
		{
			name:  "rule with host and single path",
			rules: []networkingv1.IngressRule{httpRule("example.com", "/api")},
			wantRules: []dto.IngressRule{
				{Host: "example.com", Paths: []dto.IngressPath{{Path: "/api", Backend: ""}}},
			},
		},
		{
			name:  "rule with host and multiple paths",
			rules: []networkingv1.IngressRule{httpRule("example.com", "/api", "/health")},
			wantRules: []dto.IngressRule{
				{Host: "example.com", Paths: []dto.IngressPath{{Path: "/api", Backend: ""}, {Path: "/health", Backend: ""}}},
			},
		},
		{
			name:  "rule with empty host uses wildcard",
			rules: []networkingv1.IngressRule{httpRule("", "/path")},
			wantRules: []dto.IngressRule{
				{Host: "*", Paths: []dto.IngressPath{{Path: "/path", Backend: ""}}},
			},
		},
		{
			name:  "rule with no http block shows host only",
			rules: []networkingv1.IngressRule{hostOnlyRule("example.com")},
			wantRules: []dto.IngressRule{
				{Host: "example.com", Paths: nil},
			},
		},
		{
			name: "multiple rules",
			rules: []networkingv1.IngressRule{
				httpRule("a.com", "/foo"),
				httpRule("b.com", "/bar"),
			},
			wantRules: []dto.IngressRule{
				{Host: "a.com", Paths: []dto.IngressPath{{Path: "/foo", Backend: ""}}},
				{Host: "b.com", Paths: []dto.IngressPath{{Path: "/bar", Backend: ""}}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ing := makeIngress("test", "default", nil, tt.rules)
			lister := newIngressLister(ing)

			result, err := ListIngresses(lister, []string{"default"})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != 1 {
				t.Fatalf("expected 1 result, got %d", len(result))
			}
			if !reflect.DeepEqual(result[0].Rules, tt.wantRules) {
				t.Errorf("Rules = %+v; want %+v", result[0].Rules, tt.wantRules)
			}
		})
	}
}

func TestListIngresses_NameNamespace(t *testing.T) {
	ing := makeIngress("my-ingress", "production", nil, nil)
	lister := newIngressLister(ing)

	result, err := ListIngresses(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-ingress" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-ingress")
	}
	if result[0].Namespace != "production" {
		t.Errorf("Namespace = %q; want %q", result[0].Namespace, "production")
	}
}

func TestListIngresses_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	ing1 := makeIngress("ingress-a", "ns-a", nil, nil)
	ing2 := makeIngress("ingress-b", "ns-b", nil, nil)
	lister := newIngressLister(ing1, ing2)

	result, err := ListIngresses(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListIngresses_SpecificNamespaceFilters(t *testing.T) {
	ing1 := makeIngress("ingress-a", "ns-a", nil, nil)
	ing2 := makeIngress("ingress-b", "ns-b", nil, nil)
	lister := newIngressLister(ing1, ing2)

	result, err := ListIngresses(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "ingress-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "ingress-a")
	}
}

// --- Edge-case tests not covered by the happy-path suite above ---

// LB entry has both IP and Hostname set: IP must win because it is checked first.
func TestToIngress_LBEntry_IPTakesPriorityOverHostname(t *testing.T) {
	ing := makeIngress("ing", "default", []networkingv1.IngressLoadBalancerIngress{
		{IP: "10.0.0.1", Hostname: "should-be-dropped.example.com"},
	}, nil)
	got := toIngress(ing)
	if got.LoadBalancers != "10.0.0.1" {
		t.Errorf("IP should win over Hostname; got %q", got.LoadBalancers)
	}
}

// LB entry has neither IP nor Hostname — it must be silently skipped.
func TestToIngress_LBEntry_NeitherIPNorHostname_IsSkipped(t *testing.T) {
	ing := makeIngress("ing", "default", []networkingv1.IngressLoadBalancerIngress{
		{IP: "", Hostname: ""}, // skipped
		{IP: "192.168.1.1"},    // kept
	}, nil)
	got := toIngress(ing)
	if got.LoadBalancers != "192.168.1.1" {
		t.Errorf("empty LB entry must be skipped; got %q", got.LoadBalancers)
	}
}

// All LB entries have neither IP nor Hostname — result must be "-".
func TestToIngress_AllLBEntries_EmptyFields_ReturnsDash(t *testing.T) {
	ing := makeIngress("ing", "default", []networkingv1.IngressLoadBalancerIngress{
		{IP: "", Hostname: ""},
		{IP: "", Hostname: ""},
	}, nil)
	got := toIngress(ing)
	if got.LoadBalancers != "-" {
		t.Errorf("all-empty LB entries should give \"-\"; got %q", got.LoadBalancers)
	}
}

// HTTP rule block is present but Paths slice is empty — rule is kept with no paths.
func TestToIngress_HTTPRule_ZeroPaths_EmptyPathsSlice(t *testing.T) {
	ing := makeIngress("ing", "default", nil, []networkingv1.IngressRule{
		{
			Host: "example.com",
			IngressRuleValue: networkingv1.IngressRuleValue{
				HTTP: &networkingv1.HTTPIngressRuleValue{Paths: []networkingv1.HTTPIngressPath{}},
			},
		},
	})
	got := toIngress(ing)
	if len(got.Rules) != 1 {
		t.Fatalf("expected 1 rule; got %d", len(got.Rules))
	}
	if got.Rules[0].Host != "example.com" {
		t.Errorf("Host = %q; want %q", got.Rules[0].Host, "example.com")
	}
	if len(got.Rules[0].Paths) != 0 {
		t.Errorf("Paths = %+v; want empty", got.Rules[0].Paths)
	}
}

// Completely empty Ingress object — LBs must be "-" and Rules must be empty.
func TestToIngress_EmptyIngress_BothFieldsEmpty(t *testing.T) {
	got := toIngress(&networkingv1.Ingress{})
	if got.LoadBalancers != "-" {
		t.Errorf("LoadBalancers: got %q; want \"-\"", got.LoadBalancers)
	}
	if len(got.Rules) != 0 {
		t.Errorf("Rules: got %+v; want empty", got.Rules)
	}
}

// Age must be a non-empty string when CreationTimestamp is in the past.
func TestToIngress_Age_NonZeroTimestamp_IsNonEmpty(t *testing.T) {
	ing := makeIngress("ing", "default", nil, nil)
	// makeIngress sets CreationTimestamp to 2 hours ago → humanAge returns "2h"
	got := toIngress(ing)
	if got.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
	if !strings.HasSuffix(got.Age, "h") && !strings.HasSuffix(got.Age, "d") &&
		!strings.HasSuffix(got.Age, "m") && !strings.HasSuffix(got.Age, "s") {
		t.Errorf("Age has unexpected format: %q", got.Age)
	}
}

// ListIngresses with an empty lister must return an empty (non-nil) slice, no error.
func TestListIngresses_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newIngressLister()
	result, err := ListIngresses(lister, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

// Error returned by the cluster-scoped List must propagate unchanged.
func TestListIngresses_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListIngresses(&errorIngressLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

// Error returned by the namespaced List must propagate unchanged.
func TestListIngresses_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListIngresses(&errorIngressLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}
