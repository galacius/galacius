import { createContext, FC, ReactNode, use, useCallback, useMemo, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

interface DetailDrawerContextValue {
  selectedNamespaceName: string | null;
  onToggleNamespaceDetail: (name?: string) => void;

  selectedClusterRoleName: string | null;
  onToggleClusterRoleDetail: (name?: string) => void;

  selectedClusterRoleBindingName: string | null;
  onToggleClusterRoleBindingDetail: (name?: string) => void;

  selectedIngressClassName: string | null;
  onToggleIngressClassDetail: (name?: string) => void;

  selectedValidatingWebhookConfigName: string | null;
  onToggleValidatingWebhookConfigDetail: (name?: string) => void;

  selectedRoleName: string | null;
  selectedRoleNamespace: string | null;
  onToggleRoleDetail: (namespace?: string, name?: string) => void;

  selectedRoleBindingName: string | null;
  selectedRoleBindingNamespace: string | null;
  onToggleRoleBindingDetail: (namespace?: string, name?: string) => void;

  selectedServiceAccountName: string | null;
  selectedServiceAccountNamespace: string | null;
  onToggleServiceAccountDetail: (namespace?: string, name?: string) => void;

  selectedPodName: string | null;
  selectedPodNamespace: string | null;
  onTogglePodDetail: (namespace?: string, name?: string) => void;

  selectedJobName: string | null;
  selectedJobNamespace: string | null;
  onToggleJobDetail: (namespace?: string, name?: string) => void;

  selectedCronJobName: string | null;
  selectedCronJobNamespace: string | null;
  onToggleCronJobDetail: (namespace?: string, name?: string) => void;

  selectedNodeName: string | null;
  onToggleNodeDetail: (name?: string) => void;

  selectedServiceName: string | null;
  selectedServiceNamespace: string | null;
  onToggleServiceDetail: (namespace?: string, name?: string) => void;

  selectedDeploymentName: string | null;
  selectedDeploymentNamespace: string | null;
  onToggleDeploymentDetail: (namespace?: string, name?: string) => void;

  selectedReplicaSetName: string | null;
  selectedReplicaSetNamespace: string | null;
  onToggleReplicaSetDetail: (namespace?: string, name?: string) => void;

  selectedDaemonSetName: string | null;
  selectedDaemonSetNamespace: string | null;
  onToggleDaemonSetDetail: (namespace?: string, name?: string) => void;

  selectedStatefulSetName: string | null;
  selectedStatefulSetNamespace: string | null;
  onToggleStatefulSetDetail: (namespace?: string, name?: string) => void;

  selectedEventName: string | null;
  selectedEventNamespace: string | null;
  onToggleEventDetail: (namespace?: string, name?: string) => void;

  selectedConfigMapName: string | null;
  selectedConfigMapNamespace: string | null;
  onToggleConfigMapDetail: (namespace?: string, name?: string) => void;

  selectedNetworkPolicyName: string | null;
  selectedNetworkPolicyNamespace: string | null;
  onToggleNetworkPolicyDetail: (namespace?: string, name?: string) => void;

  selectedPersistentVolumeClaimName: string | null;
  selectedPersistentVolumeClaimNamespace: string | null;
  onTogglePersistentVolumeClaimDetail: (namespace?: string, name?: string) => void;

  selectedPodDisruptionBudgetName: string | null;
  selectedPodDisruptionBudgetNamespace: string | null;
  onTogglePodDisruptionBudgetDetail: (namespace?: string, name?: string) => void;

  selectedSecretName: string | null;
  selectedSecretNamespace: string | null;
  onToggleSecretDetail: (namespace?: string, name?: string) => void;

  selectedHPAName: string | null;
  selectedHPANamespace: string | null;
  onToggleHPADetail: (namespace?: string, name?: string) => void;

  selectedIngressName: string | null;
  selectedIngressNamespace: string | null;
  onToggleIngressDetail: (namespace?: string, name?: string) => void;

  selectedResourceQuotaName: string | null;
  selectedResourceQuotaNamespace: string | null;
  onToggleResourceQuotaDetail: (namespace?: string, name?: string) => void;

  selectedLimitRangeName: string | null;
  selectedLimitRangeNamespace: string | null;
  onToggleLimitRangeDetail: (namespace?: string, name?: string) => void;

  selectedEndpointName: string | null;
  selectedEndpointNamespace: string | null;
  onToggleEndpointDetail: (namespace?: string, name?: string) => void;

  selectedEndpointSliceName: string | null;
  selectedEndpointSliceNamespace: string | null;
  onToggleEndpointSliceDetail: (namespace?: string, name?: string) => void;

  selectedLeaseName: string | null;
  selectedLeaseNamespace: string | null;
  onToggleLease: (namespace?: string, name?: string) => void;

  selectedPriorityClassName: string | null;
  onTogglePriorityClass: (name?: string) => void;

  selectedPersistentVolumeName: string | null;
  onTogglePersistentVolumeDetail: (name?: string) => void;

  selectedStorageClassName: string | null;
  onToggleStorageClassDetail: (name?: string) => void;
}

interface DetailDrawerState {
  selectedNamespaceName: string | null;
  selectedClusterRoleName: string | null;
  selectedClusterRoleBindingName: string | null;
  selectedIngressClassName: string | null;
  selectedValidatingWebhookConfigName: string | null;
  selectedRoleName: string | null;
  selectedRoleNamespace: string | null;
  selectedRoleBindingName: string | null;
  selectedRoleBindingNamespace: string | null;
  selectedServiceAccountName: string | null;
  selectedServiceAccountNamespace: string | null;
  selectedPodName: string | null;
  selectedPodNamespace: string | null;
  selectedJobName: string | null;
  selectedJobNamespace: string | null;
  selectedCronJobName: string | null;
  selectedCronJobNamespace: string | null;
  selectedNodeName: string | null;
  selectedServiceName: string | null;
  selectedServiceNamespace: string | null;
  selectedDeploymentName: string | null;
  selectedDeploymentNamespace: string | null;
  selectedReplicaSetName: string | null;
  selectedReplicaSetNamespace: string | null;
  selectedDaemonSetName: string | null;
  selectedDaemonSetNamespace: string | null;
  selectedStatefulSetName: string | null;
  selectedStatefulSetNamespace: string | null;
  selectedEventName: string | null;
  selectedEventNamespace: string | null;
  selectedConfigMapName: string | null;
  selectedConfigMapNamespace: string | null;
  selectedNetworkPolicyName: string | null;
  selectedNetworkPolicyNamespace: string | null;
  selectedPersistentVolumeClaimName: string | null;
  selectedPersistentVolumeClaimNamespace: string | null;
  selectedPodDisruptionBudgetName: string | null;
  selectedPodDisruptionBudgetNamespace: string | null;
  selectedSecretName: string | null;
  selectedSecretNamespace: string | null;
  selectedHPAName: string | null;
  selectedHPANamespace: string | null;
  selectedIngressName: string | null;
  selectedIngressNamespace: string | null;
  selectedResourceQuotaName: string | null;
  selectedResourceQuotaNamespace: string | null;
  selectedLimitRangeName: string | null;
  selectedLimitRangeNamespace: string | null;
  selectedEndpointName: string | null;
  selectedEndpointNamespace: string | null;
  selectedEndpointSliceName: string | null;
  selectedEndpointSliceNamespace: string | null;
  selectedLeaseName: string | null;
  selectedLeaseNamespace: string | null;
  selectedPriorityClassName: string | null;
  selectedPersistentVolumeName: string | null;
  selectedStorageClassName: string | null;
}

type DetailDrawerAction =
  | { type: "toggleNamespace"; name?: string }
  | { type: "toggleClusterRole"; name?: string }
  | { type: "toggleClusterRoleBinding"; name?: string }
  | { type: "toggleIngressClass"; name?: string }
  | { type: "toggleValidatingWebhookConfig"; name?: string }
  | { type: "toggleRole"; namespace?: string; name?: string }
  | { type: "toggleRoleBinding"; namespace?: string; name?: string }
  | { type: "toggleServiceAccount"; namespace?: string; name?: string }
  | { type: "togglePod"; namespace?: string; name?: string }
  | { type: "toggleJob"; namespace?: string; name?: string }
  | { type: "toggleCronJob"; namespace?: string; name?: string }
  | { type: "toggleNode"; name?: string }
  | { type: "toggleService"; namespace?: string; name?: string }
  | { type: "toggleDeployment"; namespace?: string; name?: string }
  | { type: "toggleReplicaSet"; namespace?: string; name?: string }
  | { type: "toggleDaemonSet"; namespace?: string; name?: string }
  | { type: "toggleStatefulSet"; namespace?: string; name?: string }
  | { type: "toggleEvent"; namespace?: string; name?: string }
  | { type: "toggleConfigMap"; namespace?: string; name?: string }
  | { type: "toggleNetworkPolicy"; namespace?: string; name?: string }
  | { type: "togglePersistentVolumeClaim"; namespace?: string; name?: string }
  | { type: "togglePodDisruptionBudget"; namespace?: string; name?: string }
  | { type: "toggleSecret"; namespace?: string; name?: string }
  | { type: "toggleHPA"; namespace?: string; name?: string }
  | { type: "toggleIngress"; namespace?: string; name?: string }
  | { type: "toggleResourceQuota"; namespace?: string; name?: string }
  | { type: "toggleLimitRange"; namespace?: string; name?: string }
  | { type: "toggleEndpoint"; namespace?: string; name?: string }
  | { type: "toggleEndpointSlice"; namespace?: string; name?: string }
  | { type: "toggleLease"; namespace?: string; name?: string }
  | { type: "togglePriorityClass"; name?: string }
  | { type: "togglePersistentVolume"; name?: string }
  | { type: "toggleStorageClass"; name?: string };

const initialState: DetailDrawerState = {
  selectedNamespaceName: null,
  selectedClusterRoleName: null,
  selectedClusterRoleBindingName: null,
  selectedIngressClassName: null,
  selectedValidatingWebhookConfigName: null,
  selectedRoleName: null,
  selectedRoleNamespace: null,
  selectedRoleBindingName: null,
  selectedRoleBindingNamespace: null,
  selectedServiceAccountName: null,
  selectedServiceAccountNamespace: null,
  selectedPodName: null,
  selectedPodNamespace: null,
  selectedJobName: null,
  selectedJobNamespace: null,
  selectedCronJobName: null,
  selectedCronJobNamespace: null,
  selectedNodeName: null,
  selectedServiceName: null,
  selectedServiceNamespace: null,
  selectedDeploymentName: null,
  selectedDeploymentNamespace: null,
  selectedReplicaSetName: null,
  selectedReplicaSetNamespace: null,
  selectedDaemonSetName: null,
  selectedDaemonSetNamespace: null,
  selectedStatefulSetName: null,
  selectedStatefulSetNamespace: null,
  selectedEventName: null,
  selectedEventNamespace: null,
  selectedConfigMapName: null,
  selectedConfigMapNamespace: null,
  selectedNetworkPolicyName: null,
  selectedNetworkPolicyNamespace: null,
  selectedPersistentVolumeClaimName: null,
  selectedPersistentVolumeClaimNamespace: null,
  selectedPodDisruptionBudgetName: null,
  selectedPodDisruptionBudgetNamespace: null,
  selectedSecretName: null,
  selectedSecretNamespace: null,
  selectedHPAName: null,
  selectedHPANamespace: null,
  selectedIngressName: null,
  selectedIngressNamespace: null,
  selectedResourceQuotaName: null,
  selectedResourceQuotaNamespace: null,
  selectedLimitRangeName: null,
  selectedLimitRangeNamespace: null,
  selectedEndpointName: null,
  selectedEndpointNamespace: null,
  selectedEndpointSliceName: null,
  selectedEndpointSliceNamespace: null,
  selectedLeaseName: null,
  selectedLeaseNamespace: null,
  selectedPriorityClassName: null,
  selectedPersistentVolumeName: null,
  selectedStorageClassName: null,
};

function detailDrawerReducer(
  state: DetailDrawerState,
  action: DetailDrawerAction
): DetailDrawerState {
  switch (action.type) {
    case "toggleNamespace":
      return { ...state, selectedNamespaceName: action.name ?? null };
    case "toggleClusterRole":
      return { ...state, selectedClusterRoleName: action.name ?? null };
    case "toggleClusterRoleBinding":
      return { ...state, selectedClusterRoleBindingName: action.name ?? null };
    case "toggleIngressClass":
      return { ...state, selectedIngressClassName: action.name ?? null };
    case "toggleValidatingWebhookConfig":
      return { ...state, selectedValidatingWebhookConfigName: action.name ?? null };
    case "toggleRole":
      return {
        ...state,
        selectedRoleNamespace: action.namespace ?? null,
        selectedRoleName: action.name ?? null,
      };
    case "toggleRoleBinding":
      return {
        ...state,
        selectedRoleBindingNamespace: action.namespace ?? null,
        selectedRoleBindingName: action.name ?? null,
      };
    case "toggleServiceAccount":
      return {
        ...state,
        selectedServiceAccountNamespace: action.namespace ?? null,
        selectedServiceAccountName: action.name ?? null,
      };
    case "togglePod":
      return {
        ...state,
        selectedPodNamespace: action.namespace ?? null,
        selectedPodName: action.name ?? null,
      };
    case "toggleJob":
      return {
        ...state,
        selectedJobNamespace: action.namespace ?? null,
        selectedJobName: action.name ?? null,
      };
    case "toggleCronJob":
      return {
        ...state,
        selectedCronJobNamespace: action.namespace ?? null,
        selectedCronJobName: action.name ?? null,
      };
    case "toggleNode":
      return { ...state, selectedNodeName: action.name ?? null };
    case "toggleService":
      return {
        ...state,
        selectedServiceNamespace: action.namespace ?? null,
        selectedServiceName: action.name ?? null,
      };
    case "toggleDeployment":
      return {
        ...state,
        selectedDeploymentNamespace: action.namespace ?? null,
        selectedDeploymentName: action.name ?? null,
      };
    case "toggleReplicaSet":
      return {
        ...state,
        selectedReplicaSetNamespace: action.namespace ?? null,
        selectedReplicaSetName: action.name ?? null,
      };
    case "toggleDaemonSet":
      return {
        ...state,
        selectedDaemonSetNamespace: action.namespace ?? null,
        selectedDaemonSetName: action.name ?? null,
      };
    case "toggleStatefulSet":
      return {
        ...state,
        selectedStatefulSetNamespace: action.namespace ?? null,
        selectedStatefulSetName: action.name ?? null,
      };
    case "toggleEvent":
      return {
        ...state,
        selectedEventNamespace: action.namespace ?? null,
        selectedEventName: action.name ?? null,
      };
    case "toggleConfigMap":
      return {
        ...state,
        selectedConfigMapNamespace: action.namespace ?? null,
        selectedConfigMapName: action.name ?? null,
      };
    case "toggleNetworkPolicy":
      return {
        ...state,
        selectedNetworkPolicyNamespace: action.namespace ?? null,
        selectedNetworkPolicyName: action.name ?? null,
      };
    case "togglePersistentVolumeClaim":
      return {
        ...state,
        selectedPersistentVolumeClaimNamespace: action.namespace ?? null,
        selectedPersistentVolumeClaimName: action.name ?? null,
      };
    case "togglePodDisruptionBudget":
      return {
        ...state,
        selectedPodDisruptionBudgetNamespace: action.namespace ?? null,
        selectedPodDisruptionBudgetName: action.name ?? null,
      };
    case "toggleSecret":
      return {
        ...state,
        selectedSecretNamespace: action.namespace ?? null,
        selectedSecretName: action.name ?? null,
      };
    case "toggleHPA":
      return {
        ...state,
        selectedHPANamespace: action.namespace ?? null,
        selectedHPAName: action.name ?? null,
      };
    case "toggleIngress":
      return {
        ...state,
        selectedIngressNamespace: action.namespace ?? null,
        selectedIngressName: action.name ?? null,
      };
    case "toggleResourceQuota":
      return {
        ...state,
        selectedResourceQuotaNamespace: action.namespace ?? null,
        selectedResourceQuotaName: action.name ?? null,
      };
    case "toggleLimitRange":
      return {
        ...state,
        selectedLimitRangeNamespace: action.namespace ?? null,
        selectedLimitRangeName: action.name ?? null,
      };
    case "toggleEndpoint":
      return {
        ...state,
        selectedEndpointNamespace: action.namespace ?? null,
        selectedEndpointName: action.name ?? null,
      };
    case "toggleEndpointSlice":
      return {
        ...state,
        selectedEndpointSliceNamespace: action.namespace ?? null,
        selectedEndpointSliceName: action.name ?? null,
      };
    case "toggleLease":
      return {
        ...state,
        selectedLeaseNamespace: action.namespace ?? null,
        selectedLeaseName: action.name ?? null,
      };
    case "togglePriorityClass":
      return { ...state, selectedPriorityClassName: action.name ?? null };
    case "togglePersistentVolume":
      return { ...state, selectedPersistentVolumeName: action.name ?? null };
    case "toggleStorageClass":
      return { ...state, selectedStorageClassName: action.name ?? null };
  }
}

interface DetailDrawerStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DetailDrawerContextValue;
}

const DetailDrawerCtx = createContext<DetailDrawerStore | null>(null);

function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

const identitySelector = (value: DetailDrawerContextValue) => value;

// Context-selector emulation: every consumer subscribes directly to the
// external store (bypassing React context propagation entirely) and only
// re-renders when the slice it selected actually changes, per shallowEqual.
// Without this, one shared reducer/context meant toggling any one of the ~40
// resource kinds' drawers re-rendered every consumer in the app (every list
// view and every drawer), which under React StrictMode's doubled render +
// effect passes made rapid list<->drawer navigation feel like it hung.
export function useDetailDrawerContext<T = DetailDrawerContextValue>(
  selector: (value: DetailDrawerContextValue) => T = identitySelector as (
    value: DetailDrawerContextValue
  ) => T
): T {
  const store = use(DetailDrawerCtx);
  if (!store) throw new Error("useDetailDrawerContext must be used inside DetailDrawerProvider");
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
    selector,
    shallowEqual
  );
}

function createDetailDrawerStore() {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (action: DetailDrawerAction) => {
      const next = detailDrawerReducer(state, action);
      if (next !== state) {
        state = next;
        listeners.forEach((listener) => listener());
      }
    },
  };
}

interface DetailDrawerProviderProps {
  children: ReactNode;
}

export const DetailDrawerProvider: FC<DetailDrawerProviderProps> = ({ children }) => {
  // State lives outside React (in this lazily-created store), not in
  // useReducer — dispatch notifies listeners synchronously, and the Provider
  // itself never re-renders on toggle, since every actual re-render happens
  // in the individual useSyncExternalStoreWithSelector subscribers instead.
  // The store's mutable state lives in a closure variable, never as a
  // settable property, so nothing here ever assigns into the useState value
  // itself (only method calls: store.dispatch/getState/subscribe).
  const [store] = useState(createDetailDrawerStore);
  const dispatch = store.dispatch;

  const dispatchers = useMemo(
    () => ({
      onToggleNamespaceDetail: (name?: string) => dispatch({ type: "toggleNamespace", name }),

      onToggleClusterRoleDetail: (name?: string) => dispatch({ type: "toggleClusterRole", name }),

      onToggleClusterRoleBindingDetail: (name?: string) =>
        dispatch({ type: "toggleClusterRoleBinding", name }),

      onToggleIngressClassDetail: (name?: string) => dispatch({ type: "toggleIngressClass", name }),

      onToggleValidatingWebhookConfigDetail: (name?: string) =>
        dispatch({ type: "toggleValidatingWebhookConfig", name }),

      onToggleRoleDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleRole", namespace, name }),

      onToggleRoleBindingDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleRoleBinding", namespace, name }),

      onToggleServiceAccountDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleServiceAccount", namespace, name }),

      onTogglePodDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "togglePod", namespace, name }),

      onToggleJobDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleJob", namespace, name }),

      onToggleCronJobDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleCronJob", namespace, name }),

      onToggleNodeDetail: (name?: string) => dispatch({ type: "toggleNode", name }),

      onToggleServiceDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleService", namespace, name }),

      onToggleDeploymentDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleDeployment", namespace, name }),

      onToggleReplicaSetDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleReplicaSet", namespace, name }),

      onToggleDaemonSetDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleDaemonSet", namespace, name }),

      onToggleStatefulSetDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleStatefulSet", namespace, name }),

      onToggleEventDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleEvent", namespace, name }),

      onToggleConfigMapDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleConfigMap", namespace, name }),

      onToggleNetworkPolicyDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleNetworkPolicy", namespace, name }),

      onTogglePersistentVolumeClaimDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "togglePersistentVolumeClaim", namespace, name }),

      onTogglePodDisruptionBudgetDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "togglePodDisruptionBudget", namespace, name }),

      onToggleSecretDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleSecret", namespace, name }),

      onToggleHPADetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleHPA", namespace, name }),

      onToggleIngressDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleIngress", namespace, name }),

      onToggleResourceQuotaDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleResourceQuota", namespace, name }),

      onToggleLimitRangeDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleLimitRange", namespace, name }),

      onToggleEndpointDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleEndpoint", namespace, name }),

      onToggleEndpointSliceDetail: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleEndpointSlice", namespace, name }),

      onToggleLease: (namespace?: string, name?: string) =>
        dispatch({ type: "toggleLease", namespace, name }),

      onTogglePriorityClass: (name?: string) => dispatch({ type: "togglePriorityClass", name }),

      onTogglePersistentVolumeDetail: (name?: string) =>
        dispatch({ type: "togglePersistentVolume", name }),

      onToggleStorageClassDetail: (name?: string) => dispatch({ type: "toggleStorageClass", name }),
    }),
    [dispatch]
  );

  const getSnapshot = useCallback(
    (): DetailDrawerContextValue => ({ ...store.getState(), ...dispatchers }),
    [store, dispatchers]
  );

  const contextStore = useMemo<DetailDrawerStore>(
    () => ({ subscribe: store.subscribe, getSnapshot }),
    [store, getSnapshot]
  );

  return <DetailDrawerCtx.Provider value={contextStore}>{children}</DetailDrawerCtx.Provider>;
};
