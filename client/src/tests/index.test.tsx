// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	DoctorRecommendationCard,
	getDoctorSearchUrl,
	getNextRecommendationLabel,
	getResultsNavigation,
	normalizeSymptoms,
	ResultsHeader,
	SearchHero,
	SearchPageShell,
	SUGGESTED_SYMPTOMS,
	searchDoctors,
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
			<SearchPageShell>
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
});
