export interface ResourceQuota {
  Name: string;
  Namespace: string;
  Age: string;
}

export interface ResourceQuotaDetail {
  Name: string;
  Namespace: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Hard: Record<string, string>;
  Used: Record<string, string>;
}
