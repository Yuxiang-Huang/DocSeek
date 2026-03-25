import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getRuntimeConfig, loadEnvFile } from "./env";

describe("API env", () => {
	test("loads missing values from an env file without overriding existing ones", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "docseek-api-env-"));
		const envFile = join(tempDir, ".env");

		writeFileSync(
			envFile,
			[
				"# comment",
				"DATABASE_URL=postgresql://from-file",
				'OPENAI_API_KEY="from-file-key"',
				"OPENAI_EMBEDDING_MODEL=text-embedding-3-large",
			].join("\n"),
		);

		const env: NodeJS.ProcessEnv = {
			DATABASE_URL: "postgresql://already-set",
		};

		try {
			loadEnvFile(envFile, env);

			expect(env.DATABASE_URL).toBe("postgresql://already-set");
			expect(env.OPENAI_API_KEY).toBe("from-file-key");
			expect(env.OPENAI_EMBEDDING_MODEL).toBe("text-embedding-3-large");
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});

	test("fails fast when OPENAI_API_KEY is missing", () => {
		expect(() =>
			getRuntimeConfig({
				DATABASE_URL: "postgresql://docseek:docseek@localhost:55432/docseek_upmc",
				OPENAI_API_KEY: "",
			}),
		).toThrow(
			"OPENAI_API_KEY is required at startup. Set it in the repo root .env file or the environment.",
		);
	});

	test("returns runtime config from environment", () => {
		const config = getRuntimeConfig({
			PORT: "4010",
			DATABASE_URL: "postgresql://configured-db",
			CORS_ALLOWED_ORIGINS: "http://localhost:5173, http://127.0.0.1:5173",
			OPENAI_API_KEY: "configured-key",
			OPENAI_BASE_URL: "https://example.com/v1/",
			OPENAI_EMBEDDING_MODEL: "text-embedding-3-large",
		});

		expect(config).toEqual({
			port: 4010,
			databaseUrl: "postgresql://configured-db",
			corsAllowedOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"],
			openAiApiKey: "configured-key",
			openAiBaseUrl: "https://example.com/v1",
			openAiEmbeddingModel: "text-embedding-3-large",
			openAiValidationModel: "gpt-4.1-mini",
		});
	});
});
