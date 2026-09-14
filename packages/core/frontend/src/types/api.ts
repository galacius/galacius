export interface UseQueryCallback<T = unknown> {
  select?: (data?: T) => T;
}
