package app

import (
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

func (a *App) WatchPersistentVolumeDetail(name string) {
	a.watchedPersistentVolume.watch("", name)
}

func (a *App) UnwatchPersistentVolumeDetail(name string) {
	a.watchedPersistentVolume.unwatch("", name)
}

func (a *App) emitPersistentVolumeDetail() {
	_, name, ok := a.watchedPersistentVolume.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSync(h, "pvs") {
		return
	}
	detail, err := kubeResources.GetPersistentVolumeByName(h.Factory.Core().V1().PersistentVolumes().Lister(), name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("pv:update", func() any { return detail })
}

func (a *App) GetPersistentVolumeByName(name string) (dto.PersistentVolumeDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "pvs") {
		return dto.PersistentVolumeDetail{}, nil
	}
	result, err := kubeResources.GetPersistentVolumeByName(h.Factory.Core().V1().PersistentVolumes().Lister(), name)
	if err != nil {
		log.Printf("app: GetPersistentVolumeByName: %v", err)
		return dto.PersistentVolumeDetail{}, nil
	}
	return result, nil
}
