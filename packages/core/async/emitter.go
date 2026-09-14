package async

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// Emit marshals payload and publishes it to the host on topic "plugins.<pluginID>.<eventName>".
func (c *GrpcClient) Emit(ctx context.Context, eventName string, pluginID string, payload interface{}) {
	var payloadJSON string
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			fmt.Printf("emit event: marshal payload: %v\n", err)
			return
		}
		payloadJSON = string(b)
	}

	go func() {
		emitCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		topic := fmt.Sprintf("plugins.%s.%s", pluginID, eventName)
		if err := c.Publish(emitCtx, topic, payloadJSON); err != nil {
			fmt.Printf("%v\n", err)
		}
	}()
}
