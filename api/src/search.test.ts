import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	requestDoctorSortFromOpenAI,
	normalizeSearchLimit,
} from "./search";

const baseConfig = {
	databaseUrl: "postgresql://localhost/test",
	openAiApiKey: "test-key",
	openAiBaseUrl: "https://api.openai.com/v1",
	openAiEmbeddingModel: "text-embedding-3-small",
	openAiChatModel: "gpt-4o-mini",
};

const doctorA = {
	id: 1,
	source_provider_id: 100,
	npi: null,
	full_name: "Dr. Alice",
	first_name: "Alice",
	middle_name: null,
	last_name: null,
	suffix: null,
	primary_specialty: "Cardiology",
	accepting_new_patients: true,
	profile_url: null,
	ratings_url: null,
	book_appointment_url: null,
	primary_location: "Pittsburgh",
	primary_phone: null,
	created_at: "2026-01-01T00:00:00Z",
};

const doctorB = {
	...doctorA,
	id: 2,
	full_name: "Dr. Bob",
	first_name: "Bob",
	primary_specialty: "Neurology",
};

const doctorC = {
	...doctorA,
	id: 3,
	full_name: "Dr. Carol",
	first_name: "Carol",
	primary_specialty: "Orthopedics",
};

describe("requestDoctorSortFromOpenAI", () => {
	beforeEach(() => {
		globalThis.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						choices: [
							{
								message: {
									content: " [2, 3, 1] ",
								},
							},
						],
					}),
			} as Response),
		) as typeof fetch;
	});

	test("returns empty array when given no doctors", async () => {
		const result = await requestDoctorSortFromOpenAI(
			"headaches",
			[],
			baseConfig,
		);
		expect(result).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});

	test("reorders doctors by OpenAI response", async () => {
		const input = [doctorA, doctorB, doctorC];
		const result = await requestDoctorSortFromOpenAI(
			"migraines and headaches",
			input,
			baseConfig,
		);
		expect(result.map((d) => d.id)).toEqual([2, 3, 1]);
		expect(result[0].full_name).toBe("Dr. Bob");
		expect(result[1].full_name).toBe("Dr. Carol");
		expect(result[2].full_name).toBe("Dr. Alice");
	});

	test("includes doctors not in LLM response at the end", async () => {
		(globalThis.fetch as ReturnType<typeof mock>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					choices: [
						{
							message: {
								content: "[2, 1]",
							},
						},
					],
				}),
		} as Response);

		const input = [doctorA, doctorB, doctorC];
		const result = await requestDoctorSortFromOpenAI("headaches", input, baseConfig);
		expect(result.map((d) => d.id)).toEqual([2, 1, 3]);
	});

	test("throws when chat API returns non-ok", async () => {
		(globalThis.fetch as ReturnType<typeof mock>).mockResolvedValueOnce({
			ok: false,
		} as Response);

		await expect(
			requestDoctorSortFromOpenAI("headaches", [doctorA], baseConfig),
		).rejects.toThrow("Chat completion failed with status");
	});
});

describe("normalizeSearchLimit", () => {
	test("returns 10 when undefined", () => {
		expect(normalizeSearchLimit(undefined)).toBe(10);
	});

	test("returns limit when valid", () => {
		expect(normalizeSearchLimit(5)).toBe(5);
		expect(normalizeSearchLimit(50)).toBe(50);
	});

	test("caps at 50", () => {
		expect(normalizeSearchLimit(100)).toBe(50);
	});

	test("throws for invalid limit", () => {
		expect(() => normalizeSearchLimit(0)).toThrow("limit must be a positive integer");
		expect(() => normalizeSearchLimit(-1)).toThrow("limit must be a positive integer");
	});
});
