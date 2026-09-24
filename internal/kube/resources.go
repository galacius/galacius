package kube

import (
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	listersautoscalingv2 "k8s.io/client-go/listers/autoscaling/v2"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
	listerscoordinationv1 "k8s.io/client-go/listers/coordination/v1"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	listersdiscoveryv1 "k8s.io/client-go/listers/discovery/v1"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
	listerspolicyv1 "k8s.io/client-go/listers/policy/v1"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
	"k8s.io/client-go/tools/cache"

	"github.com/galacius/galacius/internal/kube/nsscope"
)

// nsscopeResource is the subset of *nsscope.ScopedResource[L]'s API needed
// for generic per-resource bookkeeping (StopResource/GetSyncedChan/Stop),
// independent of L — every *nsscope.ScopedResource[L] satisfies this
// regardless of its lister type.
type nsscopeResource interface {
	Stop()
	SyncedChan() <-chan struct{}
}

// RescopePods (re)builds the Pod informer(s) to cover exactly the given
// namespaces, replacing whatever was there before; nil/empty or more than
// nsscope's configured max namespaces falls back to a single cluster-wide
// informer. A no-op if the requested scope already matches the current one.
// See nsscope.ScopedResource.Rescope.
func (h *FactoryHandle) RescopePods(namespaces []string) {
	h.pod.Rescope(namespaces)
}

// SetPodsEventHandler registers fn to be called with the namespace of every
// Pod add/update/delete observed by the current and any future Pod
// informer(s) (i.e. it survives RescopePods rebuilds).
func (h *FactoryHandle) SetPodsEventHandler(fn func(namespace string)) {
	h.pod.SetEventHandler(fn)
}

// SetPodsOnSynced registers fn to be called once after Pods' initial cache
// sync completes.
func (h *FactoryHandle) SetPodsOnSynced(fn func()) {
	h.pod.SetOnSynced(fn)
}

// PodLister returns the current lister for "pods", scoped exactly as
// configured by the most recent RescopePods call (or cluster-wide by
// default).
func (h *FactoryHandle) PodLister() listerscorev1.PodLister {
	return h.pod.Lister()
}

func (h *FactoryHandle) RescopeDeployments(namespaces []string) {
	h.deployment.Rescope(namespaces)
}
func (h *FactoryHandle) SetDeploymentsEventHandler(fn func(namespace string)) {
	h.deployment.SetEventHandler(fn)
}
func (h *FactoryHandle) DeploymentLister() listersappsv1.DeploymentLister {
	return h.deployment.Lister()
}

func (h *FactoryHandle) RescopeDaemonSets(namespaces []string) {
	h.daemonset.Rescope(namespaces)
}
func (h *FactoryHandle) SetDaemonSetsEventHandler(fn func(namespace string)) {
	h.daemonset.SetEventHandler(fn)
}
func (h *FactoryHandle) DaemonSetLister() listersappsv1.DaemonSetLister {
	return h.daemonset.Lister()
}

func (h *FactoryHandle) RescopeStatefulSets(namespaces []string) {
	h.statefulset.Rescope(namespaces)
}
func (h *FactoryHandle) SetStatefulSetsEventHandler(fn func(namespace string)) {
	h.statefulset.SetEventHandler(fn)
}
func (h *FactoryHandle) StatefulSetLister() listersappsv1.StatefulSetLister {
	return h.statefulset.Lister()
}

func (h *FactoryHandle) RescopeReplicaSets(namespaces []string) {
	h.replicaset.Rescope(namespaces)
}
func (h *FactoryHandle) SetReplicaSetsEventHandler(fn func(namespace string)) {
	h.replicaset.SetEventHandler(fn)
}
func (h *FactoryHandle) ReplicaSetLister() listersappsv1.ReplicaSetLister {
	return h.replicaset.Lister()
}

func (h *FactoryHandle) RescopeJobs(namespaces []string) {
	h.job.Rescope(namespaces)
}
func (h *FactoryHandle) SetJobsEventHandler(fn func(namespace string)) {
	h.job.SetEventHandler(fn)
}
func (h *FactoryHandle) JobLister() listersbatchv1.JobLister {
	return h.job.Lister()
}

func (h *FactoryHandle) RescopeCronJobs(namespaces []string) {
	h.cronjob.Rescope(namespaces)
}
func (h *FactoryHandle) SetCronJobsEventHandler(fn func(namespace string)) {
	h.cronjob.SetEventHandler(fn)
}
func (h *FactoryHandle) CronJobLister() listersbatchv1.CronJobLister {
	return h.cronjob.Lister()
}

func (h *FactoryHandle) RescopeConfigMaps(namespaces []string) {
	h.configmap.Rescope(namespaces)
}
func (h *FactoryHandle) SetConfigMapsEventHandler(fn func(namespace string)) {
	h.configmap.SetEventHandler(fn)
}
func (h *FactoryHandle) ConfigMapLister() listerscorev1.ConfigMapLister {
	return h.configmap.Lister()
}

func (h *FactoryHandle) RescopeSecrets(namespaces []string) {
	h.secret.Rescope(namespaces)
}
func (h *FactoryHandle) SetSecretsEventHandler(fn func(namespace string)) {
	h.secret.SetEventHandler(fn)
}
func (h *FactoryHandle) SecretLister() listerscorev1.SecretLister {
	return h.secret.Lister()
}

func (h *FactoryHandle) RescopeResourceQuotas(namespaces []string) {
	h.resourcequota.Rescope(namespaces)
}
func (h *FactoryHandle) SetResourceQuotasEventHandler(fn func(namespace string)) {
	h.resourcequota.SetEventHandler(fn)
}
func (h *FactoryHandle) ResourceQuotaLister() listerscorev1.ResourceQuotaLister {
	return h.resourcequota.Lister()
}

func (h *FactoryHandle) RescopeLimitRanges(namespaces []string) {
	h.limitrange.Rescope(namespaces)
}
func (h *FactoryHandle) SetLimitRangesEventHandler(fn func(namespace string)) {
	h.limitrange.SetEventHandler(fn)
}
func (h *FactoryHandle) LimitRangeLister() listerscorev1.LimitRangeLister {
	return h.limitrange.Lister()
}

func (h *FactoryHandle) RescopeHorizontalPodAutoscalers(namespaces []string) {
	h.hpa.Rescope(namespaces)
}
func (h *FactoryHandle) SetHorizontalPodAutoscalersEventHandler(fn func(namespace string)) {
	h.hpa.SetEventHandler(fn)
}
func (h *FactoryHandle) HorizontalPodAutoscalerLister() listersautoscalingv2.HorizontalPodAutoscalerLister {
	return h.hpa.Lister()
}

func (h *FactoryHandle) RescopePodDisruptionBudgets(namespaces []string) {
	h.pdb.Rescope(namespaces)
}
func (h *FactoryHandle) SetPodDisruptionBudgetsEventHandler(fn func(namespace string)) {
	h.pdb.SetEventHandler(fn)
}
func (h *FactoryHandle) PodDisruptionBudgetLister() listerspolicyv1.PodDisruptionBudgetLister {
	return h.pdb.Lister()
}

func (h *FactoryHandle) RescopeLeases(namespaces []string) {
	h.lease.Rescope(namespaces)
}
func (h *FactoryHandle) SetLeasesEventHandler(fn func(namespace string)) {
	h.lease.SetEventHandler(fn)
}
func (h *FactoryHandle) LeaseLister() listerscoordinationv1.LeaseLister {
	return h.lease.Lister()
}

func (h *FactoryHandle) RescopeServices(namespaces []string) {
	h.service.Rescope(namespaces)
}
func (h *FactoryHandle) SetServicesEventHandler(fn func(namespace string)) {
	h.service.SetEventHandler(fn)
}
func (h *FactoryHandle) ServiceLister() listerscorev1.ServiceLister {
	return h.service.Lister()
}

func (h *FactoryHandle) RescopeEndpointSlices(namespaces []string) {
	h.endpointslice.Rescope(namespaces)
}
func (h *FactoryHandle) SetEndpointSlicesEventHandler(fn func(namespace string)) {
	h.endpointslice.SetEventHandler(fn)
}
func (h *FactoryHandle) EndpointSliceLister() listersdiscoveryv1.EndpointSliceLister {
	return h.endpointslice.Lister()
}

func (h *FactoryHandle) RescopeEndpoints(namespaces []string) {
	h.endpoint.Rescope(namespaces)
}
func (h *FactoryHandle) SetEndpointsEventHandler(fn func(namespace string)) {
	h.endpoint.SetEventHandler(fn)
}
func (h *FactoryHandle) EndpointsLister() listerscorev1.EndpointsLister {
	return h.endpoint.Lister()
}

func (h *FactoryHandle) RescopeIngresses(namespaces []string) {
	h.ingress.Rescope(namespaces)
}
func (h *FactoryHandle) SetIngressesEventHandler(fn func(namespace string)) {
	h.ingress.SetEventHandler(fn)
}
func (h *FactoryHandle) IngressLister() listersnetworkingv1.IngressLister {
	return h.ingress.Lister()
}

func (h *FactoryHandle) RescopeNetworkPolicies(namespaces []string) {
	h.networkpolicy.Rescope(namespaces)
}
func (h *FactoryHandle) SetNetworkPoliciesEventHandler(fn func(namespace string)) {
	h.networkpolicy.SetEventHandler(fn)
}
func (h *FactoryHandle) NetworkPolicyLister() listersnetworkingv1.NetworkPolicyLister {
	return h.networkpolicy.Lister()
}

func (h *FactoryHandle) RescopePersistentVolumeClaims(namespaces []string) {
	h.pvc.Rescope(namespaces)
}
func (h *FactoryHandle) SetPersistentVolumeClaimsEventHandler(fn func(namespace string)) {
	h.pvc.SetEventHandler(fn)
}
func (h *FactoryHandle) PersistentVolumeClaimLister() listerscorev1.PersistentVolumeClaimLister {
	return h.pvc.Lister()
}

func (h *FactoryHandle) RescopeServiceAccounts(namespaces []string) {
	h.serviceaccount.Rescope(namespaces)
}
func (h *FactoryHandle) SetServiceAccountsEventHandler(fn func(namespace string)) {
	h.serviceaccount.SetEventHandler(fn)
}
func (h *FactoryHandle) ServiceAccountLister() listerscorev1.ServiceAccountLister {
	return h.serviceaccount.Lister()
}

func (h *FactoryHandle) RescopeRoles(namespaces []string) {
	h.role.Rescope(namespaces)
}
func (h *FactoryHandle) SetRolesEventHandler(fn func(namespace string)) {
	h.role.SetEventHandler(fn)
}
func (h *FactoryHandle) RoleLister() listersrbacv1.RoleLister {
	return h.role.Lister()
}

func (h *FactoryHandle) RescopeRoleBindings(namespaces []string) {
	h.rolebinding.Rescope(namespaces)
}
func (h *FactoryHandle) SetRoleBindingsEventHandler(fn func(namespace string)) {
	h.rolebinding.SetEventHandler(fn)
}
func (h *FactoryHandle) RoleBindingLister() listersrbacv1.RoleBindingLister {
	return h.rolebinding.Lister()
}

func (h *FactoryHandle) RescopeEvents(namespaces []string) {
	h.event.Rescope(namespaces)
}
func (h *FactoryHandle) SetEventsEventHandler(fn func(namespace string)) {
	h.event.SetEventHandler(fn)
}
func (h *FactoryHandle) EventLister() listerscorev1.EventLister {
	return h.event.Lister()
}

// initScopedResources bootstraps every nsscope-managed resource as a single
// cluster-wide informer (matching the generic resources set up in
// NewFactoryHandle). Connect() typically supersedes this immediately via the
// matching RescopeXxx call once it knows the caller's namespace filter;
// nsscope.New already builds a valid, already-started group so
// ListerX/GetSyncedChan(resource) never observe a nil/unset state.
func (h *FactoryHandle) initScopedResources() {
	clearForbidden := func(resource string) func() {
		return func() {
			// Deletes every forbidden record for resource, across every
			// namespace — a real Rescope tears down and rebuilds every
			// informer in the group, so all of them deserve a clean slate
			// to retry against, not just the ones for the new namespace set.
			h.forbidden.Range(func(k, _ any) bool {
				if fk, ok := k.(forbiddenKey); ok && fk.resource == resource {
					h.forbidden.Delete(k)
				}
				return true
			})
		}
	}
	onScopedForbidden := func(name, namespace string) {
		h.forbidden.Store(forbiddenKey{name, namespace}, struct{}{})
		select {
		case <-h.globalStop:
		default:
			h.onForbidden(name, namespace)
		}
	}
	h.pod = nsscope.NewPodsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().Pods().Informer() },
		clearForbidden("pods"), onScopedForbidden,
		h.globalStop,
	)
	h.deployment = nsscope.NewDeploymentsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Apps().V1().Deployments().Informer() },
		clearForbidden("deployments"), onScopedForbidden,
		h.globalStop,
	)
	h.daemonset = nsscope.NewDaemonSetsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Apps().V1().DaemonSets().Informer() },
		clearForbidden("daemonsets"), onScopedForbidden,
		h.globalStop,
	)
	h.statefulset = nsscope.NewStatefulSetsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Apps().V1().StatefulSets().Informer() },
		clearForbidden("statefulsets"), onScopedForbidden,
		h.globalStop,
	)
	h.replicaset = nsscope.NewReplicaSetsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Apps().V1().ReplicaSets().Informer() },
		clearForbidden("replicasets"), onScopedForbidden,
		h.globalStop,
	)
	h.job = nsscope.NewJobsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Batch().V1().Jobs().Informer() },
		clearForbidden("jobs"), onScopedForbidden,
		h.globalStop,
	)
	h.cronjob = nsscope.NewCronJobsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Batch().V1().CronJobs().Informer() },
		clearForbidden("cronjobs"), onScopedForbidden,
		h.globalStop,
	)
	h.configmap = nsscope.NewConfigMapsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().ConfigMaps().Informer() },
		clearForbidden("configmaps"), onScopedForbidden,
		h.globalStop,
	)
	h.secret = nsscope.NewSecretsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().Secrets().Informer() },
		clearForbidden("secrets"), onScopedForbidden,
		h.globalStop,
	)
	h.resourcequota = nsscope.NewResourceQuotasResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().ResourceQuotas().Informer() },
		clearForbidden("resourcequotas"), onScopedForbidden,
		h.globalStop,
	)
	h.limitrange = nsscope.NewLimitRangesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().LimitRanges().Informer() },
		clearForbidden("limitranges"), onScopedForbidden,
		h.globalStop,
	)
	h.hpa = nsscope.NewHorizontalPodAutoscalersResource(
		h.cs,
		func() cache.SharedIndexInformer {
			return h.Factory.Autoscaling().V2().HorizontalPodAutoscalers().Informer()
		},
		clearForbidden("hpa"), onScopedForbidden,
		h.globalStop,
	)
	h.pdb = nsscope.NewPodDisruptionBudgetsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Policy().V1().PodDisruptionBudgets().Informer() },
		clearForbidden("pdbs"), onScopedForbidden,
		h.globalStop,
	)
	h.lease = nsscope.NewLeasesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Coordination().V1().Leases().Informer() },
		clearForbidden("leases"), onScopedForbidden,
		h.globalStop,
	)
	h.service = nsscope.NewServicesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().Services().Informer() },
		clearForbidden("services"), onScopedForbidden,
		h.globalStop,
	)
	h.endpointslice = nsscope.NewEndpointSlicesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Discovery().V1().EndpointSlices().Informer() },
		clearForbidden("endpointslices"), onScopedForbidden,
		h.globalStop,
	)
	h.endpoint = nsscope.NewEndpointsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().Endpoints().Informer() },
		clearForbidden("endpoints"), onScopedForbidden,
		h.globalStop,
	)
	h.ingress = nsscope.NewIngressesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Networking().V1().Ingresses().Informer() },
		clearForbidden("ingresses"), onScopedForbidden,
		h.globalStop,
	)
	h.networkpolicy = nsscope.NewNetworkPoliciesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Networking().V1().NetworkPolicies().Informer() },
		clearForbidden("networkpolicies"), onScopedForbidden,
		h.globalStop,
	)
	h.pvc = nsscope.NewPersistentVolumeClaimsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().PersistentVolumeClaims().Informer() },
		clearForbidden("pvcs"), onScopedForbidden,
		h.globalStop,
	)
	h.serviceaccount = nsscope.NewServiceAccountsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().ServiceAccounts().Informer() },
		clearForbidden("serviceaccounts"), onScopedForbidden,
		h.globalStop,
	)
	h.role = nsscope.NewRolesResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Rbac().V1().Roles().Informer() },
		clearForbidden("roles"), onScopedForbidden,
		h.globalStop,
	)
	h.rolebinding = nsscope.NewRoleBindingsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Rbac().V1().RoleBindings().Informer() },
		clearForbidden("rolebindings"), onScopedForbidden,
		h.globalStop,
	)
	h.event = nsscope.NewEventsResource(
		h.cs,
		func() cache.SharedIndexInformer { return h.Factory.Core().V1().Events().Informer() },
		clearForbidden("events"), onScopedForbidden,
		h.globalStop,
	)
	h.scoped = map[string]nsscopeResource{
		"pods":            h.pod,
		"deployments":     h.deployment,
		"daemonsets":      h.daemonset,
		"statefulsets":    h.statefulset,
		"replicasets":     h.replicaset,
		"jobs":            h.job,
		"cronjobs":        h.cronjob,
		"configmaps":      h.configmap,
		"secrets":         h.secret,
		"resourcequotas":  h.resourcequota,
		"limitranges":     h.limitrange,
		"hpa":             h.hpa,
		"pdbs":            h.pdb,
		"leases":          h.lease,
		"services":        h.service,
		"endpointslices":  h.endpointslice,
		"endpoints":       h.endpoint,
		"ingresses":       h.ingress,
		"networkpolicies": h.networkpolicy,
		"pvcs":            h.pvc,
		"serviceaccounts": h.serviceaccount,
		"roles":           h.role,
		"rolebindings":    h.rolebinding,
		"events":          h.event,
	}
}

func (h *FactoryHandle) SetDeploymentsOnSynced(fn func())              { h.deployment.SetOnSynced(fn) }
func (h *FactoryHandle) SetDaemonSetsOnSynced(fn func())               { h.daemonset.SetOnSynced(fn) }
func (h *FactoryHandle) SetStatefulSetsOnSynced(fn func())             { h.statefulset.SetOnSynced(fn) }
func (h *FactoryHandle) SetReplicaSetsOnSynced(fn func())              { h.replicaset.SetOnSynced(fn) }
func (h *FactoryHandle) SetJobsOnSynced(fn func())                     { h.job.SetOnSynced(fn) }
func (h *FactoryHandle) SetCronJobsOnSynced(fn func())                 { h.cronjob.SetOnSynced(fn) }
func (h *FactoryHandle) SetConfigMapsOnSynced(fn func())               { h.configmap.SetOnSynced(fn) }
func (h *FactoryHandle) SetSecretsOnSynced(fn func())                  { h.secret.SetOnSynced(fn) }
func (h *FactoryHandle) SetResourceQuotasOnSynced(fn func())           { h.resourcequota.SetOnSynced(fn) }
func (h *FactoryHandle) SetLimitRangesOnSynced(fn func())              { h.limitrange.SetOnSynced(fn) }
func (h *FactoryHandle) SetHorizontalPodAutoscalersOnSynced(fn func()) { h.hpa.SetOnSynced(fn) }
func (h *FactoryHandle) SetPodDisruptionBudgetsOnSynced(fn func())     { h.pdb.SetOnSynced(fn) }
func (h *FactoryHandle) SetLeasesOnSynced(fn func())                   { h.lease.SetOnSynced(fn) }
func (h *FactoryHandle) SetServicesOnSynced(fn func())                 { h.service.SetOnSynced(fn) }
func (h *FactoryHandle) SetEndpointSlicesOnSynced(fn func())           { h.endpointslice.SetOnSynced(fn) }
func (h *FactoryHandle) SetEndpointsOnSynced(fn func())                { h.endpoint.SetOnSynced(fn) }
func (h *FactoryHandle) SetIngressesOnSynced(fn func())                { h.ingress.SetOnSynced(fn) }
func (h *FactoryHandle) SetNetworkPoliciesOnSynced(fn func())          { h.networkpolicy.SetOnSynced(fn) }
func (h *FactoryHandle) SetPersistentVolumeClaimsOnSynced(fn func())   { h.pvc.SetOnSynced(fn) }
func (h *FactoryHandle) SetServiceAccountsOnSynced(fn func())          { h.serviceaccount.SetOnSynced(fn) }
func (h *FactoryHandle) SetRolesOnSynced(fn func())                    { h.role.SetOnSynced(fn) }
func (h *FactoryHandle) SetRoleBindingsOnSynced(fn func())             { h.rolebinding.SetOnSynced(fn) }
func (h *FactoryHandle) SetEventsOnSynced(fn func())                   { h.event.SetOnSynced(fn) }
