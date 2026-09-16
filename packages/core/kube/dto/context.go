package dto

// KubeconfigGroup groups context names by the kubeconfig file that defines them.
type KubeconfigGroup struct {
	KubeconfigPath string   `json:"kubeconfigPath"`
	Contexts       []string `json:"contexts"`
}
