import { describe, test, expect, mock, beforeEach } from "bun:test";
import { createApp } from "../index";

// ===========================================================================
// createApp — Hono app factory with injected services
// ===========================================================================

const mockSearchService = mock(() => Promise.resolve([]));
const mockGetDoctorService = mock(() => Promise.resolve(null));
const mockFeedbackService = mock(() => Promise.resolve());
const mockSymptomValidationService = mock(() =>
	Promise.resolve({ isDescriptiveEnough: true }),
);

beforeEach(() => {
	mockSearchService.mockReset();
	mockGetDoctorService.mockReset();
	mockFeedbackService.mockReset();
	mockSymptomValidationService.mockReset();
	mockSearchService.mockImplementation(() => Promise.resolve([]));
	mockGetDoctorService.mockImplementation(() => Promise.resolve(null));
	mockFeedbackService.mockImplementation(() => Promise.resolve());
	mockSymptomValidationService.mockImplementation(() =>
		Promise.resolve({ isDescriptiveEnough: true }),
	);
});

function makeApp() {
	return createApp({
		searchService: mockSearchService,
		getDoctorService: mockGetDoctorService,
		feedbackService: mockFeedbackService,
		symptomValidationService: mockSymptomValidationService,
	});
}

async function json(res: Response) {
	return res.json();
}

// ---------------------------------------------------------------------------
// createApp
// ---------------------------------------------------------------------------

describe("createApp", () => {
	test("returns an object with a fetch method", () => {
		const app = makeApp();
		expect(typeof app.fetch).toBe("function");
	});

	test("works with no arguments (uses defaults)", () => {
		expect(() => createApp()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------

describe("GET /", () => {
	test("responds with status 200", async () => {
		const app = makeApp();
		const res = await app.fetch(new Request("http://localhost/"));
		expect(res.status).toBe(200);
	});

	test("responds with name 'DocSeek API'", async () => {
		const app = makeApp();
		const res = await app.fetch(new Request("http://localhost/"));
		const body = await json(res);
		expect(body.name).toBe("DocSeek API");
	});

	test("responds with status 'ok'", async () => {
		const app = makeApp();
		const res = await app.fetch(new Request("http://localhost/"));
		const body = await json(res);
		expect(body.status).toBe("ok");
	});
});

// ---------------------------------------------------------------------------
// POST /doctors/search
// ---------------------------------------------------------------------------

describe("POST /doctors/search", () => {
	function searchRequest(body: unknown) {
		return new Request("http://localhost/doctors/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	test("returns 400 when symptoms is missing", async () => {
		const app = makeApp();
		const res = await app.fetch(searchRequest({}));
		expect(res.status).toBe(400);
	});

	test("returns 400 when symptoms is an empty string", async () => {
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: "" }));
		expect(res.status).toBe(400);
	});

	test("returns 400 when symptoms is not a string", async () => {
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: 123 }));
		expect(res.status).toBe(400);
	});

	test("returns 400 when body is not valid JSON", async () => {
		const app = makeApp();
		const res = await app.fetch(
			new Request("http://localhost/doctors/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not json",
			}),
		);
		expect(res.status).toBe(400);
	});

	test("returns 200 and calls searchService for a valid request", async () => {
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: "knee pain" }));
		expect(res.status).toBe(200);
		expect(mockSearchService).toHaveBeenCalledTimes(1);
	});

	test("returns the doctors array from the search service", async () => {
		const fakeDoctors = [{ id: 1, full_name: "Dr. Smith" }];
		mockSearchService.mockImplementation(() => Promise.resolve(fakeDoctors));
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: "back pain" }));
		const body = await json(res);
		expect(body.doctors).toEqual(fakeDoctors);
	});

	test("trims whitespace from symptoms before calling the service", async () => {
		const app = makeApp();
		await app.fetch(searchRequest({ symptoms: "  knee pain  " }));
		const calledWith = mockSearchService.mock.calls[0][0];
		expect(calledWith.symptoms).toBe("knee pain");
	});

	test("passes location filter to the search service when provided", async () => {
		const app = makeApp();
		await app.fetch(searchRequest({ symptoms: "pain", location: "Pittsburgh" }));
		const calledWith = mockSearchService.mock.calls[0][0];
		expect(calledWith.options.filters.location).toBe("Pittsburgh");
	});

	test("passes onlyAcceptingNewPatients filter when it is a boolean", async () => {
		const app = makeApp();
		await app.fetch(searchRequest({ symptoms: "pain", onlyAcceptingNewPatients: true }));
		const calledWith = mockSearchService.mock.calls[0][0];
		expect(calledWith.options.filters.onlyAcceptingNewPatients).toBe(true);
	});

	test("returns 500 when searchService is not configured", async () => {
		const app = createApp({});
		const res = await app.fetch(searchRequest({ symptoms: "pain" }));
		expect(res.status).toBe(500);
	});

	test("returns 500 when searchService throws an unexpected error", async () => {
		mockSearchService.mockImplementation(() => Promise.reject(new Error("DB down")));
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: "pain" }));
		expect(res.status).toBe(500);
	});

	test("returns 400 when searchService throws a limit validation error", async () => {
		mockSearchService.mockImplementation(() =>
			Promise.reject(new Error("limit must be a positive integer")),
		);
		const app = makeApp();
		const res = await app.fetch(searchRequest({ symptoms: "pain", limit: -1 }));
		expect(res.status).toBe(400);
	});
});

// ---------------------------------------------------------------------------
// GET /doctors/:id
// ---------------------------------------------------------------------------

describe("GET /doctors/:id", () => {
	function doctorRequest(id: string | number) {
		return new Request(`http://localhost/doctors/${id}`);
	}

	test("returns 400 for an invalid doctor id", async () => {
		const app = makeApp();
		const res = await app.fetch(doctorRequest("abc"));
		expect(res.status).toBe(400);
		expect(await json(res)).toEqual({ error: "invalid doctor id" });
	});

	test("returns 404 when the doctor does not exist", async () => {
		mockGetDoctorService.mockImplementation(() => Promise.resolve(null));
		const app = makeApp();
		const res = await app.fetch(doctorRequest(123));
		expect(res.status).toBe(404);
		expect(await json(res)).toEqual({ error: "doctor not found" });
		expect(mockGetDoctorService).toHaveBeenCalledWith(123);
	});

	test("returns 200 and doctor payload when doctor is found", async () => {
		const doctor = { id: 7, full_name: "Dr. Seven" };
		mockGetDoctorService.mockImplementation(() => Promise.resolve(doctor));
		const app = makeApp();
		const res = await app.fetch(doctorRequest(7));
		expect(res.status).toBe(200);
		expect(await json(res)).toEqual({ doctor });
		expect(mockGetDoctorService).toHaveBeenCalledWith(7);
	});

	test("returns 500 when getDoctorService is not configured", async () => {
		const app = createApp({});
		const res = await app.fetch(doctorRequest(1));
		expect(res.status).toBe(500);
		expect(await json(res)).toEqual({ error: "get doctor service is not configured" });
	});

	test("returns 500 when getDoctorService throws", async () => {
		mockGetDoctorService.mockImplementation(() =>
			Promise.reject(new Error("database unavailable")),
		);
		const app = makeApp();
		const res = await app.fetch(doctorRequest(3));
		expect(res.status).toBe(500);
		expect(await json(res)).toEqual({ error: "database unavailable" });
	});
});

// ---------------------------------------------------------------------------
// POST /doctors/:id/feedback
// ---------------------------------------------------------------------------

describe("POST /doctors/:id/feedback", () => {
	function feedbackRequest(id: string | number, body: unknown) {
		return new Request(`http://localhost/doctors/${id}/feedback`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	test("returns 201 for a valid rating", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(1, { rating: 4 }));
		expect(res.status).toBe(201);
	});

	test("returns 201 with an optional comment", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(1, { rating: 5, comment: "Great!" }));
		expect(res.status).toBe(201);
	});

	test("calls feedbackService with the correct doctorId and rating", async () => {
		const app = makeApp();
		await app.fetch(feedbackRequest(7, { rating: 3 }));
		const calledWith = mockFeedbackService.mock.calls[0][0];
		expect(calledWith.doctorId).toBe(7);
		expect(calledWith.rating).toBe(3);
	});

	test("returns 400 for an invalid doctor id (0)", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(0, { rating: 4 }));
		expect(res.status).toBe(400);
	});

	test("returns 400 for a non-numeric doctor id", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest("abc", { rating: 4 }));
		expect(res.status).toBe(400);
	});

	test("returns 400 for an invalid rating (out of range)", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(1, { rating: 6 }));
		expect(res.status).toBe(400);
	});

	test("returns 400 for a missing rating", async () => {
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(1, {}));
		expect(res.status).toBe(400);
	});

	test("returns 500 when feedbackService is not configured", async () => {
		const app = createApp({});
		const res = await app.fetch(feedbackRequest(1, { rating: 4 }));
		expect(res.status).toBe(500);
	});

	test("returns 500 when feedbackService throws", async () => {
		mockFeedbackService.mockImplementation(() => Promise.reject(new Error("DB error")));
		const app = makeApp();
		const res = await app.fetch(feedbackRequest(1, { rating: 4 }));
		expect(res.status).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// POST /symptoms/validate
// ---------------------------------------------------------------------------

describe("POST /symptoms/validate", () => {
	function validateRequest(body: unknown) {
		return new Request("http://localhost/symptoms/validate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	test("returns 200 for valid symptoms", async () => {
		const app = makeApp();
		const res = await app.fetch(validateRequest({ symptoms: "chest pain" }));
		expect(res.status).toBe(200);
	});

	test("returns the assessment from the validation service", async () => {
		mockSymptomValidationService.mockImplementation(() =>
			Promise.resolve({ isDescriptiveEnough: false, reasoning: "Too vague." }),
		);
		const app = makeApp();
		const res = await app.fetch(validateRequest({ symptoms: "I feel bad" }));
		const body = await json(res);
		expect(body.isDescriptiveEnough).toBe(false);
		expect(body.reasoning).toBe("Too vague.");
	});

	test("returns 400 when symptoms is missing", async () => {
		const app = makeApp();
		const res = await app.fetch(validateRequest({}));
		expect(res.status).toBe(400);
	});

	test("returns 400 when symptoms is an empty string", async () => {
		const app = makeApp();
		const res = await app.fetch(validateRequest({ symptoms: "" }));
		expect(res.status).toBe(400);
	});

	test("calls the validation service with trimmed symptoms", async () => {
		const app = makeApp();
		await app.fetch(validateRequest({ symptoms: "  headache  " }));
		const calledWith = mockSymptomValidationService.mock.calls[0][0];
		expect(calledWith.symptoms).toBe("headache");
	});

	test("passes valid conversation history to the service", async () => {
		const history = [{ role: "assistant", content: "Can you describe more?" }];
		const app = makeApp();
		await app.fetch(validateRequest({ symptoms: "pain", history }));
		const calledWith = mockSymptomValidationService.mock.calls[0][0];
		expect(calledWith.history).toHaveLength(1);
		expect(calledWith.history[0].role).toBe("assistant");
	});

	test("filters out invalid history entries (missing role)", async () => {
		const app = makeApp();
		await app.fetch(
			validateRequest({ symptoms: "pain", history: [{ content: "no role" }, { role: "user", content: "valid" }] }),
		);
		const calledWith = mockSymptomValidationService.mock.calls[0][0];
		expect(calledWith.history).toHaveLength(1);
	});

	test("returns 500 when symptomValidationService is not configured", async () => {
		const app = createApp({});
		const res = await app.fetch(validateRequest({ symptoms: "pain" }));
		expect(res.status).toBe(500);
	});

	test("returns 500 when the validation service throws", async () => {
		mockSymptomValidationService.mockImplementation(() =>
			Promise.reject(new Error("LLM unavailable")),
		);
		const app = makeApp();
		const res = await app.fetch(validateRequest({ symptoms: "pain" }));
		expect(res.status).toBe(500);
	});
});
