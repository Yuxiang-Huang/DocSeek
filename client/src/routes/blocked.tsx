import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type Doctor,
	SearchPageShell,
} from "../components/App";
import { useBlockedPhysicians } from "../hooks/useBlockedPhysicians";

export const Route = createFileRoute("/blocked")({
	component: BlockedRoutePage,
});

export function BlockedRoutePage() {
	const { blockedDoctors, unblockDoctor } = useBlockedPhysicians();
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		setActiveIndex((i) =>
			i >= blockedDoctors.length ? Math.max(0, blockedDoctors.length - 1) : i,
		);
	}, [blockedDoctors.length]);

	return (
		<SearchPageShell>
			<section className="results-page" aria-label="Blocked physicians">
				<header className="results-header">
					<div className="results-header-top">
						<Link className="back-link" to="/">
							<ArrowLeft aria-hidden size={18} strokeWidth={2.2} />
							Start a new search
						</Link>
						<div className="blocked-page-badge">
							<EyeOff aria-hidden size={22} strokeWidth={2} />
							<span>Blocked physicians</span>
						</div>
					</div>
					<div className="results-copy">
						<p className="results-kicker">Your blocked list</p>
						<h1 className="results-title">Blocked physicians</h1>
						<p className="results-lede">
							Physicians you have chosen not to see in results. Unblock any
							physician to have them appear in future searches again.
						</p>
					</div>
				</header>

				{blockedDoctors.length === 0 ? (
					<div className="saved-empty">
						<p>You haven&apos;t blocked any physicians.</p>
						<p>
							<Link to="/" className="saved-empty-link">
								Search for doctors
							</Link>{" "}
							and use the &ldquo;Do not show again&rdquo; option on any
							physician card.
						</p>
					</div>
				) : (
					<BlockedDoctorCard
						doctors={blockedDoctors}
						activeDoctorIndex={activeIndex}
						onNextDoctor={() => setActiveIndex((i) => i + 1)}
						onUnblock={(doctor) => unblockDoctor(doctor.id)}
					/>
				)}
			</section>
		</SearchPageShell>
	);
}

type BlockedDoctorCardProps = {
	doctors: Doctor[];
	activeDoctorIndex: number;
	onNextDoctor: () => void;
	onUnblock: (doctor: Doctor) => void;
};

export function BlockedDoctorCard({
	doctors,
	activeDoctorIndex,
	onNextDoctor,
	onUnblock,
}: BlockedDoctorCardProps) {
	const activeDoctor = doctors[activeDoctorIndex];
	const hasNextDoctor = activeDoctorIndex < doctors.length - 1;

	if (!activeDoctor) return null;

	return (
		<section className="doctor-card" aria-live="polite">
			<div className="doctor-card-header">
				<div>
					<p className="result-count">
						Blocked physician {activeDoctorIndex + 1} of {doctors.length}
					</p>
					<h2>{activeDoctor.full_name}</h2>
				</div>
				<div className="doctor-card-header-actions">
					<button
						type="button"
						className="save-button"
						onClick={() => onUnblock(activeDoctor)}
						aria-label={`Unblock ${activeDoctor.full_name} and show in future results`}
					>
						<EyeOff aria-hidden size={20} strokeWidth={2} />
						Unblock
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
				<button
					className="secondary-action"
					type="button"
					onClick={onNextDoctor}
					disabled={!hasNextDoctor}
				>
					{hasNextDoctor
						? "See the next blocked physician"
						: "You've reached the last blocked physician"}
				</button>
			</div>
		</section>
	);
}
