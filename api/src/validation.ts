type SymptomDescriptionAssessment = {
	isDescriptiveEnough: boolean;
	reasoning?: string;
};

export type SymptomValidationMessage = {
	role: "user" | "assistant";
	content: string;
};

type SymptomValidationRuntimeConfig = {
	openAiApiKey: string;
	openAiBaseUrl: string;
	openAiValidationModel: string;
};

type ChatCompletionsResponse = {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
};

type SymptomValidationParams = {
	symptoms: string;
	history?: SymptomValidationMessage[];
};

export type SymptomValidationService = (
	params: SymptomValidationParams,
) => Promise<SymptomDescriptionAssessment>;

const symptomValidationSystemPrompt = `You determine whether a patient's symptom description is descriptive enough to search for matching doctors.

Be moderately strict. A single real symptom can be enough, but if the description is vague or could apply to almost anything, ask for a bit more detail.

Return isDescriptiveEnough as false when the text is too vague, not actually about symptoms they are experiencing, or is mainly a request for a test, doctor, or administrative task without describing what is wrong.

When prior messages are included, use them as conversation history. The latest user message is the current symptom input. Assistant messages are the prior follow-up guidance shown to the patient.

When isDescriptiveEnough is false, include a short reasoning message that tells the patient what detail to add.`;

export function normalizeSymptomAssessment(
	assessment: SymptomDescriptionAssessment,
): SymptomDescriptionAssessment {
	if (assessment.isDescriptiveEnough) {
		return { isDescriptiveEnough: true };
	}

	const reasoning = assessment.reasoning?.trim();

	return reasoning
		? {
				isDescriptiveEnough: false,
				reasoning,
			}
		: {
				isDescriptiveEnough: false,
				reasoning:
					"Add a little more detail about the symptoms you are experiencing.",
			};
}

function extractMessageContent(
	content: ChatCompletionsResponse["choices"] extends Array<infer T>
		? T extends { message?: { content?: infer U } }
			? U
			: never
		: never,
): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((part) => (typeof part?.text === "string" ? part.text : ""))
			.join("")
			.trim();
	}

	return "";
}

export async function assessSymptomDescription(
	{ symptoms, history = [] }: SymptomValidationParams,
	config: SymptomValidationRuntimeConfig,
): Promise<SymptomDescriptionAssessment> {
	const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.openAiApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: config.openAiValidationModel,
			messages: [
				{
					role: "system",
					content: symptomValidationSystemPrompt,
				},
				...history,
				{
					role: "user",
					content: symptoms,
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "symptom_description_assessment",
					schema: {
						type: "object",
						properties: {
							isDescriptiveEnough: { type: "boolean" },
							reasoning: { type: "string" },
						},
						required: ["isDescriptiveEnough"],
						additionalProperties: false,
					},
				},
			},
		}),
	});

	if (!response.ok) {
		throw new Error(
			`Symptom validation request failed with status ${response.status}`,
		);
	}

	const payload = (await response.json()) as ChatCompletionsResponse;
	const content = extractMessageContent(payload.choices?.[0]?.message?.content);

	if (!content) {
		throw new Error("Symptom validation response did not include content");
	}

	const parsed = JSON.parse(content) as SymptomDescriptionAssessment;

	if (typeof parsed.isDescriptiveEnough !== "boolean") {
		throw new Error("Symptom validation response did not match the schema");
	}

	return normalizeSymptomAssessment(parsed);
}

export function createSymptomValidationService(
	config: SymptomValidationRuntimeConfig,
): SymptomValidationService {
	return async (params) => assessSymptomDescription(params, config);
}
