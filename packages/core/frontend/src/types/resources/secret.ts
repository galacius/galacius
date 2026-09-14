export interface Secret {
  Name: string;
  Namespace: string;
  Labels: string[];
  Keys: string[];
  Type: string;
  Age: string;
}

export interface SecretDetail {
  Name: string;
  Namespace: string;
  Type: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Data: Record<string, string>;
}
