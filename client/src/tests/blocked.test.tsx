// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import type { Doctor } from "../components/App";
import {
	BlockedDoctorCard,
	BlockedRoutePage,
} from "../routes/blocked";
import { AppNav } from "../components/AppNav";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	Link: ({
		children,
		to,
		className,
		"aria-label": ariaLabel,
	}: {
		children: ReactNode;
		to: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={to} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

vi.mock("../hooks/useBlockedPhysicians", () => ({
	useBlockedPhysicians: vi.fn(),
}));

vi.mock("../hooks/useSavedPhysicians", () => ({
	useSavedPhysicians: vi.fn(),
}));

vi.mock("../components/App", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../components/App")>();
	return {
		...actual,
		SearchPageShell: ({ children }: { children: ReactNode }) => (
			<div>{children}</div>
		),
	};
});

// ---------------------------------------------------------------------------
// Helpers
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

import { useBlockedPhysicians } from "../hooks/useBlockedPhysicians";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

function mockBlockedHook(
	blockedDoctors: Doctor[],
	unblockDoctor = vi.fn(),
) {
	vi.mocked(useBlockedPhysicians).mockReturnValue({
		blockedDoctors,
		unblockDoctor,
		blockDoctor: vi.fn(),
		isBlocked: vi.fn().mockReturnValue(false),
	});
}

function mockSavedHook(savedDoctors: Doctor[] = []) {
	vi.mocked(useSavedPhysicians).mockReturnValue({
		savedDoctors,
		addSavedDoctor: vi.fn(),
		removeSavedDoctor: vi.fn(),
		isSaved: vi.fn().mockReturnValue(false),
	});
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ===========================================================================
// BlockedDoctorCard
// ===========================================================================

describe("BlockedDoctorCard", () => {
	test("renders null when activeDoctorIndex is out of bounds", () => {
		// input: doctors=[], activeDoctorIndex=0  →  expected: nothing rendered
		const { container } = render(
			<BlockedDoctorCard
				doctors={[]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	test("renders the active doctor's full name as a heading", () => {
		// input: doctors=[{full_name:"Dr. Jane Smith"}], activeDoctorIndex=0
		// expected: h2 with "Dr. Jane Smith"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ full_name: "Dr. Jane Smith" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Dr. Jane Smith" }),
		).toBeTruthy();
	});

	test("shows the correct 'Blocked physician X of Y' count label", () => {
		// input: 3 doctors, activeDoctorIndex=1
		// expected: "Blocked physician 2 of 3"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 }), makeDoctor({ id: 3 })]}
				activeDoctorIndex={1}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Blocked physician 2 of 3")).toBeTruthy();
	});

	test("renders the 'Unblock' button with the doctor's name in aria-label", () => {
		// input: doctor with full_name="Dr. Test"
		// expected: button with aria-label containing the doctor's name
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ full_name: "Dr. Test" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", {
				name: /Unblock Dr. Test and show in future results/i,
			}),
		).toBeTruthy();
	});

	test("calls onUnblock with the active doctor object when unblock button is clicked", () => {
		// input: click unblock button
		// expected: onUnblock called with the exact doctor object
		const onUnblock = vi.fn();
		const doctor = makeDoctor({ id: 7, full_name: "Dr. Unblock Me" });
		render(
			<BlockedDoctorCard
				doctors={[doctor]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={onUnblock}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Unblock Dr. Unblock Me and show in future results/i,
			}),
		);
		expect(onUnblock).toHaveBeenCalledOnce();
		expect(onUnblock).toHaveBeenCalledWith(doctor);
	});

	test("shows 'Accepting new patients' when accepting_new_patients is true", () => {
		// input: accepting_new_patients=true  →  expected: "Accepting new patients"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ accepting_new_patients: true })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Accepting new patients")).toBeTruthy();
	});

	test("shows 'Check availability' when accepting_new_patients is false", () => {
		// input: accepting_new_patients=false  →  expected: "Check availability"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ accepting_new_patients: false })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Check availability")).toBeTruthy();
	});

	test("shows the primary specialty text", () => {
		// input: primary_specialty="Neurology"  →  expected: text "Neurology" visible
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_specialty: "Neurology" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Neurology")).toBeTruthy();
	});

	test("shows 'Specialty not listed' when primary_specialty is null", () => {
		// input: primary_specialty=null  →  expected: "Specialty not listed"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_specialty: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Specialty not listed")).toBeTruthy();
	});

	test("shows the primary location text", () => {
		// input: primary_location="Pittsburgh, PA"  →  expected: text visible
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_location: "Pittsburgh, PA" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Pittsburgh, PA")).toBeTruthy();
	});

	test("shows 'Location not listed' when primary_location is null", () => {
		// input: primary_location=null  →  expected: "Location not listed"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_location: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Location not listed")).toBeTruthy();
	});

	test("shows the primary phone number", () => {
		// input: primary_phone="412-555-0001"  →  expected: text visible
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_phone: "412-555-0001" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("412-555-0001")).toBeTruthy();
	});

	test("shows 'Phone number not listed' when primary_phone is null", () => {
		// input: primary_phone=null  →  expected: "Phone number not listed"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor({ primary_phone: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(screen.getByText("Phone number not listed")).toBeTruthy();
	});

	test("shows 'See the next blocked physician' button when more doctors follow", () => {
		// input: 2 doctors, activeDoctorIndex=0 (has next)
		// expected: button text is "See the next blocked physician"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "See the next blocked physician" }),
		).toBeTruthy();
	});

	test("shows 'You've reached the last blocked physician' at the final doctor", () => {
		// input: 1 doctor, activeDoctorIndex=0 (no next)
		// expected: button text is "You've reached the last blocked physician"
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", {
				name: "You've reached the last blocked physician",
			}),
		).toBeTruthy();
	});

	test("next button is disabled when at the last doctor", () => {
		// input: 1 doctor  →  expected: button has disabled attribute
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "You've reached the last blocked physician",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("next button is enabled when more doctors follow", () => {
		// input: 2 doctors, activeDoctorIndex=0  →  expected: button is not disabled
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnblock={vi.fn()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "See the next blocked physician",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	test("calls onNextDoctor when the next button is clicked", () => {
		// input: 2 doctors, click next  →  expected: onNextDoctor called once
		const onNextDoctor = vi.fn();
		render(
			<BlockedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={onNextDoctor}
				onUnblock={vi.fn()}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "See the next blocked physician" }),
		);
		expect(onNextDoctor).toHaveBeenCalledOnce();
	});
});

// ===========================================================================
// BlockedRoutePage
// ===========================================================================

describe("BlockedRoutePage", () => {
	test("renders the 'Blocked physicians' h1 heading", () => {
		// hook returns empty list; heading should still render
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Blocked physicians" }),
		).toBeTruthy();
	});

	test("renders the 'Your blocked list' kicker text", () => {
		// input: empty blocked list  →  expected: kicker text visible
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(screen.getByText("Your blocked list")).toBeTruthy();
	});

	test("shows a back link to start a new search", () => {
		// expected: link with text "Start a new search"
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByRole("link", { name: /Start a new search/i }),
		).toBeTruthy();
	});

	test("shows the empty-state message when no doctors are blocked", () => {
		// input: blockedDoctors=[]  →  expected: empty-state text visible
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByText("You haven't blocked any physicians."),
		).toBeTruthy();
	});

	test("shows a 'Search for doctors' link in the empty state", () => {
		// input: blockedDoctors=[]  →  expected: link to "/"
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByRole("link", { name: "Search for doctors" }),
		).toBeTruthy();
	});

	test("does not show the empty-state message when doctors are blocked", () => {
		// input: one blocked doctor  →  expected: empty-state text absent
		mockBlockedHook([makeDoctor()]);
		render(<BlockedRoutePage />);
		expect(
			screen.queryByText("You haven't blocked any physicians."),
		).toBeNull();
	});

	test("shows the blocked doctor's name when the list is non-empty", () => {
		// input: one blocked doctor named "Dr. Blocked"
		// expected: doctor's name visible in the card
		mockBlockedHook([makeDoctor({ full_name: "Dr. Blocked" })]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Dr. Blocked" }),
		).toBeTruthy();
	});

	test("calls unblockDoctor with the correct id when unblock is triggered", () => {
		// input: blocked doctor id=42, click "Unblock"
		// expected: unblockDoctor(42) called
		const unblockDoctor = vi.fn();
		const doctor = makeDoctor({ id: 42, full_name: "Dr. Unblock" });
		mockBlockedHook([doctor], unblockDoctor);
		render(<BlockedRoutePage />);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Unblock Dr. Unblock and show in future results/i,
			}),
		);
		expect(unblockDoctor).toHaveBeenCalledOnce();
		expect(unblockDoctor).toHaveBeenCalledWith(42);
	});

	test("shows the first blocked doctor when multiple are blocked", () => {
		// input: two blocked doctors; initial activeIndex=0
		// expected: first doctor's name visible
		mockBlockedHook([
			makeDoctor({ id: 1, full_name: "Dr. First" }),
			makeDoctor({ id: 2, full_name: "Dr. Second" }),
		]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Dr. First" }),
		).toBeTruthy();
	});

	test("advances to the next blocked doctor when the next button is clicked", () => {
		// input: two blocked doctors; click next
		// expected: second doctor's name visible
		mockBlockedHook([
			makeDoctor({ id: 1, full_name: "Dr. First" }),
			makeDoctor({ id: 2, full_name: "Dr. Second" }),
		]);
		render(<BlockedRoutePage />);
		fireEvent.click(
			screen.getByRole("button", { name: "See the next blocked physician" }),
		);
		expect(
			screen.getByRole("heading", { name: "Dr. Second" }),
		).toBeTruthy();
	});

	test("shows the description explaining what blocking does", () => {
		// User understands exactly what blocking does before confirming
		mockBlockedHook([]);
		render(<BlockedRoutePage />);
		expect(
			screen.getByText(/Unblock any physician to have them appear in future searches again/i),
		).toBeTruthy();
	});
});

// ===========================================================================
// AppNav – blocked physicians nav link
// ===========================================================================

describe("AppNav blocked physicians nav", () => {
	test("renders the 'Blocked physicians' navigation link", () => {
		// expected: nav link with text "Blocked physicians"
		mockBlockedHook([]);
		mockSavedHook([]);
		render(<AppNav />);
		expect(
			screen.getByRole("link", { name: /Blocked physicians/i }),
		).toBeTruthy();
	});

	test("nav link aria-label is 'Blocked physicians' when no doctors are blocked", () => {
		// input: blockedCount=0
		// expected: aria-label === "Blocked physicians"
		mockBlockedHook([]);
		mockSavedHook([]);
		render(<AppNav />);
		expect(
			screen.getByRole("link", { name: "Blocked physicians" }),
		).toBeTruthy();
	});

	test("nav link aria-label includes count when at least one doctor is blocked", () => {
		// input: 2 blocked doctors
		// expected: aria-label === "Blocked physicians (2 blocked)"
		mockBlockedHook([makeDoctor({ id: 1 }), makeDoctor({ id: 2 })]);
		mockSavedHook([]);
		render(<AppNav />);
		expect(
			screen.getByRole("link", { name: "Blocked physicians (2 blocked)" }),
		).toBeTruthy();
	});

	test("shows the count badge when at least one doctor is blocked", () => {
		// input: 3 blocked doctors
		// expected: count badge "3" visible
		mockBlockedHook([
			makeDoctor({ id: 1 }),
			makeDoctor({ id: 2 }),
			makeDoctor({ id: 3 }),
		]);
		mockSavedHook([]);
		render(<AppNav />);
		expect(screen.getByText("3")).toBeTruthy();
	});

	test("does not show the count badge when no doctors are blocked", () => {
		// input: no blocked doctors
		// expected: no numeric badge visible
		mockBlockedHook([]);
		mockSavedHook([]);
		render(<AppNav />);
		// No badge with a digit should appear for the blocked nav
		const badges = screen
			.queryAllByText(/^\d+$/)
			.filter((el) => el.classList.contains("app-nav-count-blocked"));
		expect(badges).toHaveLength(0);
	});

	test("nav link points to /blocked route", () => {
		// expected: href="/blocked"
		mockBlockedHook([]);
		mockSavedHook([]);
		render(<AppNav />);
		const link = screen.getByRole("link", {
			name: /Blocked physicians/i,
		}) as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("/blocked");
	});
});
