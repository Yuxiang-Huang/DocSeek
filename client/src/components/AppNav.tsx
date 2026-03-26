import { Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useSavedPhysicians } from "../hooks/useSavedPhysicians";

export function AppNav() {
	const { savedDoctors } = useSavedPhysicians();
	const count = savedDoctors.length;

	return (
		<nav className="app-nav" aria-label="Main navigation">
			<Link to="/" className="app-nav-brand">
				DocSeek
			</Link>
			<Link
				to="/saved"
				className="app-nav-link"
				aria-label={
					count > 0 ? `Saved physicians (${count} saved)` : "Saved physicians"
				}
			>
				<Bookmark aria-hidden size={18} strokeWidth={2} />
				Saved physicians
				{count > 0 ? (
					<span className="app-nav-count" aria-hidden>
						{count}
					</span>
				) : null}
			</Link>
		</nav>
	);
}
