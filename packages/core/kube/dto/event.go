package dto

type Event struct {
	Type                    string
	Message                 string
	Namespace               string
	InvolvedObjectKind      string
	InvolvedObjectName      string
	Source                  string
	Count                   int32
	Age                     string
	LastSeen                string
	CreatedAt               int64
	Name                    string
	Reason                  string
	FirstSeen               string
	FirstSeenAt             int64
	LastSeenAt              int64
	InvolvedObjectFieldPath string
	InvolvedObjectNamespace string
	ManagedFields           []ManagedField
}
