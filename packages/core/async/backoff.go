package async

import "time"

// BackoffReconnector tracks the exponential backoff delay used between reconnect
// attempts in watchClusterContext, capped at maxBackoffMS.
type BackoffReconnector struct {
	initialBackoffMS int
	maxBackoffMS     int
	backoffMS        int
}

func NewBackoffReconnector() *BackoffReconnector {
	return &BackoffReconnector{
		initialBackoffMS: 1000,
		maxBackoffMS:     30000,
		backoffMS:        1000,
	}
}

func (br *BackoffReconnector) OnDialError() time.Duration {
	duration := time.Duration(br.backoffMS) * time.Millisecond
	br.backoffMS *= 2
	if br.backoffMS > br.maxBackoffMS {
		br.backoffMS = br.maxBackoffMS
	}
	return duration
}

func (br *BackoffReconnector) OnSubscribeError() time.Duration {
	return br.OnDialError()
}

func (br *BackoffReconnector) OnConnected() {
	br.backoffMS = br.initialBackoffMS
}

func (br *BackoffReconnector) OnStreamError() time.Duration {
	// Don't increase backoff on stream error; let the next dial attempt reset it
	return time.Duration(br.backoffMS) * time.Millisecond
}
