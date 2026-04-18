// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import type { Doctor } from "../components/App";
import { DoctorRecommendationCard } from "../components/App";
import { SavedDoctorCard } from "../routes/saved";

const mockUseCopyPhysicianLink = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
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

vi.mock("../hooks/useCopyPhysicianLink", () => ({
	useCopyPhysicianLink: (doctorId: number) => mockUseCopyPhysicianLink(doctorId),
}));

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
	return {
		id: 1,
		full_name: "Dr. Copy",
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

describe("Copy link UI on physician cards", () => {
	beforeEach(() => {
		mockUseCopyPhysicianLink.mockReset();
		mockUseCopyPhysicianLink.mockReturnValue({
			copyStatus: "idle",
			handleCopyLink: vi.fn(),
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	test("triggers copy action from recommendation cards", () => {
		const handleCopyLink = vi.fn();
		mockUseCopyPhysicianLink.mockReturnValue({
			copyStatus: "idle",
			handleCopyLink,
		});

		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ id: 4, full_name: "Dr. Four" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Copy link to Dr. Four's profile",
			}),
		);

		expect(handleCopyLink).toHaveBeenCalledOnce();
		expect(mockUseCopyPhysicianLink).toHaveBeenCalledWith(4);
	});

	test("shows error fallback guidance when recommendation-card copy fails", () => {
		mockUseCopyPhysicianLink.mockReturnValue({
			copyStatus: "error",
			handleCopyLink: vi.fn(),
		});

		render(
			<DoctorRecommendationCard
				doctors={[makeDoctor({ id: 5, full_name: "Dr. Five" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
			/>,
		);

		expect(screen.getByText("Copy link")).toBeTruthy();
		expect(screen.getByText(/Unable to copy automatically\./i)).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Open profile to share link" })
				.getAttribute("href"),
		).toBe(`${window.location.origin}/physician/5`);
	});

	test("shows copied success state on saved cards", () => {
		mockUseCopyPhysicianLink.mockReturnValue({
			copyStatus: "success",
			handleCopyLink: vi.fn(),
		});

		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ id: 8, full_name: "Dr. Eight" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);

		expect(screen.getByText("Link copied!")).toBeTruthy();
		expect(mockUseCopyPhysicianLink).toHaveBeenCalledWith(8);
	});
});
