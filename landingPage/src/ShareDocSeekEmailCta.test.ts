import { describe, expect, test } from "vitest";
import { buildDocSeekShareMailto } from "./ShareDocSeekEmailCta";

describe("buildDocSeekShareMailto", () => {
	test("returns mailto with encoded subject and body including page URL", () => {
		const href = buildDocSeekShareMailto("https://example.com/landing/");
		expect(href.startsWith("mailto:?")).toBe(true);
		expect(href).toContain(encodeURIComponent("https://example.com/landing/"));
		expect(href).toContain(encodeURIComponent("Pittsburgh"));
		expect(href).toContain(encodeURIComponent("UPMC"));
	});
});
