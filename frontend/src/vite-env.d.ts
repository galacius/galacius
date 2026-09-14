/// <reference types="vite/client" />

declare const __NODE_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_AUTHOR_NAME: string;
  readonly VITE_AUTHOR_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
