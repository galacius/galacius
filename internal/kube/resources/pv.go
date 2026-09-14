package kubeResources

import (
	"maps"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toPersistentVolume(pv *corev1.PersistentVolume) dto.PersistentVolume {
	storageClass := "-"
	if pv.Spec.StorageClassName != "" {
		storageClass = pv.Spec.StorageClassName
	}

	capacity := "-"
	if q, ok := pv.Spec.Capacity[corev1.ResourceStorage]; ok {
		capacity = q.String()
	}

	claim := "-"
	if pv.Spec.ClaimRef != nil {
		claim = pv.Spec.ClaimRef.Namespace + "/" + pv.Spec.ClaimRef.Name
	}

	status := string(pv.Status.Phase)
	if pv.DeletionTimestamp != nil {
		status = "Terminating"
	}

	return dto.PersistentVolume{
		Name:         pv.Name,
		StorageClass: storageClass,
		Capacity:     capacity,
		Claim:        claim,
		Age:          humanAge(pv.CreationTimestamp.Time),
		Status:       status,
	}
}

func toPersistentVolumeDetail(pv *corev1.PersistentVolume) dto.PersistentVolumeDetail {
	capacity := "-"
	if q, ok := pv.Spec.Capacity[corev1.ResourceStorage]; ok {
		capacity = q.String()
	}

	accessModes := make([]string, len(pv.Spec.AccessModes))
	for i, mode := range pv.Spec.AccessModes {
		accessModes[i] = string(mode)
	}

	reclaimPolicy := "-"
	if pv.Spec.PersistentVolumeReclaimPolicy != "" {
		reclaimPolicy = string(pv.Spec.PersistentVolumeReclaimPolicy)
	}

	status := string(pv.Status.Phase)
	if pv.DeletionTimestamp != nil {
		status = "Terminating"
	}

	storageClass := "-"
	if pv.Spec.StorageClassName != "" {
		storageClass = pv.Spec.StorageClassName
	}

	claim := "-"
	if pv.Spec.ClaimRef != nil {
		claim = pv.Spec.ClaimRef.Namespace + "/" + pv.Spec.ClaimRef.Name
	}

	volumeMode := "-"
	if pv.Spec.VolumeMode != nil {
		volumeMode = string(*pv.Spec.VolumeMode)
	}

	mountOptions := pv.Spec.MountOptions
	if mountOptions == nil {
		mountOptions = []string{}
	}

	nodeAffinitySummary := "-"
	if pv.Spec.NodeAffinity != nil && pv.Spec.NodeAffinity.Required != nil && len(pv.Spec.NodeAffinity.Required.NodeSelectorTerms) > 0 {
		nodeAffinitySummary = "Node affinity defined"
	}

	lbls := map[string]string{}
	maps.Copy(lbls, pv.Labels)

	annots := map[string]string{}
	maps.Copy(annots, pv.Annotations)

	return dto.PersistentVolumeDetail{
		Name:                pv.Name,
		Capacity:            capacity,
		AccessModes:         accessModes,
		ReclaimPolicy:       reclaimPolicy,
		Status:              status,
		StorageClass:        storageClass,
		Claim:               claim,
		VolumeMode:          volumeMode,
		MountOptions:        mountOptions,
		NodeAffinitySummary: nodeAffinitySummary,
		Age:                 humanAge(pv.CreationTimestamp.Time),
		CreatedAt:           pv.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:              lbls,
		Annotations:         annots,
	}
}

func ListPersistentVolumes(pvLister listerscorev1.PersistentVolumeLister) ([]dto.PersistentVolume, error) {
	pvs, err := pvLister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	result := make([]dto.PersistentVolume, len(pvs))
	for i, pv := range pvs {
		result[i] = toPersistentVolume(pv)
	}
	return result, nil
}

func GetPersistentVolumeByName(lister listerscorev1.PersistentVolumeLister, name string) (dto.PersistentVolumeDetail, error) {
	pv, err := lister.Get(name)
	if err != nil {
		return dto.PersistentVolumeDetail{}, err
	}
	return toPersistentVolumeDetail(pv), nil
}
