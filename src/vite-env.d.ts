/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_WOKWI_API_URL?: string;
  readonly VITE_GAS_WEBAPP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
