import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type Doctor,
	CopyLinkButton,
	direct_to_booking,
	SearchPageShell,
} from "../components/App";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

export const Route = createFileRoute("/saved")({
	component: SavedRoutePage,
});

export function SavedRoutePage() {
	const { savedDoctors, removeSavedDoctor } = useSavedPhysicians();
	const [activeIndex, setActiveIndex] = useState(0);

	// Reset active index when saved list changes
	useEffect(() => {
		setActiveIndex((i) =>
			i >= savedDoctors.length ? Math.max(0, savedDoctors.length - 1) : i,
		);
	}, [savedDoctors.length]);

	return (
		<SearchPageShell>
			<section className="results-page" aria-label="Saved physicians">
				<header className="results-header">
					<div className="results-header-top">
						<Link className="back-link" to="/">
							<ArrowLeft aria-hidden size={18} strokeWidth={2.2} />
							Start a new search
						</Link>
						<div className="saved-page-badge">
							<BookmarkCheck aria-hidden size={22} strokeWidth={2} />
							<span>Saved physicians</span>
						</div>
					</div>
					<div className="results-copy">
						<p className="results-kicker">Your saved list</p>
						<h1 className="results-title">Saved physicians</h1>
						<p className="results-lede">
							Physicians you saved for later. You can remove any from your list
							when you no longer need them.
						</p>
					</div>
				</header>

				{savedDoctors.length === 0 ? (
					<div className="saved-empty">
						<p>You haven&apos;t saved any physicians yet.</p>
						<p>
							<Link to="/" className="saved-empty-link">
								Search for doctors
							</Link>{" "}
							and save the ones you want to revisit later.
						</p>
					</div>
				) : (
					<SavedDoctorCard
						doctors={savedDoctors}
						activeDoctorIndex={activeIndex}
						onNextDoctor={() => setActiveIndex((i) => i + 1)}
						onUnsave={(doctor) => removeSavedDoctor(doctor.id)}
					/>
				)}
			</section>
		</SearchPageShell>
	);
}

type SavedDoctorCardProps = {
	doctors: Doctor[];
	activeDoctorIndex: number;
	onNextDoctor: () => void;
	onUnsave: (doctor: Doctor) => void;
};

export function SavedDoctorCard({
	doctors,
	activeDoctorIndex,
	onNextDoctor,
	onUnsave,
}: SavedDoctorCardProps) {
	const activeDoctor = doctors[activeDoctorIndex];
	const hasNextDoctor = activeDoctorIndex < doctors.length - 1;

	if (!activeDoctor) return null;

	const bookingUrl = direct_to_booking(activeDoctor);

	return (
		<section className="doctor-card" aria-live="polite">
			<div className="doctor-card-header">
				<div>
					<p className="result-count">
						Saved physician {activeDoctorIndex + 1} of {doctors.length}
					</p>
					<h2>{activeDoctor.full_name}</h2>
				</div>
				<div className="doctor-card-header-actions">
					<button
						type="button"
						className="save-button saved"
						onClick={() => onUnsave(activeDoctor)}
						aria-label={`Remove ${activeDoctor.full_name} from saved physicians`}
					>
						<BookmarkCheck aria-hidden size={20} strokeWidth={2} />
						Remove from saved
					</button>
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
			<div className="doctor-details">
				<p className="doctor-detail">
					{activeDoctor.primary_location ?? "Location not listed"}
				</p>
				<p className="doctor-detail">
					{activeDoctor.primary_phone ?? "Phone number not listed"}
				</p>
			</div>
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
				<CopyLinkButton
					doctorId={activeDoctor.id}
					doctorName={activeDoctor.full_name}
				/>
				<button
					className="secondary-action"
					type="button"
					onClick={onNextDoctor}
					disabled={!hasNextDoctor}
				>
					{hasNextDoctor
						? "See the next saved physician"
						: "You've reached the last saved physician"}
				</button>
			</div>
		</section>
	);
}
