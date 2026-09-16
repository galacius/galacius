//go:build darwin

package app

/*
#cgo LDFLAGS: -framework Cocoa
extern void EnableFullscreenButton(void);
*/
import "C"

func enableFullscreenButton() {
	C.EnableFullscreenButton()
}
