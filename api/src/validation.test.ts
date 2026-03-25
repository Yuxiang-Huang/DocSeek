import { describe, expect, test, vi } from "bun:test";
import {
	assessSymptomDescription,
	normalizeSymptomAssessment,
} from "./validation";

describe("symptom validation helpers", () => {
	test("drops reasoning when the description is descriptive enough", () => {
		expect(
			normalizeSymptomAssessment({
				isDescriptiveEnough: true,
				reasoning: "extra detail that should not be returned",
			}),
		).toEqual({
			isDescriptiveEnough: true,
		});
	});

	test("fills in a fallback reason when the model omits one", () => {
		expect(
			normalizeSymptomAssessment({
				isDescriptiveEnough: false,
			}),
		).toEqual({
			isDescriptiveEnough: false,
			reasoning: "Add a little more detail about the symptoms you are experiencing.",
		});
	});

	test("requests a structured symptom assessment from the LLM", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify({
								isDescriptiveEnough: false,
								reasoning:
									"Describe the symptom you are experiencing, not just the test you want.",
							}),
						},
					},
				],
			}),
		});

		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const assessment = await assessSymptomDescription({
				symptoms: "MRI scan",
				history: [
					{
						role: "user",
						content: "headache",
					},
					{
						role: "assistant",
						content: "Describe what the headache feels like.",
					},
				],
			}, {
				openAiApiKey: "test-key",
				openAiBaseUrl: "https://api.openai.com/v1",
				openAiValidationModel: "gpt-4.1-mini",
			});

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.openai.com/v1/chat/completions",
				expect.objectContaining({
					method: "POST",
				}),
			);
			expect(assessment).toEqual({
				isDescriptiveEnough: false,
				reasoning:
					"Describe the symptom you are experiencing, not just the test you want.",
			});
			expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						role: "user",
						content: "headache",
					}),
					expect.objectContaining({
						role: "assistant",
						content: "Describe what the headache feels like.",
					}),
					expect.objectContaining({
						role: "user",
						content: "MRI scan",
					}),
				]),
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
