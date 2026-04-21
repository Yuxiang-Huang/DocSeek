import { describe, expect, test } from "vitest";
import { QUICK_DEMO_YOUTUBE_EMBED_SRC } from "./quickDemoYoutube";

describe("quickDemoYoutube", () => {
	test("embed URL targets the DocSeek demo video", () => {
		expect(QUICK_DEMO_YOUTUBE_EMBED_SRC).toContain("LqcEq8dSqyk");
		expect(QUICK_DEMO_YOUTUBE_EMBED_SRC).toMatch(
			/^https:\/\/www\.youtube\.com\/embed\//,
		);
	});
});
