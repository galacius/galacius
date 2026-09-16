export interface HPA {
  Name: string;
  Namespace: string;
  Metrics: string;
  MinPods: number;
  MaxPods: number;
  Replicas: number;
  Age: string;
  Status: string;
}

export interface HPAMetric {
  Name: string;
  Current: string;
  Target: string;
}

export interface ScaleTargetRef {
  Kind: string;
  Name: string;
}

export interface HPADetail {
  Name: string;
  Namespace: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ScaleTargetRef: ScaleTargetRef;
  Metrics: HPAMetric[];
  MinPods: number;
  MaxPods: number;
  Replicas: number;
  Status: string;
  Age: string;
}
