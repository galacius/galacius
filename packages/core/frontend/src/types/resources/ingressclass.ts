export interface IngressClass {
  Name: string;
  Controller: string;
  IsDefault: boolean;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
}
