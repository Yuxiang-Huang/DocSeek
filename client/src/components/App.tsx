import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Search, Stethoscope } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { calculateDistance, formatDistance } from "../utils/distance";

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
};

type HomePageProps = {
	navigateToResults: (symptoms: string) => void;
};

type DoctorRecommendationCardProps = {
	doctors: Doctor[];
	activeDoctorIndex: number;
	onNextDoctor: () => void;
	userLocation: UserLocation | null;
};

type ResultsHeaderProps = {
	includeBackLink?: boolean;
	initialSymptoms: string;
};

type ResultsSearchSummaryProps = {
	symptoms: string;
};

type ResultsPageProps = {
	initialSymptoms: string;
	searchDoctorsImpl?: typeof searchDoctors;
	includeBackLink?: boolean;
};

export function getDoctorSearchUrl(apiBaseUrl = API_BASE_URL) {
	return `${apiBaseUrl}/doctors/search`;
}

export function getSymptomValidationUrl(apiBaseUrl = API_BASE_URL) {
	return `${apiBaseUrl}/symptoms/validate`;
}

export function normalizeSymptoms(symptoms: string) {
	return symptoms.trim();
}

export function getResultsNavigation(symptoms: string) {
	return {
		to: "/results" as const,
		search: {
			symptoms: normalizeSymptoms(symptoms),
		},
	};
}

export async function submitFeedback(
	doctorId: number,
	rating: number,
	comment: string,
	{ apiBaseUrl = API_BASE_URL, fetchImpl = fetch }: SearchDoctorsOptions = {},
): Promise<void> {
	const response = await fetchImpl(`${apiBaseUrl}/doctors/${doctorId}/feedback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ rating, comment: comment || undefined }),
	});

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

export async function searchDoctors(
	symptoms: string,
	{ apiBaseUrl = API_BASE_URL, fetchImpl = fetch }: SearchDoctorsOptions = {},
): Promise<Doctor[]> {
	const trimmedSymptoms = normalizeSymptoms(symptoms);
	if (!trimmedSymptoms) {
		throw new Error(
			"Enter your current symptoms to search for matching doctors.",
		);
	}

	const response = await fetchImpl(getDoctorSearchUrl(apiBaseUrl), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			symptoms: trimmedSymptoms,
		}),
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
			errorMessage: "Enter your current symptoms to search for matching doctors.",
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

export function SearchPageShell({ children }: SearchPageShellProps) {
	return (
		<main className="app-shell">
			<a className="skip-link" href="#page-content">
				Skip to main content
			</a>
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

export function SearchHero({
	symptoms,
	onSymptomsChange,
	onSubmit,
	isLoading = false,
	errorMessage,
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
	const [errorMessage, setErrorMessage] = useState("");
	const [isValidating, setIsValidating] = useState(false);
	const [validationAttemptCount, setValidationAttemptCount] = useState(0);
	const [validationHistory, setValidationHistory] = useState<
		SymptomValidationMessage[]
	>([]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setIsValidating(true);
		setErrorMessage("");

		try {
			const result = await resolveSymptomsSubmission(symptoms, {
				attemptCount: validationAttemptCount,
				validationHistory,
			});

			setValidationAttemptCount(result.nextAttemptCount);
			setValidationHistory(result.nextValidationHistory);

			if (!result.canNavigate) {
				setErrorMessage(result.errorMessage);
				return;
			}

			navigateToResults(result.symptoms);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Unable to validate your symptoms right now.",
			);
		} finally {
			setIsValidating(false);
		}
	}

	return (
		<SearchPageShell>
			<SearchHero
				symptoms={symptoms}
				onSymptomsChange={(value) => {
					setSymptoms(value);
				}}
				onSubmit={handleSubmit}
				errorMessage={errorMessage}
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
			setError(err instanceof Error ? err.message : "Failed to submit feedback.");
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
				<div className="star-row" role="group" aria-label="Rating">
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
				<button className="secondary-action" type="submit" disabled={rating === 0}>
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
	userLocation,
}: DoctorRecommendationCardProps) {
	const activeDoctor = doctors[activeDoctorIndex];
	const hasNextDoctor = activeDoctorIndex < doctors.length - 1;

	const distanceLabel =
		userLocation && activeDoctor?.latitude != null && activeDoctor?.longitude != null
			? formatDistance(
					calculateDistance(
						userLocation.latitude,
						userLocation.longitude,
						activeDoctor.latitude,
						activeDoctor.longitude,
					),
				)
			: null;

	if (!activeDoctor) {
		return null;
	}

	return (
		<section className="doctor-card" aria-live="polite">
			<div className="doctor-card-header">
				<div>
					<p className="result-count">
						Recommendation {activeDoctorIndex + 1} of {doctors.length}
					</p>
					<h2>{activeDoctor.full_name}</h2>
				</div>
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
			<p className="doctor-meta">
				{activeDoctor.primary_specialty ?? "Specialty not listed"}
			</p>
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
				{activeDoctor.book_appointment_url ? (
					<a
						href={activeDoctor.book_appointment_url}
						target="_blank"
						rel="noreferrer"
						aria-label={`Book an appointment with ${activeDoctor.full_name} (opens in a new tab)`}
					>
						Book appointment
					</a>
				) : null}
				<button
					className="secondary-action"
					type="button"
					onClick={onNextDoctor}
					disabled={!hasNextDoctor}
				>
					{getNextRecommendationLabel(hasNextDoctor)}
				</button>
			</div>
		</section>
	);
}

export function ResultsHeader({
	includeBackLink = true,
	initialSymptoms,
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
	searchDoctorsImpl = searchDoctors,
	includeBackLink = false,
}: ResultsPageProps) {
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [activeDoctorIndex, setActiveDoctorIndex] = useState(0);
	const [errorMessage, setErrorMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
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

			try {
				const matchedDoctors = await searchDoctorsImpl(initialSymptoms);

				if (ignore) {
					return;
				}

				setDoctors(matchedDoctors);
				setActiveDoctorIndex(0);

				if (matchedDoctors.length === 0) {
					setErrorMessage(
						"No doctors matched those symptoms. Try adding more detail.",
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
	}, [initialSymptoms, searchDoctorsImpl]);

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
				/>

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

				{!errorMessage && !isLoading && doctors.length > 0 ? (
					<DoctorRecommendationCard
						doctors={doctors}
						activeDoctorIndex={activeDoctorIndex}
						onNextDoctor={() =>
							setActiveDoctorIndex((currentIndex) => currentIndex + 1)
						}
						userLocation={userLocation}
					/>
				) : null}
			</section>
		</SearchPageShell>
	);
}
