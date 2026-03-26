// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	DoctorRecommendationCard,
	direct_to_booking,
	EmergencyCareAlert,
	getDoctorSearchUrl,
	getNextRecommendationLabel,
	getResultsNavigation,
	getSymptomValidationUrl,
	normalizeSymptoms,
	ResultsActiveFilters,
	resolveSymptomsSubmission,
	ResultsHeader,
	SearchFiltersForm,
	SearchHero,
	SearchPageShell,
	SUGGESTED_SYMPTOMS,
	searchDoctors,
	symptomsSuggestEmergencyCare,
	validateSymptomsForDoctorSearch,
} from "../components/App";

afterEach(() => {
	cleanup();
});

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

	test("calls the backend symptom validation endpoint", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				isDescriptiveEnough: false,
				reasoning: "Describe the symptom you are feeling, not only the test.",
			}),
		});

		expect(getSymptomValidationUrl("http://localhost:3000")).toBe(
			"http://localhost:3000/symptoms/validate",
		);

		await expect(
			validateSymptoms("MRI scan", {
				apiBaseUrl: "http://localhost:3000",
				fetchImpl: fetchMock as typeof fetch,
				history: [
					{
						role: "user",
						content: "headache",
					},
				],
			}),
		).resolves.toEqual({
			isDescriptiveEnough: false,
			reasoning: "Describe the symptom you are feeling, not only the test.",
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/symptoms/validate",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					symptoms: "MRI scan",
					history: [
						{
							role: "user",
							content: "headache",
						},
					],
				}),
			}),
		);
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

	test("falls back to profile_url for direct booking when book_appointment_url is missing", () => {
		expect(
			direct_to_booking({
				id: 1,
				full_name: "Dr. Avery Quinn",
				primary_specialty: "Neurology",
				accepting_new_patients: true,
				profile_url: "https://example.com/doctors/avery-quinn",
				book_appointment_url: null,
				primary_location: "Pittsburgh, PA",
				primary_phone: "412-555-0100",
			}),
		).toBe("https://example.com/doctors/avery-quinn");
	test("detects common emergency symptom phrases", () => {
		expect(symptomsSuggestEmergencyCare("chest pain")).toBe(true);
		expect(symptomsSuggestEmergencyCare("Chest Pain")).toBe(true);
		expect(symptomsSuggestEmergencyCare("severe headache")).toBe(false);
		expect(symptomsSuggestEmergencyCare("worst headache of my life")).toBe(
			true,
		);
	});

	test("blocks doctor search navigation when validation finds emergency symptoms", () => {
		const blocked = validateSymptomsForDoctorSearch("chest pain");
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.message).toMatch(/emergency care/i);
		}

		const allowed = validateSymptomsForDoctorSearch("migraines");
		expect(allowed).toEqual({ ok: true, normalized: "migraines" });
	});
});

describe("frontend page flow", () => {
	test("shows the emergency alert when symptom text may need urgent care", () => {
		render(
			<SearchHero
				symptoms="chest pain"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByRole("alert").textContent).toMatch(/911/);
	});

	test("normalizes symptom input before navigating to the results page", () => {
		expect(normalizeSymptoms("  migraines  ")).toBe("migraines");
		expect(getResultsNavigation("  migraines  ")).toEqual({
			to: "/results",
			search: {
				symptoms: "migraines",
			},
		});
	});

	test("getResultsNavigation includes filter params when provided", () => {
		expect(
			getResultsNavigation("migraines", {
				location: "Pittsburgh",
				onlyAcceptingNewPatients: true,
			}),
		).toEqual({
			to: "/results",
			search: {
				symptoms: "migraines",
				location: "Pittsburgh",
				onlyAcceptingNewPatients: "true",
			},
		});
	});

	test("searchDoctors sends filter params in the request body when provided", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ doctors: [] }),
		});

		await searchDoctors("headaches", {
			apiBaseUrl: "http://localhost:3000",
			fetchImpl: fetchMock as typeof fetch,
			filters: {
				location: "Pittsburgh",
				onlyAcceptingNewPatients: true,
			},
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:3000/doctors/search",
			expect.objectContaining({
				body: JSON.stringify({
					symptoms: "headaches",
					location: "Pittsburgh",
					onlyAcceptingNewPatients: true,
				}),
			}),
		);
	test("renders the emergency care alert component", () => {
		render(<EmergencyCareAlert />);

		const alert = screen.getByRole("alert");
		expect(alert.textContent).toMatch(/911/);
		expect(alert.textContent).toMatch(/emergency room/i);
	});

	test("renders the landing hero with the responsive helper copy hook", () => {
		render(
			<SearchHero symptoms="" onSymptomsChange={vi.fn()} onSubmit={vi.fn()} />,
		);

		expect(
			screen
				.getByRole("textbox", { name: "Current symptoms" })
				.getAttribute("required"),
		).not.toBeNull();
		expect(screen.getByText("How can we help you today?")).toBeTruthy();
		expect(
			screen.getByText(
				/Describe what you are feeling and DocSeek will surface the strongest/i,
			).className,
		).toContain("hero-lede");
		expect(document.querySelector(".suggestion-list")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Migraines" })).toBeTruthy();
	});

	test("renders a skip link for keyboard users", () => {
		render(
			<SearchPageShell showNav={false}>
				<div>Content</div>
			</SearchPageShell>,
		);

		expect(
			screen
				.getByRole("link", { name: "Skip to main content" })
				.getAttribute("href"),
		).toBe("#page-content");
	});

	test("uses the suggested tags to request a symptom update", () => {
		const onSymptomsChange = vi.fn();

		render(
			<SearchHero
				symptoms=""
				onSymptomsChange={onSymptomsChange}
				onSubmit={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "MRI scan" }));

		expect(onSymptomsChange).toHaveBeenCalledWith("MRI scan");
	});

	test("shows the validation feedback under the symptoms input", () => {
		render(
			<SearchHero
				symptoms="MRI scan"
				onSymptomsChange={vi.fn()}
				onSubmit={vi.fn()}
				errorMessage="Describe the symptom you are feeling, not only the test."
			/>,
		);

		expect(
			screen.getByText(
				"Describe the symptom you are feeling, not only the test.",
			),
		).toBeTruthy();
		expect(
			screen
				.getByRole("textbox", { name: "Current symptoms" })
				.getAttribute("aria-describedby"),
		).toBe("symptoms-validation-message");
	});

	test("blocks navigation when the symptom description is too vague", async () => {
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "Add the symptom you are experiencing, not just the test.",
		});

		await expect(
			resolveSymptomsSubmission("MRI scan", {
				validateSymptomsImpl,
			}),
		).resolves.toEqual({
			canNavigate: false,
			errorMessage: "Add the symptom you are experiencing, not just the test.",
			nextAttemptCount: 1,
			nextValidationHistory: [
				{
					role: "user",
					content: "MRI scan",
				},
				{
					role: "assistant",
					content: "Add the symptom you are experiencing, not just the test.",
				},
			],
		});

		expect(validateSymptomsImpl).toHaveBeenCalledWith("MRI scan", {
			history: [],
		});
	});

	test("navigates when the symptom description is descriptive enough", async () => {
		await expect(
			resolveSymptomsSubmission("  persistent headaches and dizziness  ", {
				validateSymptomsImpl: vi.fn().mockResolvedValue({
					isDescriptiveEnough: true,
				}),
			}),
		).resolves.toEqual({
			canNavigate: true,
			symptoms: "persistent headaches and dizziness",
			nextAttemptCount: 0,
			nextValidationHistory: [],
		});
	});

	test("keeps the empty symptom guidance ahead of model validation", async () => {
		const validateSymptomsImpl = vi.fn();

		await expect(
			resolveSymptomsSubmission("   ", {
				validateSymptomsImpl,
			}),
		).resolves.toEqual({
			canNavigate: false,
			errorMessage: "Enter your current symptoms to search for matching doctors.",
			nextAttemptCount: 0,
			nextValidationHistory: [],
		});

		expect(validateSymptomsImpl).not.toHaveBeenCalled();
	});

	test("includes prior symptom attempts and prior feedback in later validation calls", async () => {
		const validateSymptomsImpl = vi.fn().mockResolvedValue({
			isDescriptiveEnough: false,
			reasoning: "Name the symptom itself and any related issue.",
		});

		await resolveSymptomsSubmission("need MRI", {
			attemptCount: 1,
			validationHistory: [
				{
					role: "user",
					content: "headache",
				},
				{
					role: "assistant",
					content: "Describe where it hurts and anything else you feel.",
				},
			],
			validateSymptomsImpl,
		});

		expect(validateSymptomsImpl).toHaveBeenCalledWith("need MRI", {
			history: [
				{
					role: "user",
					content: "headache",
				},
				{
					role: "assistant",
					content: "Describe where it hurts and anything else you feel.",
				},
			],
		});
	});

	test("allows navigation after the third failed validation", async () => {
		await expect(
			resolveSymptomsSubmission("MRI scan", {
				attemptCount: 2,
				validateSymptomsImpl: vi.fn().mockResolvedValue({
					isDescriptiveEnough: false,
					reasoning: "Please add the symptom you are having.",
				}),
			}),
		).resolves.toEqual({
			canNavigate: true,
			symptoms: "MRI scan",
			nextAttemptCount: 0,
			nextValidationHistory: [],
		});
	});

	test("renders the results header summary for compact layouts", () => {
		render(
			<ResultsHeader
				includeBackLink={false}
				initialSymptoms="persistent cough"
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Recommended doctors" }),
		).toBeTruthy();
		expect(screen.getByText("persistent cough")).toBeTruthy();
		expect(document.querySelector(".results-header-top")).toBeTruthy();
	});

	test("renders filter form with location and availability options", () => {
		render(
			<SearchFiltersForm
				location="Pittsburgh"
				onlyAcceptingNewPatients={true}
				onLocationChange={vi.fn()}
				onOnlyAcceptingChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("group", { name: /Filter by your preferences/ }),
		).toBeTruthy();
		expect(
			screen.getByLabelText(/Location \(city, state, or ZIP\)/),
		).toBeTruthy();
		expect(
			screen.getByLabelText(/Only show doctors accepting new patients/),
		).toBeTruthy();
	});

	test("renders active filters when location and availability are applied", () => {
		const onRefine = vi.fn();
		render(
			<ResultsActiveFilters
				filters={{
					location: "Pittsburgh, PA",
					onlyAcceptingNewPatients: true,
				}}
				onRefine={onRefine}
			/>,
		);

		expect(
			screen.getByText(/Filtered by: Pittsburgh, PA • Accepting new patients/),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", {
				name: /Refine location and availability filters/,
			}),
		);
		expect(onRefine).toHaveBeenCalledTimes(1);
	});

	test("renders the doctor card header tag and actions with responsive hook classes", () => {
		render(
			<DoctorRecommendationCard
				doctors={[
					{
						id: 1,
						full_name: "Dr. Avery Quinn",
						primary_specialty: "Neurology",
						accepting_new_patients: true,
						profile_url: "https://example.com/doctors/avery-quinn",
						book_appointment_url: "https://example.com/book/avery-quinn",
						primary_location: "Pittsburgh, PA",
						primary_phone: "412-555-0100",
					},
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
			/>,
		);

		expect(document.querySelector(".doctor-card-header")).toBeTruthy();
		expect(screen.getByText("Accepting new patients")).toBeTruthy();
		expect(document.querySelector(".doctor-links")).toBeTruthy();
		expect(
			screen.getByRole("link", {
				name: "View profile for Dr. Avery Quinn (opens in a new tab)",
			}),
		).toBeTruthy();
		expect(
			screen
				.getByRole("button", {
					name: "You've reached the last recommendation",
				})
				.getAttribute("disabled"),
		).not.toBeNull();
	});

	test("doctor card shows Save for later when callbacks provided and not saved", () => {
		const onSave = vi.fn();
		const onUnsave = vi.fn();
		render(
			<DoctorRecommendationCard
				doctors={[
					{
						id: 1,
						full_name: "Dr. Avery Quinn",
						primary_specialty: "Neurology",
						accepting_new_patients: true,
						profile_url: null,
						book_appointment_url: null,
						primary_location: "Pittsburgh, PA",
						primary_phone: "412-555-0100",
					},
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				isSaved={false}
				onSave={onSave}
				onUnsave={onUnsave}
			/>,
		);

		const saveButton = screen.getByRole("button", {
			name: "Save Dr. Avery Quinn for later",
		});
		expect(saveButton).toBeTruthy();
		expect(saveButton.textContent).toContain("Save for later");
		fireEvent.click(saveButton);
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onUnsave).not.toHaveBeenCalled();
	});

	test("doctor card shows Saved and calls onUnsave when clicked", () => {
		const onSave = vi.fn();
		const onUnsave = vi.fn();
		render(
			<DoctorRecommendationCard
				doctors={[
					{
						id: 1,
						full_name: "Dr. Avery Quinn",
						primary_specialty: "Neurology",
						accepting_new_patients: true,
						profile_url: null,
						book_appointment_url: null,
						primary_location: "Pittsburgh, PA",
						primary_phone: "412-555-0100",
					},
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				isSaved={true}
				onSave={onSave}
				onUnsave={onUnsave}
			/>,
		);

		const unsaveButton = screen.getByRole("button", {
			name: "Remove Dr. Avery Quinn from saved physicians",
		});
		expect(unsaveButton).toBeTruthy();
		expect(unsaveButton.textContent).toContain("Saved");
		fireEvent.click(unsaveButton);
		expect(onUnsave).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});

	test("doctor card hides save button when onSave/onUnsave not provided", () => {
		render(
			<DoctorRecommendationCard
				doctors={[
					{
						id: 1,
						full_name: "Dr. Avery Quinn",
						primary_specialty: "Neurology",
						accepting_new_patients: true,
						profile_url: null,
						book_appointment_url: null,
						primary_location: "Pittsburgh, PA",
						primary_phone: "412-555-0100",
					},
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: /Save .+ for later/ }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: /Remove .+ from saved/ }),
		).toBeNull();
	});
});
