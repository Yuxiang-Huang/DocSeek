import { createFileRoute } from "@tanstack/react-router";
import { ResultsPage, type SearchFilters } from "../components/App";

type ResultsSearch = {
	symptoms: string;
	location?: string;
	onlyAcceptingNewPatients?: string;
};

export const Route = createFileRoute("/results")({
	validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
		symptoms: typeof search.symptoms === "string" ? search.symptoms : "",
		location:
			typeof search.location === "string" && search.location.trim()
				? search.location.trim()
				: undefined,
		onlyAcceptingNewPatients:
			search.onlyAcceptingNewPatients === "true" ? "true" : undefined,
	}),
	component: ResultsRoutePage,
});

function ResultsRoutePage() {
	const {
		symptoms: initialSymptoms,
		location,
		onlyAcceptingNewPatients,
	} = Route.useSearch();

	const initialFilters: SearchFilters | undefined =
		location || onlyAcceptingNewPatients
			? {
					...(location && { location }),
					...(onlyAcceptingNewPatients === "true" && {
						onlyAcceptingNewPatients: true,
					}),
				}
			: undefined;

	return (
		<ResultsPage
			initialSymptoms={initialSymptoms}
			initialFilters={initialFilters}
			includeBackLink
		/>
	);
}
