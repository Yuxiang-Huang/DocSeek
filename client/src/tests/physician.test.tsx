// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import type { Doctor } from "../components/App";

const { mockUseParams, mockFetchDoctor } = vi.hoisted(() => ({
	mockUseParams: vi.fn(),
	mockFetchDoctor: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useParams: mockUseParams,
	}),
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

vi.mock("../components/App", () => ({
	fetchDoctor: (doctorId: number) => mockFetchDoctor(doctorId),
	direct_to_booking: (doctor: { profile_url: string | null }) => doctor.profile_url,
	SearchPageShell: ({ children }: { children: ReactNode }) => (
		<div data-testid="search-shell">{children}</div>
	),
}));

import { Route } from "../routes/physician.$id";

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
	return {
		id: 1,
		full_name: "Dr. Profile",
		primary_specialty: "Family Medicine",
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

const PhysicianProfilePage = (Route as { component: () => JSX.Element }).component;

describe("Physician profile route", () => {
	beforeEach(() => {
		mockUseParams.mockReset();
		mockFetchDoctor.mockReset();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	test("loads and renders the doctor profile for a valid shared physician id", async () => {
		mockUseParams.mockReturnValue({ id: "7" });
		mockFetchDoctor.mockResolvedValue(makeDoctor({ id: 7, full_name: "Dr. Seven" }));

		render(<PhysicianProfilePage />);
		expect(screen.getByText("Loading physician profile…")).toBeTruthy();

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Dr. Seven" }),
			).toBeTruthy();
		});
		expect(mockFetchDoctor).toHaveBeenCalledWith(7);
	});

	test("shows not found fallback for an invalid shared physician id", () => {
		mockUseParams.mockReturnValue({ id: "not-a-number" });

		render(<PhysicianProfilePage />);

		expect(
			screen.getByRole("heading", { name: "Physician not found" }),
		).toBeTruthy();
		expect(mockFetchDoctor).not.toHaveBeenCalled();
	});

	test("shows not found fallback when physician no longer exists", async () => {
		mockUseParams.mockReturnValue({ id: "11" });
		mockFetchDoctor.mockResolvedValue(null);

		render(<PhysicianProfilePage />);

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Physician not found" }),
			).toBeTruthy();
		});
	});

	test("shows error state when loading physician fails", async () => {
		mockUseParams.mockReturnValue({ id: "12" });
		mockFetchDoctor.mockRejectedValue(new Error("Unable to load this physician profile."));

		render(<PhysicianProfilePage />);

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Unable to load profile" }),
			).toBeTruthy();
		});
		expect(
			screen.getByText("Unable to load this physician profile."),
		).toBeTruthy();
	});
});
