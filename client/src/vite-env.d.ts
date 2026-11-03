/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path or URL of the API, e.g. "/api" (proxied by Vite) or "http://localhost:4000/api". */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
