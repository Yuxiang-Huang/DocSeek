const DEFAULT_RESULT_LIMIT = 10;

type DoctorRow = {
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
	latitude: number | null;
	longitude: number | null;
};

type EmbeddingsResponse = {
	data: Array<{
		embedding: number[];
		index: number;
	}>;
};

type SearchDoctorsOptions = {
	limit?: number;
};

type SearchDoctorsParams = {
	symptoms: string;
	options?: SearchDoctorsOptions;
};

export type DoctorSearchService = (params: SearchDoctorsParams) => Promise<DoctorRow[]>;

type SearchRuntimeConfig = {
	databaseUrl: string;
	openAiApiKey: string;
	openAiBaseUrl: string;
	openAiEmbeddingModel: string;
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

export function createDoctorSearchService(
	config: SearchRuntimeConfig,
): DoctorSearchService {
	const sql = new Bun.SQL(config.databaseUrl);

	return async ({ symptoms, options }) => {
		const limit = normalizeSearchLimit(options?.limit);
		const embedding = await requestEmbedding(symptoms, config);
		const vectorLiteral = formatVectorLiteral(embedding);

		const rows = await sql<DoctorRow[]>`
			SELECT d.*,
				loc.latitude,
				loc.longitude
			FROM doctor_search_embeddings dse
			INNER JOIN doctors d ON d.id = dse.doctor_id
			LEFT JOIN doctor_locations dl ON dl.doctor_id = d.id AND dl.is_primary = true
			LEFT JOIN locations loc ON loc.id = dl.location_id
			WHERE dse.embedding IS NOT NULL
			ORDER BY dse.embedding <=> ${vectorLiteral}::vector
			LIMIT ${limit}
		`;

		return rows;
	};
}
