import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import {
	normalizeSymptomAssessment,
	assessSymptomDescription,
	createSymptomValidationService,
} from "../validation";

const fakeConfig = {
	openAiApiKey: "test-key",
	openAiBaseUrl: "https://mock-openai.test",
	openAiValidationModel: "gpt-4o",
};

// ===========================================================================
// normalizeSymptomAssessment — pure function
// ===========================================================================

describe("normalizeSymptomAssessment", () => {
	test("returns { isDescriptiveEnough: true } with no reasoning when descriptive", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: true, reasoning: "looks fine" });
		expect(result).toEqual({ isDescriptiveEnough: true });
	});

	test("strips reasoning when isDescriptiveEnough is true", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: true, reasoning: "some reasoning" });
		expect(result.reasoning).toBeUndefined();
	});

	test("preserves reasoning when isDescriptiveEnough is false and reasoning is provided", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: false, reasoning: "Too vague." });
		expect(result.reasoning).toBe("Too vague.");
	});

	test("trims whitespace from reasoning when isDescriptiveEnough is false", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: false, reasoning: "  Add more detail.  " });
		expect(result.reasoning).toBe("Add more detail.");
	});

	test("uses the default fallback reasoning when reasoning is undefined", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: false });
		expect(result.reasoning).toBe("Add a little more detail about the symptoms you are experiencing.");
	});

	test("uses the default fallback reasoning when reasoning is whitespace only", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: false, reasoning: "   " });
		expect(result.reasoning).toBe("Add a little more detail about the symptoms you are experiencing.");
	});

	test("returns isDescriptiveEnough: false when not descriptive enough", () => {
		const result = normalizeSymptomAssessment({ isDescriptiveEnough: false, reasoning: "Too vague." });
		expect(result.isDescriptiveEnough).toBe(false);
	});
});

// ===========================================================================
// assessSymptomDescription — mocks global fetch
// ===========================================================================

function makeChatResponse(content: string) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				choices: [{ message: { content } }],
			}),
	};
}

describe("assessSymptomDescription", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	test("returns isDescriptiveEnough: true when the LLM responds true", async () => {
		global.fetch = mock(() =>
			Promise.resolve(makeChatResponse(JSON.stringify({ isDescriptiveEnough: true }))),
		) as unknown as typeof fetch;
		const result = await assessSymptomDescription({ symptoms: "chest pain" }, fakeConfig);
		expect(result.isDescriptiveEnough).toBe(true);
	});

	test("returns isDescriptiveEnough: false with reasoning from the LLM", async () => {
		global.fetch = mock(() =>
			Promise.resolve(
				makeChatResponse(JSON.stringify({ isDescriptiveEnough: false, reasoning: "Too vague." })),
			),
		) as unknown as typeof fetch;
		const result = await assessSymptomDescription({ symptoms: "I feel bad" }, fakeConfig);
		expect(result.isDescriptiveEnough).toBe(false);
		expect(result.reasoning).toBe("Too vague.");
	});

	test("calls fetch with the chat completions endpoint", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(makeChatResponse(JSON.stringify({ isDescriptiveEnough: true }))),
		) as unknown as typeof fetch;
		global.fetch = fetchMock;
		await assessSymptomDescription({ symptoms: "headache" }, fakeConfig);
		const calledUrl = (fetchMock as ReturnType<typeof mock>).mock.calls[0][0];
		expect(calledUrl).toBe("https://mock-openai.test/chat/completions");
	});

	test("throws when the response is not ok", async () => {
		global.fetch = mock(() =>
			Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) }),
		) as unknown as typeof fetch;
		await expect(assessSymptomDescription({ symptoms: "pain" }, fakeConfig)).rejects.toThrow(
			"Symptom validation request failed with status 429",
		);
	});

	test("throws when the response content is empty", async () => {
		global.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ choices: [{ message: { content: "" } }] }),
			}),
		) as unknown as typeof fetch;
		await expect(assessSymptomDescription({ symptoms: "pain" }, fakeConfig)).rejects.toThrow(
			"Symptom validation response did not include content",
		);
	});

	test("throws when the JSON response is missing isDescriptiveEnough", async () => {
		global.fetch = mock(() =>
			Promise.resolve(makeChatResponse(JSON.stringify({ reasoning: "something" }))),
		) as unknown as typeof fetch;
		await expect(assessSymptomDescription({ symptoms: "pain" }, fakeConfig)).rejects.toThrow(
			"Symptom validation response did not match the schema",
		);
	});

	test("passes conversation history to the LLM request body", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(makeChatResponse(JSON.stringify({ isDescriptiveEnough: true }))),
		) as unknown as typeof fetch;
		global.fetch = fetchMock;
		const history = [{ role: "assistant" as const, content: "Can you describe the pain?" }];
		await assessSymptomDescription({ symptoms: "sharp pain", history }, fakeConfig);
		const body = JSON.parse((fetchMock as ReturnType<typeof mock>).mock.calls[0][1].body);
		const roles = body.messages.map((m: { role: string }) => m.role);
		expect(roles).toContain("assistant");
	});
});

// ===========================================================================
// createSymptomValidationService — factory
// ===========================================================================

describe("createSymptomValidationService", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	test("returns a function", () => {
		const service = createSymptomValidationService(fakeConfig);
		expect(typeof service).toBe("function");
	});

	test("the returned service resolves with an assessment object", async () => {
		global.fetch = mock(() =>
			Promise.resolve(makeChatResponse(JSON.stringify({ isDescriptiveEnough: true }))),
		) as unknown as typeof fetch;
		const service = createSymptomValidationService(fakeConfig);
		const result = await service({ symptoms: "severe headache" });
		expect(typeof result.isDescriptiveEnough).toBe("boolean");
	});
});
