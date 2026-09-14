package dto

type PriorityClassRef struct {
	Name string `json:"name"`
}

type PriorityClass struct {
	Name             string
	Value            int32
	GlobalDefault    bool
	Description      string
	PreemptionPolicy string
	Age              string
	CreatedAt        string
	ManagedFields    []ManagedField
}
