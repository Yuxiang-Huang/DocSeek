/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DOCSEEK_APP_URL?: string;
	readonly VITEST?: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
