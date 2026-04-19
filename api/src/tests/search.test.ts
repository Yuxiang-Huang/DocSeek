import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import {
	normalizeSearchLimit,
	formatVectorLiteral,
	requestEmbedding,
	requestDoctorSortFromOpenAI,
	createDoctorSearchService,
	createGetDoctorService,
	type DoctorRow,
} from "../search";

// ===========================================================================
// normalizeSearchLimit — pure function
// ===========================================================================

describe("normalizeSearchLimit", () => {
	test("returns 10 (default) when rawLimit is undefined", () => {
		expect(normalizeSearchLimit(undefined)).toBe(10);
	});

	test("returns the value unchanged for a valid limit of 1", () => {
		expect(normalizeSearchLimit(1)).toBe(1);
	});

	test("returns the value unchanged for a valid limit of 10", () => {
		expect(normalizeSearchLimit(10)).toBe(10);
	});

	test("caps the limit at 50 when the value exceeds 50", () => {
		expect(normalizeSearchLimit(100)).toBe(50);
	});

	test("returns 50 for exactly 50", () => {
		expect(normalizeSearchLimit(50)).toBe(50);
	});

	test("throws for limit 0", () => {
		expect(() => normalizeSearchLimit(0)).toThrow("limit must be a positive integer");
	});

	test("throws for a negative limit", () => {
		expect(() => normalizeSearchLimit(-5)).toThrow("limit must be a positive integer");
	});

	test("throws for a non-integer limit (1.5)", () => {
		expect(() => normalizeSearchLimit(1.5)).toThrow("limit must be a positive integer");
	});
});

// ===========================================================================
// formatVectorLiteral — pure function
// ===========================================================================

describe("formatVectorLiteral", () => {
	test("formats an empty array as '[]'", () => {
		expect(formatVectorLiteral([])).toBe("[]");
	});

	test("formats a single-element array correctly", () => {
		expect(formatVectorLiteral([0.5])).toBe("[0.5]");
	});

	test("formats a two-element array with comma separation", () => {
		expect(formatVectorLiteral([0.1, 0.9])).toBe("[0.1,0.9]");
	});

	test("formats multiple elements correctly", () => {
		expect(formatVectorLiteral([1, 2, 3])).toBe("[1,2,3]");
	});

	test("preserves floating point precision", () => {
		expect(formatVectorLiteral([0.123456789])).toBe("[0.123456789]");
	});
});

// ===========================================================================
// requestEmbedding — mocks global fetch
// ===========================================================================

const fakeConfig = {
	databaseUrl: "mock://db",
	openAiApiKey: "test-key",
	openAiBaseUrl: "https://mock-openai.test",
	openAiEmbeddingModel: "text-embedding-3-small",
	openAiChatModel: "gpt-4o",
};

const mockEmbeddingVector = [0.1, 0.2, 0.3];

function makeEmbeddingResponse(vector: number[]) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				data: [{ embedding: vector, index: 0 }],
			}),
	};
}

describe("requestEmbedding", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = mock(() => Promise.resolve(makeEmbeddingResponse(mockEmbeddingVector))) as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	test("returns the embedding vector from the response", async () => {
		const result = await requestEmbedding("knee pain", fakeConfig);
		expect(result).toEqual(mockEmbeddingVector);
	});

	test("calls fetch with the embeddings endpoint", async () => {
		await requestEmbedding("knee pain", fakeConfig);
		const calledUrl = (global.fetch as ReturnType<typeof mock>).mock.calls[0][0];
		expect(calledUrl).toBe("https://mock-openai.test/embeddings");
	});

	test("throws when the response is not ok", async () => {
		global.fetch = mock(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })) as unknown as typeof fetch;
		await expect(requestEmbedding("pain", fakeConfig)).rejects.toThrow("Embedding request failed with status 401");
	});

	test("throws when the response data contains no embedding", async () => {
		global.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ data: [{ index: 0, embedding: [] }] }),
			}),
		) as unknown as typeof fetch;
		await expect(requestEmbedding("pain", fakeConfig)).rejects.toThrow("Embedding response did not include a vector");
	});

	test("throws when the response data array is empty", async () => {
		global.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ data: [] }),
			}),
		) as unknown as typeof fetch;
		await expect(requestEmbedding("pain", fakeConfig)).rejects.toThrow("Embedding response did not include a vector");
	});
});

// ===========================================================================
// requestDoctorSortFromOpenAI — mocks global fetch
// ===========================================================================

function makeDoctor(id: number, specialty: string | null = null): DoctorRow {
	return {
		id,
		source_provider_id: id,
		npi: null,
		full_name: `Doctor ${id}`,
		first_name: null,
		middle_name: null,
		last_name: null,
		suffix: null,
		primary_specialty: specialty,
		accepting_new_patients: true,
		profile_url: null,
		ratings_url: null,
		book_appointment_url: null,
		primary_location: null,
		primary_phone: null,
		created_at: "2024-01-01",
		match_score: 0.9,
		matched_specialty: null,
		latitude: null,
		longitude: null,
	};
}

function makeChatResponse(content: string) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				choices: [{ message: { content } }],
			}),
	};
}

describe("requestDoctorSortFromOpenAI", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	test("returns an empty array immediately when doctors list is empty", async () => {
		const result = await requestDoctorSortFromOpenAI("pain", [], fakeConfig);
		expect(result).toEqual([]);
	});

	test("does not call fetch when doctors list is empty", async () => {
		const fetchMock = mock(() => Promise.resolve(makeChatResponse("[1]"))) as unknown as typeof fetch;
		global.fetch = fetchMock;
		await requestDoctorSortFromOpenAI("pain", [], fakeConfig);
		expect((fetchMock as ReturnType<typeof mock>).mock.calls.length).toBe(0);
	});

	test("returns doctors sorted by the IDs returned from the API", async () => {
		const doctors = [makeDoctor(1), makeDoctor(2), makeDoctor(3)];
		global.fetch = mock(() => Promise.resolve(makeChatResponse("[3,1,2]"))) as unknown as typeof fetch;
		const result = await requestDoctorSortFromOpenAI("pain", doctors, fakeConfig);
		expect(result.map((d) => d.id)).toEqual([3, 1, 2]);
	});

	test("appends doctors whose IDs are missing from the API response", async () => {
		const doctors = [makeDoctor(1), makeDoctor(2), makeDoctor(3)];
		// API returns only IDs 1 and 3 — doctor 2 should be appended
		global.fetch = mock(() => Promise.resolve(makeChatResponse("[1,3]"))) as unknown as typeof fetch;
		const result = await requestDoctorSortFromOpenAI("pain", doctors, fakeConfig);
		expect(result.map((d) => d.id)).toEqual([1, 3, 2]);
	});

	test("falls back to original order when API returns unparseable content", async () => {
		const doctors = [makeDoctor(1), makeDoctor(2)];
		global.fetch = mock(() => Promise.resolve(makeChatResponse("not a json array"))) as unknown as typeof fetch;
		const result = await requestDoctorSortFromOpenAI("pain", doctors, fakeConfig);
		expect(result.map((d) => d.id)).toEqual([1, 2]);
	});

	test("throws when the fetch response is not ok", async () => {
		const doctors = [makeDoctor(1)];
		global.fetch = mock(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })) as unknown as typeof fetch;
		await expect(requestDoctorSortFromOpenAI("pain", doctors, fakeConfig)).rejects.toThrow("Chat completion failed with status 500");
	});

	test("throws when the response has no content", async () => {
		const doctors = [makeDoctor(1)];
		global.fetch = mock(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ choices: [{ message: { content: "" } }] }),
			}),
		) as unknown as typeof fetch;
		await expect(requestDoctorSortFromOpenAI("pain", doctors, fakeConfig)).rejects.toThrow("Chat completion did not return content");
	});
});

// ===========================================================================
// createDoctorSearchService — factory; mocks Bun.SQL and fetch
// ===========================================================================

describe("createDoctorSearchService", () => {
	const originalSQL = (Bun as unknown as Record<string, unknown>).SQL;
	const originalFetch = global.fetch;
	const mockSql = mock(() => Promise.resolve([]));

	beforeEach(() => {
		mockSql.mockReset();
		mockSql.mockImplementation(() => Promise.resolve([]));
		(Bun as unknown as Record<string, unknown>).SQL = function MockSQL() {
			return mockSql;
		};
		// Mock both embedding and chat completion endpoints
		global.fetch = mock((url: string) => {
			if ((url as string).includes("/embeddings")) {
				return Promise.resolve(makeEmbeddingResponse([0.1, 0.2]));
			}
			return Promise.resolve(makeChatResponse("[]"));
		}) as unknown as typeof fetch;
	});

	afterEach(() => {
		(Bun as unknown as Record<string, unknown>).SQL = originalSQL;
		global.fetch = originalFetch;
	});

	test("returns a function", () => {
		const service = createDoctorSearchService(fakeConfig);
		expect(typeof service).toBe("function");
	});

	test("the returned service resolves to an array", async () => {
		const service = createDoctorSearchService(fakeConfig);
		const result = await service({ symptoms: "knee pain" });
		expect(Array.isArray(result)).toBe(true);
	});

	test("the returned service calls the sql query function", async () => {
		const service = createDoctorSearchService(fakeConfig);
		await service({ symptoms: "knee pain" });
		expect(mockSql).toHaveBeenCalledTimes(1);
	});
});

// ===========================================================================
// createGetDoctorService
// ===========================================================================

describe("createGetDoctorService", () => {
	const originalSQL = (Bun as unknown as Record<string, unknown>).SQL;
	const mockSql = mock(() => Promise.resolve([]));

	beforeEach(() => {
		mockSql.mockReset();
		mockSql.mockImplementation(() => Promise.resolve([]));
		(Bun as unknown as Record<string, unknown>).SQL = function MockSQL() {
			return mockSql;
		};
	});

	afterEach(() => {
		(Bun as unknown as Record<string, unknown>).SQL = originalSQL;
	});

	test("returns null when no doctor row exists", async () => {
		const service = createGetDoctorService({ databaseUrl: "mock://db" });
		await expect(service(123)).resolves.toBeNull();
	});

	test("returns the first doctor row when one exists", async () => {
		const doctor = makeDoctor(4);
		mockSql.mockImplementation(() => Promise.resolve([doctor]));
		const service = createGetDoctorService({ databaseUrl: "mock://db" });
		await expect(service(4)).resolves.toEqual(doctor);
	});
});
