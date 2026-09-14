package dto

type Namespace struct {
	Name           string
	Labels         map[string]string
	Annotations    map[string]string
	Age            string
	CreatedAt      string
	Status         string
	ManagedFields  []ManagedField
	ResourceQuotas []string
	LimitRanges    []string
}
