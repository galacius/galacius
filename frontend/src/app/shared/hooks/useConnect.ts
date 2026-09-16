import { useMutation } from "@tanstack/react-query";
import { Connect } from "@wailsjs/go/app/App";

// Module-scoped (not per-hook-instance) so every call site shares one
// monotonic counter — there's only one logical "active context" on the
// backend to order calls against.
//
// Seeded from Date.now() rather than 0: the Go backend process outlives a
// frontend-only reload (Ctrl+R reloads the webview's JS, not the Wails app),
// so App.activeContextSeq can already be well past 0 from a prior session's
// Connect calls. If this counter restarted at 0 after reload, the first few
// post-reload Connect calls would carry a seq <= the backend's, get silently
// dropped by tryClaimConnectSeq (see App.Connect), and leave the backend's
// activeContext stuck on the pre-reload cluster — while the frontend, seeing
// Connect resolve without error, optimistically switches its UI to the newly
// selected cluster anyway. Seeding from wall-clock time keeps this counter
// far ahead of any seq the backend has ever claimed, and still strictly
// increases across reloads (and within a session, via the ++ below).
let callSeq = Date.now();

export const useConnect = () =>
  useMutation({
    // Rapid back-and-forth cluster switches each fire their own untracked,
    // unordered mutate() call, and each does slow network/informer-sync work
    // before the backend commits it as active — so they can finish in an
    // order that doesn't match the order the user clicked them in. Passing a
    // synchronously-incremented seq lets the backend drop a call that's been
    // superseded by a newer one, instead of a stale switch silently winning
    // and leaving the backend's active context out of sync with the UI. See
    // App.Connect.
    mutationFn: (ctx: string) => Connect(ctx, ++callSeq),
  });
