import { createFileRoute } from "@tanstack/react-router";
import { ResultsPage } from "../components/App";

type ResultsSearch = {
	symptoms: string;
};

export const Route = createFileRoute("/results")({
	validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
		symptoms: typeof search.symptoms === "string" ? search.symptoms : "",
	}),
	component: ResultsRoutePage,
});

function ResultsRoutePage() {
	const { symptoms: initialSymptoms } = Route.useSearch();

	return <ResultsPage initialSymptoms={initialSymptoms} includeBackLink />;
}
