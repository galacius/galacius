export const EventsOn =
  (_event: string, _callback: (...args: unknown[]) => void): (() => void) =>
  () => {};

export const BrowserOpenURL = (_url: string): void => {};
