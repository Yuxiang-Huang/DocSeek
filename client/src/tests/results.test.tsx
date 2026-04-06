// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mutable state so the vi.mock factory can close over it.
// ---------------------------------------------------------------------------

const mockUseSearch = vi.hoisted(() => vi.fn());

// Mock createFileRoute to return the raw options object with useSearch injected,
// giving tests access to validateSearch and the component function directly.
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useSearch: mockUseSearch,
	}),
}));

// Replace ResultsPage with a lightweight spy that captures its props instead
// of running the full search/geolocation logic (tested in App.test.tsx).
const capturedResultsPageProps = vi.hoisted(
	(): { current: Record<string, unknown> | null } => ({ current: null }),
);

vi.mock("../components/App", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../components/App")>();
	return {
		...actual,
		ResultsPage: (props: Record<string, unknown>) => {
			capturedResultsPageProps.current = props;
			return <div data-testid="results-page" />;
		},
	};
});

// ---------------------------------------------------------------------------
// Import Route AFTER mocks so we get the captured options object.
// ---------------------------------------------------------------------------

import { Route } from "../routes/results";

type ValidateSearch = (search: Record<string, unknown>) => {
	symptoms: string;
	location?: string;
	onlyAcceptingNewPatients?: string;
};

type RouteOptions = {
	validateSearch: ValidateSearch;
	component: React.ComponentType;
};

const options = Route as unknown as RouteOptions;
const validateSearch = options.validateSearch;
const ResultsRoutePage = options.component;

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
	capturedResultsPageProps.current = null;
	vi.clearAllMocks();
});

// ===========================================================================
// validateSearch — pure search-param normalisation
// ===========================================================================

describe("validateSearch", () => {
	// --- symptoms ---

	test("returns the symptoms string unchanged when it is a string", () => {
		// input: { symptoms: "headache" }  →  expected: symptoms === "headache"
		expect(validateSearch({ symptoms: "headache" }).symptoms).toBe("headache");
	});

	test("returns an empty string for symptoms when the key is absent", () => {
		// input: {}  →  expected: symptoms === ""
		expect(validateSearch({}).symptoms).toBe("");
	});

	test("returns an empty string for symptoms when the value is not a string", () => {
		// input: { symptoms: 123 }  →  expected: symptoms === ""
		expect(validateSearch({ symptoms: 123 }).symptoms).toBe("");
	});

	test("preserves an empty-string symptoms value (valid string, just empty)", () => {
		// input: { symptoms: "" }  →  expected: symptoms === ""
		expect(validateSearch({ symptoms: "" }).symptoms).toBe("");
	});

	// --- location ---

	test("returns the location string when it is a non-empty string", () => {
		// input: { location: "Pittsburgh" }  →  expected: location === "Pittsburgh"
		expect(validateSearch({ location: "Pittsburgh" }).location).toBe(
			"Pittsburgh",
		);
	});

	test("trims whitespace from the location value", () => {
		// input: { location: "  Pittsburgh  " }  →  expected: location === "Pittsburgh"
		expect(validateSearch({ location: "  Pittsburgh  " }).location).toBe(
			"Pittsburgh",
		);
	});

	test("returns undefined for location when the value is whitespace-only", () => {
		// input: { location: "   " }  →  expected: location === undefined
		expect(validateSearch({ location: "   " }).location).toBeUndefined();
	});

	test("returns undefined for location when the key is absent", () => {
		// input: {}  →  expected: location === undefined
		expect(validateSearch({}).location).toBeUndefined();
	});

	test("returns undefined for location when the value is not a string", () => {
		// input: { location: 42 }  →  expected: location === undefined
		expect(validateSearch({ location: 42 }).location).toBeUndefined();
	});

	// --- onlyAcceptingNewPatients ---

	test("returns 'true' for onlyAcceptingNewPatients when the value is the string 'true'", () => {
		// input: { onlyAcceptingNewPatients: "true" }  →  expected: "true"
		expect(
			validateSearch({ onlyAcceptingNewPatients: "true" })
				.onlyAcceptingNewPatients,
		).toBe("true");
	});

	test("returns undefined for onlyAcceptingNewPatients when the value is the string 'false'", () => {
		// input: { onlyAcceptingNewPatients: "false" }  →  expected: undefined
		expect(
			validateSearch({ onlyAcceptingNewPatients: "false" })
				.onlyAcceptingNewPatients,
		).toBeUndefined();
	});

	test("returns undefined for onlyAcceptingNewPatients when the value is the boolean true (not the string)", () => {
		// Only the exact string "true" triggers the flag.
		// input: { onlyAcceptingNewPatients: true }  →  expected: undefined
		expect(
			validateSearch({ onlyAcceptingNewPatients: true })
				.onlyAcceptingNewPatients,
		).toBeUndefined();
	});

	test("returns undefined for onlyAcceptingNewPatients when the key is absent", () => {
		// input: {}  →  expected: undefined
		expect(validateSearch({}).onlyAcceptingNewPatients).toBeUndefined();
	});

	// --- combined ---

	test("normalises all three params correctly in a single call", () => {
		// input: all three params set
		// expected: each returned correctly
		const result = validateSearch({
			symptoms: "knee pain",
			location: "  Pittsburgh, PA  ",
			onlyAcceptingNewPatients: "true",
		});
		expect(result.symptoms).toBe("knee pain");
		expect(result.location).toBe("Pittsburgh, PA");
		expect(result.onlyAcceptingNewPatients).toBe("true");
	});
});

// ===========================================================================
// ResultsRoutePage — initialFilters assembly from search params
// ===========================================================================

describe("ResultsRoutePage", () => {
	beforeEach(() => {
		// Default: only symptoms set, no filters.
		mockUseSearch.mockReturnValue({
			symptoms: "headache",
			location: undefined,
			onlyAcceptingNewPatients: undefined,
		});
	});

	test("renders the ResultsPage component", () => {
		// expected: <div data-testid="results-page" /> is present
		render(<ResultsRoutePage />);
		expect(screen.getByTestId("results-page")).toBeTruthy();
	});

	test("passes initialSymptoms from the search params to ResultsPage", () => {
		// input: symptoms="knee pain"  →  expected: ResultsPage receives initialSymptoms="knee pain"
		mockUseSearch.mockReturnValue({ symptoms: "knee pain" });
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.initialSymptoms).toBe("knee pain");
	});

	test("passes includeBackLink=true to ResultsPage unconditionally", () => {
		// The route always shows a back link.
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.includeBackLink).toBe(true);
	});

	test("passes initialFilters=undefined when neither location nor onlyAcceptingNewPatients is set", () => {
		// input: no filter params  →  expected: initialFilters === undefined
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.initialFilters).toBeUndefined();
	});

	test("passes initialFilters with location when location is set", () => {
		// input: location="Pittsburgh"  →  expected: initialFilters.location === "Pittsburgh"
		mockUseSearch.mockReturnValue({
			symptoms: "headache",
			location: "Pittsburgh",
			onlyAcceptingNewPatients: undefined,
		});
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.initialFilters).toEqual({
			location: "Pittsburgh",
		});
	});

	test("passes initialFilters with onlyAcceptingNewPatients=true when the flag is 'true'", () => {
		// input: onlyAcceptingNewPatients="true"  →  expected: initialFilters.onlyAcceptingNewPatients === true
		mockUseSearch.mockReturnValue({
			symptoms: "headache",
			location: undefined,
			onlyAcceptingNewPatients: "true",
		});
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.initialFilters).toEqual({
			onlyAcceptingNewPatients: true,
		});
	});

	test("passes initialFilters with both location and onlyAcceptingNewPatients when both are set", () => {
		// input: both filter params present
		// expected: initialFilters contains both keys
		mockUseSearch.mockReturnValue({
			symptoms: "headache",
			location: "Pittsburgh, PA",
			onlyAcceptingNewPatients: "true",
		});
		render(<ResultsRoutePage />);
		expect(capturedResultsPageProps.current?.initialFilters).toEqual({
			location: "Pittsburgh, PA",
			onlyAcceptingNewPatients: true,
		});
	});
});
