package kubeResources

import (
	"fmt"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func derefBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt32(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

// toManagedFields converts an object's ManagedFields into their DTO form,
// rendering each field's FieldsV1 as YAML.
func toManagedFields(obj metav1.Object) []dto.ManagedField {
	mfs := obj.GetManagedFields()
	out := make([]dto.ManagedField, 0, len(mfs))
	for _, mf := range mfs {
		fieldsYAML := ""
		if raw := mf.FieldsV1.GetRawBytes(); len(raw) > 0 {
			if yamlBytes, err := sigsyaml.JSONToYAML(raw); err == nil {
				fieldsYAML = string(yamlBytes)
			}
		}
		out = append(out, dto.ManagedField{
			Manager:    mf.Manager,
			Operation:  string(mf.Operation),
			FieldsYAML: fieldsYAML,
		})
	}
	return out
}

// humanAge converts a creation time to a human-readable age string.
func humanAge(t time.Time) string {
	d := time.Since(t)
	switch {
	case d >= 24*time.Hour:
		return fmt.Sprintf("%dd", int(d.Hours()/24))
	case d >= time.Hour:
		return fmt.Sprintf("%dh", int(d.Hours()))
	case d >= time.Minute:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	default:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
}
