package app

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/galacius/galacius/internal/kube"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

const maxPortForwardSessions = 20

func validatePort(port string) error {
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return fmt.Errorf("invalid port %q: must be a number between 1 and 65535", port)
	}
	return nil
}

func validateLocalPort(port string) error {
	n, err := strconv.Atoi(port)
	if err != nil || n < 0 || n > 65535 {
		return fmt.Errorf("invalid local port %q: must be a number between 0 and 65535", port)
	}
	return nil
}

// isPodReady checks if a pod is in Ready condition by looking at its conditions list.
func isPodReady(pod *corev1.Pod) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func (a *App) resolvePodName(factory *kube.FactoryHandle, namespace, kind, name string) (string, error) {
	if kind == "pod" {
		return name, nil
	}
	if kind != "service" {
		return "", fmt.Errorf("unsupported kind: %q (must be \"pod\" or \"service\")", kind)
	}

	// Check namespace against active filter before querying listers
	_, activeNamespaces := a.activeFactoryAndNamespaces()
	if len(activeNamespaces) > 0 {
		// Non-empty activeNamespaces means a filter is active; check if namespace is in it
		namespaceInFilter := false
		for _, ns := range activeNamespaces {
			if ns == namespace {
				namespaceInFilter = true
				break
			}
		}
		if !namespaceInFilter {
			return "", fmt.Errorf("namespace %q is not in the active namespace filter", namespace)
		}
	}

	// Wait for services and pods caches to sync before reading listers
	if !waitForResourceSyncWithTimeout(factory, "services", 10*time.Second) {
		return "", fmt.Errorf("service cache is still loading — please retry in a moment")
	}
	if !waitForResourceSyncWithTimeout(factory, "pods", 10*time.Second) {
		return "", fmt.Errorf("pod/service cache is still loading — please retry in a moment")
	}

	svc, err := factory.ServiceLister().Services(namespace).Get(name)
	if err != nil {
		return "", fmt.Errorf("service %s/%s not found: %w", namespace, name, err)
	}
	if len(svc.Spec.Selector) == 0 {
		return "", fmt.Errorf("service %s/%s has no selector", namespace, name)
	}
	sel := labels.Set(svc.Spec.Selector).AsSelector()
	pods, err := factory.PodLister().Pods(namespace).List(sel)
	if err != nil || len(pods) == 0 {
		return "", fmt.Errorf("no pods found for service %s/%s", namespace, name)
	}

	// Find a pod that is both Running and Ready
	for _, p := range pods {
		if p.Status.Phase == corev1.PodRunning && isPodReady(p) {
			return p.Name, nil
		}
	}

	// No running and ready pod found
	return "", fmt.Errorf("no running and ready pod found backing service %s/%s", namespace, name)
}

func (a *App) monitorPortForward(id string, errCh <-chan error, cancel context.CancelFunc) {
	go func() {
		<-errCh
		cancel()
		a.pfMu.Lock()
		pf, ok := a.portForwards[id]
		if ok && pf.Status != "Stopped" {
			pf.Status = "Error"
			a.portForwards[id] = pf
			delete(a.pfCancels, id)
		}
		a.pfMu.Unlock()
		a.emitPortForwards()
	}()
}

func (a *App) emitPortForwards() {
	a.pfMu.RLock()
	result := make([]dto.PortForward, 0, len(a.portForwards))
	for _, pf := range a.portForwards {
		result = append(result, pf)
	}
	a.pfMu.RUnlock()
	runtime.EventsEmit(a.ctx, "portforwards:update", result)
}

func (a *App) ListPortForwards() []dto.PortForward {
	a.pfMu.RLock()
	defer a.pfMu.RUnlock()
	result := make([]dto.PortForward, 0, len(a.portForwards))
	for _, pf := range a.portForwards {
		result = append(result, pf)
	}
	return result
}

// resolveNamedPort resolves a named port (e.g. "http") to its numeric equivalent
// by looking up the pod's container specs. If targetPort is already numeric, it is
// returned unchanged.
func resolveNamedPort(factory *kube.FactoryHandle, namespace, podName, targetPort string) (string, error) {
	if _, err := strconv.Atoi(targetPort); err == nil {
		return targetPort, nil
	}

	// Wait for pods cache to sync before reading lister
	if !waitForResourceSyncWithTimeout(factory, "pods", 10*time.Second) {
		return "", fmt.Errorf("pod cache is still loading — please retry in a moment")
	}

	pod, err := factory.PodLister().Pods(namespace).Get(podName)
	if err != nil {
		return "", fmt.Errorf("pod %s/%s not found: %w", namespace, podName, err)
	}
	// Ephemeral containers cannot declare named ports (Kubernetes spec), so skip them.
	allContainers := append(pod.Spec.Containers, pod.Spec.InitContainers...)
	for _, container := range allContainers {
		for _, port := range container.Ports {
			if port.Name == targetPort {
				return strconv.Itoa(int(port.ContainerPort)), nil
			}
		}
	}
	return "", fmt.Errorf("named port %q not found in any container of pod %s/%s", targetPort, namespace, podName)
}

// StartPortForward starts a kubectl-style port-forward tunnel to a pod or service.
// Returns the session ID and the actual local port (important when localPort="0" for OS-assigned).
func (a *App) StartPortForward(namespace, kind, name, podPort, localPort, protocol, scheme, servicePort string) (dto.StartResult, error) {
	zero := dto.StartResult{}

	if err := validateLocalPort(localPort); err != nil {
		return zero, err
	}

	a.pfMu.RLock()
	count := len(a.portForwards)
	a.pfMu.RUnlock()
	if count >= maxPortForwardSessions {
		return zero, fmt.Errorf("maximum of %d concurrent port-forward sessions reached", maxPortForwardSessions)
	}

	a.mu.RLock()
	cs := a.clients[a.activeContext]
	rc := a.restConfigs[a.activeContext]
	factory := a.factories[a.activeContext]
	a.mu.RUnlock()

	if cs == nil || rc == nil {
		return zero, fmt.Errorf("not connected to a cluster")
	}
	if factory == nil {
		return zero, fmt.Errorf("informers not ready")
	}

	podName, err := a.resolvePodName(factory, namespace, kind, name)
	if err != nil {
		return zero, err
	}

	resolvedPodPort, err := resolveNamedPort(factory, namespace, podName, podPort)
	if err != nil {
		return zero, err
	}
	if err := validatePort(resolvedPodPort); err != nil {
		return zero, err
	}

	pfURL := cs.CoreV1().RESTClient().Post().
		Resource("pods").Namespace(namespace).Name(podName).SubResource("portforward").URL()

	transport, upgrader, err := spdy.RoundTripperFor(rc)
	if err != nil {
		return zero, fmt.Errorf("building SPDY transport: %w", err)
	}
	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, pfURL)

	id := uuid.New().String()
	pfCtx, pfCancel := context.WithCancel(a.ctx)
	stopCh := make(chan struct{})
	readyCh := make(chan struct{})

	go func() { <-pfCtx.Done(); close(stopCh) }()

	pfw, err := portforward.New(dialer, []string{fmt.Sprintf("%s:%s", localPort, resolvedPodPort)}, stopCh, readyCh, io.Discard, &bytes.Buffer{})
	if err != nil {
		pfCancel()
		return zero, fmt.Errorf("creating port forwarder: %w", err)
	}

	errCh := make(chan error, 1)
	go func() { errCh <- pfw.ForwardPorts() }()

	readyCtx, readyCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer readyCancel()

	select {
	case <-readyCh:
		actualLocalPort := localPort
		if ports, err := pfw.GetPorts(); err == nil && len(ports) > 0 {
			actualLocalPort = strconv.Itoa(int(ports[0].Local))
		}
		a.pfMu.Lock()
		a.portForwards[id] = dto.PortForward{
			ID: id, Name: name, Namespace: namespace, Kind: kind,
			PodPort: resolvedPodPort, TargetPort: podPort, ServicePort: servicePort, LocalPort: actualLocalPort,
			Protocol: protocol, Scheme: scheme, Address: "localhost", Status: "Active",
		}
		a.pfCancels[id] = pfCancel
		a.pfMu.Unlock()
		a.emitPortForwards()
		a.monitorPortForward(id, errCh, pfCancel)
		return dto.StartResult{ID: id, LocalPort: actualLocalPort}, nil

	case err := <-errCh:
		pfCancel()
		return zero, fmt.Errorf("port forward failed to start: %w", err)

	case <-readyCtx.Done():
		pfCancel()
		return zero, fmt.Errorf("timed out waiting for port forward to become ready")
	}
}

// StopPortForward cancels an active port-forward session by ID and marks it Stopped.
func (a *App) StopPortForward(id string) {
	a.pfMu.Lock()
	pf, ok := a.portForwards[id]
	if !ok {
		a.pfMu.Unlock()
		return
	}
	pf.Status = "Stopped"
	a.portForwards[id] = pf
	if cancel, exists := a.pfCancels[id]; exists {
		cancel()
		delete(a.pfCancels, id)
	}
	a.pfMu.Unlock()
	a.emitPortForwards()
}

// RemovePortForward deletes a stopped port-forward session by ID.
func (a *App) RemovePortForward(id string) {
	a.pfMu.Lock()
	if _, ok := a.portForwards[id]; !ok {
		a.pfMu.Unlock()
		return
	}
	delete(a.portForwards, id)
	if cancel, exists := a.pfCancels[id]; exists {
		cancel()
		delete(a.pfCancels, id)
	}
	a.pfMu.Unlock()
	a.emitPortForwards()
}
