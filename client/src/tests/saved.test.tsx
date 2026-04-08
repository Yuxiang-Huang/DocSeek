// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import type { Doctor } from "../components/App";
import {
	SavedDoctorCard,
	SavedRoutePage,
} from "../routes/saved";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

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
	useNavigate: () => vi.fn(),
}));

vi.mock("../hooks/useSavedPhysicians", () => ({
	useSavedPhysicians: vi.fn(),
}));

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

// Lazily import the mocked hook so vi.mocked can configure it per test
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

function mockHook(savedDoctors: Doctor[], removeSavedDoctor = vi.fn()) {
	vi.mocked(useSavedPhysicians).mockReturnValue({
		savedDoctors,
		removeSavedDoctor,
		addSavedDoctor: vi.fn(),
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
// SavedDoctorCard
// ===========================================================================

describe("SavedDoctorCard", () => {
	test("renders null when activeDoctorIndex is out of bounds", () => {
		// input: doctors=[], activeDoctorIndex=0  →  expected: nothing rendered
		const { container } = render(
			<SavedDoctorCard
				doctors={[]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	test("renders the active doctor's full name as a heading", () => {
		// input: doctors=[{full_name:"Dr. Jane Smith"}], activeDoctorIndex=0
		// expected: h2 with "Dr. Jane Smith"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ full_name: "Dr. Jane Smith" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Dr. Jane Smith" }),
		).toBeTruthy();
	});

	test("shows the correct 'Saved physician X of Y' count label", () => {
		// input: 3 doctors, activeDoctorIndex=1
		// expected: "Saved physician 2 of 3"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 }), makeDoctor({ id: 3 })]}
				activeDoctorIndex={1}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Saved physician 2 of 3")).toBeTruthy();
	});

	test("renders the 'Remove from saved' button", () => {
		// input: doctor with full_name="Dr. Test"
		// expected: button with aria-label containing the doctor's name
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ full_name: "Dr. Test" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", {
				name: /Remove Dr. Test from saved physicians/i,
			}),
		).toBeTruthy();
	});

	test("calls onUnsave with the active doctor object when remove button is clicked", () => {
		// input: click remove button
		// expected: onUnsave called with the exact doctor object
		const onUnsave = vi.fn();
		const doctor = makeDoctor({ id: 7, full_name: "Dr. Remove Me" });
		render(
			<SavedDoctorCard
				doctors={[doctor]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={onUnsave}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Remove Dr. Remove Me from saved physicians/i,
			}),
		);
		expect(onUnsave).toHaveBeenCalledOnce();
		expect(onUnsave).toHaveBeenCalledWith(doctor);
	});

	test("shows 'Accepting new patients' when accepting_new_patients is true", () => {
		// input: accepting_new_patients=true  →  expected: "Accepting new patients"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ accepting_new_patients: true })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Accepting new patients")).toBeTruthy();
	});

	test("shows 'Check availability' when accepting_new_patients is false", () => {
		// input: accepting_new_patients=false  →  expected: "Check availability"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ accepting_new_patients: false })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Check availability")).toBeTruthy();
	});

	test("shows the primary specialty text", () => {
		// input: primary_specialty="Neurology"  →  expected: text "Neurology" visible
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_specialty: "Neurology" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Neurology")).toBeTruthy();
	});

	test("shows 'Specialty not listed' when primary_specialty is null", () => {
		// input: primary_specialty=null  →  expected: "Specialty not listed"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_specialty: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Specialty not listed")).toBeTruthy();
	});

	test("shows the primary location text", () => {
		// input: primary_location="Pittsburgh, PA"  →  expected: text visible
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_location: "Pittsburgh, PA" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Pittsburgh, PA")).toBeTruthy();
	});

	test("shows 'Location not listed' when primary_location is null", () => {
		// input: primary_location=null  →  expected: "Location not listed"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_location: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Location not listed")).toBeTruthy();
	});

	test("shows the primary phone number", () => {
		// input: primary_phone="412-555-0001"  →  expected: text visible
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_phone: "412-555-0001" })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("412-555-0001")).toBeTruthy();
	});

	test("shows 'Phone number not listed' when primary_phone is null", () => {
		// input: primary_phone=null  →  expected: "Phone number not listed"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ primary_phone: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(screen.getByText("Phone number not listed")).toBeTruthy();
	});

	test("shows view-profile link when profile_url is set", () => {
		// input: profile_url="https://example.com/doc/1"
		// expected: link with aria-label containing the doctor's name
		render(
			<SavedDoctorCard
				doctors={[
					makeDoctor({
						full_name: "Dr. Link",
						profile_url: "https://example.com/doc/1",
					}),
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("link", { name: /View profile for Dr. Link/i }),
		).toBeTruthy();
	});

	test("hides view-profile link when profile_url is null", () => {
		// input: profile_url=null  →  expected: no profile link rendered
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ profile_url: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.queryByRole("link", { name: /View profile/i }),
		).toBeNull();
	});

	test("shows book-appointment link when profile_url is set (direct_to_booking returns profile_url)", () => {
		// direct_to_booking(doctor) === doctor.profile_url, so bookingUrl is set
		// input: profile_url="https://example.com/doc/1", full_name="Dr. Book"
		// expected: "Book appointment" link rendered
		render(
			<SavedDoctorCard
				doctors={[
					makeDoctor({
						full_name: "Dr. Book",
						profile_url: "https://example.com/doc/1",
					}),
				]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("link", {
				name: /Book an appointment with Dr. Book/i,
			}),
		).toBeTruthy();
	});

	test("hides book-appointment link when profile_url is null", () => {
		// input: profile_url=null  →  bookingUrl=null  →  no booking link
		render(
			<SavedDoctorCard
				doctors={[makeDoctor({ profile_url: null })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.queryByRole("link", { name: /Book an appointment/i }),
		).toBeNull();
	});

	test("shows 'See the next saved physician' button text when more doctors follow", () => {
		// input: 2 doctors, activeDoctorIndex=0 (has next)
		// expected: button text is "See the next saved physician"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "See the next saved physician" }),
		).toBeTruthy();
	});

	test("shows 'You've reached the last saved physician' at the final doctor", () => {
		// input: 1 doctor, activeDoctorIndex=0 (no next)
		// expected: button text is "You've reached the last saved physician"
		render(
			<SavedDoctorCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", {
				name: "You've reached the last saved physician",
			}),
		).toBeTruthy();
	});

	test("next button is disabled when at the last doctor", () => {
		// input: 1 doctor  →  expected: button has disabled attribute
		render(
			<SavedDoctorCard
				doctors={[makeDoctor()]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "You've reached the last saved physician",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("next button is enabled when more doctors follow", () => {
		// input: 2 doctors, activeDoctorIndex=0  →  expected: button is not disabled
		render(
			<SavedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={vi.fn()}
				onUnsave={vi.fn()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "See the next saved physician",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	test("calls onNextDoctor when the next button is clicked", () => {
		// input: 2 doctors, click next  →  expected: onNextDoctor called once
		const onNextDoctor = vi.fn();
		render(
			<SavedDoctorCard
				doctors={[makeDoctor(), makeDoctor({ id: 2 })]}
				activeDoctorIndex={0}
				onNextDoctor={onNextDoctor}
				onUnsave={vi.fn()}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "See the next saved physician" }),
		);
		expect(onNextDoctor).toHaveBeenCalledOnce();
	});
});

// ===========================================================================
// SavedRoutePage
// ===========================================================================

describe("SavedRoutePage", () => {
	test("renders the 'Saved physicians' h1 heading", () => {
		// hook returns empty list; heading should still render
		mockHook([]);
		render(<SavedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Saved physicians" }),
		).toBeTruthy();
	});

	test("renders the 'Your saved list' kicker text", () => {
		// input: empty saved list  →  expected: kicker text visible
		mockHook([]);
		render(<SavedRoutePage />);
		expect(screen.getByText("Your saved list")).toBeTruthy();
	});

	test("shows a back link to start a new search", () => {
		// expected: link with text "Start a new search"
		mockHook([]);
		render(<SavedRoutePage />);
		expect(
			screen.getByRole("link", { name: /Start a new search/i }),
		).toBeTruthy();
	});

	test("shows the empty-state message when no doctors are saved", () => {
		// input: savedDoctors=[]  →  expected: empty-state text visible
		mockHook([]);
		render(<SavedRoutePage />);
		expect(
			screen.getByText("You haven't saved any physicians yet."),
		).toBeTruthy();
	});

	test("shows a 'Search for doctors' link in the empty state", () => {
		// input: savedDoctors=[]  →  expected: link to "/"
		mockHook([]);
		render(<SavedRoutePage />);
		expect(
			screen.getByRole("link", { name: "Search for doctors" }),
		).toBeTruthy();
	});

	test("does not show the empty-state message when doctors are saved", () => {
		// input: one saved doctor  →  expected: empty-state text absent
		mockHook([makeDoctor()]);
		render(<SavedRoutePage />);
		expect(
			screen.queryByText("You haven't saved any physicians yet."),
		).toBeNull();
	});

	test("shows the saved doctor's name when the list is non-empty", () => {
		// input: one saved doctor named "Dr. Saved"
		// expected: doctor's name visible in the card
		mockHook([makeDoctor({ full_name: "Dr. Saved" })]);
		render(<SavedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Dr. Saved" }),
		).toBeTruthy();
	});

	test("calls removeSavedDoctor with the correct id when unsave is triggered", () => {
		// input: saved doctor id=42, click "Remove from saved"
		// expected: removeSavedDoctor(42) called
		const removeSavedDoctor = vi.fn();
		const doctor = makeDoctor({ id: 42, full_name: "Dr. Unsave" });
		mockHook([doctor], removeSavedDoctor);
		render(<SavedRoutePage />);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Remove Dr. Unsave from saved physicians/i,
			}),
		);
		expect(removeSavedDoctor).toHaveBeenCalledOnce();
		expect(removeSavedDoctor).toHaveBeenCalledWith(42);
	});

	test("shows the first saved doctor when multiple are saved", () => {
		// input: two saved doctors; initial activeIndex=0
		// expected: first doctor's name visible
		mockHook([
			makeDoctor({ id: 1, full_name: "Dr. First" }),
			makeDoctor({ id: 2, full_name: "Dr. Second" }),
		]);
		render(<SavedRoutePage />);
		expect(
			screen.getByRole("heading", { name: "Dr. First" }),
		).toBeTruthy();
	});

	test("advances to the next saved doctor when the next button is clicked", () => {
		// input: two saved doctors; click next
		// expected: second doctor's name visible
		mockHook([
			makeDoctor({ id: 1, full_name: "Dr. First" }),
			makeDoctor({ id: 2, full_name: "Dr. Second" }),
		]);
		render(<SavedRoutePage />);
		fireEvent.click(
			screen.getByRole("button", { name: "See the next saved physician" }),
		);
		expect(
			screen.getByRole("heading", { name: "Dr. Second" }),
		).toBeTruthy();
	});
});
