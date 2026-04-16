import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type Doctor,
	CopyLinkButton,
	direct_to_booking,
	SearchPageShell,
} from "../components/App";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const Route = createFileRoute("/physician/$id")({
	component: PhysicianProfilePage,
});

type PhysicianResponse =
	| { doctor: Doctor }
	| { error: string };

async function fetchPhysician(id: number): Promise<Doctor | null> {
	const response = await fetch(`${API_BASE_URL}/doctors/${id}`);
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error("Unable to load physician profile right now.");
	}
	const payload = (await response.json()) as PhysicianResponse;
	if ("error" in payload) {
		throw new Error(payload.error);
	}
	return payload.doctor;
}

function PhysicianProfilePage() {
	const { id } = Route.useParams();
	const numericId = Number(id);

	const [doctor, setDoctor] = useState<Doctor | null | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let ignore = false;

		if (!Number.isInteger(numericId) || numericId < 1) {
			setErrorMessage("Physician not found.");
			setDoctor(null);
			return;
		}

		async function load() {
			try {
				const result = await fetchPhysician(numericId);
				if (!ignore) {
					setDoctor(result);
					if (!result) {
						setErrorMessage(
							"This physician is no longer available or could not be found.",
						);
					}
				}
			} catch (error) {
				if (!ignore) {
					setDoctor(null);
					setErrorMessage(
						error instanceof Error
							? error.message
							: "Unable to load physician profile right now.",
					);
				}
			}
		}

		void load();

		return () => {
			ignore = true;
		};
	}, [numericId]);

	const bookingUrl = doctor ? direct_to_booking(doctor) : null;

	return (
		<SearchPageShell>
			<section className="results-page" aria-label="Physician profile">
				<header className="results-header">
					<div className="results-header-top">
						<Link className="back-link" to="/">
							<ArrowLeft aria-hidden size={18} strokeWidth={2.2} />
							Start a new search
						</Link>
					</div>
					<div className="results-copy">
						<p className="results-kicker">Physician profile</p>
						<h1 className="results-title">
							{doctor ? doctor.full_name : "Physician Profile"}
						</h1>
					</div>
				</header>

				{doctor === undefined ? (
					<p className="loading-message">Loading physician profile…</p>
				) : null}

				{errorMessage ? (
					<p className="feedback-message" role="alert">
						{errorMessage}
					</p>
				) : null}

				{doctor ? <PhysicianProfileCard doctor={doctor} bookingUrl={bookingUrl} /> : null}
			</section>
		</SearchPageShell>
	);
}

type PhysicianProfileCardProps = {
	doctor: Doctor;
	bookingUrl: string | null;
};

function PhysicianProfileCard({ doctor, bookingUrl }: PhysicianProfileCardProps) {
	return (
		<section className="doctor-card" aria-label={`Profile for ${doctor.full_name}`}>
			<div className="doctor-card-header">
				<div>
					<h2>{doctor.full_name}</h2>
				</div>
				<div className="doctor-card-header-actions">
					<p
						className={
							doctor.accepting_new_patients
								? "availability availability-open"
								: "availability"
						}
					>
						{doctor.accepting_new_patients
							? "Accepting new patients"
							: "Check availability"}
					</p>
				</div>
			</div>
			<p className="doctor-meta">
				{doctor.primary_specialty ?? "Specialty not listed"}
			</p>
			<div className="doctor-details">
				<p className="doctor-detail">
					{doctor.primary_location ?? "Location not listed"}
				</p>
				<p className="doctor-detail">
					{doctor.primary_phone ?? "Phone number not listed"}
				</p>
			</div>
			<div className="doctor-links">
				{doctor.profile_url ? (
					<a
						href={doctor.profile_url}
						target="_blank"
						rel="noreferrer"
						aria-label={`View full profile for ${doctor.full_name} (opens in a new tab)`}
					>
						View full profile
					</a>
				) : null}
				{bookingUrl ? (
					<a
						href={bookingUrl}
						target="_blank"
						rel="noreferrer"
						aria-label={`Book an appointment with ${doctor.full_name} (opens in a new tab)`}
					>
						Book appointment
					</a>
				) : null}
				<CopyLinkButton doctorId={doctor.id} doctorName={doctor.full_name} />
			</div>
		</section>
	);
}
