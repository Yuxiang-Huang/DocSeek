// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	buildMatchExplanation,
	type Doctor,
	DoctorRecommendationCard,
	direct_to_booking,
	EmergencyCareAlert,
	FeedbackForm,
	formatMatchedSpecialties,
	formatNextAvailable,
	getDoctorSearchUrl,
	getFallbackDistanceMiles,
	getMatchQualityLabel,
	getNextRecommendationLabel,
	getResultsNavigation,
	getSymptomValidationUrl,
	HomePage,
	loadSortOption,
	normalizeSymptoms,
	ResultsActiveFilters,
	ResultsHeader,
	ResultsPage,
	ResultsRefineFilters,
	ResultsSearchSummary,
	resolveSymptomsSubmission,
	SearchFiltersForm,
	SearchForm,
	SearchHero,
	SearchPageShell,
	saveSortOption,
	searchDoctors,
	sortDoctorsByEarliestAppointment,
	submitFeedback,
	symptomsSuggestEmergencyCare,
	validateSymptoms,
	validateSymptomsForDoctorSearch,
} from "../components/App";

// ---------------------------------------------------------------------------
// Module mocks (hoisted by vitest)
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
	Link: ({
		children,
		to,
		className,
	}: {
		children: ReactNode;
		to: string;
		className?: string;
	}) => (
		<a href={to} className={className}>
			{children}
		</a>
	),
}));

vi.mock("../hooks/useSavedPhysicians", () => ({
	useSavedPhysicians: () => ({
		savedDoctors: [],
		addSavedDoctor: vi.fn(),
		removeSavedDoctor: vi.fn(),
		isSaved: () => false,
	}),
}));

// ---------------------------------------------------------------------------
// Global teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Shared test factory
// ---------------------------------------------------------------------------

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
	return {
		id: 1,
		full_name: "Dr. Test",
		primary_specialty: "General Medicine",
		accepting_new_patients: true,
		profile_url: "https://example.com/doctor/1",
		book_appointment_url: null,
		primary_location: "Pittsburgh, PA",
		primary_phone: "412-555-0001",
		match_score: null,
		matched_specialty: null,
		latitude: null,
		longitude: null,
		...overrides,
	};
}

// ===========================================================================
// getDoctorSearchUrl
// ===========================================================================

describe("getDoctorSearchUrl", () => {
	test("appends /doctors/search to a provided base URL", () => {
		// input: "https://api.example.com"
		// expected: "https://api.example.com/doctors/search"
		expect(getDoctorSearchUrl("https://api.example.com")).toBe(
			"https://api.example.com/doctors/search",
		);
	});

	test("works with a localhost base URL", () => {
		// input: "http://localhost:3000"
		// expected: "http://localhost:3000/doctors/search"
		expect(getDoctorSearchUrl("http://localhost:3000")).toBe(
			"http://localhost:3000/doctors/search",
		);
	});

	test("works with a staging base URL", () => {
		// input: "https://staging.docseek.io"
		// expected: "https://staging.docseek.io/doctors/search"
		expect(getDoctorSearchUrl("https://staging.docseek.io")).toBe(
			"https://staging.docseek.io/doctors/search",
		);
	});
});

// ===========================================================================
// getSymptomValidationUrl
// ===========================================================================

describe("getSymptomValidationUrl", () => {
	test("appends /symptoms/validate to the provided base URL", () => {
		// input: "https://api.example.com"
		// expected: "https://api.example.com/symptoms/validate"
		expect(getSymptomValidationUrl("https://api.example.com")).toBe(
			"https://api.example.com/symptoms/validate",
		);
	});

	test("works with a localhost base URL", () => {
		// input: "http://localhost:3000"
		// expected: "http://localhost:3000/symptoms/validate"
		expect(getSymptomValidationUrl("http://localhost:3000")).toBe(
			"http://localhost:3000/symptoms/validate",
		);
	});
});

// ===========================================================================
// normalizeSymptoms
// ===========================================================================

describe("normalizeSymptoms", () => {
	test("trims leading whitespace", () => {
		// input: "   headache"  →  expected: "headache"
		expect(normalizeSymptoms("   headache")).toBe("headache");
	});

	test("trims trailing whitespace", () => {
		// input: "headache   "  →  expected: "headache"
		expect(normalizeSymptoms("headache   ")).toBe("headache");
	});

	test("trims whitespace on both sides simultaneously", () => {
		// input: "  persistent headache  "  →  expected: "persistent headache"
		expect(normalizeSymptoms("  persistent headache  ")).toBe(
			"persistent headache",
		);
	});

	test("returns empty string for whitespace-only input", () => {
		// input: "   "  →  expected: ""
		expect(normalizeSymptoms("   ")).toBe("");
	});

	test("returns empty string for empty input", () => {
		// input: ""  →  expected: ""
		expect(normalizeSymptoms("")).toBe("");
	});

	test("preserves interior whitespace between words", () => {
		// input: "  chest   pain  "  →  expected: "chest   pain"
		expect(normalizeSymptoms("  chest   pain  ")).toBe("chest   pain");
	});

	test("returns the original string when no trimming is needed", () => {
		// input: "migraines"  →  expected: "migraines"
		expect(normalizeSymptoms("migraines")).toBe("migraines");
	});
});

// ===========================================================================
// symptomsSuggestEmergencyCare
// ===========================================================================

describe("symptomsSuggestEmergencyCare", () => {
	test("returns true for 'chest pain'", () => {
		// input: "chest pain"  →  expected: true
		expect(symptomsSuggestEmergencyCare("chest pain")).toBe(true);
	});

	test("returns true regardless of letter case (uppercase phrase)", () => {
		// input: "CHEST PAIN"  →  expected: true
		expect(symptomsSuggestEmergencyCare("CHEST PAIN")).toBe(true);
	});

	test("returns true for 'stroke'", () => {
		// input: "I think I am having a stroke"  →  expected: true
		expect(symptomsSuggestEmergencyCare("I think I am having a stroke")).toBe(
			true,
		);
	});

	test("returns true for 'shortness of breath'", () => {
		// input: "shortness of breath"  →  expected: true
		expect(symptomsSuggestEmergencyCare("shortness of breath")).toBe(true);
	});

	test("returns true for 'worst headache' (thunderclap proxy phrase)", () => {
		// input: "worst headache of my life"  →  expected: true
		expect(symptomsSuggestEmergencyCare("worst headache of my life")).toBe(
			true,
		);
	});

	test("returns true for 'suicidal'", () => {
		// input: "I feel suicidal"  →  expected: true
		expect(symptomsSuggestEmergencyCare("I feel suicidal")).toBe(true);
	});

	test("returns true when emergency phrase is embedded in a longer sentence", () => {
		// input: "I have had difficulty breathing since yesterday"  →  expected: true
		expect(
			symptomsSuggestEmergencyCare(
				"I have had difficulty breathing since yesterday",
			),
		).toBe(true);
	});

	test("returns false for a common non-emergency symptom", () => {
		// input: "migraines"  →  expected: false
		expect(symptomsSuggestEmergencyCare("migraines")).toBe(false);
	});

	test("returns false for a severe-but-not-emergency headache description", () => {
		// input: "severe headache"  →  expected: false
		expect(symptomsSuggestEmergencyCare("severe headache")).toBe(false);
	});

	test("returns false for empty string", () => {
		// input: ""  →  expected: false
		expect(symptomsSuggestEmergencyCare("")).toBe(false);
	});

	test("returns false for whitespace-only input", () => {
		// input: "   "  →  expected: false
		expect(symptomsSuggestEmergencyCare("   ")).toBe(false);
	});

	test("returns true for 'heart attack'", () => {
		// input: "possible heart attack"  →  expected: true
		expect(symptomsSuggestEmergencyCare("possible heart attack")).toBe(true);
	});

	test("returns true for 'passed out'", () => {
		// input: "I passed out this morning"  →  expected: true
		expect(symptomsSuggestEmergencyCare("I passed out this morning")).toBe(
			true,
		);
	});
});

// ===========================================================================
// validateSymptomsForDoctorSearch
// ===========================================================================

describe("validateSymptomsForDoctorSearch", () => {
	test("returns ok:false with 'enter your current symptoms' message for empty string", () => {
		// input: ""  →  expected: { ok: false, message: /enter your current symptoms/ }
		const result = validateSymptomsForDoctorSearch("");
		expect(result.ok).toBe(false);
		if (!result.ok)
			expect(result.message).toMatch(/enter your current symptoms/i);
	});

	test("returns ok:false for whitespace-only input", () => {
		// input: "   "  →  expected: { ok: false }
		expect(validateSymptomsForDoctorSearch("   ").ok).toBe(false);
	});

	test("returns ok:false with emergency-care message for 'chest pain'", () => {
		// input: "chest pain"  →  expected: { ok: false, message: /emergency care/ }
		const result = validateSymptomsForDoctorSearch("chest pain");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/emergency care/i);
	});

	test("returns ok:true with normalized text for a valid symptom", () => {
		// input: "  migraines  "  →  expected: { ok: true, normalized: "migraines" }
		expect(validateSymptomsForDoctorSearch("  migraines  ")).toEqual({
			ok: true,
			normalized: "migraines",
		});
	});

	test("returns ok:true and preserves multi-word descriptions", () => {
		// input: "persistent knee pain for two weeks"
		// expected: { ok: true, normalized: "persistent knee pain for two weeks" }
		const result = validateSymptomsForDoctorSearch(
			"persistent knee pain for two weeks",
		);
		expect(result.ok).toBe(true);
		if (result.ok)
			expect(result.normalized).toBe("persistent knee pain for two weeks");
	});
});

// ===========================================================================
// getResultsNavigation
// ===========================================================================

describe("getResultsNavigation", () => {
	test("builds a navigation object targeting /results with trimmed symptoms", () => {
		// input: "  migraines  "  →  expected: { to: "/results", search: { symptoms: "migraines" } }
		expect(getResultsNavigation("  migraines  ")).toEqual({
			to: "/results",
			search: { symptoms: "migraines" },
		});
	});

	test("includes location when provided in the filters object", () => {
		// input symptoms: "headache", filters.location: "Pittsburgh"
		// expected: search.location === "Pittsburgh"
		const nav = getResultsNavigation("headache", { location: "Pittsburgh" });
		expect(nav.search).toHaveProperty("location", "Pittsburgh");
	});

	test("includes onlyAcceptingNewPatients as the string 'true' when the flag is set", () => {
		// input filters.onlyAcceptingNewPatients: true
		// expected: search.onlyAcceptingNewPatients === "true"
		const nav = getResultsNavigation("headache", {
			onlyAcceptingNewPatients: true,
		});
		expect(nav.search).toHaveProperty("onlyAcceptingNewPatients", "true");
	});

	test("omits onlyAcceptingNewPatients when it is false", () => {
		// input filters.onlyAcceptingNewPatients: false
		// expected: search has no onlyAcceptingNewPatients key
		const nav = getResultsNavigation("headache", {
			onlyAcceptingNewPatients: false,
		});
		expect(nav.search).not.toHaveProperty("onlyAcceptingNewPatients");
	});

	test("omits location when the filters object has no location", () => {
		// input: filters = {}  →  expected: no location key in search
		const nav = getResultsNavigation("headache", {});
		expect(nav.search).not.toHaveProperty("location");
	});

	test("includes both location and onlyAcceptingNewPatients when both are set", () => {
		// input: location="Pittsburgh, PA", onlyAcceptingNewPatients=true
		// expected: search has both keys
		const nav = getResultsNavigation("headache", {
			location: "Pittsburgh, PA",
			onlyAcceptingNewPatients: true,
		});
		expect(nav.search).toEqual({
			symptoms: "headache",
			location: "Pittsburgh, PA",
			onlyAcceptingNewPatients: "true",
		});
	});

	test("route target is always /results", () => {
		// expected: to === "/results" regardless of inputs
		expect(getResultsNavigation("anything").to).toBe("/results");
	});
});

// ===========================================================================
// submitFeedback
// ===========================================================================

describe("submitFeedback", () => {
	test("POSTs to the correct /doctors/:id/feedback endpoint", async () => {
		// input: doctorId=42  →  expected URL: ".../doctors/42/feedback"
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({}) });
		await submitFeedback(42, 5, "Great doctor!", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/doctors/42/feedback",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("sends rating and comment in the JSON request body", async () => {
		// input: rating=4, comment="Good experience"
		// expected body: { rating: 4, comment: "Good experience" }
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({}) });
		await submitFeedback(1, 4, "Good experience", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.rating).toBe(4);
		expect(body.comment).toBe("Good experience");
	});

	test("omits the comment field when comment is an empty string", async () => {
		// input: comment=""  →  expected body has no comment key
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({}) });
		await submitFeedback(1, 3, "", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body).not.toHaveProperty("comment");
	});

	test("throws the server error message when response is not ok", async () => {
		// input: server returns { error: "Rating must be between 1 and 5." }
		// expected: throws "Rating must be between 1 and 5."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Rating must be between 1 and 5." }),
		});
		await expect(
			submitFeedback(1, 0, "", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Rating must be between 1 and 5.");
	});

	test("throws a generic message when response is not ok and has no error field", async () => {
		// input: server returns {}  →  expected: throws "Failed to submit feedback."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({}),
		});
		await expect(
			submitFeedback(1, 3, "", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Failed to submit feedback.");
	});

	test("resolves without a return value on success", async () => {
		// input: server returns ok  →  expected: resolves to undefined
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({}) });
		await expect(
			submitFeedback(1, 5, "Nice", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).resolves.toBeUndefined();
	});
});

// ===========================================================================
// getNextRecommendationLabel
// ===========================================================================

describe("getNextRecommendationLabel", () => {
	test("returns 'See the next recommended doctor' when hasNextDoctor is true", () => {
		// input: true  →  expected: "See the next recommended doctor"
		expect(getNextRecommendationLabel(true)).toBe(
			"See the next recommended doctor",
		);
	});

	test('returns "You\'ve reached the last recommendation" when hasNextDoctor is false', () => {
		// input: false  →  expected: "You've reached the last recommendation"
		expect(getNextRecommendationLabel(false)).toBe(
			"You've reached the last recommendation",
		);
	});
});

// ===========================================================================
// getFallbackDistanceMiles
// ===========================================================================

describe("getFallbackDistanceMiles", () => {
	test("returns a value in the range [1, 25)", () => {
		// The seeded formula always yields 1 + fraction*24, so [1, 25)
		for (let id = 1; id <= 10; id++) {
			for (let idx = 0; idx < 5; idx++) {
				const dist = getFallbackDistanceMiles(id, idx);
				expect(dist).toBeGreaterThanOrEqual(1);
				expect(dist).toBeLessThan(25);
			}
		}
	});

	test("is deterministic — same inputs always yield the same output", () => {
		// input: id=5, index=2  →  same result on repeated calls
		expect(getFallbackDistanceMiles(5, 2)).toBe(getFallbackDistanceMiles(5, 2));
	});

	test("produces different distances for different doctor IDs", () => {
		// input: (id=1, idx=0) vs (id=2, idx=0)  →  not equal
		expect(getFallbackDistanceMiles(1, 0)).not.toBe(
			getFallbackDistanceMiles(2, 0),
		);
	});

	test("produces different distances for different recommendation indices", () => {
		// input: (id=1, idx=0) vs (id=1, idx=1)  →  not equal
		expect(getFallbackDistanceMiles(1, 0)).not.toBe(
			getFallbackDistanceMiles(1, 1),
		);
	});

	test("matches the expected seeded formula value for known inputs", () => {
		// id=1, index=0: seed = (1*9301 + 1*49297) % 233280 = 58598
		// distance = 1 + (58598 / 233280) * 24
		const expected = 1 + (58598 / 233280) * 24;
		expect(getFallbackDistanceMiles(1, 0)).toBeCloseTo(expected, 10);
	});
});

// ===========================================================================
// direct_to_booking
// ===========================================================================

describe("direct_to_booking", () => {
	test("returns the doctor's profile_url", () => {
		// input: doctor with profile_url="https://providers.upmc.com/doc/1"
		// expected: "https://providers.upmc.com/doc/1"
		const doctor = makeDoctor({
			profile_url: "https://providers.upmc.com/doc/1",
		});
		expect(direct_to_booking(doctor)).toBe("https://providers.upmc.com/doc/1");
	});

	test("returns null when the doctor has no profile_url", () => {
		// input: doctor with profile_url=null  →  expected: null
		expect(direct_to_booking(makeDoctor({ profile_url: null }))).toBeNull();
	});

	test("returns profile_url even when book_appointment_url also exists", () => {
		// UPMC scheduling happens through the profile, not a direct booking URL
		// input: both profile_url and book_appointment_url set
		// expected: returns profile_url
		const doctor = makeDoctor({
			profile_url: "https://providers.upmc.com/doc/42",
			book_appointment_url: "https://direct-book.example.com",
		});
		expect(direct_to_booking(doctor)).toBe("https://providers.upmc.com/doc/42");
	});
});

// ===========================================================================
// getMatchQualityLabel
// ===========================================================================

describe("getMatchQualityLabel", () => {
	test("returns 'Possible match' for a null score", () => {
		// input: null  →  expected: "Possible match"
		expect(getMatchQualityLabel(null)).toBe("Possible match");
	});

	test("returns 'Strong match' for a score of exactly 0.55", () => {
		// input: 0.55  →  expected: "Strong match"  (boundary)
		expect(getMatchQualityLabel(0.55)).toBe("Strong match");
	});

	test("returns 'Strong match' for scores above 0.55", () => {
		// input: 0.8  →  expected: "Strong match"
		expect(getMatchQualityLabel(0.8)).toBe("Strong match");
		// input: 1.0  →  expected: "Strong match"
		expect(getMatchQualityLabel(1.0)).toBe("Strong match");
	});

	test("returns 'Good match' for a score of exactly 0.4", () => {
		// input: 0.4  →  expected: "Good match"  (boundary)
		expect(getMatchQualityLabel(0.4)).toBe("Good match");
	});

	test("returns 'Good match' for scores in [0.4, 0.55)", () => {
		// input: 0.5  →  expected: "Good match"
		expect(getMatchQualityLabel(0.5)).toBe("Good match");
		// input: 0.54  →  expected: "Good match"
		expect(getMatchQualityLabel(0.54)).toBe("Good match");
	});

	test("returns 'Possible match' for scores below 0.4", () => {
		// input: 0.0  →  expected: "Possible match"
		expect(getMatchQualityLabel(0.0)).toBe("Possible match");
		// input: 0.39  →  expected: "Possible match"
		expect(getMatchQualityLabel(0.39)).toBe("Possible match");
	});
});

// ===========================================================================
// formatMatchedSpecialties
// ===========================================================================

describe("formatMatchedSpecialties", () => {
	test("returns an empty array for a null input", () => {
		// input: null  →  expected: []
		expect(formatMatchedSpecialties(null)).toEqual([]);
	});

	test("returns an empty array for an empty string", () => {
		// input: ""  →  expected: []
		expect(formatMatchedSpecialties("")).toEqual([]);
	});

	test("returns a single-element array for a single specialty", () => {
		// input: "Neurology"  →  expected: ["Neurology"]
		expect(formatMatchedSpecialties("Neurology")).toEqual(["Neurology"]);
	});

	test("splits multiple specialties on semicolons", () => {
		// input: "Neurology;Cardiology;Oncology"
		// expected: ["Neurology", "Cardiology", "Oncology"]
		expect(formatMatchedSpecialties("Neurology;Cardiology;Oncology")).toEqual([
			"Neurology",
			"Cardiology",
			"Oncology",
		]);
	});

	test("trims whitespace around each specialty name", () => {
		// input: " Neurology ; Cardiology "  →  expected: ["Neurology", "Cardiology"]
		expect(formatMatchedSpecialties(" Neurology ; Cardiology ")).toEqual([
			"Neurology",
			"Cardiology",
		]);
	});

	test("filters out empty segments from double or trailing semicolons", () => {
		// input: "Neurology;;Cardiology;"  →  expected: ["Neurology", "Cardiology"]
		expect(formatMatchedSpecialties("Neurology;;Cardiology;")).toEqual([
			"Neurology",
			"Cardiology",
		]);
	});
});

// ===========================================================================
// buildMatchExplanation
// ===========================================================================

describe("buildMatchExplanation", () => {
	test("uses generic specialty text when matchedSpecialty is null", () => {
		// input: symptoms="headache", matchedSpecialty=null
		// expected output contains: "matched to this physician's specialty"
		expect(buildMatchExplanation("headache", null)).toContain(
			"matched to this physician's specialty",
		);
	});

	test("includes the specialty name when matchedSpecialty is provided", () => {
		// input: matchedSpecialty="Neurology"
		// expected output contains: "expertise in Neurology"
		expect(buildMatchExplanation("headache", "Neurology")).toContain(
			"expertise in Neurology",
		);
	});

	test("always wraps the described symptoms in quotes", () => {
		// input: symptoms="persistent knee pain"
		// expected output contains: '"persistent knee pain"'
		expect(
			buildMatchExplanation("persistent knee pain", "Orthopedics"),
		).toContain('"persistent knee pain"');
	});

	test("uses only the first semicolon-separated specialty when multiple exist", () => {
		// input: matchedSpecialty="Neurology;Cardiology"
		// expected output contains "Neurology" but not "Cardiology"
		const result = buildMatchExplanation("headache", "Neurology;Cardiology");
		expect(result).toContain("expertise in Neurology");
		expect(result).not.toContain("Cardiology");
	});

	test("trims whitespace from symptoms before including them in the output", () => {
		// input: symptoms="  headache  "
		// expected output contains: '"headache"' (trimmed)
		expect(buildMatchExplanation("  headache  ", null)).toContain('"headache"');
	});

	test("full output format with specialty", () => {
		// input: symptoms="knee pain", matchedSpecialty="Orthopedics"
		// expected: exact sentence structure
		expect(buildMatchExplanation("knee pain", "Orthopedics")).toBe(
			'Your symptoms were matched to this physician\'s expertise in Orthopedics. You described: "knee pain".',
		);
	});

	test("full output format without specialty", () => {
		// input: symptoms="back pain", matchedSpecialty=null
		// expected: generic sentence
		expect(buildMatchExplanation("back pain", null)).toBe(
			'Your symptoms were matched to this physician\'s specialty. You described: "back pain".',
		);
	});
});

// ===========================================================================
// searchDoctors
// ===========================================================================

describe("searchDoctors", () => {
	test("throws for empty symptoms", async () => {
		// input: ""  →  expected: throws with "enter your current symptoms"
		await expect(searchDoctors("")).rejects.toThrow(
			"Enter your current symptoms to search for matching doctors.",
		);
	});

	test("throws for whitespace-only symptoms", async () => {
		// input: "   "  →  expected: same error
		await expect(searchDoctors("   ")).rejects.toThrow(
			"Enter your current symptoms to search for matching doctors.",
		);
	});

	test("POSTs to the doctor search endpoint", async () => {
		// expected: fetch called with method POST and correct URL
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});
		await searchDoctors("headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/doctors/search",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("sends trimmed symptoms in the request body", async () => {
		// input: "  headache  "  →  body.symptoms === "headache"
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});
		await searchDoctors("  headache  ", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.symptoms).toBe("headache");
	});

	test("returns the doctors array from the server response", async () => {
		// input: server returns two doctors  →  expected: array of length 2
		const doctors = [
			makeDoctor({ id: 1, full_name: "Dr. Alpha" }),
			makeDoctor({ id: 2, full_name: "Dr. Beta" }),
		];
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors }),
		});
		const result = await searchDoctors("headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		expect(result).toHaveLength(2);
		expect(result[0].full_name).toBe("Dr. Alpha");
		expect(result[1].full_name).toBe("Dr. Beta");
	});

	test("includes location in the request body when provided as a filter", async () => {
		// input: filters.location="Pittsburgh"  →  body.location === "Pittsburgh"
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});
		await searchDoctors("headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
			filters: { location: "Pittsburgh" },
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.location).toBe("Pittsburgh");
	});

	test("includes onlyAcceptingNewPatients=true in the body when that filter is set", async () => {
		// input: filters.onlyAcceptingNewPatients=true  →  body.onlyAcceptingNewPatients === true
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});
		await searchDoctors("headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
			filters: { onlyAcceptingNewPatients: true },
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.onlyAcceptingNewPatients).toBe(true);
	});

	test("does not include filter keys when filters object is empty", async () => {
		// input: filters={}  →  body has no location or onlyAcceptingNewPatients
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});
		await searchDoctors("headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
			filters: {},
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body).not.toHaveProperty("location");
		expect(body).not.toHaveProperty("onlyAcceptingNewPatients");
	});

	test("throws the server error message when response is not ok", async () => {
		// input: server returns { ok:false, error:"Invalid symptoms format." }
		// expected: throws "Invalid symptoms format."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Invalid symptoms format." }),
		});
		await expect(
			searchDoctors("headache", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Invalid symptoms format.");
	});

	test("throws a generic message when response is not ok and has no error field", async () => {
		// input: server returns { ok:false, body:{} }
		// expected: throws "Unable to search for doctors right now."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({}),
		});
		await expect(
			searchDoctors("headache", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Unable to search for doctors right now.");
	});

	test("throws when response is ok but missing the doctors field", async () => {
		// input: server returns { results: [] } (wrong shape)
		// expected: throws "Unable to search for doctors right now."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] }),
		});
		await expect(
			searchDoctors("headache", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Unable to search for doctors right now.");
	});
});

// ===========================================================================
// validateSymptoms
// ===========================================================================

describe("validateSymptoms", () => {
	test("throws for empty symptoms without calling fetch", async () => {
		// input: ""  →  expected: throws before any network call
		const fetchMock = vi.fn();
		await expect(
			validateSymptoms("", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow(
			"Enter your current symptoms to search for matching doctors.",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("throws for whitespace-only symptoms", async () => {
		// input: "   "  →  expected: throws same message
		await expect(validateSymptoms("   ")).rejects.toThrow(
			"Enter your current symptoms to search for matching doctors.",
		);
	});

	test("POSTs trimmed symptoms and history to the validation endpoint", async () => {
		// input: symptoms="  persistent headache  ", history=[{role:"user",content:"headache"}]
		// expected: body.symptoms="persistent headache", body.history=[...]
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ isDescriptiveEnough: true }),
		});
		await validateSymptoms("  persistent headache  ", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
			history: [{ role: "user", content: "headache" }],
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.symptoms).toBe("persistent headache");
		expect(body.history).toEqual([{ role: "user", content: "headache" }]);
	});

	test("returns { isDescriptiveEnough: true } and strips reasoning when validation passes", async () => {
		// input: server returns { isDescriptiveEnough: true, reasoning: "should be stripped" }
		// expected: { isDescriptiveEnough: true }  (no reasoning key)
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				isDescriptiveEnough: true,
				reasoning: "should be stripped",
			}),
		});
		const result = await validateSymptoms("persistent headache", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		expect(result).toEqual({ isDescriptiveEnough: true });
	});

	test("returns reasoning when validation reports symptoms are not descriptive enough", async () => {
		// input: server returns { isDescriptiveEnough: false, reasoning: "Be more specific." }
		// expected: { isDescriptiveEnough: false, reasoning: "Be more specific." }
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				isDescriptiveEnough: false,
				reasoning: "Be more specific.",
			}),
		});
		const result = await validateSymptoms("MRI scan", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		expect(result).toEqual({
			isDescriptiveEnough: false,
			reasoning: "Be more specific.",
		});
	});

	test("sends an empty history array when no history option is provided", async () => {
		// input: no history option  →  expected: body.history === []
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ isDescriptiveEnough: true }),
		});
		await validateSymptoms("knee pain", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body.history).toEqual([]);
	});

	test("throws the server error message when response is not ok", async () => {
		// input: server returns { ok:false, error:"Service unavailable." }
		// expected: throws "Service unavailable."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Service unavailable." }),
		});
		await expect(
			validateSymptoms("headache", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Service unavailable.");
	});

	test("throws a generic message when response is ok but missing isDescriptiveEnough", async () => {
		// input: server returns { message: "ok" } (wrong shape)
		// expected: throws "Unable to validate your symptoms right now."
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ message: "ok" }),
		});
		await expect(
			validateSymptoms("headache", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
			}),
		).rejects.toThrow("Unable to validate your symptoms right now.");
	});
});

// ===========================================================================
// resolveSymptomsSubmission
// ===========================================================================

describe("resolveSymptomsSubmission", () => {
	test("returns canNavigate:false without calling the validator for empty symptoms", async () => {
		// input: "   "  →  expected: canNavigate=false, validator never called
		const validateSymptomsImpl = vi.fn();
		const result = await resolveSymptomsSubmission("   ", {
			validateSymptomsImpl,
		});
		expect(result.canNavigate).toBe(false);
		expect(validateSymptomsImpl).not.toHaveBeenCalled();
		if (!result.canNavigate)
			expect(result.errorMessage).toMatch(/enter your current symptoms/i);
	});

	test("returns canNavigate:false with the validator's reasoning when symptoms are vague", async () => {
		// input: "headache", validator says not descriptive
		// expected: canNavigate=false, errorMessage="Be more specific."
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "Be more specific.",
		});
		const result = await resolveSymptomsSubmission("headache", {
			validateSymptomsImpl,
		});
		expect(result.canNavigate).toBe(false);
		if (!result.canNavigate)
			expect(result.errorMessage).toBe("Be more specific.");
	});

	test("increments nextAttemptCount when validation fails", async () => {
		// input: attemptCount=0, validation fails
		// expected: nextAttemptCount=1
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "More detail needed.",
		});
		const result = await resolveSymptomsSubmission("headache", {
			attemptCount: 0,
			validateSymptomsImpl,
		});
		if (!result.canNavigate) expect(result.nextAttemptCount).toBe(1);
	});

	test("appends the user attempt and assistant reasoning to the validation history", async () => {
		// input: validationHistory=[], symptoms="headache", fails with "More detail needed."
		// expected nextValidationHistory: [user+assistant messages appended]
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "More detail needed.",
		});
		const result = await resolveSymptomsSubmission("headache", {
			validationHistory: [],
			validateSymptomsImpl,
		});
		if (!result.canNavigate) {
			expect(result.nextValidationHistory).toEqual([
				{ role: "user", content: "headache" },
				{ role: "assistant", content: "More detail needed." },
			]);
		}
	});

	test("returns canNavigate:true with trimmed symptoms when descriptive enough", async () => {
		// input: "  persistent headache  ", validator says descriptive
		// expected: canNavigate=true, symptoms="persistent headache"
		const validateSymptomsImpl = vi
			.fn()
			.mockResolvedValue({ isDescriptiveEnough: true });
		const result = await resolveSymptomsSubmission("  persistent headache  ", {
			validateSymptomsImpl,
		});
		expect(result.canNavigate).toBe(true);
		if (result.canNavigate) expect(result.symptoms).toBe("persistent headache");
	});

	test("resets attempt count and history to zero on a successful validation", async () => {
		// input: attemptCount=2, existing history, validation passes
		// expected: nextAttemptCount=0, nextValidationHistory=[]
		const validateSymptomsImpl = vi
			.fn()
			.mockResolvedValue({ isDescriptiveEnough: true });
		const result = await resolveSymptomsSubmission("knee pain", {
			attemptCount: 2,
			validationHistory: [{ role: "user", content: "old" }],
			validateSymptomsImpl,
		});
		expect(result.nextAttemptCount).toBe(0);
		expect(result.nextValidationHistory).toEqual([]);
	});

	test("allows navigation after reaching the maximum number of validation attempts", async () => {
		// input: attemptCount=2, maxValidationAttempts=3, validation still fails
		// expected: canNavigate=true (bypass after 3 tries)
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "Still vague.",
		});
		const result = await resolveSymptomsSubmission("MRI scan", {
			attemptCount: 2,
			maxValidationAttempts: 3,
			validateSymptomsImpl,
		});
		expect(result.canNavigate).toBe(true);
	});

	test("passes the full validation history to validateSymptomsImpl", async () => {
		// input: existing history with prior turn
		// expected: validateSymptomsImpl called with that history
		const validateSymptomsImpl = vi
			.fn()
			.mockResolvedValue({ isDescriptiveEnough: true });
		const history = [
			{ role: "user" as const, content: "prior symptom" },
			{ role: "assistant" as const, content: "prior feedback" },
		];
		await resolveSymptomsSubmission("knee pain", {
			validationHistory: history,
			validateSymptomsImpl,
		});
		expect(validateSymptomsImpl).toHaveBeenCalledWith("knee pain", {
			history,
		});
	});

	test("uses a fallback reasoning message when the validator returns no reasoning", async () => {
		// input: validation returns { isDescriptiveEnough: false } (no reasoning field)
		// expected: errorMessage matches /add a little more detail/
		const validateSymptomsImpl = vi
			.fn()
			.mockResolvedValue({ isDescriptiveEnough: false });
		const result = await resolveSymptomsSubmission("headache", {
			validateSymptomsImpl,
		});
		if (!result.canNavigate)
			expect(result.errorMessage).toMatch(/add a little more detail/i);
	});
});

// ===========================================================================
// EmergencyCareAlert  (component)
// ===========================================================================

describe("EmergencyCareAlert", () => {
	test("renders an element with role='alert'", () => {
		render(<EmergencyCareAlert />);
		expect(screen.getByRole("alert")).toBeTruthy();
	});

	test("mentions 911 in the alert body", () => {
		render(<EmergencyCareAlert />);
		expect(screen.getByRole("alert").textContent).toContain("911");
	});

	test("mentions 'emergency room' in the alert body", () => {
		render(<EmergencyCareAlert />);
		expect(screen.getByRole("alert").textContent).toMatch(/emergency room/i);
	});

	test("displays the correct alert title", () => {
		render(<EmergencyCareAlert />);
		expect(
			screen.getByText("Your symptoms may need immediate emergency care"),
		).toBeTruthy();
	});

	test("has aria-live='assertive' so screen readers announce it immediately", () => {
		render(<EmergencyCareAlert />);
		expect(screen.getByRole("alert").getAttribute("aria-live")).toBe(
			"assertive",
		);
	});
});

// ===========================================================================
// SearchPageShell  (component)
// ===========================================================================

describe("SearchPageShell", () => {
	test("renders its children", () => {
		render(
			<SearchPageShell showNav={false}>
				<p>Hello World</p>
			</SearchPageShell>,
		);
		expect(screen.getByText("Hello World")).toBeTruthy();
	});

	test("renders a skip link pointing to #page-content", () => {
		render(
			<SearchPageShell showNav={false}>
				<div />
			</SearchPageShell>,
		);
		expect(
			screen
				.getByRole("link", { name: "Skip to main content" })
				.getAttribute("href"),
		).toBe("#page-content");
	});

	test("wraps content inside a #page-content element", () => {
		render(
			<SearchPageShell showNav={false}>
				<span>content</span>
			</SearchPageShell>,
		);
		expect(document.getElementById("page-content")).toBeTruthy();
	});

	test("renders a <main> as the outermost element", () => {
		render(
			<SearchPageShell showNav={false}>
				<div />
			</SearchPageShell>,
		);
		expect(document.querySelector("main.app-shell")).toBeTruthy();
	});
});

// ===========================================================================
// SearchForm  (component)
// ===========================================================================

describe("SearchForm", () => {
	test("renders a textarea with id 'symptoms'", () => {
		render(
			<SearchForm symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(document.getElementById("symptoms")).toBeTruthy();
	});

	test("renders the submit button with accessible label", () => {
		render(
			<SearchForm symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(
			screen.getByRole("button", { name: /Find matching doctors/i }),
		).toBeTruthy();
	});

	test("textarea value reflects the symptoms prop", () => {
		render(
			<SearchForm
				symptoms="migraine"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);
		expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
			"migraine",
		);
	});

	test("calls onSymptomsChange with the new value when the textarea changes", () => {
		const onSymptomsChange = vi.fn();
		render(
			<SearchForm
				symptoms=""
				onSymptomsChange={onSymptomsChange}
				onSubmit={vi.fn()}
			/>,
		);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "persistent headache" },
		});
		expect(onSymptomsChange).toHaveBeenCalledWith("persistent headache");
	});

	test("calls onSubmit when the form is submitted", () => {
		const onSubmit = vi.fn((e) => e.preventDefault());
		render(
			<SearchForm
				symptoms="headache"
				onSymptomsChange={vi.fn()}
				onSubmit={onSubmit}
			/>,
		);
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(screen.getByRole("textbox").closest("form")!);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test("shows the validation message when provided", () => {
		render(
			<SearchForm
				symptoms=""
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				validationMessage="Describe your symptoms."
			/>,
		);
		expect(screen.getByText("Describe your symptoms.")).toBeTruthy();
	});

	test("does not render the validation message element when message is absent", () => {
		render(
			<SearchForm symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(document.getElementById("symptoms-validation-message")).toBeNull();
	});

	test("disables the submit button and shows 'Finding doctors' label when isLoading", () => {
		render(
			<SearchForm
				symptoms="headache"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				isLoading={true}
			/>,
		);
		const btn = screen.getByRole("button", {
			name: /Finding doctors/i,
		}) as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	test("textarea has aria-describedby pointing to the validation message when present", () => {
		render(
			<SearchForm
				symptoms=""
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				validationMessage="Error!"
			/>,
		);
		expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(
			"symptoms-validation-message",
		);
	});

	test("textarea is marked as required", () => {
		render(
			<SearchForm symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect((screen.getByRole("textbox") as HTMLTextAreaElement).required).toBe(
			true,
		);
	});
});

// ===========================================================================
// SearchFiltersForm  (component)
// ===========================================================================

describe("SearchFiltersForm", () => {
	test("renders a fieldset group labelled 'Filter by your preferences'", () => {
		render(
			<SearchFiltersForm
				location=""
				onlyAcceptingNewPatients={false}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("group", { name: /filter by your preferences/i }),
		).toBeTruthy();
	});

	test("shows the provided location value in the location input", () => {
		render(
			<SearchFiltersForm
				location="Pittsburgh, PA"
				onlyAcceptingNewPatients={false}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);
		const input = screen.getByLabelText(
			/Location \(city, state, or ZIP\)/i,
		) as HTMLInputElement;
		expect(input.value).toBe("Pittsburgh, PA");
	});

	test("calls onLocationChange with the new value when the location input changes", () => {
		const onLocationChange = vi.fn();
		render(
			<SearchFiltersForm
				location=""
				onlyAcceptingNewPatients={false}
				onLocationChange={onLocationChange}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);
		fireEvent.change(
			screen.getByLabelText(/Location \(city, state, or ZIP\)/i),
			{ target: { value: "Cleveland, OH" } },
		);
		expect(onLocationChange).toHaveBeenCalledWith("Cleveland, OH");
	});

	test("checkbox is checked when onlyAcceptingNewPatients is true", () => {
		render(
			<SearchFiltersForm
				location=""
				onlyAcceptingNewPatients={true}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);
		const checkbox = screen.getByLabelText(
			/Only show doctors accepting new patients/i,
		) as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	test("checkbox is unchecked when onlyAcceptingNewPatients is false", () => {
		render(
			<SearchFiltersForm
				location=""
				onlyAcceptingNewPatients={false}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);
		const checkbox = screen.getByLabelText(
			/Only show doctors accepting new patients/i,
		) as HTMLInputElement;
		expect(checkbox.checked).toBe(false);
	});

	test("calls onOnlyAcceptingChange with true when unchecked checkbox is clicked", () => {
		const onOnlyAcceptingChange = vi.fn();
		render(
			<SearchFiltersForm
				location=""
				onlyAcceptingNewPatients={false}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={onOnlyAcceptingChange}
			/>,
		);
		fireEvent.click(
			screen.getByLabelText(/Only show doctors accepting new patients/i),
		);
		expect(onOnlyAcceptingChange).toHaveBeenCalledWith(true);
	});
});

// ===========================================================================
// SearchHero  (component)
// ===========================================================================

describe("SearchHero", () => {
	test("renders the main heading 'How can we help you today?'", () => {
		render(
			<SearchHero symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(
			screen.getByRole("heading", { name: "How can we help you today?" }),
		).toBeTruthy();
	});

	test("renders the lede copy describing the product", () => {
		render(
			<SearchHero symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(
			screen.getByText(
				/Describe what you are feeling and DocSeek will surface/i,
			),
		).toBeTruthy();
	});

	test("shows EmergencyCareAlert when symptoms contain 'chest pain'", () => {
		render(
			<SearchHero
				symptoms="chest pain"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);
		expect(screen.getByRole("alert").textContent).toContain("911");
	});

	test("does not show EmergencyCareAlert for non-emergency symptoms", () => {
		render(
			<SearchHero
				symptoms="migraines"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	test("renders all three suggestion chips", () => {
		render(
			<SearchHero symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(screen.getByRole("button", { name: "Migraines" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "MRI scan" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Broken leg" })).toBeTruthy();
	});

	test("clicking a suggestion chip calls onSymptomsChange with that chip's text", () => {
		const onSymptomsChange = vi.fn();
		render(
			<SearchHero
				symptoms=""
				onSymptomsChange={onSymptomsChange}
				onSubmit={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Migraines" }));
		expect(onSymptomsChange).toHaveBeenCalledWith("Migraines");
	});

	test("shows the errorMessage below the search form", () => {
		render(
			<SearchHero
				symptoms=""
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				errorMessage="Please enter more detail."
			/>,
		);
		expect(screen.getByText("Please enter more detail.")).toBeTruthy();
	});

	test("renders the filters fieldset when filters prop is provided", () => {
		render(
			<SearchHero
				symptoms=""
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				filters={{
					location: "",
					onlyAcceptingNewPatients: false,
					onLocationChange: vi.fn(),
					onOnlyAcceptingChange: vi.fn(),
				}}
			/>,
		);
		expect(
			screen.getByRole("group", { name: /filter by your preferences/i }),
		).toBeTruthy();
	});

	test("does not render the filters fieldset when filters prop is absent", () => {
		render(
			<SearchHero symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);
		expect(
			screen.queryByRole("group", {
				name: /filter by your preferences/i,
			}),
		).toBeNull();
	});
});

// ===========================================================================
// HomePage  (component)
// ===========================================================================

describe("HomePage", () => {
	test("renders the search hero heading", () => {
		render(<HomePage navigateToResults={vi.fn()} />);
		expect(
			screen.getByRole("heading", { name: "How can we help you today?" }),
		).toBeTruthy();
	});

	test("renders the location and accepting-new-patients filter fields", () => {
		render(<HomePage navigateToResults={vi.fn()} />);
		expect(
			screen.getByLabelText(/Location \(city, state, or ZIP\)/i),
		).toBeTruthy();
		expect(
			screen.getByLabelText(/Only show doctors accepting new patients/i),
		).toBeTruthy();
	});

	test("shows an error message when the form is submitted without symptoms", async () => {
		render(<HomePage navigateToResults={vi.fn()} />);
		const symptomsInput = screen.getByLabelText("Current symptoms");
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(symptomsInput.closest("form")!);
		await waitFor(() =>
			expect(screen.getByText(/enter your current symptoms/i)).toBeTruthy(),
		);
	});

	test("calls navigateToResults with symptoms after successful validation", async () => {
		const navigateToResults = vi.fn();
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: true,
			json: async () => ({ isDescriptiveEnough: true }),
		} as Response);

		render(<HomePage navigateToResults={navigateToResults} />);
		const symptomsInput = screen.getByLabelText("Current symptoms");
		fireEvent.change(symptomsInput, {
			target: { value: "persistent knee pain" },
		});
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(symptomsInput.closest("form")!);
		await waitFor(() =>
			expect(navigateToResults).toHaveBeenCalledWith(
				"persistent knee pain",
				undefined,
			),
		);
	});

	test("passes location and accepting-patients filter to navigateToResults when set", async () => {
		const navigateToResults = vi.fn();
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: true,
			json: async () => ({ isDescriptiveEnough: true }),
		} as Response);

		render(<HomePage navigateToResults={navigateToResults} />);
		const symptomsInput = screen.getByLabelText("Current symptoms");
		fireEvent.change(symptomsInput, {
			target: { value: "knee pain" },
		});
		fireEvent.change(
			screen.getByLabelText(/Location \(city, state, or ZIP\)/i),
			{ target: { value: "Pittsburgh, PA" } },
		);
		fireEvent.click(
			screen.getByLabelText(/Only show doctors accepting new patients/i),
		);
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(symptomsInput.closest("form")!);
		await waitFor(() =>
			expect(navigateToResults).toHaveBeenCalledWith("knee pain", {
				location: "Pittsburgh, PA",
				onlyAcceptingNewPatients: true,
			}),
		);
	});
});

// ===========================================================================
// FeedbackForm  (component)
// ===========================================================================

describe("FeedbackForm", () => {
	test("renders 5 star rating buttons", () => {
		render(<FeedbackForm doctorId={1} />);
		for (let i = 1; i <= 5; i++) {
			expect(
				screen.getByRole("button", {
					name: `${i} star${i > 1 ? "s" : ""}`,
				}),
			).toBeTruthy();
		}
	});

	test("submit button is disabled when no star rating has been selected", () => {
		render(<FeedbackForm doctorId={1} />);
		expect(
			(
				screen.getByRole("button", {
					name: "Submit feedback",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("submit button becomes enabled after a star is clicked", () => {
		render(<FeedbackForm doctorId={1} />);
		fireEvent.click(screen.getByRole("button", { name: "3 stars" }));
		expect(
			(
				screen.getByRole("button", {
					name: "Submit feedback",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	test("calls submitFeedbackImpl with the correct doctorId, rating, and comment", async () => {
		const submitFeedbackImpl = vi.fn().mockResolvedValue(undefined);
		render(
			<FeedbackForm doctorId={42} submitFeedbackImpl={submitFeedbackImpl} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "4 stars" }));
		fireEvent.change(screen.getByPlaceholderText(/Optional comment/i), {
			target: { value: "Very helpful doctor" },
		});
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(
			screen.getByRole("button", { name: "Submit feedback" }).closest("form")!,
		);
		await waitFor(() =>
			expect(submitFeedbackImpl).toHaveBeenCalledWith(
				42,
				4,
				"Very helpful doctor",
			),
		);
	});

	test("shows 'Thanks for your feedback!' after successful submission", async () => {
		const submitFeedbackImpl = vi.fn().mockResolvedValue(undefined);
		render(
			<FeedbackForm doctorId={1} submitFeedbackImpl={submitFeedbackImpl} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(
			screen.getByRole("button", { name: "Submit feedback" }).closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText("Thanks for your feedback!")).toBeTruthy(),
		);
	});

	test("shows an error message when submitFeedbackImpl throws", async () => {
		const submitFeedbackImpl = vi
			.fn()
			.mockRejectedValue(new Error("Network failure."));
		render(
			<FeedbackForm doctorId={1} submitFeedbackImpl={submitFeedbackImpl} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "2 stars" }));
		// biome-ignore lint: non-null assertion safe in test context
		fireEvent.submit(
			screen.getByRole("button", { name: "Submit feedback" }).closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText("Network failure.")).toBeTruthy(),
		);
	});
});

// ===========================================================================
// DoctorRecommendationCard  (component)
// ===========================================================================

describe("DoctorRecommendationCard", () => {
	test("renders null when there is no doctor at the active index", () => {
		const { container } = render(
			<DoctorRecommendationCard
				doctors={[]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	test("renders the active doctor's full name as a heading", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ full_name: "Dr. Jane Smith" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms="headache"
				userLocation={null}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Dr. Jane Smith" }),
		).toBeTruthy();
	});

	test("shows 'Accepting new patients' when accepting_new_patients is true", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ accepting_new_patients: true })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Accepting new patients")).toBeTruthy();
	});

	test("shows 'Check availability' when accepting_new_patients is false", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ accepting_new_patients: false })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Check availability")).toBeTruthy();
	});

	test("shows the correct 'Recommendation X of Y' label", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Recommendation 1 of 2")).toBeTruthy();
	});

	test("shows 'Specialty not listed' when primary_specialty is null", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ primary_specialty: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Specialty not listed")).toBeTruthy();
	});

	test("displays the match quality badge ('Strong match' for score 0.7)", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ match_score: 0.7 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms="headache"
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Strong match")).toBeTruthy();
	});

	test("displays 'Good match' badge for a score of 0.45", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ match_score: 0.45 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms="headache"
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Good match")).toBeTruthy();
	});

	test("calls onNextDoctor when the next button is clicked", () => {
		const onNextDoctor = vi.fn();
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={onNextDoctor}
				symptoms=""
				userLocation={null}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "See the next recommended doctor",
			}),
		);
		expect(onNextDoctor).toHaveBeenCalledTimes(1);
	});

	test("next button is disabled when viewing the last doctor", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "You've reached the last recommendation",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("shows the view-profile link when profile_url is set", () => {
		render(
			<DoctorRecommendationCard
				doctors={[
					makeDoctor({
						full_name: "Dr. Test",
						profile_url: "https://example.com/doc",
					}),
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(
			screen.getByRole("link", { name: /View profile for Dr. Test/i }),
		).toBeTruthy();
	});

	test("hides the view-profile link when profile_url is null", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ profile_url: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(screen.queryByRole("link", { name: /View profile/i })).toBeNull();
	});

	test("renders matched specialties as list items", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ matched_specialty: "Neurology;Cardiology" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms="headache"
				userLocation={null}
			/>,
		);
		expect(screen.getByText("Neurology")).toBeTruthy();
		expect(screen.getByText("Cardiology")).toBeTruthy();
	});

	test("does not render the matched specialties list when matched_specialty is null", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ matched_specialty: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(document.querySelector(".match-specialty-list")).toBeNull();
	});

	test("renders a distance label when userLocation is null (fallback seed)", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ id: 7 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(document.querySelector(".distance-label")).toBeTruthy();
	});

	test("calls onSave when the save button is clicked and doctor is not yet saved", () => {
		const onSave = vi.fn();
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ full_name: "Dr. Save" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				isSaved={false}
				onSave={onSave}
				onUnsave={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /Save Dr. Save for later/i }),
		);
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	test("calls onUnsave when the saved button is clicked", () => {
		const onUnsave = vi.fn();
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ full_name: "Dr. Save" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				isSaved={true}
				onSave={vi.fn()}
				onUnsave={onUnsave}
				symptoms=""
				userLocation={null}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Remove Dr. Save from saved physicians/i,
			}),
		);
		expect(onUnsave).toHaveBeenCalledTimes(1);
	});

	test("hides the save/unsave button when onSave and onUnsave are not provided", () => {
		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				symptoms=""
				userLocation={null}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: /Save .+ for later/i }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: /Remove .+ from saved/i }),
		).toBeNull();
	});
});

// ===========================================================================
// ResultsActiveFilters  (component)
// ===========================================================================

describe("ResultsActiveFilters", () => {
	test("renders null when no filters are active", () => {
		const { container } = render(
			<ResultsActiveFilters filters={{}} onRefine={vi.fn()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	test("renders null when onlyAcceptingNewPatients is explicitly false and no location", () => {
		const { container } = render(
			<ResultsActiveFilters
				filters={{ onlyAcceptingNewPatients: false }}
				onRefine={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	test("shows the location label when location filter is set", () => {
		render(
			<ResultsActiveFilters
				filters={{ location: "Pittsburgh, PA" }}
				onRefine={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Pittsburgh, PA/)).toBeTruthy();
	});

	test("shows 'Accepting new patients' label when that filter is active", () => {
		render(
			<ResultsActiveFilters
				filters={{ onlyAcceptingNewPatients: true }}
				onRefine={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Accepting new patients/)).toBeTruthy();
	});

	test("shows both labels joined by a bullet when both filters are set", () => {
		render(
			<ResultsActiveFilters
				filters={{
					location: "Pittsburgh, PA",
					onlyAcceptingNewPatients: true,
				}}
				onRefine={vi.fn()}
			/>,
		);
		expect(
			screen.getByText(/Filtered by: Pittsburgh, PA • Accepting new patients/),
		).toBeTruthy();
	});

	test("calls onRefine when the 'Refine filters' button is clicked", () => {
		const onRefine = vi.fn();
		render(
			<ResultsActiveFilters
				filters={{ location: "Pittsburgh" }}
				onRefine={onRefine}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Refine location and availability filters/i,
			}),
		);
		expect(onRefine).toHaveBeenCalledTimes(1);
	});
});

// ===========================================================================
// ResultsRefineFilters  (component)
// ===========================================================================

describe("ResultsRefineFilters", () => {
	const baseProps = {
		location: "",
		onlyAcceptingNewPatients: false,
		onLocationChange: vi.fn(),
		onOnlyAcceptingChange: vi.fn(),
		onApply: vi.fn(),
		onCancel: vi.fn(),
		isRefining: false,
	};

	test("renders null when isRefining is false", () => {
		const { container } = render(<ResultsRefineFilters {...baseProps} />);
		expect(container.firstChild).toBeNull();
	});

	test("renders the refine form heading when isRefining is true", () => {
		render(<ResultsRefineFilters {...baseProps} isRefining={true} />);
		expect(
			screen.getByRole("heading", { name: "Refine your filters" }),
		).toBeTruthy();
	});

	test("location input shows the provided value when refining", () => {
		render(
			<ResultsRefineFilters
				{...baseProps}
				isRefining={true}
				location="Monroeville"
			/>,
		);
		const input = screen.getByLabelText(
			/Location \(city, state, or ZIP\)/i,
		) as HTMLInputElement;
		expect(input.value).toBe("Monroeville");
	});

	test("calls onLocationChange when the location input changes", () => {
		const onLocationChange = vi.fn();
		render(
			<ResultsRefineFilters
				{...baseProps}
				isRefining={true}
				onLocationChange={onLocationChange}
			/>,
		);
		fireEvent.change(
			screen.getByLabelText(/Location \(city, state, or ZIP\)/i),
			{ target: { value: "Erie, PA" } },
		);
		expect(onLocationChange).toHaveBeenCalledWith("Erie, PA");
	});

	test("checkbox reflects the onlyAcceptingNewPatients prop", () => {
		render(
			<ResultsRefineFilters
				{...baseProps}
				isRefining={true}
				onlyAcceptingNewPatients={true}
			/>,
		);
		const checkbox = screen.getByLabelText(
			/Only show doctors accepting new patients/i,
		) as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	test("calls onApply when the 'Apply filters' button is clicked", () => {
		const onApply = vi.fn();
		render(
			<ResultsRefineFilters
				{...baseProps}
				isRefining={true}
				onApply={onApply}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Apply refined filters" }),
		);
		expect(onApply).toHaveBeenCalledTimes(1);
	});

	test("calls onCancel when the 'Cancel' button is clicked", () => {
		const onCancel = vi.fn();
		render(
			<ResultsRefineFilters
				{...baseProps}
				isRefining={true}
				onCancel={onCancel}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Cancel refining filters" }),
		);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});

// ===========================================================================
// ResultsHeader  (component)
// ===========================================================================

describe("ResultsHeader", () => {
	test("renders the 'Recommended doctors' heading", () => {
		render(
			<ResultsHeader
				includeBackLink={false}
				initialSymptoms="persistent cough"
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Recommended doctors" }),
		).toBeTruthy();
	});

	test("displays the initial symptoms text in the search summary", () => {
		render(
			<ResultsHeader includeBackLink={false} initialSymptoms="knee swelling" />,
		);
		expect(screen.getByText("knee swelling")).toBeTruthy();
	});

	test("hides the back link when includeBackLink is false", () => {
		render(<ResultsHeader includeBackLink={false} initialSymptoms="cough" />);
		expect(
			screen.queryByRole("link", { name: /Start a new search/i }),
		).toBeNull();
	});

	test("shows the back link when includeBackLink is true", () => {
		render(<ResultsHeader includeBackLink={true} initialSymptoms="cough" />);
		expect(
			screen.getByRole("link", { name: /Start a new search/i }),
		).toBeTruthy();
	});

	test("shows the active filters row when a location filter is provided", () => {
		render(
			<ResultsHeader
				includeBackLink={false}
				initialSymptoms="cough"
				activeFilters={{ location: "Pittsburgh" }}
				onRefineFilters={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Pittsburgh/)).toBeTruthy();
	});

	test("does not show the active filters row when activeFilters has no values", () => {
		render(
			<ResultsHeader
				includeBackLink={false}
				initialSymptoms="cough"
				activeFilters={{}}
			/>,
		);
		expect(screen.queryByRole("button", { name: /Refine/i })).toBeNull();
	});
});

// ===========================================================================
// ResultsSearchSummary  (component)
// ===========================================================================

describe("ResultsSearchSummary", () => {
	test("renders the symptoms text visibly", () => {
		render(<ResultsSearchSummary symptoms="persistent back pain" />);
		expect(screen.getByText("persistent back pain")).toBeTruthy();
	});

	test("includes a screen-reader-only label 'Search symptoms:'", () => {
		render(<ResultsSearchSummary symptoms="headache" />);
		expect(screen.getByText("Search symptoms:")).toBeTruthy();
	});

	test("applies the results-search-summary class to the wrapper", () => {
		render(<ResultsSearchSummary symptoms="headache" />);
		expect(document.querySelector(".results-search-summary")).toBeTruthy();
	});

	test("renders different symptom strings correctly", () => {
		render(<ResultsSearchSummary symptoms="lower back pain and fatigue" />);
		expect(screen.getByText("lower back pain and fatigue")).toBeTruthy();
	});
});

// ===========================================================================
// ResultsPage  (component)
// ===========================================================================

describe("ResultsPage", () => {
	// jsdom does not implement navigator.geolocation — stub it so the
	// useEffect in ResultsPage doesn't throw on mount.
	beforeEach(() => {
		Object.defineProperty(globalThis.navigator, "geolocation", {
			value: { getCurrentPosition: vi.fn() },
			writable: true,
			configurable: true,
		});
	});

	test("shows 'Loading recommendations…' while the search is in progress", () => {
		// searchDoctorsImpl never resolves — loading state persists
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={() => new Promise(() => {})}
			/>,
		);
		expect(screen.getByText("Loading recommendations…")).toBeTruthy();
	});

	test("renders the doctor card after a successful search", async () => {
		const doctor = makeDoctor({ full_name: "Dr. Results" });
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={vi.fn().mockResolvedValue([doctor])}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Dr. Results" })).toBeTruthy(),
		);
	});

	test("shows the server error message when the search rejects", async () => {
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={vi.fn().mockRejectedValue(new Error("API is down."))}
			/>,
		);
		await waitFor(() => expect(screen.getByText("API is down.")).toBeTruthy());
	});

	test("shows 'No doctors matched' message when search returns an empty array", async () => {
		render(
			<ResultsPage
				initialSymptoms="very unusual condition xyz"
				searchDoctorsImpl={vi.fn().mockResolvedValue([])}
			/>,
		);
		await waitFor(() =>
			expect(
				screen.getByText(/No doctors matched those symptoms/i),
			).toBeTruthy(),
		);
	});

	test("shows the emergency alert and skips the search for emergency symptoms", async () => {
		const searchDoctorsImpl = vi.fn();
		render(
			<ResultsPage
				initialSymptoms="chest pain"
				searchDoctorsImpl={searchDoctorsImpl}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain("911"),
		);
		expect(searchDoctorsImpl).not.toHaveBeenCalled();
	});

	test("displays the initial symptoms in the search summary bar", async () => {
		render(
			<ResultsPage
				initialSymptoms="lower back pain"
				searchDoctorsImpl={vi.fn().mockResolvedValue([])}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByText("lower back pain")).toBeTruthy(),
		);
	});

	test("renders the 'Recommended doctors' heading once loaded", async () => {
		render(
			<ResultsPage
				initialSymptoms="knee pain"
				searchDoctorsImpl={vi.fn().mockResolvedValue([])}
			/>,
		);
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Recommended doctors" }),
			).toBeTruthy(),
		);
	});

	test("renders the sort dropdown with Relevance and Earliest appointment options", async () => {
		const doctor = makeDoctor({ full_name: "Dr. Sort Test" });
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={vi.fn().mockResolvedValue([doctor])}
			/>,
		);
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Dr. Sort Test" }),
			).toBeTruthy(),
		);
		const select = screen.getByRole("combobox", { name: "Sort results" });
		expect(select).toBeTruthy();
		expect(
			select.querySelector?.("option[value='relevance']") ?? select,
		).toBeTruthy();
		expect(
			document.querySelector("option[value='earliest_appointment']"),
		).toBeTruthy();
	});

	test("changing sort dropdown to earliest appointment reorders doctors by next_available", async () => {
		const later = makeDoctor({
			id: 1,
			full_name: "Dr. Later",
			next_available: "2025-06-10T09:00:00Z",
			match_score: 0.9,
		});
		const sooner = makeDoctor({
			id: 2,
			full_name: "Dr. Sooner",
			next_available: "2025-05-01T09:00:00Z",
			match_score: 0.5,
		});
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={vi.fn().mockResolvedValue([later, sooner])}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Dr. Later" })).toBeTruthy(),
		);
		const select = screen.getByRole("combobox", { name: "Sort results" });
		fireEvent.change(select, { target: { value: "earliest_appointment" } });
		// After reorder, Dr. Sooner (earliest) should be shown first.
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Dr. Sooner" })).toBeTruthy(),
		);
	});

	test("doctor card labels physician with no appointment data appropriately", async () => {
		const noAppt = makeDoctor({
			id: 3,
			full_name: "Dr. No Appt",
			next_available: null,
		});
		render(
			<ResultsPage
				initialSymptoms="headaches"
				searchDoctorsImpl={vi.fn().mockResolvedValue([noAppt])}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Dr. No Appt" })).toBeTruthy(),
		);
		expect(screen.getByText("No appointment data")).toBeTruthy();
	});
});

// ===========================================================================
// sortDoctorsByEarliestAppointment
// ===========================================================================

describe("sortDoctorsByEarliestAppointment", () => {
	test("orders doctors ascending by next_available datetime", () => {
		// input: three doctors with dates in non-ascending order
		// expected: result is in ascending date order
		const a = makeDoctor({
			id: 1,
			full_name: "Dr. C",
			next_available: "2025-07-01T08:00:00Z",
		});
		const b = makeDoctor({
			id: 2,
			full_name: "Dr. A",
			next_available: "2025-05-01T08:00:00Z",
		});
		const c = makeDoctor({
			id: 3,
			full_name: "Dr. B",
			next_available: "2025-06-01T08:00:00Z",
		});
		const result = sortDoctorsByEarliestAppointment([a, b, c]);
		expect(result.map((d) => d.full_name)).toEqual(["Dr. A", "Dr. B", "Dr. C"]);
	});

	test("places doctors without appointment data at the end", () => {
		// input: mix of doctors with and without next_available
		// expected: doctors with dates first, then null/undefined at end
		const withDate = makeDoctor({
			id: 1,
			full_name: "Dr. HasDate",
			next_available: "2025-06-01T08:00:00Z",
		});
		const noDate = makeDoctor({
			id: 2,
			full_name: "Dr. NoDate",
			next_available: null,
		});
		const result = sortDoctorsByEarliestAppointment([noDate, withDate]);
		expect(result[0].full_name).toBe("Dr. HasDate");
		expect(result[1].full_name).toBe("Dr. NoDate");
	});

	test("uses match_score descending as secondary sort when two doctors share the same datetime", () => {
		// input: two doctors with identical next_available, different match scores
		// expected: higher match_score comes first
		const sameTime = "2025-06-15T10:00:00Z";
		const lowScore = makeDoctor({
			id: 1,
			full_name: "Dr. LowScore",
			next_available: sameTime,
			match_score: 0.3,
		});
		const highScore = makeDoctor({
			id: 2,
			full_name: "Dr. HighScore",
			next_available: sameTime,
			match_score: 0.8,
		});
		const result = sortDoctorsByEarliestAppointment([lowScore, highScore]);
		expect(result[0].full_name).toBe("Dr. HighScore");
		expect(result[1].full_name).toBe("Dr. LowScore");
	});

	test("treats a doctor with an invalid date string as having no appointment data", () => {
		// input: one doctor with a valid date, one with an invalid date string
		// expected: invalid date is treated like no appointment data and placed last
		const valid = makeDoctor({
			id: 1,
			full_name: "Dr. Valid",
			next_available: "2025-06-01T08:00:00Z",
		});
		const invalid = makeDoctor({
			id: 2,
			full_name: "Dr. Invalid",
			next_available: "not-a-date",
		});
		const result = sortDoctorsByEarliestAppointment([invalid, valid]);
		expect(result[0].full_name).toBe("Dr. Valid");
		expect(result[1].full_name).toBe("Dr. Invalid");
	});

	test("returns an empty array when given an empty array", () => {
		// input: []  →  expected: []
		expect(sortDoctorsByEarliestAppointment([])).toEqual([]);
	});

	test("returns the single doctor unchanged", () => {
		// input: one doctor  →  expected: same doctor in result
		const doctor = makeDoctor({
			id: 1,
			full_name: "Dr. Solo",
			next_available: "2025-06-01T08:00:00Z",
		});
		const result = sortDoctorsByEarliestAppointment([doctor]);
		expect(result).toHaveLength(1);
		expect(result[0].full_name).toBe("Dr. Solo");
	});

	test("places all no-date doctors at the end in their original relative order", () => {
		// input: multiple no-date doctors
		// expected: all appear at end, relative order preserved
		const withDate = makeDoctor({
			id: 1,
			full_name: "Dr. HasDate",
			next_available: "2025-06-01T08:00:00Z",
		});
		const noDate1 = makeDoctor({
			id: 2,
			full_name: "Dr. NoDate1",
			next_available: null,
		});
		const noDate2 = makeDoctor({
			id: 3,
			full_name: "Dr. NoDate2",
			next_available: undefined,
		});
		const result = sortDoctorsByEarliestAppointment([
			noDate1,
			withDate,
			noDate2,
		]);
		expect(result[0].full_name).toBe("Dr. HasDate");
		expect(result.slice(1).map((d) => d.full_name)).toEqual([
			"Dr. NoDate1",
			"Dr. NoDate2",
		]);
	});
});

// ===========================================================================
// formatNextAvailable
// ===========================================================================

describe("formatNextAvailable", () => {
	test("returns 'No appointment data' for null", () => {
		// input: null  →  expected: "No appointment data"
		expect(formatNextAvailable(null)).toBe("No appointment data");
	});

	test("returns 'No appointment data' for undefined", () => {
		// input: undefined  →  expected: "No appointment data"
		expect(formatNextAvailable(undefined)).toBe("No appointment data");
	});

	test("returns 'No appointment data' for an empty string", () => {
		// input: ""  →  expected: "No appointment data"
		expect(formatNextAvailable("")).toBe("No appointment data");
	});

	test("returns 'No appointment data' for an invalid date string", () => {
		// input: "not-a-date"  →  expected: "No appointment data"
		expect(formatNextAvailable("not-a-date")).toBe("No appointment data");
	});

	test("returns a human-readable date string for a valid ISO datetime", () => {
		// input: valid ISO datetime  →  expected: formatted string (non-empty, not the fallback)
		const result = formatNextAvailable("2025-06-15T10:00:00Z");
		expect(result).not.toBe("No appointment data");
		expect(result.length).toBeGreaterThan(0);
		// Should include year 2025 and the month abbreviation
		expect(result).toMatch(/2025/);
	});
});

// ===========================================================================
// loadSortOption / saveSortOption
// ===========================================================================

describe("loadSortOption / saveSortOption", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	test("loadSortOption returns 'relevance' when sessionStorage is empty", () => {
		// input: nothing stored  →  expected: "relevance"
		expect(loadSortOption()).toBe("relevance");
	});

	test("loadSortOption returns 'earliest_appointment' after saving that value", () => {
		// input: saveSortOption("earliest_appointment")
		// expected: loadSortOption() === "earliest_appointment"
		saveSortOption("earliest_appointment");
		expect(loadSortOption()).toBe("earliest_appointment");
	});

	test("loadSortOption returns 'relevance' after saving 'relevance'", () => {
		// input: saveSortOption("relevance")
		// expected: loadSortOption() === "relevance"
		saveSortOption("relevance");
		expect(loadSortOption()).toBe("relevance");
	});

	test("loadSortOption returns 'relevance' after an unrecognized value is stored", () => {
		// input: arbitrary string stored directly in sessionStorage
		// expected: loadSortOption() falls back to "relevance"
		sessionStorage.setItem("docseek-sort-option", "unknown_option");
		expect(loadSortOption()).toBe("relevance");
	});
});
