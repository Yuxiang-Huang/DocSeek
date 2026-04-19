import { queryGetDoctorById, querySearchDoctors } from "./queries";


const DEFAULT_RESULT_LIMIT = 10;

export type DoctorRow = {
	id: number;
	source_provider_id: number;
	npi: string | null;
	full_name: string;
	first_name: string | null;
	middle_name: string | null;
	last_name: string | null;
	suffix: string | null;
	primary_specialty: string | null;
	accepting_new_patients: boolean;
	profile_url: string | null;
	ratings_url: string | null;
	book_appointment_url: string | null;
	primary_location: string | null;
	primary_phone: string | null;
	created_at: string;
	match_score: number | null;
	matched_specialty: string | null;
	latitude: number | null;
	longitude: number | null;
	next_available: string | null;
};

type EmbeddingsResponse = {
	data: Array<{
		embedding: number[];
		index: number;
	}>;
};

export type SearchFilters = {
	location?: string | null;
	onlyAcceptingNewPatients?: boolean;
};

type SearchDoctorsOptions = {
	limit?: number;
	filters?: SearchFilters;
};

type SearchDoctorsParams = {
	symptoms: string;
	options?: SearchDoctorsOptions;
};

export type DoctorSearchService = (params: SearchDoctorsParams) => Promise<DoctorRow[]>;

export type GetDoctorService = (doctorId: number) => Promise<DoctorRow | null>;

type SearchRuntimeConfig = {
	databaseUrl: string;
	openAiApiKey: string;
	openAiBaseUrl: string;
	openAiEmbeddingModel: string;
	openAiChatModel: string;
};

export function normalizeSearchLimit(rawLimit: number | undefined): number {
	if (rawLimit === undefined) {
		return DEFAULT_RESULT_LIMIT;
	}

	if (!Number.isInteger(rawLimit) || rawLimit < 1) {
		throw new Error("limit must be a positive integer");
	}

	return Math.min(rawLimit, 50);
}

export function formatVectorLiteral(embedding: number[]): string {
	return `[${embedding.map((value) => value.toString()).join(",")}]`;
}

export async function requestEmbedding(
	symptoms: string,
	config: SearchRuntimeConfig,
): Promise<number[]> {
	const response = await fetch(`${config.openAiBaseUrl}/embeddings`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.openAiApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			input: symptoms,
			model: config.openAiEmbeddingModel,
		}),
	});

	if (!response.ok) {
		throw new Error(`Embedding request failed with status ${response.status}`);
	}

	const payload = (await response.json()) as EmbeddingsResponse;
	const firstItem = payload.data.find((item) => item.index === 0) ?? payload.data[0];

	if (!firstItem?.embedding?.length) {
		throw new Error("Embedding response did not include a vector");
	}

	return firstItem.embedding;
}

type ChatCompletionResponse = {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
};

export async function requestDoctorSortFromOpenAI(
	symptoms: string,
	doctors: DoctorRow[],
	config: SearchRuntimeConfig,
): Promise<DoctorRow[]> {
	if (doctors.length === 0) return doctors;

	const doctorList = doctors
		.map(
			(d, i) =>
				`${i + 1}. id=${d.id}, name=${d.full_name}, specialty=${d.primary_specialty ?? "unknown"}, location=${d.primary_location ?? "unknown"}`,
		)
		.join("\n");

	const systemPrompt = `You are a medical referral assistant. Given a patient's symptoms and a list of doctors, return the doctor IDs in order of best match (most relevant first). Respond with ONLY a JSON array of integers: the doctor IDs in your recommended order. Example: [3, 1, 7, 2, 5, 4, 6, 8, 9, 10]`;

	const userPrompt = `Patient symptoms: ${symptoms}

Doctors (currently in vector-search order):
${doctorList}

Return a JSON array of these doctor IDs sorted by relevance to the symptoms, best match first.`;

	const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.openAiApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: config.openAiChatModel,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			temperature: 0,
		}),
	});

	if (!response.ok) {
		throw new Error(`Chat completion failed with status ${response.status}`);
	}

	const payload = (await response.json()) as ChatCompletionResponse;
	const content = payload.choices?.[0]?.message?.content?.trim();
	if (!content) {
		throw new Error("Chat completion did not return content");
	}

	const jsonMatch = content.match(/\[[\d,\s]*\]/);
	const sortedIds = jsonMatch
		? (JSON.parse(jsonMatch[0]) as number[])
		: doctors.map((d) => d.id);

	const byId = new Map(doctors.map((d) => [d.id, d]));
	const sorted: DoctorRow[] = [];
	for (const id of sortedIds) {
		const doctor = byId.get(id);
		if (doctor) {
			sorted.push(doctor);
			byId.delete(id);
		}
	}
	sorted.push(...Array.from(byId.values()));
	return sorted;
}

export function createDoctorSearchService(
	config: SearchRuntimeConfig,
): DoctorSearchService {
	const sql = new Bun.SQL(config.databaseUrl);

	return async ({ symptoms, options }) => {
		const limit = normalizeSearchLimit(options?.limit);
		const filters = options?.filters ?? {};

		const embedding = await requestEmbedding(symptoms, config);
		const vectorLiteral = formatVectorLiteral(embedding);

		const rows = await querySearchDoctors(sql, vectorLiteral, limit, filters);

		return requestDoctorSortFromOpenAI(symptoms, rows, config);
	};
}

export function createGetDoctorService(config: Pick<SearchRuntimeConfig, "databaseUrl">): GetDoctorService {
	const sql = new Bun.SQL(config.databaseUrl);

	return async (doctorId) => {
		const rows = await queryGetDoctorById(sql, doctorId);
		return rows[0] ?? null;
	};
}
