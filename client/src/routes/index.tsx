import { createFileRoute } from "@tanstack/react-router";
import { getResultsNavigation, HomePage } from "../components/App";

export const Route = createFileRoute("/")({
	component: HomeRoute,
});

function HomeRoute() {
	const navigate = Route.useNavigate();

	return (
		<HomePage
			navigateToResults={(symptoms) =>
				void navigate(getResultsNavigation(symptoms))
			}
		/>
	);
}
