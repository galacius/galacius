export interface Ingress {
  Name: string;
  Namespace: string;
  LoadBalancers: string;
  Rules: IngressRule[];
  Age: string;
}

export interface IngressPath {
  Path: string;
  Backend: string;
}

export interface IngressRule {
  Host: string;
  Paths: IngressPath[];
}

export interface IngressDetail {
  Name: string;
  Namespace: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  LoadBalancers: string;
  Ports: string;
  Rules: IngressRule[];
}
