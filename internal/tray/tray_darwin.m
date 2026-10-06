#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>
#import "_cgo_export.h"

// GLC prefix to avoid clashes with Wails classes.
@interface GLCTrayTarget : NSObject
@end

@implementation GLCTrayTarget
- (void)onItem:(id)sender {
    NSMenuItem *item = (NSMenuItem *)sender;
    galaciusTrayItemClicked((int)item.tag);
}
@end

static NSStatusItem *statusItem = nil;
static GLCTrayTarget *trayTarget = nil;

static void addMenuItemToMenu(NSMenu *menu, NSString *title, int tag, GLCTrayTarget *target) {
    NSMenuItem *item = [[NSMenuItem alloc]
        initWithTitle:title
        action:@selector(onItem:)
        keyEquivalent:@""];
    item.tag = tag;
    item.target = target;
    [menu addItem:item];
    [item release];
}

void GLCStartTray(const void* png, int len) {
    dispatch_async(dispatch_get_main_queue(), ^{
        // Idempotent: if already started, do nothing.
        if (statusItem != nil) {
            return;
        }

        // Create status item with variable length (auto-sized by macOS).
        statusItem = [[[NSStatusBar systemStatusBar]
            statusItemWithLength:NSVariableStatusItemLength] retain];

        // Load icon from PNG data.
        NSData *iconData = [NSData dataWithBytes:png length:len];
        NSImage *icon = [[NSImage alloc] initWithData:iconData];
        if (icon != nil) {
            [icon setTemplate:YES];
            [icon setSize:NSMakeSize(18, 18)];
            [statusItem.button setImage:icon];
            [icon release];
        }

        // Create menu.
        NSMenu *menu = [[NSMenu alloc] init];

        // Create tray target (retained).
        trayTarget = [[GLCTrayTarget alloc] init];

        // Add menu items.
        addMenuItemToMenu(menu, @"Open Galacius", 1, trayTarget);    // ItemOpen
        addMenuItemToMenu(menu, @"Settings", 2, trayTarget);          // ItemSettings
        addMenuItemToMenu(menu, @"About Galacius", 3, trayTarget);    // ItemAbout
        [menu addItem:[NSMenuItem separatorItem]];
        addMenuItemToMenu(menu, @"Quit App", 4, trayTarget);          // ItemQuit

        [statusItem setMenu:menu];
        [menu release];
    });
}

void GLCStopTray(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (statusItem != nil) {
            [[NSStatusBar systemStatusBar] removeStatusItem:statusItem];
            [statusItem release];
            statusItem = nil;
        }
        if (trayTarget != nil) {
            [trayTarget release];
            trayTarget = nil;
        }
    });
}
