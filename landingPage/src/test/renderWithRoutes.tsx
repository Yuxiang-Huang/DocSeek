import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AboutTheTeamPage } from "../AboutTheTeamPage";
import { App } from "../App";

/** Renders home + about routes (matches `main.tsx`). */
export function renderSite(initialPath = "/") {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/about-the-team" element={<AboutTheTeamPage />} />
			</Routes>
		</MemoryRouter>,
	);
}
