import { Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Bookmark,
	BookmarkCheck,
	Check,
	Filter,
	Link2,
	Search,
	Stethoscope,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";
import { calculateDistance, formatDistance } from "../utils/distance";
import { AppNav } from "./AppNav";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const SUGGESTED_SYMPTOMS = [
	"Migraines",
	"MRI scan",
	"Broken leg",
] as const;

export type Doctor = {
	id: number;
	full_name: string;
	primary_specialty: string | null;
	accepting_new_patients: boolean;
	profile_url: string | null;
	book_appointment_url: string | null;
	primary_location: string | null;
	primary_phone: string | null;
	match_score: number | null;
	matched_specialty: string | null;
	latitude: number | null;
	longitude: number | null;
};

type UserLocation = {
	latitude: number;
	longitude: number;
};

type DoctorSearchResponse = {
	doctors: Doctor[];
};

export type SearchFilters = {
	location?: string;
	onlyAcceptingNewPatients?: boolean;
};

type SymptomValidationResponse = {
	isDescriptiveEnough: boolean;
	reasoning?: string;
};

export type SymptomValidationMessage = {
	role: "user" | "assistant";
	content: string;
};

type SearchDoctorsOptions = {
	apiBaseUrl?: string;
	fetchImpl?: typeof fetch;
	filters?: SearchFilters;
};

type SearchFiltersFormProps = {
	location: string;
	onlyAcceptingNewPatients: boolean;
	onLocationChange: (value: string) => void;
	onOnlyAcceptingChange: (value: boolean) => void;
};

type ValidateSymptomsOptions = SearchDoctorsOptions & {
	history?: SymptomValidationMessage[];
};

type ValidateSymptomsImplementation = (
	symptoms: string,
	options?: Pick<ValidateSymptomsOptions, "history">,
) => Promise<SymptomValidationResponse>;

type ResolveSymptomsSubmissionOptions = {
	attemptCount?: number;
	maxValidationAttempts?: number;
	validationHistory?: SymptomValidationMessage[];
	validateSymptomsImpl?: ValidateSymptomsImplementation;
};

type SearchPageShellProps = {
	children: ReactNode;
	/** Set to false in tests to avoid router/hook requirements. Defaults to true. */
	showNav?: boolean;
};

type SearchFormProps = {
	symptoms: string;
	onSymptomsChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isLoading?: boolean;
	validationMessage?: string;
};

type SearchHeroProps = SearchFormProps & {
	errorMessage?: string;
	filters?: SearchFiltersFormProps;
};

type HomePageProps = {
	navigateToResults: (symptoms: string, filters?: SearchFilters) => void;
};

type DoctorRecommendationCardProps = {
	doctors: Doctor[];
	activeDoctorIndex: number;
	onNextDoctor: () => void;
	symptoms: string;
	isSaved?: boolean;
	onSave?: () => void;
	onUnsave?: () => void;
	userLocation: UserLocation | null;
};

type ResultsHeaderProps = {
	includeBackLink?: boolean;
	initialSymptoms: string;
	activeFilters?: SearchFilters;
	onRefineFilters?: () => void;
};

type ResultsSearchSummaryProps = {
	symptoms: string;
};

type ResultsActiveFiltersProps = {
	filters: SearchFilters;
	onRefine: () => void;
};

type ResultsRefineFiltersProps = {
	location: string;
	onlyAcceptingNewPatients: boolean;
	onLocationChange: (value: string) => void;
	onOnlyAcceptingChange: (value: boolean) => void;
	onApply: () => void;
	onCancel: () => void;
	isRefining: boolean;
};

type ResultsPageProps = {
	initialSymptoms: string;
	initialFilters?: SearchFilters;
	searchDoctorsImpl?: typeof searchDoctors;
	includeBackLink?: boolean;
};

export function getDoctorSearchUrl(apiBaseUrl = API_BASE_URL) {
	return `${apiBaseUrl}/doctors/search`;
}

export function getSymptomValidationUrl(apiBaseUrl = API_BASE_URL) {
	return `${apiBaseUrl}/symptoms/validate`;
}

export function getPhysicianProfileUrl(
	doctorId: number,
	origin = typeof window !== "undefined" ? window.location.origin : "",
) {
	return `${origin}/physician/${doctorId}`;
}

export function getDoctorUrl(doctorId: number, apiBaseUrl = API_BASE_URL) {
	return `${apiBaseUrl}/doctors/${doctorId}`;
}

export async function fetchDoctor(
	doctorId: number,
	{ apiBaseUrl = API_BASE_URL, fetchImpl = fetch }: SearchDoctorsOptions = {},
): Promise<Doctor | null> {
	const response = await fetchImpl(getDoctorUrl(doctorId, apiBaseUrl));

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		const payload = (await response.json()) as { error?: string };
		throw new Error(payload.error ?? "Unable to load physician profile.");
	}

	const payload = (await response.json()) as { doctor?: Doctor };
	return payload.doctor ?? null;
}

export function normalizeSymptoms(symptoms: string) {
	return symptoms.trim();
}

/** Lowercase, collapse spaces, normalize apostrophes for phrase matching. */
function normalizeSymptomsForMatching(symptoms: string) {
	return normalizeSymptoms(symptoms)
		.toLowerCase()
		.replace(/\u2019/g, "'")
		.replace(/\s+/g, " ");
}

/**
 * Heuristic keyword check for symptoms that often warrant immediate emergency care.
 * Not a medical diagnosis — DocSeek is for finding doctors, not triage.
 */
const EMERGENCY_PHRASES = [
	"anaphylaxis",
	"can't breathe",
	"cant breathe",
	"chest pain",
	"crushing chest",
	"difficulty breathing",
	"face drooping",
	"heart attack",
	"kill myself",
	"overdose",
	"passed out",
	"passing out",
	"severe bleeding",
	"shortness of breath",
	"slurred speech",
	"stroke",
	"suicidal",
	"suicide",
	"throat closing",
	"thunderclap headache",
	"trouble breathing",
	"unconscious",
	"want to die",
	"won't wake",
	"worst headache",
] as const;

export function symptomsSuggestEmergencyCare(symptoms: string) {
	const normalized = normalizeSymptomsForMatching(symptoms);
	if (!normalized) {
		return false;
	}
	return EMERGENCY_PHRASES.some((phrase) => normalized.includes(phrase));
}

export type DoctorSearchValidation =
	| { ok: true; normalized: string }
	| { ok: false; message: string };

/** Validates home search input before navigating to results. */
export function validateSymptomsForDoctorSearch(
	symptoms: string,
): DoctorSearchValidation {
	const normalized = normalizeSymptoms(symptoms);
	if (!normalized) {
		return {
			ok: false,
			message: "Enter your current symptoms to search for matching doctors.",
		};
	}
	if (symptomsSuggestEmergencyCare(normalized)) {
		return {
			ok: false,
			message:
				"We can't start a doctor search while you may need emergency care. Call 911 or go to the ER if you need help right now.",
		};
	}
	return { ok: true, normalized };
}

export function EmergencyCareAlert() {
	return (
		<div className="emergency-care-alert" role="alert" aria-live="assertive">
			<div className="emergency-care-alert-icon" aria-hidden="true">
				<AlertTriangle size={28} strokeWidth={2} />
			</div>
			<div className="emergency-care-alert-body">
				<p className="emergency-care-alert-title">
					Your symptoms may need immediate emergency care
				</p>
				<p className="emergency-care-alert-text">
					If you could be having a medical emergency, call <strong>911</strong>{" "}
					(or your local emergency number) or go to the nearest emergency room
					now. DocSeek does not replace emergency services.
				</p>
			</div>
		</div>
	);
}

export function getResultsNavigation(
	symptoms: string,
	filters?: SearchFilters,
) {
	return {
		to: "/results" as const,
		search: {
			symptoms: normalizeSymptoms(symptoms),
			...(filters?.location && { location: filters.location }),
			...(filters?.onlyAcceptingNewPatients && {
				onlyAcceptingNewPatients: "true",
			}),
		},
	};
}

export async function submitFeedback(
	doctorId: number,
	rating: number,
	comment: string,
	{ apiBaseUrl = API_BASE_URL, fetchImpl = fetch }: SearchDoctorsOptions = {},
): Promise<void> {
	const response = await fetchImpl(
		`${apiBaseUrl}/doctors/${doctorId}/feedback`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rating, comment: comment || undefined }),
		},
	);

	if (!response.ok) {
		const payload = (await response.json()) as { error?: string };
		throw new Error(payload.error ?? "Failed to submit feedback.");
	}
}

export function getNextRecommendationLabel(hasNextDoctor: boolean) {
	return hasNextDoctor
		? "See the next recommended doctor"
		: "You've reached the last recommendation";
}

export function getFallbackDistanceMiles(
	doctorId: number,
	recommendationIndex: number,
) {
	const seed = (doctorId * 9301 + (recommendationIndex + 1) * 49297) % 233280;
	return 1 + (seed / 233280) * 24;
}

/** UPMC scheduling is reached from the provider profile page. */
export function direct_to_booking(doctor: Doctor): string | null {
	return doctor.profile_url;
}

export function getMatchQualityLabel(score: number | null): string {
	if (score === null) return "Possible match";
	if (score >= 0.55) return "Strong match";
	if (score >= 0.4) return "Good match";
	return "Possible match";
}

export function formatMatchedSpecialties(matched: string | null): string[] {
	if (!matched) return [];
	return matched
		.split(";")
		.map((s) => s.trim())
		.filter(Boolean);
}

export function buildMatchExplanation(
	symptoms: string,
	matchedSpecialty: string | null,
): string {
	const primarySpecialty = matchedSpecialty?.split(";")[0]?.trim() ?? null;
	const base = primarySpecialty
		? `Your symptoms were matched to this physician's expertise in ${primarySpecialty}.`
		: "Your symptoms were matched to this physician's specialty.";
	return `${base} You described: "${symptoms.trim()}".`;
}

export async function searchDoctors(
	symptoms: string,
	{
		apiBaseUrl = API_BASE_URL,
		fetchImpl = fetch,
		filters,
	}: SearchDoctorsOptions = {},
): Promise<Doctor[]> {
	const trimmedSymptoms = normalizeSymptoms(symptoms);
	if (!trimmedSymptoms) {
		throw new Error(
			"Enter your current symptoms to search for matching doctors.",
		);
	}

	const body: Record<string, unknown> = { symptoms: trimmedSymptoms };
	if (filters) {
		if (filters.location) body.location = filters.location;
		if (filters.onlyAcceptingNewPatients) body.onlyAcceptingNewPatients = true;
	}

	const response = await fetchImpl(getDoctorSearchUrl(apiBaseUrl), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const payload = (await response.json()) as
		| DoctorSearchResponse
		| { error?: string };

	if (!response.ok) {
		throw new Error(
			"error" in payload && payload.error
				? payload.error
				: "Unable to search for doctors right now.",
		);
	}

	if (!("doctors" in payload)) {
		throw new Error("Unable to search for doctors right now.");
	}

	return payload.doctors;
}

export async function validateSymptoms(
	symptoms: string,
	{
		apiBaseUrl = API_BASE_URL,
		fetchImpl = fetch,
		history = [],
	}: ValidateSymptomsOptions = {},
): Promise<SymptomValidationResponse> {
	const trimmedSymptoms = normalizeSymptoms(symptoms);
	if (!trimmedSymptoms) {
		throw new Error(
			"Enter your current symptoms to search for matching doctors.",
		);
	}

	const response = await fetchImpl(getSymptomValidationUrl(apiBaseUrl), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			symptoms: trimmedSymptoms,
			history,
		}),
	});

	const payload = (await response.json()) as
		| SymptomValidationResponse
		| { error?: string };

	if (!response.ok) {
		throw new Error(
			"error" in payload && payload.error
				? payload.error
				: "Unable to validate your symptoms right now.",
		);
	}

	if (!("isDescriptiveEnough" in payload)) {
		throw new Error("Unable to validate your symptoms right now.");
	}

	if (payload.isDescriptiveEnough) {
		return { isDescriptiveEnough: true };
	}

	return {
		isDescriptiveEnough: false,
		reasoning: payload.reasoning,
	};
}

export async function resolveSymptomsSubmission(
	symptoms: string,
	{
		attemptCount = 0,
		maxValidationAttempts = 3,
		validationHistory = [],
		validateSymptomsImpl = validateSymptoms,
	}: ResolveSymptomsSubmissionOptions = {},
) {
	const trimmedSymptoms = normalizeSymptoms(symptoms);

	if (!trimmedSymptoms) {
		return {
			canNavigate: false,
			errorMessage:
				"Enter your current symptoms to search for matching doctors.",
			nextAttemptCount: attemptCount,
			nextValidationHistory: validationHistory,
		};
	}

	const validation = await validateSymptomsImpl(trimmedSymptoms, {
		history: validationHistory,
	});
	const reasoning =
		validation.reasoning ??
		"Add a little more detail about the symptoms you are experiencing.";

	if (!validation.isDescriptiveEnough) {
		const nextAttemptCount = attemptCount + 1;
		const nextValidationHistory = [
			...validationHistory,
			{
				role: "user" as const,
				content: trimmedSymptoms,
			},
			{
				role: "assistant" as const,
				content: reasoning,
			},
		];

		if (nextAttemptCount >= maxValidationAttempts) {
			return {
				canNavigate: true,
				symptoms: trimmedSymptoms,
				nextAttemptCount: 0,
				nextValidationHistory: [],
			};
		}

		return {
			canNavigate: false,
			errorMessage: reasoning,
			nextAttemptCount,
			nextValidationHistory,
		};
	}

	return {
		canNavigate: true,
		symptoms: trimmedSymptoms,
		nextAttemptCount: 0,
		nextValidationHistory: [],
	};
}

export function SearchPageShell({
	children,
	showNav = true,
}: SearchPageShellProps) {
	return (
		<main className="app-shell">
			<a className="skip-link" href="#page-content">
				Skip to main content
			</a>
			{showNav ? <AppNav /> : null}
			<div className="background-orb background-orb-left" aria-hidden="true" />
			<div className="background-orb background-orb-right" aria-hidden="true" />
			<div className="constellation constellation-top" aria-hidden="true" />
			<div className="constellation constellation-bottom" aria-hidden="true" />
			<div id="page-content" className="page-content">
				{children}
			</div>
		</main>
	);
}

export function SearchForm({
	symptoms,
	onSymptomsChange,
	onSubmit,
	isLoading = false,
	validationMessage,
}: SearchFormProps) {
	return (
		<form className="search-form" onSubmit={onSubmit}>
			<label className="sr-only" htmlFor="symptoms">
				Current symptoms
			</label>
			<div className="search-frame">
				<div className="search-input-wrap">
					<Search
						aria-hidden="true"
						className="search-icon"
						size={28}
						strokeWidth={1.9}
					/>
					<textarea
						id="symptoms"
						name="symptoms"
						className="symptoms-input"
						rows={1}
						value={symptoms}
						onChange={(event) => onSymptomsChange(event.target.value)}
						placeholder="I have chest pains"
						aria-describedby={
							validationMessage ? "symptoms-validation-message" : undefined
						}
						required
					/>
				</div>
				<button
					className="primary-action"
					type="submit"
					disabled={isLoading}
					aria-label={isLoading ? "Finding doctors" : "Find matching doctors"}
				>
					<ArrowRight aria-hidden="true" size={34} strokeWidth={2.1} />
				</button>
			</div>
			{validationMessage ? (
				<p
					id="symptoms-validation-message"
					className="feedback-message"
					role="alert"
				>
					{validationMessage}
				</p>
			) : null}
		</form>
	);
}

export function SearchFiltersForm({
	location,
	onlyAcceptingNewPatients,
	onLocationChange,
	onOnlyAcceptingChange,
}: SearchFiltersFormProps) {
	return (
		<fieldset className="search-filters" aria-labelledby="filter-heading">
			<legend id="filter-heading" className="filter-heading">
				Filter by your preferences
			</legend>
			<div className="filter-fields">
				<div className="filter-field">
					<label htmlFor="filter-location">
						Location (city, state, or ZIP)
					</label>
					<input
						id="filter-location"
						type="text"
						value={location}
						onChange={(e) => onLocationChange(e.target.value)}
						placeholder="e.g. Pittsburgh, PA"
						aria-describedby="filter-location-hint"
					/>
					<span id="filter-location-hint" className="filter-hint">
						Show doctors near this area
					</span>
				</div>
				<div className="filter-field filter-checkbox">
					<input
						id="filter-accepting"
						type="checkbox"
						checked={onlyAcceptingNewPatients}
						onChange={(e) => onOnlyAcceptingChange(e.target.checked)}
						aria-describedby="filter-accepting-hint"
					/>
					<label htmlFor="filter-accepting">
						Only show doctors accepting new patients
					</label>
					<span id="filter-accepting-hint" className="filter-hint">
						Filter by availability
					</span>
				</div>
			</div>
		</fieldset>
	);
}

export function SearchHero({
	symptoms,
	onSymptomsChange,
	onSubmit,
	isLoading = false,
	errorMessage,
	filters,
}: SearchHeroProps) {
	return (
		<section className="hero">
			<div className="brand-lockup">
				<div className="brand-mark" aria-hidden="true">
					<Stethoscope aria-hidden="true" size={36} strokeWidth={2.1} />
				</div>
				<p className="eyebrow">DocSeek</p>
			</div>
			<h1>How can we help you today?</h1>
			<p className="lede hero-lede">
				Describe what you are feeling and DocSeek will surface the strongest
				doctor matches on a separate results page.
			</p>

			<SearchForm
				symptoms={symptoms}
				onSymptomsChange={onSymptomsChange}
				onSubmit={onSubmit}
				isLoading={isLoading}
				validationMessage={errorMessage}
			/>

			{filters ? (
				<SearchFiltersForm
					location={filters.location}
					onlyAcceptingNewPatients={filters.onlyAcceptingNewPatients}
					onLocationChange={filters.onLocationChange}
					onOnlyAcceptingChange={filters.onOnlyAcceptingChange}
				/>
			) : null}
			{symptomsSuggestEmergencyCare(symptoms) ? <EmergencyCareAlert /> : null}

			<div className="suggestion-list">
				{SUGGESTED_SYMPTOMS.map((suggestion) => (
					<button
						key={suggestion}
						className="suggestion-chip"
						type="button"
						onClick={() => onSymptomsChange(suggestion)}
					>
						{suggestion}
					</button>
				))}
			</div>
		</section>
	);
}

export function HomePage({ navigateToResults }: HomePageProps) {
	const [symptoms, setSymptoms] = useState("");
	const [location, setLocation] = useState("");
	const [onlyAcceptingNewPatients, setOnlyAcceptingNewPatients] =
		useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [isValidating, setIsValidating] = useState(false);
	const [validationAttemptCount, setValidationAttemptCount] = useState(0);
	const [validationHistory, setValidationHistory] = useState<
		SymptomValidationMessage[]
	>([]);

	function handleSymptomsChange(value: string) {
		setSymptoms(value);
		setErrorMessage("");
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsValidating(true);
		setErrorMessage("");

		try {
			// 1. Smart Validation from Main
			const result = await resolveSymptomsSubmission(symptoms, {
				attemptCount: validationAttemptCount,
				validationHistory,
			});

			setValidationAttemptCount(result.nextAttemptCount);
			setValidationHistory(result.nextValidationHistory);

			if (!result.canNavigate) {
				setErrorMessage(
					result.errorMessage ??
						"Add a little more detail about the symptoms you are experiencing.",
				);
				return;
			}

			const nextSymptoms = result.symptoms;
			if (!nextSymptoms) {
				setErrorMessage("Unable to search without symptoms.");
				return;
			}

			// 2. Filter Logic from your Saved Physicians branch
			const filters: SearchFilters = {};
			if (location.trim()) filters.location = location.trim();
			if (onlyAcceptingNewPatients) filters.onlyAcceptingNewPatients = true;

			// 3. Navigate with both Symptoms and Filters
			navigateToResults(
				nextSymptoms,
				Object.keys(filters).length > 0 ? filters : undefined,
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to validate symptoms.",
			);
		} finally {
			setIsValidating(false);
		}
	}

	return (
		<SearchPageShell>
			<SearchHero
				symptoms={symptoms}
				onSymptomsChange={handleSymptomsChange}
				onSubmit={handleSubmit}
				errorMessage={errorMessage}
				filters={{
					location,
					onlyAcceptingNewPatients,
					onLocationChange: setLocation,
					onOnlyAcceptingChange: setOnlyAcceptingNewPatients,
				}}
				isLoading={isValidating}
			/>
		</SearchPageShell>
	);
}

type FeedbackFormProps = {
	doctorId: number;
	submitFeedbackImpl?: typeof submitFeedback;
};

export function FeedbackForm({
	doctorId,
	submitFeedbackImpl = submitFeedback,
}: FeedbackFormProps) {
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState("");

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		try {
			await submitFeedbackImpl(doctorId, rating, comment);
			setSubmitted(true);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to submit feedback.",
			);
		}
	}

	if (submitted) {
		return (
			<div className="feedback-section">
				<p className="feedback-thanks">Thanks for your feedback!</p>
			</div>
		);
	}

	return (
		<div className="feedback-section">
			<p className="feedback-section-label">Rate your visit</p>
			<form className="feedback-form" onSubmit={handleSubmit}>
				<div className="star-row">
					{[1, 2, 3, 4, 5].map((n) => (
						<button
							key={n}
							type="button"
							className={`star-btn${rating >= n ? " star-btn-active" : ""}`}
							onClick={() => setRating(n)}
							aria-label={`${n} star${n > 1 ? "s" : ""}`}
						>
							★
						</button>
					))}
				</div>
				<textarea
					className="feedback-comment"
					placeholder="Optional comment…"
					rows={2}
					value={comment}
					onChange={(e) => setComment(e.target.value)}
				/>
				{error ? <p className="feedback-error">{error}</p> : null}
				<button
					className="secondary-action"
					type="submit"
					disabled={rating === 0}
				>
					Submit feedback
				</button>
			</form>
		</div>
	);
}

export function DoctorRecommendationCard({
	doctors,
	activeDoctorIndex,
	onNextDoctor,
	symptoms = "",
	isSaved = false,
	onSave,
	onUnsave,
	userLocation,
}: DoctorRecommendationCardProps) {
	const activeDoctor = doctors[activeDoctorIndex];
	const hasNextDoctor = activeDoctorIndex < doctors.length - 1;
	const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);

	if (!activeDoctor) {
		return null;
	}

	async function handleCopyLink() {
		const url = getPhysicianProfileUrl(activeDoctor.id);
		try {
			await navigator.clipboard.writeText(url);
			setCopyStatus("success");
			setTimeout(() => setCopyStatus("idle"), 2500);
		} catch {
			setCopyStatus("error");
			setTimeout(() => setCopyStatus("idle"), 5000);
		}
	}

	const preciseDistanceMiles =
		userLocation &&
		activeDoctor.latitude != null &&
		activeDoctor.longitude != null
			? calculateDistance(
					userLocation.latitude,
					userLocation.longitude,
					activeDoctor.latitude,
					activeDoctor.longitude,
				)
			: null;
	const distanceLabel = formatDistance(
		preciseDistanceMiles ??
			getFallbackDistanceMiles(activeDoctor.id, activeDoctorIndex),
	);

	const bookingUrl = direct_to_booking(activeDoctor);
	const matchedSpecialties = formatMatchedSpecialties(
		activeDoctor.matched_specialty,
	);

	return (
		<section className="doctor-card" aria-live="polite">
			<div className="doctor-card-header">
				<div>
					<p className="result-count">
						Recommendation {activeDoctorIndex + 1} of {doctors.length}
					</p>
					<h2>{activeDoctor.full_name}</h2>
				</div>
				<div className="doctor-card-header-actions">
					{onSave && onUnsave ? (
						<button
							type="button"
							className={`save-button ${isSaved ? "saved" : ""}`}
							onClick={() => (isSaved ? onUnsave() : onSave())}
							aria-label={
								isSaved
									? `Remove ${activeDoctor.full_name} from saved physicians`
									: `Save ${activeDoctor.full_name} for later`
							}
						>
							{isSaved ? (
								<>
									<BookmarkCheck aria-hidden size={20} strokeWidth={2} />
									Saved
								</>
							) : (
								<>
									<Bookmark aria-hidden size={20} strokeWidth={2} />
									Save for later
								</>
							)}
						</button>
					) : null}
					<p
						className={
							activeDoctor.accepting_new_patients
								? "availability availability-open"
								: "availability"
						}
					>
						{activeDoctor.accepting_new_patients
							? "Accepting new patients"
							: "Check availability"}
					</p>
				</div>
			</div>
			<p className="doctor-meta">
				{activeDoctor.primary_specialty ?? "Specialty not listed"}
			</p>
			<div className="match-reason">
				<div className="match-reason-header">
					<p className="match-reason-label">Why recommended</p>
					<span className="match-quality-badge">
						{getMatchQualityLabel(activeDoctor.match_score)}
					</span>
				</div>
				<p className="match-explanation">
					{buildMatchExplanation(symptoms, activeDoctor.matched_specialty)}
				</p>
				{matchedSpecialties.length > 0 ? (
					<ul className="match-specialty-list">
						{matchedSpecialties.map((specialty) => (
							<li key={specialty} className="match-specialty-item">
								{specialty}
							</li>
						))}
					</ul>
				) : null}
			</div>
			<div className="doctor-details">
				<p className="doctor-detail">
					{activeDoctor.primary_location ?? "Location not listed"}
					{distanceLabel ? (
						<span className="distance-label"> · {distanceLabel}</span>
					) : null}
				</p>
				<p className="doctor-detail">
					{activeDoctor.primary_phone ?? "Phone number not listed"}
				</p>
			</div>
			<FeedbackForm doctorId={activeDoctor.id} />
			<div className="doctor-links">
				{activeDoctor.profile_url ? (
					<a
						href={activeDoctor.profile_url}
						target="_blank"
						rel="noreferrer"
						aria-label={`View profile for ${activeDoctor.full_name} (opens in a new tab)`}
					>
						View profile
					</a>
				) : null}
				{bookingUrl ? (
					<a
						href={bookingUrl}
						target="_blank"
						rel="noreferrer"
						aria-label={`Book an appointment with ${activeDoctor.full_name} (opens in a new tab)`}
					>
						Book appointment
					</a>
				) : null}
				<button
					className={`secondary-action copy-link-button${copyStatus === "success" ? " copy-link-success" : ""}`}
					type="button"
					onClick={handleCopyLink}
					aria-label={`Copy link to ${activeDoctor.full_name}'s profile`}
				>
					{copyStatus === "success" ? (
						<>
							<Check aria-hidden size={18} strokeWidth={2.2} />
							Link copied!
						</>
					) : (
						<>
							<Link2 aria-hidden size={18} strokeWidth={2} />
							Copy link
						</>
					)}
				</button>
				<button
					className="secondary-action"
					type="button"
					onClick={onNextDoctor}
					disabled={!hasNextDoctor}
				>
					{getNextRecommendationLabel(hasNextDoctor)}
				</button>
			</div>
			{copyStatus === "error" ? (
				<p className="copy-link-error" role="alert">
					Unable to copy automatically.{" "}
					<a href={getPhysicianProfileUrl(activeDoctor.id)} rel="noreferrer">
						Open profile to share link
					</a>
				</p>
			) : null}
		</section>
	);
}

export function ResultsActiveFilters({
	filters,
	onRefine,
}: ResultsActiveFiltersProps) {
	const labels: string[] = [];
	if (filters.location) labels.push(filters.location);
	if (filters.onlyAcceptingNewPatients) labels.push("Accepting new patients");

	if (labels.length === 0) return null;

	return (
		<div className="results-active-filters">
			<Filter aria-hidden="true" size={16} strokeWidth={2} />
			<span className="results-active-filters-label">
				Filtered by: {labels.join(" • ")}
			</span>
			<button
				type="button"
				className="results-refine-link"
				onClick={onRefine}
				aria-label="Refine location and availability filters"
			>
				Refine filters
			</button>
		</div>
	);
}

export function ResultsRefineFilters({
	location,
	onlyAcceptingNewPatients,
	onLocationChange,
	onOnlyAcceptingChange,
	onApply,
	onCancel,
	isRefining,
}: ResultsRefineFiltersProps) {
	if (!isRefining) return null;

	return (
		<div className="results-refine-filters">
			<h3 id="refine-heading" className="refine-heading">
				Refine your filters
			</h3>
			<div className="refine-fields">
				<div className="filter-field">
					<label htmlFor="refine-location">
						Location (city, state, or ZIP)
					</label>
					<input
						id="refine-location"
						type="text"
						value={location}
						onChange={(e) => onLocationChange(e.target.value)}
						placeholder="e.g. Pittsburgh, PA"
					/>
				</div>
				<div className="filter-field filter-checkbox">
					<input
						id="refine-accepting"
						type="checkbox"
						checked={onlyAcceptingNewPatients}
						onChange={(e) => onOnlyAcceptingChange(e.target.checked)}
					/>
					<label htmlFor="refine-accepting">
						Only show doctors accepting new patients
					</label>
				</div>
			</div>
			<div className="refine-actions">
				<button
					type="button"
					className="primary-action"
					onClick={onApply}
					aria-label="Apply refined filters"
				>
					Apply filters
				</button>
				<button
					type="button"
					className="secondary-action"
					onClick={onCancel}
					aria-label="Cancel refining filters"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

export function ResultsHeader({
	includeBackLink = true,
	initialSymptoms,
	activeFilters,
	onRefineFilters,
}: ResultsHeaderProps) {
	return (
		<header className="results-header">
			<div className="results-header-top">
				{includeBackLink ? (
					<Link className="back-link" to="/">
						<ArrowLeft aria-hidden="true" size={18} strokeWidth={2.2} />
						Start a new search
					</Link>
				) : null}
				<ResultsSearchSummary symptoms={initialSymptoms} />
			</div>
			{activeFilters &&
			(activeFilters.location || activeFilters.onlyAcceptingNewPatients) ? (
				<ResultsActiveFilters
					filters={activeFilters}
					onRefine={onRefineFilters ?? (() => {})}
				/>
			) : null}
			<div className="results-copy">
				<p className="results-kicker">Recommended doctors</p>
				<h1 className="results-title">Recommended doctors</h1>
				<p className="results-lede">
					Review one doctor at a time, then move to the next recommendation if
					you want more options.
				</p>
			</div>
		</header>
	);
}

export function ResultsSearchSummary({ symptoms }: ResultsSearchSummaryProps) {
	return (
		<div className="results-search-summary">
			<div className="results-search-frame">
				<Search
					aria-hidden="true"
					className="search-icon results-search-icon"
					size={22}
					strokeWidth={1.9}
				/>
				<p className="results-search-text">
					<span className="sr-only">Search symptoms:</span>
					{symptoms}
				</p>
			</div>
		</div>
	);
}

export function ResultsPage({
	initialSymptoms,
	initialFilters,
	searchDoctorsImpl = searchDoctors,
	includeBackLink = false,
}: ResultsPageProps) {
	const navigate = useNavigate();
	const savedPhysicians = useSavedPhysicians();
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [activeDoctorIndex, setActiveDoctorIndex] = useState(0);
	const [errorMessage, setErrorMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isRefining, setIsRefining] = useState(false);
	const [refineLocation, setRefineLocation] = useState(
		initialFilters?.location ?? "",
	);
	const [refineOnlyAccepting, setRefineOnlyAccepting] = useState(
		initialFilters?.onlyAcceptingNewPatients ?? false,
	);

	useEffect(() => {
		setRefineLocation(initialFilters?.location ?? "");
		setRefineOnlyAccepting(initialFilters?.onlyAcceptingNewPatients ?? false);
	}, [initialFilters]);
	const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

	useEffect(() => {
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				setUserLocation({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				}),
			() => {},
		);
	}, []);

	useEffect(() => {
		let ignore = false;

		async function loadDoctors() {
			setIsLoading(true);
			setErrorMessage("");

			if (symptomsSuggestEmergencyCare(initialSymptoms)) {
				if (!ignore) {
					setDoctors([]);
					setActiveDoctorIndex(0);
					setIsLoading(false);
				}
				return;
			}

			try {
				const matchedDoctors = await searchDoctorsImpl(initialSymptoms, {
					filters: initialFilters,
				});

				if (ignore) {
					return;
				}

				setDoctors(matchedDoctors);
				setActiveDoctorIndex(0);

				if (matchedDoctors.length === 0) {
					setErrorMessage(
						"No doctors matched those symptoms. Try adding more detail or relaxing your filters.",
					);
				}
			} catch (error) {
				if (ignore) {
					return;
				}

				setDoctors([]);
				setActiveDoctorIndex(0);
				setErrorMessage(
					error instanceof Error
						? error.message
						: "Unable to search for doctors right now.",
				);
			} finally {
				if (!ignore) {
					setIsLoading(false);
				}
			}
		}

		void loadDoctors();

		return () => {
			ignore = true;
		};
	}, [initialSymptoms, initialFilters, searchDoctorsImpl]);

	return (
		<SearchPageShell>
			<section
				className="results-page"
				aria-busy={isLoading}
				aria-describedby="results-status"
			>
				<ResultsHeader
					includeBackLink={includeBackLink}
					initialSymptoms={initialSymptoms}
					activeFilters={initialFilters}
					onRefineFilters={
						initialFilters ? () => setIsRefining(true) : undefined
					}
				/>

				<ResultsRefineFilters
					location={refineLocation}
					onlyAcceptingNewPatients={refineOnlyAccepting}
					onLocationChange={setRefineLocation}
					onOnlyAcceptingChange={setRefineOnlyAccepting}
					onApply={() => {
						const filters: SearchFilters = {};
						if (refineLocation.trim()) filters.location = refineLocation.trim();
						if (refineOnlyAccepting) filters.onlyAcceptingNewPatients = true;
						navigate(getResultsNavigation(initialSymptoms, filters));
						setIsRefining(false);
					}}
					onCancel={() => setIsRefining(false)}
					isRefining={isRefining}
				/>

				{symptomsSuggestEmergencyCare(initialSymptoms) ? (
					<EmergencyCareAlert />
				) : null}

				<div id="results-status" className="sr-only" aria-live="polite">
					{isLoading
						? `Loading doctor recommendations for ${initialSymptoms}.`
						: doctors.length > 0
							? `Showing ${doctors.length} doctor recommendations for ${initialSymptoms}.`
							: "No doctor recommendations are currently displayed."}
				</div>

				{isLoading ? (
					<p className="loading-message">Loading recommendations…</p>
				) : null}

				{errorMessage ? (
					<p className="feedback-message" role="alert">
						{errorMessage}
					</p>
				) : null}

				{!symptomsSuggestEmergencyCare(initialSymptoms) &&
				!errorMessage &&
				!isLoading &&
				doctors.length > 0 ? (
					<DoctorRecommendationCard
						doctors={doctors}
						activeDoctorIndex={activeDoctorIndex}
						symptoms={initialSymptoms}
						onNextDoctor={() =>
							setActiveDoctorIndex((currentIndex) => currentIndex + 1)
						}
						isSaved={savedPhysicians.isSaved(doctors[activeDoctorIndex]?.id)}
						onSave={() =>
							doctors[activeDoctorIndex] &&
							savedPhysicians.addSavedDoctor(doctors[activeDoctorIndex])
						}
						onUnsave={() =>
							savedPhysicians.removeSavedDoctor(doctors[activeDoctorIndex]?.id)
						}
						userLocation={userLocation}
					/>
				) : null}
			</section>
		</SearchPageShell>
	);
}
