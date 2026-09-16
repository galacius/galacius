#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>

void EnableFullscreenButton(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSWindow *window = [[NSApplication sharedApplication] mainWindow];
        if (window == nil) {
            window = [[NSApplication sharedApplication] windows].firstObject;
        }
        if (window != nil) {
            NSWindowCollectionBehavior behaviour = [window collectionBehavior];
            behaviour |= NSWindowCollectionBehaviorFullScreenPrimary;
            [window setCollectionBehavior:behaviour];
        }
    });
}
