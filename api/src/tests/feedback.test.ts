import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { validateRating, createFeedbackService } from "../feedback";

// ===========================================================================
// validateRating — pure validation, no mocks needed
// ===========================================================================

describe("validateRating", () => {
	test("returns 1 for the minimum valid rating", () => {
		expect(validateRating(1)).toBe(1);
	});

	test("returns 5 for the maximum valid rating", () => {
		expect(validateRating(5)).toBe(5);
	});

	test("returns the rating unchanged for a mid-range value (3)", () => {
		expect(validateRating(3)).toBe(3);
	});

	test("throws for rating 0 (below minimum)", () => {
		expect(() => validateRating(0)).toThrow("rating must be an integer between 1 and 5");
	});

	test("throws for rating 6 (above maximum)", () => {
		expect(() => validateRating(6)).toThrow("rating must be an integer between 1 and 5");
	});

	test("throws for a negative rating", () => {
		expect(() => validateRating(-1)).toThrow();
	});

	test("throws for a float (1.5 is not an integer)", () => {
		expect(() => validateRating(1.5)).toThrow();
	});

	test("throws for a string that looks like a number", () => {
		expect(() => validateRating("3")).toThrow();
	});

	test("throws for null", () => {
		expect(() => validateRating(null)).toThrow();
	});

	test("throws for undefined", () => {
		expect(() => validateRating(undefined)).toThrow();
	});
});

// ===========================================================================
// createFeedbackService — factory; mocks Bun.SQL
// ===========================================================================

describe("createFeedbackService", () => {
	const mockInsert = mock(() => Promise.resolve());
	const originalSQL = (Bun as unknown as Record<string, unknown>).SQL;

	beforeEach(() => {
		mockInsert.mockReset();
		// Replace Bun.SQL with a constructor that returns mockInsert as the tagged-template fn
		(Bun as unknown as Record<string, unknown>).SQL = function MockSQL() {
			return mockInsert;
		};
	});

	afterEach(() => {
		(Bun as unknown as Record<string, unknown>).SQL = originalSQL;
	});

	test("createFeedbackService returns a function", () => {
		const service = createFeedbackService({ databaseUrl: "mock://db" });
		expect(typeof service).toBe("function");
	});

	test("calling the service resolves without throwing", async () => {
		const service = createFeedbackService({ databaseUrl: "mock://db" });
		await expect(service({ doctorId: 1, rating: 4 })).resolves.toBeUndefined();
	});

	test("calling the service invokes the sql template tag once", async () => {
		const service = createFeedbackService({ databaseUrl: "mock://db" });
		await service({ doctorId: 1, rating: 4 });
		expect(mockInsert).toHaveBeenCalledTimes(1);
	});

	test("calling the service with a comment resolves without throwing", async () => {
		const service = createFeedbackService({ databaseUrl: "mock://db" });
		await expect(service({ doctorId: 2, rating: 5, comment: "Great doctor" })).resolves.toBeUndefined();
	});

	test("rejects when the sql call throws", async () => {
		mockInsert.mockImplementation(() => Promise.reject(new Error("DB error")));
		const service = createFeedbackService({ databaseUrl: "mock://db" });
		await expect(service({ doctorId: 1, rating: 3 })).rejects.toThrow("DB error");
	});
});
