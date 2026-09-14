export interface PodDisruptionBudget {
  Name: string;
  Namespace: string;
  MinAvailable: string;
  MaxUnavailable: string;
  CurrentHealthy: number;
  DesiredHealthy: number;
  Age: string;
}

export interface PodDisruptionBudgetDetail {
  Name: string;
  Namespace: string;
  MinAvailable: string;
  MaxUnavailable: string;
  CurrentHealthy: number;
  DesiredHealthy: number;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Selector: Record<string, string>;
}
