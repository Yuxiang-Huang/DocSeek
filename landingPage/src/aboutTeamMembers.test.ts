import { describe, expect, test } from "vitest";
import { aboutTeamMembers, publicHeadshotSrc } from "./aboutTeamMembers";

describe("aboutTeamMembers", () => {
	test("publicHeadshotSrc encodes spaces and special characters", () => {
		expect(publicHeadshotSrc("IMG_0360 2.JPG")).toBe(
			"/headshots/IMG_0360%202.JPG",
		);
		expect(publicHeadshotSrc("10.8.2025 CMU Media Day_0337.JPEG")).toBe(
			"/headshots/10.8.2025%20CMU%20Media%20Day_0337.JPEG",
		);
	});

	test("roster lists four members with unique image filenames", () => {
		expect(aboutTeamMembers).toHaveLength(4);
		const names = new Set(aboutTeamMembers.map((m) => m.imageFilename));
		expect(names.size).toBe(4);
	});
});
