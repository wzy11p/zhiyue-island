/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INGESTION_ENDPOINT?: string
  readonly VITE_TUTOR_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
