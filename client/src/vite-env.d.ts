/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path or URL of the API, e.g. "/api" (proxied by Vite) or "http://localhost:4000/api". */
  readonly VITE_API_URL?: string;
  /** "true" turns on Arabic / RTL (read only through `isArabicEnabled()` in src/features.ts). */
  readonly VITE_FEATURE_AR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
