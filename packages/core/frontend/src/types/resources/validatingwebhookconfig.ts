export interface ValidatingWebhookConfig {
  Name: string;
  Webhooks: number;
  Age: string;
}

export interface ValidatingWebhookConfigDetail {
  Name: string;
  APIVersion: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Webhooks: WebhookDetail[];
}

export interface WebhookDetail {
  Name: string;
  ClientConfigServiceName: string;
  ClientConfigServiceNamespace: string;
  MatchPolicy: string;
  FailurePolicy: string;
  AdmissionReviewVersions: string[];
  SideEffects: string;
  TimeoutSeconds: number;
  NamespaceSelectorExpressions: string;
  ObjectSelectorExpressions: string;
  RulesAPIGroups: string[];
  RulesAPIVersions: string[];
  RulesOperations: string[];
  RulesResources: string[];
  RulesScope: string;
}
