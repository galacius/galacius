export {
  GetValidatingWebhookConfigByName,
  GetValidatingWebhookConfigYAML,
  ListValidatingWebhookConfigs,
  UnwatchValidatingWebhookConfigDetail,
  UpdateValidatingWebhookConfigYAML,
  WatchValidatingWebhookConfigDetail,
} from "@wailsjs/go/app/App";

export type {
  ValidatingWebhookConfig,
  ValidatingWebhookConfigDetail,
  WebhookDetail,
} from "@galacius/core";
