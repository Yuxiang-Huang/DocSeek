import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type Doctor,
	direct_to_booking,
	fetchDoctor,
	SearchPageShell,
} from "../components/App";

export const Route = createFileRoute("/physician/$id")({
	component: PhysicianProfilePage,
});

function PhysicianProfilePage() {
	const { id } = Route.useParams();
	const doctorId = Number(id);

	const [doctor, setDoctor] = useState<Doctor | null | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!Number.isInteger(doctorId) || doctorId < 1) {
			setDoctor(null);
			return;
		}

		setDoctor(undefined);
		setError(null);

		fetchDoctor(doctorId)
			.then((result) => {
				setDoctor(result);
			})
			.catch((err: unknown) => {
				const message =
					err instanceof Error
						? err.message
						: "Unable to load this physician profile.";
				setError(message);
				setDoctor(null);
			});
	}, [doctorId]);

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
				</header>

				{doctor === undefined && error === null ? (
					<p className="loading-message">Loading physician profile&hellip;</p>
				) : error !== null ? (
					<div className="physician-profile-unavailable">
						<Stethoscope
							className="physician-profile-unavailable-icon"
							aria-hidden
							size={40}
							strokeWidth={1.5}
						/>
						<h1 className="physician-profile-unavailable-title">
							Unable to load profile
						</h1>
						<p className="physician-profile-unavailable-body">{error}</p>
					</div>
				) : doctor === null ? (
					<div className="physician-profile-unavailable">
						<Stethoscope
							className="physician-profile-unavailable-icon"
							aria-hidden
							size={40}
							strokeWidth={1.5}
						/>
						<h1 className="physician-profile-unavailable-title">
							Physician not found
						</h1>
						<p className="physician-profile-unavailable-body">
							This physician profile is no longer available or does not exist.
						</p>
					</div>
				) : (
					<PhysicianProfileCard doctor={doctor} />
				)}
			</section>
		</SearchPageShell>
	);
}

function PhysicianProfileCard({ doctor }: { doctor: Doctor }) {
	const bookingUrl = direct_to_booking(doctor);

	return (
		<article
			className="doctor-card physician-profile-card"
			aria-label={`Profile for ${doctor.full_name}`}
		>
			<div className="doctor-card-header">
				<div>
					<p className="result-count">Physician profile</p>
					<h1 className="doctor-card-name">{doctor.full_name}</h1>
				</div>
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
						View profile
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
			</div>
		</article>
	);
}
