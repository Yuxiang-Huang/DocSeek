import { describe, expect, test } from "vitest";
import { calculateDistance, formatDistance } from "../utils/distance";

// ===========================================================================
// calculateDistance — Haversine formula, result in miles
// ===========================================================================

describe("calculateDistance", () => {
	test("returns 0 for identical coordinates", () => {
		expect(calculateDistance(0, 0, 0, 0)).toBe(0);
	});

	test("returns 0 for identical non-zero coordinates", () => {
		expect(calculateDistance(40.4406, -79.9959, 40.4406, -79.9959)).toBe(0);
	});

	test("returns a number", () => {
		expect(typeof calculateDistance(0, 0, 1, 0)).toBe("number");
	});

	test("returns a non-negative value", () => {
		expect(calculateDistance(10, 20, 30, 40)).toBeGreaterThanOrEqual(0);
	});

	test("is symmetric — distance(A, B) equals distance(B, A)", () => {
		const d1 = calculateDistance(40.4406, -79.9959, 40.7128, -74.006);
		const d2 = calculateDistance(40.7128, -74.006, 40.4406, -79.9959);
		expect(d1).toBeCloseTo(d2, 10);
	});

	test("1 degree of latitude is approximately 69 miles", () => {
		// One degree of latitude ≈ 69.09 miles (Earth radius × π/180)
		const dist = calculateDistance(0, 0, 1, 0);
		expect(dist).toBeCloseTo(69.09, 0);
	});

	test("1 degree of longitude on the equator is approximately 69 miles", () => {
		// On the equator, longitude degrees equal latitude degrees in distance
		const dist = calculateDistance(0, 0, 0, 1);
		expect(dist).toBeCloseTo(69.09, 0);
	});

	test("Pittsburgh to New York City is approximately 305 miles", () => {
		// Pittsburgh: 40.4406° N, 79.9959° W
		// New York City: 40.7128° N, 74.0060° W
		const dist = calculateDistance(40.4406, -79.9959, 40.7128, -74.006);
		expect(dist).toBeGreaterThan(300);
		expect(dist).toBeLessThan(315);
	});

	test("works with negative latitude (southern hemisphere)", () => {
		// Sydney: -33.8688, 151.2093 — should return a positive distance
		const dist = calculateDistance(-33.8688, 151.2093, 0, 0);
		expect(dist).toBeGreaterThan(0);
	});

	test("distance grows as points move farther apart along the same meridian", () => {
		const short = calculateDistance(0, 0, 1, 0);
		const long = calculateDistance(0, 0, 10, 0);
		expect(long).toBeGreaterThan(short);
	});

	test("quarter-circle arc (0° to 90° latitude) is approximately 6,215 miles", () => {
		// R × (π/2) = 3958.8 × 1.5708 ≈ 6,215 miles
		const dist = calculateDistance(0, 0, 90, 0);
		expect(dist).toBeCloseTo(6215, -1); // within ±10 miles
	});
});

// ===========================================================================
// formatDistance — display string for a distance in miles
// ===========================================================================

describe("formatDistance", () => {
	// --- "Less than 0.1 mi away" branch (miles < 0.1) ---

	test("returns 'Less than 0.1 mi away' for 0 miles", () => {
		expect(formatDistance(0)).toBe("Less than 0.1 mi away");
	});

	test("returns 'Less than 0.1 mi away' for a small positive value (0.05)", () => {
		expect(formatDistance(0.05)).toBe("Less than 0.1 mi away");
	});

	test("returns 'Less than 0.1 mi away' for 0.099 (just below boundary)", () => {
		expect(formatDistance(0.099)).toBe("Less than 0.1 mi away");
	});

	// --- toFixed(1) branch (0.1 ≤ miles < 10) ---

	test("returns '0.1 mi away' for exactly 0.1 miles (boundary is not < 0.1)", () => {
		expect(formatDistance(0.1)).toBe("0.1 mi away");
	});

	test("returns one decimal place for a mid-range value (1.25 → '1.3 mi away')", () => {
		expect(formatDistance(1.25)).toBe("1.3 mi away");
	});

	test("returns one decimal place with trailing zero when needed (5.0 → '5.0 mi away')", () => {
		expect(formatDistance(5.0)).toBe("5.0 mi away");
	});

	test("returns '9.9 mi away' for 9.9 (still in toFixed branch)", () => {
		expect(formatDistance(9.9)).toBe("9.9 mi away");
	});

	test("returns '10.0 mi away' for 9.99 (< 10, so toFixed rounds up the display string)", () => {
		expect(formatDistance(9.99)).toBe("10.0 mi away");
	});

	// --- Math.round branch (miles >= 10) ---

	test("returns '10 mi away' for exactly 10 miles (enters Math.round branch)", () => {
		expect(formatDistance(10)).toBe("10 mi away");
	});

	test("rounds down correctly for 10.4 → '10 mi away'", () => {
		expect(formatDistance(10.4)).toBe("10 mi away");
	});

	test("rounds up correctly for 10.5 → '11 mi away'", () => {
		expect(formatDistance(10.5)).toBe("11 mi away");
	});

	test("rounds a large value correctly (100.4 → '100 mi away')", () => {
		expect(formatDistance(100.4)).toBe("100 mi away");
	});

	test("rounds a large value up correctly (100.6 → '101 mi away')", () => {
		expect(formatDistance(100.6)).toBe("101 mi away");
	});

	test("returns '305 mi away' for 305 miles", () => {
		expect(formatDistance(305)).toBe("305 mi away");
	});
});
