import { afterEach, describe, expect, test, vi } from "vitest";
import { docseekAppHomeHref, docseekAppOrigin } from "./appUrl";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("docseekAppOrigin", () => {
	test("defaults to deployed Railway app when env is unset", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", undefined);
		expect(docseekAppOrigin()).toBe("https://docseek.up.railway.app");
	});

	test("defaults when env is empty string", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", "");
		expect(docseekAppOrigin()).toBe("https://docseek.up.railway.app");
	});

	test("trims trailing slash from configured origin", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", "https://docseek.up.railway.app/");
		expect(docseekAppOrigin()).toBe("https://docseek.up.railway.app");
	});
});

describe("docseekAppHomeHref", () => {
	test("appends single trailing slash for home URL", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", "https://docseek.up.railway.app");
		expect(docseekAppHomeHref()).toBe("https://docseek.up.railway.app/");
	});

	test("uses default Railway origin when env unset", () => {
		vi.stubEnv("VITE_DOCSEEK_APP_URL", undefined);
		expect(docseekAppHomeHref()).toBe("https://docseek.up.railway.app/");
	});
});
