import { describe, test, expect, mock, beforeEach } from "bun:test";
import { querySearchDoctors } from "../queries";
import type { DoctorRow } from "../search";

// querySearchDoctors receives `sql` as a parameter (tagged template literal tag),
// so we can pass a mock function directly — no need to patch globals.

function makeDoctorRow(id: number): DoctorRow {
	return {
		id,
		source_provider_id: id,
		npi: null,
		full_name: `Doctor ${id}`,
		first_name: null,
		middle_name: null,
		last_name: null,
		suffix: null,
		primary_specialty: null,
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

// ===========================================================================
// querySearchDoctors
// ===========================================================================

describe("querySearchDoctors", () => {
	let mockSql: ReturnType<typeof mock>;

	beforeEach(() => {
		mockSql = mock(() => Promise.resolve([]));
	});

	test("returns what the sql template tag resolves to", async () => {
		const doctors = [makeDoctorRow(1), makeDoctorRow(2)];
		mockSql.mockImplementation(() => Promise.resolve(doctors));
		const result = await querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1,0.2]", 10);
		expect(result).toEqual(doctors);
	});

	test("calls the sql template tag exactly once", async () => {
		await querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1,0.2]", 10);
		expect(mockSql).toHaveBeenCalledTimes(1);
	});

	test("resolves to an empty array when sql returns no rows", async () => {
		mockSql.mockImplementation(() => Promise.resolve([]));
		const result = await querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1,0.2]", 10);
		expect(result).toEqual([]);
	});

	test("works with no filters argument (uses default empty object)", async () => {
		// Should not throw when filters is omitted
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5),
		).resolves.toEqual([]);
	});

	test("works with a location filter provided", async () => {
		// Should not throw; location filter is passed through to sql interpolation
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, { location: "Pittsburgh, PA" }),
		).resolves.toEqual([]);
	});

	test("works with onlyAcceptingNewPatients: true", async () => {
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, { onlyAcceptingNewPatients: true }),
		).resolves.toEqual([]);
	});

	test("works with both filters provided simultaneously", async () => {
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, {
				location: "Pittsburgh, PA",
				onlyAcceptingNewPatients: true,
			}),
		).resolves.toEqual([]);
	});

	test("works with onlyAcceptingNewPatients: false (treated as no filter)", async () => {
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, { onlyAcceptingNewPatients: false }),
		).resolves.toEqual([]);
	});

	test("works with a whitespace-only location (treated as no filter)", async () => {
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, { location: "   " }),
		).resolves.toEqual([]);
	});

	test("works with an empty filters object (no known filters set)", async () => {
		// Passing an explicitly empty object should behave the same as omitting filters
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5, {}),
		).resolves.toEqual([]);
	});

	test("rejects when the sql call rejects", async () => {
		mockSql.mockImplementation(() => Promise.reject(new Error("DB connection failed")));
		await expect(
			querySearchDoctors(mockSql as unknown as Bun.SQL, "[0.1]", 5),
		).rejects.toThrow("DB connection failed");
	});
});
