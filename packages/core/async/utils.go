package async

import (
	"encoding/json"
	"fmt"
)

func DeserializeClusterContext(data []byte) (*ClusterContextEvent, error) {
	var event ClusterContextEvent
	if err := json.Unmarshal(data, &event); err != nil {
		return nil, fmt.Errorf("unmarshal cluster context event: %w", err)
	}
	return &event, nil
}

func DeserializeActiveNamespaces(data []byte) (*ActiveNamespacesEvent, error) {
	var event ActiveNamespacesEvent
	if err := json.Unmarshal(data, &event); err != nil {
		return nil, fmt.Errorf("unmarshal active namespaces event: %w", err)
	}
	return &event, nil
}
