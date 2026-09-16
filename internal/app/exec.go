package app

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"
	executil "k8s.io/utils/exec"
)

func execKey(ns, pod, container string) string {
	return fmt.Sprintf("exec:%s:%s:%s", ns, pod, container)
}

// termSizeQueue implements remotecommand.TerminalSizeQueue backed by a channel.
type termSizeQueue struct {
	ch <-chan remotecommand.TerminalSize
}

func (q *termSizeQueue) Next() *remotecommand.TerminalSize {
	sz, ok := <-q.ch
	if !ok {
		return nil
	}
	return &sz
}

// eventWriter wraps a Wails event emitter as an io.Writer so executor stdout/stderr
// can be forwarded line-by-line to the frontend.
type eventWriter struct {
	ctx      context.Context
	eventKey string
}

func (w *eventWriter) Write(p []byte) (int, error) {
	runtime.EventsEmit(w.ctx, w.eventKey, string(p))
	return len(p), nil
}

// ExecInPod opens an interactive shell session in the given pod/container.
// Any pre-existing exec session with the same key is cancelled first.
func (a *App) ExecInPod(contextName, ns, pod, container string) error {
	key := execKey(ns, pod, container)

	a.streamMu.Lock()
	if cancel, ok := a.execCancels[key]; ok {
		cancel()
	}
	childCtx, cancel := context.WithCancel(a.ctx)
	a.execCancels[key] = cancel
	resizeCh := make(chan remotecommand.TerminalSize, 1)
	a.execResizeChans[key] = resizeCh
	a.streamMu.Unlock()

	a.mu.RLock()
	cs := a.clients[contextName]
	rc := a.restConfigs[contextName]
	a.mu.RUnlock()

	if cs == nil || rc == nil {
		cancel()
		return fmt.Errorf("no client for context %q", contextName)
	}

	cmd := []string{"sh", "-c", "clear; (bash || ash || sh)"}

	execURL := cs.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(pod).
		Namespace(ns).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: container,
			Command:   cmd,
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec).
		URL()

	executor, err := remotecommand.NewSPDYExecutor(rc, "POST", execURL)
	if err != nil {
		cancel()
		return fmt.Errorf("exec executor: %w", err)
	}

	stdinReader, stdinWriter := io.Pipe()
	stdoutKey := "exec:stdout:" + key
	stdinEventKey := "exec:stdin:" + key

	// Forward stdin events from the frontend into the pipe.
	unsub := runtime.EventsOn(a.ctx, stdinEventKey, func(data ...any) {
		if len(data) > 0 {
			if s, ok := data[0].(string); ok {
				if _, err := stdinWriter.Write([]byte(s)); err != nil {
					log.Printf("app: ExecInPod stdin write: %v", err)
				}
			}
		}
	})

	echoLine := fmt.Sprintf(
		"exec kubectl exec -i -t -n %s %s -c %s -- sh -c \"clear; (bash || ash || sh)\"",
		ns, pod, container,
	)
	runtime.EventsEmit(a.ctx, "exec:started:"+key, echoLine)

	go func() {
		defer func() {
			stdinWriter.Close()
			stdinReader.Close()
			if unsub != nil {
				unsub()
			}
			runtime.EventsEmit(a.ctx, "exec:closed:"+key, nil)

			a.streamMu.Lock()
			delete(a.execCancels, key)
			// Only remove the map entry if it still holds our channel.
			// A new session may have already replaced it; in that case leave the map alone.
			if a.execResizeChans[key] == resizeCh {
				delete(a.execResizeChans, key)
			}
			a.streamMu.Unlock()
			// Always close our own channel so termSizeQueue.Next() unblocks.
			close(resizeCh)
		}()

		if !a.isActive(contextName) {
			return
		}

		stdout := &eventWriter{ctx: a.ctx, eventKey: stdoutKey}
		err := executor.StreamWithContext(childCtx, remotecommand.StreamOptions{
			Stdin:             stdinReader,
			Stdout:            stdout,
			Stderr:            stdout,
			Tty:               true,
			TerminalSizeQueue: &termSizeQueue{ch: resizeCh},
		})
		// Skip exit event for user-initiated cancellation to avoid misleading "code 1" messages.
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return
		}
		exitCode := 0
		if err != nil {
			var exitErr executil.CodeExitError
			if errors.As(err, &exitErr) {
				exitCode = exitErr.ExitStatus()
			} else {
				exitCode = 1
			}
			log.Printf("app: ExecInPod %s: %v", key, err)
		}
		runtime.EventsEmit(a.ctx, "exec:exit:"+key, exitCode)
	}()

	return nil
}

// ResizeExecTerminal sends a new terminal size to the running exec session.
func (a *App) ResizeExecTerminal(ns, pod, container string, rows, cols uint16) error {
	key := execKey(ns, pod, container)
	a.streamMu.Lock()
	ch, ok := a.execResizeChans[key]
	a.streamMu.Unlock()
	if !ok {
		return fmt.Errorf("no active exec session for %s", key)
	}
	select {
	case ch <- remotecommand.TerminalSize{Width: cols, Height: rows}:
	default:
	}
	return nil
}

// StopExec cancels the running exec session for the given pod/container.
func (a *App) StopExec(ns, pod, container string) {
	key := execKey(ns, pod, container)
	a.streamMu.Lock()
	defer a.streamMu.Unlock()
	if cancel, ok := a.execCancels[key]; ok {
		cancel()
		delete(a.execCancels, key)
	}
}
