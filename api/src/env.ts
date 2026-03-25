import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = "postgresql://docseek:docseek@localhost:55432/docseek_upmc";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_VALIDATION_MODEL = "gpt-4.1-mini";

export type RuntimeConfig = {
	port: number;
	databaseUrl: string;
	corsAllowedOrigins: string[];
	openAiApiKey: string;
	openAiBaseUrl: string;
	openAiEmbeddingModel: string;
	openAiValidationModel: string;
};

export function loadEnvFile(
	filePath = resolve(import.meta.dir, "../../.env"),
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (!existsSync(filePath)) {
		return;
	}

	for (const rawLine of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}

		const separatorIndex = line.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		if (!key || env[key] !== undefined) {
			continue;
		}

		let value = line.slice(separatorIndex + 1).trim();
		if (value.length >= 2 && value[0] === value[value.length - 1] && [`"`, "'"].includes(value[0])) {
			value = value.slice(1, -1);
		}

		env[key] = value;
	}
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
	loadEnvFile(undefined, env);

	const port = Number(env.PORT ?? DEFAULT_PORT);
	const databaseUrl = env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
	const corsAllowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	const openAiApiKey = env.OPENAI_API_KEY?.trim() ?? "";
	const openAiBaseUrl = (env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL).replace(/\/$/, "");
	const openAiEmbeddingModel =
		env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_OPENAI_EMBEDDING_MODEL;
	const openAiValidationModel =
		env.OPENAI_VALIDATION_MODEL ?? DEFAULT_OPENAI_VALIDATION_MODEL;

	if (!openAiApiKey) {
		throw new Error(
			"OPENAI_API_KEY is required at startup. Set it in the repo root .env file or the environment.",
		);
	}

	return {
		port,
		databaseUrl,
		corsAllowedOrigins,
		openAiApiKey,
		openAiBaseUrl,
		openAiEmbeddingModel,
		openAiValidationModel,
	};
}
