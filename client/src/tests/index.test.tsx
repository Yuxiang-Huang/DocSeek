import { describe, expect, test, vi } from "vitest";
import {
	getDoctorSearchUrl,
	getNextRecommendationLabel,
	getResultsNavigation,
	normalizeSymptoms,
	SUGGESTED_SYMPTOMS,
	searchDoctors,
} from "../components/App";

describe("doctor search helpers", () => {
	test("builds the doctor search endpoint from the API base URL", () => {
		expect(getDoctorSearchUrl("http://localhost:3000")).toBe(
			"http://localhost:3000/doctors/search",
		);
	});

	test("rejects empty symptom submissions", async () => {
		await expect(searchDoctors("   ")).rejects.toThrow(
			"Enter your current symptoms to search for matching doctors.",
		);
	});

	test("calls the backend doctor search endpoint and preserves doctor order", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				doctors: [
					{
						id: 1,
						full_name: "Dr. Avery Quinn",
						primary_specialty: "Neurology",
						accepting_new_patients: true,
						profile_url: "https://example.com/doctors/avery-quinn",
						book_appointment_url: null,
						primary_location: "Pittsburgh, PA",
						primary_phone: "412-555-0100",
					},
					{
						id: 2,
						full_name: "Dr. Riley Chen",
						primary_specialty: "Internal Medicine",
						accepting_new_patients: false,
						profile_url: "https://example.com/doctors/riley-chen",
						book_appointment_url: null,
						primary_location: "Monroeville, PA",
						primary_phone: "412-555-0111",
					},
				],
			}),
		});

		const doctors = await searchDoctors("persistent headaches and dizziness", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/doctors/search",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					symptoms: "persistent headaches and dizziness",
				}),
			}),
		);
		expect(doctors.map((doctor) => doctor.full_name)).toEqual([
			"Dr. Avery Quinn",
			"Dr. Riley Chen",
		]);
	});

	test("uses the improved next suggestion label", () => {
		expect(getNextRecommendationLabel(true)).toBe(
			"See the next recommended doctor",
		);
		expect(getNextRecommendationLabel(false)).toBe(
			"You've reached the last recommendation",
		);
	});

	test("exposes the quick symptom suggestions in the designed order", () => {
		expect(SUGGESTED_SYMPTOMS).toEqual(["Migraines", "MRI scan", "Broken leg"]);
	});
});

describe("frontend page flow", () => {
	test("normalizes symptom input before navigating to the results page", () => {
		expect(normalizeSymptoms("  migraines  ")).toBe("migraines");
		expect(getResultsNavigation("  migraines  ")).toEqual({
			to: "/results",
			search: {
				symptoms: "migraines",
			},
		});
	});
});
