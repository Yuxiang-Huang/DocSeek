import { Link } from "@tanstack/react-router";
import { Bookmark, EyeOff } from "lucide-react";
import { useBlockedPhysicians } from "../hooks/useBlockedPhysicians";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

export function AppNav() {
	const { savedDoctors } = useSavedPhysicians();
	const { blockedDoctors } = useBlockedPhysicians();
	const savedCount = savedDoctors.length;
	const blockedCount = blockedDoctors.length;

	return (
		<nav className="app-nav" aria-label="Main navigation">
			<Link to="/" className="app-nav-brand">
				DocSeek
			</Link>
			<Link
				to="/saved"
				className="app-nav-link"
				aria-label={
					savedCount > 0
						? `Saved physicians (${savedCount} saved)`
						: "Saved physicians"
				}
			>
				<Bookmark aria-hidden size={18} strokeWidth={2} />
				Saved physicians
				{savedCount > 0 ? (
					<span className="app-nav-count" aria-hidden>
						{savedCount}
					</span>
				) : null}
			</Link>
			<Link
				to="/blocked"
				className="app-nav-link"
				aria-label={
					blockedCount > 0
						? `Blocked physicians (${blockedCount} blocked)`
						: "Blocked physicians"
				}
			>
				<EyeOff aria-hidden size={18} strokeWidth={2} />
				Blocked physicians
				{blockedCount > 0 ? (
					<span className="app-nav-count app-nav-count-blocked" aria-hidden>
						{blockedCount}
					</span>
				) : null}
			</Link>
		</nav>
	);
}
