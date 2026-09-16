/**
 * Merges incoming items from a namespace-scoped event into previously-accumulated items.
 * Removes any items whose Namespace matches the incoming namespace, then appends all incoming items.
 * This allows a hook to maintain live state across N independent per-namespace subscriptions.
 */
export function mergeNamespaceScopedData<T extends { Namespace: string }>(
  previousItems: T[],
  incomingItems: T[],
  namespace: string
): T[] {
  const filtered = previousItems.filter((item) => item.Namespace !== namespace);
  return [...filtered, ...incomingItems];
}
